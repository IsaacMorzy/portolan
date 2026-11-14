import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appFromEnv, installationToken } from "@/lib/github/app.ts";
import { createServerSupabase } from "@/lib/supabase/server";
import { LIMITS, rateLimit } from "@/lib/ratelimit.ts";

type EdgeRow = {
  source_file_id: string;
  target_file_id: string;
  kind: string;
  specifier: string;
  line: number;
};

type BlastRadiusEntry = {
  file: string;
  count: number;
};

export const dynamic = "force-dynamic";

type Body = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export async function POST(request: Request): Promise<Response> {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const { owner, repo, pullNumber } = body;
  if (!owner || typeof owner !== "string" || !repo || typeof repo !== "string" || !pullNumber) {
    return NextResponse.json({ error: "owner, repo, and pullNumber are required" }, { status: 400 });
  }

  const limited = rateLimit(`github-blast-radius:${orgId}`, LIMITS.graph);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });
  }

  const app = appFromEnv();
  if (!app) {
    return NextResponse.json(
      { error: "GitHub App not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY." },
      { status: 503 }
    );
  }

  const db = await createServerSupabase();
  const { data: appRow, error: appError } = await db
    .from("github_apps")
    .select("app_id, private_key, installation_id")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });
  if (!appRow) {
    return NextResponse.json(
      { error: "No GitHub App installed for this organization. Create one at /dashboard." },
      { status: 404 }
    );
  }

  const token = await installationToken(appRow.app_id as unknown as string, appRow.private_key as string, appRow.installation_id as unknown as string);
  if ("error" in token) {
    return NextResponse.json({ error: `GitHub: ${token.error}` }, { status: 500 });
  }

  const diffResult = await fetchPullRequestDiff(token.token as string, owner, repo, pullNumber!);
  if (typeof diffResult !== "string") {
    return NextResponse.json({ error: diffResult.error }, { status: diffResult.status });
  }
  const diff = diffResult;

  const { data: analysis, error: analysisError } = await db
    .from("analyses")
    .select("id, status")
    .eq("organization_id", orgId)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1);
  if (analysisError) return NextResponse.json({ error: analysisError.message }, { status: 500 });
  if (!analysis || analysis.length === 0) {
    return NextResponse.json({ error: "No analysis found for this repository. Run a parse first." }, { status: 404 });
  }

  const { data: edges, error: edgesError } = await db
    .from("edges")
    .select("source_file_id, target_file_id, kind, specifier, line")
    .eq("analysis_id", analysis[0].id);
  if (edgesError) return NextResponse.json({ error: edgesError.message }, { status: 500 });

  const { data: files, error: filesError } = await db
    .from("files")
    .select("id, path")
    .eq("analysis_id", analysis[0].id);
  if (filesError) return NextResponse.json({ error: filesError.message }, { status: 500 });

  const changedFiles = parseDiff(diff);
  if (changedFiles.length === 0) {
    return NextResponse.json({
      repository: `${owner}/${repo}`,
      pullNumber,
      changedFiles: [],
      blastRadius: { incoming: [], outgoing: [] },
    });
  }

  const pathToId = new Map(files.map((f) => [f.path, f.id]));
  const idToPath = new Map(files.map((f) => [f.id, f.path]));

  const changedFileIds = new Set<string>();
  for (const f of changedFiles) {
    const id = pathToId.get(f);
    if (id) changedFileIds.add(id);
  }

  const incomingEdges = edges.filter((e: EdgeRow) => changedFileIds.has(e.target_file_id));
  const outgoingEdges = edges.filter((e: EdgeRow) => changedFileIds.has(e.source_file_id));

  return NextResponse.json({
    repository: `${owner}/${repo}`,
    pullNumber,
    changedFiles: changedFiles.map((f) => ({ path: f })),
    blastRadius: {
      incoming: computeIncoming(incomingEdges, idToPath, changedFileIds),
      outgoing: computeOutgoing(outgoingEdges, idToPath, changedFileIds),
    },
  });
}

async function fetchPullRequestDiff(token: string, owner: string, repo: string, pullNumber: number): Promise<string | { error: string; status: number }> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "portolan",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    return { status: response.status, error: `GitHub PR fetch failed: ${response.status}` };
  }
  const pr = (await response.json()) as { diff_url: string };
  const diffResponse = await fetch(pr.diff_url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "portolan",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!diffResponse.ok) {
    return { error: `GitHub diff fetch failed: ${diffResponse.status}`, status: diffResponse.status };
  }
  const text = await diffResponse.text();
  return text;
}

function parseDiff(diff: string): string[] {
  const found: string[] = [];
  const lines = diff.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^diff --git a\/(.+) b\/(.+)$/);
    if (match) {
      found.push(match[1]);
    }
  }
  return found;
}

function computeIncoming(edges: EdgeRow[], idToPath: Map<string, string>, changedFileIds: Set<string>): BlastRadiusEntry[] {
  const counts: Record<string, number> = {};
  for (const e of edges) {
    if (changedFileIds.has(e.target_file_id)) {
      const target = idToPath.get(e.source_file_id);
      if (target) {
        counts[target] = (counts[target] || 0) + 1;
      }
    }
  }
  return Object.entries(counts).map(([file, count]) => ({ file, count }));
}

function computeOutgoing(edges: EdgeRow[], idToPath: Map<string, string>, changedFileIds: Set<string>): BlastRadiusEntry[] {
  const counts: Record<string, number> = {};
  for (const e of edges) {
    if (changedFileIds.has(e.source_file_id)) {
      const target = idToPath.get(e.target_file_id);
      if (target) {
        counts[target] = (counts[target] || 0) + 1;
      }
    }
  }
  return Object.entries(counts).map(([file, count]) => ({ file, count }));
}
