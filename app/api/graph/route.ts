import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { loadStoredAnalysis } from "@/lib/analysis/load";
import { adjacency, reach, type Direction } from "@/lib/graph/reach.ts";
import { createServerSupabase } from "@/lib/supabase/server";
import { explainFileAction } from "@/app/(workspace)/analyses/[id]/actions";

/**
 * The analysis graph, over HTTP, for an agent holding a Clerk session (#25).
 *
 * A JSON route rather than an MCP server: an MCP server is a transport, and the
 * three questions it would answer are one request each. If an agent needs
 * streamed tool descriptions later, this is the layer it wraps.
 *
 * Scoped exactly like the pages: the analysis is read through the caller's
 * organization, and an analysis belonging to another workspace is a 404 — the
 * same answer as one that does not exist, so this route cannot be used to
 * enumerate what other people have analysed.
 */

export const dynamic = "force-dynamic";

type Payload = {
  analysisId?: string;
  file?: string;
  direction?: Direction;
  depth?: number;
};

export async function POST(request: Request): Promise<Response> {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 401 });

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const { analysisId, file } = body;
  if (!analysisId || !file) {
    return NextResponse.json({ error: "analysisId and file are required" }, { status: 400 });
  }
  const direction: Direction = body.direction === "dependencies" ? "dependencies" : "dependents";
  const depth = Number.isInteger(body.depth) && body.depth! > 0 && body.depth! <= 5 ? body.depth! : 2;

  const db = await createServerSupabase();
  const { data: analysis, error: analysisError } = await db
    .from("analyses")
    .select("id, status, organization_id")
    .eq("id", analysisId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (analysisError) return NextResponse.json({ error: analysisError.message }, { status: 500 });
  if (!analysis || analysis.status !== "complete") {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // The same loader the analysis page uses, so an agent cannot see a graph the
  // page would not: paths resolved from file ids, edges deduped, roles joined.
  const stored = await loadStoredAnalysis(db, { id: analysis.id, label: analysis.id, coverage: null, projects: null });
  const parsed = stored.result.edges;

  if (!parsed.some((e) => e.source === file || e.target === file)) {
    return NextResponse.json({ error: `No such file in this analysis: ${file}` }, { status: 404 });
  }

  const { steps, beyond } = reach(adjacency(parsed), file, direction, depth);

  // The explanation is the same call the dashboard makes, so an agent cannot
  // get an answer a person could not, and it is cached identically.
  const explained = await explainFileAction(analysisId, file);
  return NextResponse.json({
    analysisId,
    file,
    direction,
    depth,
    steps,
    beyond,
    explanation: explained.ok
      ? { body: explained.body, model: explained.model, cached: explained.cached }
      : { error: explained.error },
  });
}
