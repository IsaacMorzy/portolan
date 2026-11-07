import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { countChurn } from "@/lib/graph/churn.ts";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * G4 (#26), over HTTP: the churn for one file in an analysis the caller owns.
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

  let body: { analysisId?: string; path?: string };
  try {
    body = (await request.json()) as { analysisId?: string; path?: string };
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const { analysisId, path } = body;
  if (!analysisId || !path) {
    return NextResponse.json({ error: "analysisId and path are required" }, { status: 400 });
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
  const result = await countChurn(repository, path);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ repository: `${repository.owner}/${repository.name}`, path, ...result });
}
