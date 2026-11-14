import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appFromEnv, installationToken } from "@/lib/github/app.ts";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseRepository, type ParseResult } from "@/lib/parser/index.ts";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const dynamic = "force-dynamic";

type Body = {
  owner: string;
  repo: string;
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

  const { owner, repo } = body;
  if (!owner || typeof owner !== "string" || !repo || typeof repo !== "string") {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 });
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

  const token = await installationToken(
    appRow.app_id as unknown as string,
    appRow.private_key,
    appRow.installation_id as unknown as string
  );
  if ("error" in token) {
    return NextResponse.json({ error: `GitHub: ${token.error}` }, { status: 500 });
  }

  const tmpDir = join(tmpdir(), `portolan-${createHash('md5').update(Date.now().toString()).digest('hex').slice(0, 8)}`);
  mkdirSync(tmpDir, { recursive: true });
  try {
    execFileSync(
      "git",
      ["clone", "--depth=1", `https://x-access-token:${token.token}@github.com/${owner}/${repo}.git`, tmpDir],
      { stdio: "pipe", timeout: 120_000 }
    );
  } catch (error) {
    rmSync(tmpDir, { recursive: true, force: true });
    return NextResponse.json(
      { error: `Failed to clone repository: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }

  let result: ParseResult;
  try {
    result = parseRepository(tmpDir);
  } catch (error) {
    rmSync(tmpDir, { recursive: true, force: true });
    return NextResponse.json(
      { error: `Parse failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }

  rmSync(tmpDir, { recursive: true, force: true });

  const now = new Date().toISOString();
  const { data: analysis, error: analysisError } = await db
    .from("analyses")
    .insert({
      organization_id: orgId,
      project_id: null as unknown as string,
      status: "complete",
      commit_sha: "HEAD",
      error: null,
      created_at: now,
      finished_at: now
    })
    .select("id")
    .single();
  if (analysisError) return NextResponse.json({ error: analysisError.message }, { status: 500 });

  return NextResponse.json({
    analysisId: (analysis.id as string) || "",
    repository: `${owner}/${repo}`,
    files: result.files.length,
    edges: result.edges.length
  });
}
