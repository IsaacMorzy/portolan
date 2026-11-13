import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { countChurn, countModuleChurn, sinceDate } from "@/lib/graph/churn.ts";
import { LIMITS, rateLimit } from "@/lib/ratelimit.ts";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * G4 (#26) and L4 (#47), over HTTP: churn for one file or one module root in
 * an analysis the caller owns.
 *
 * Scoped like every other route, and for a second reason: this spends the
 * GITHUB_TOKEN rate limit. A signed-in stranger pointing it at any repository
 * on GitHub would be using our credential as a proxy, so the path is asked
 * about through an analysis the caller's organization owns. Another
 * workspace's analysis answers exactly what a missing one answers.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 401 });

  let body: { analysisId?: string; path?: string; moduleRoot?: string };
  try {
    body = (await request.json()) as { analysisId?: string; path?: string; moduleRoot?: string };
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const { analysisId, path, moduleRoot } = body;
  if (!analysisId || typeof analysisId !== "string") {
    return NextResponse.json({ error: "analysisId is required" }, { status: 400 });
  }

  const limited = rateLimit(`churn:${orgId}`, LIMITS.churn);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });
  }

  const db = await createServerSupabase();
  const { data: analysis, error } = await db
    .from("analyses")
    .select("id, project:projects(repo_owner, repo_name)")
    .eq("id", analysisId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!analysis?.project) return NextResponse.json({ error: "Analysis not found" }, { status: 404 });

  const repository = { owner: analysis.project.repo_owner, name: analysis.project.repo_name };

  // Module churn: one number per module root in the last 90 days.
  if (moduleRoot) {
    if (typeof moduleRoot !== "string") {
      return NextResponse.json({ error: "moduleRoot must be a string" }, { status: 400 });
    }
    const since = sinceDate(90);
    const result = await countModuleChurn(repository, moduleRoot, since);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ repository: `${repository.owner}/${repository.name}`, moduleRoot, ...result, window: "last 90 days" });
  }

  // File churn: one number per file, all time.
  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  const result = await countChurn(repository, path);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ repository: `${repository.owner}/${repository.name}`, path, ...result });
}
