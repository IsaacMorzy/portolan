import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ai, model, modelId, traceConfig } from "@/lib/ai/client";
import { rateLimit, LIMITS } from "@/lib/ratelimit.ts";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseDiff } from "@/lib/parser/diff.ts";

// T1 — manual API-triggered review of one PR diff.
//
// Accepts an analysis id and a unified diff, runs the diff against the
// parsed dependency graph, asks the model to comment on the changed files,
// and writes the review + comments to Supabase.
//
// The review layer is scoped like every other entry point: the caller's
// organization must own the analysis, otherwise 404 (same as "not found"
// — this route cannot enumerate other workspaces' analyses).
export const dynamic = "force-dynamic";

type Body = {
  analysisId: string;
  diff: string;
  prNumber?: number;
};

const EXPLAIN_SYSTEM = `You review a pull request diff against a parsed dependency graph.

For each changed file, say what the change touches, which modules import it
and which it imports (from the graph), and whether the diff looks coherent
with those edges. Keep each comment short, specific to the file, and grounded
in the graph — never invent a module or edge.

Output one comment per changed file as a JSON array of objects:
{ "file": "<path>", "line": <number|null>, "body": "<comment>" }.
Use line null when the comment is about the file as a whole.`;

/** The largest diff we send to the model — a backstop against runaway prompts. */
const MAX_DIFF_CHARS = 120_000;

export async function POST(request: Request): Promise<Response> {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const { analysisId, diff } = body;
  if (!analysisId || typeof analysisId !== "string") {
    return NextResponse.json({ error: "analysisId is required" }, { status: 400 });
  }
  if (!diff || typeof diff !== "string") {
    return NextResponse.json({ error: "diff is required" }, { status: 400 });
  }

  const limited = rateLimit(`review:${orgId}`, LIMITS.graph);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const db = await createServerSupabase();

  // The analysis must exist, belong to this org, and be complete.
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

  // Parse the diff into changed files.
  const changedFiles = parseDiff(diff.slice(0, MAX_DIFF_CHARS));
  if (changedFiles.length === 0) {
    return NextResponse.json(
      { reviewId: null, comments: [], message: "No changed files found in diff" },
      { status: 200 },
    );
  }

  // Load the stored analysis: files + edges.
  const { data: files, error: filesError } = await db
    .from("files")
    .select("id, path, skip_reason")
    .eq("analysis_id", analysisId)
    .is("skip_reason", null);
  if (filesError) return NextResponse.json({ error: filesError.message }, { status: 500 });
  const pathOf = new Map(files.map((f) => [f.path, f.id]));
  const fileIds = new Set(files.map((f) => f.id));

  const { data: edges, error: edgesError } = await db
    .from("edges")
    .select("source_file_id, target_file_id, kind, specifier, line")
    .eq("analysis_id", analysisId);
  if (edgesError) return NextResponse.json({ error: edgesError.message }, { status: 500 });

  // For each changed file, collect the edges that touch it (source or target).
  const edgesByFile = new Map<string, Array<{ kind: string; specifier: string; line: number; isSource: boolean }>>();
  for (const e of edges) {
    const sourcePath = files.find((f) => f.id === e.source_file_id)?.path;
    const targetPath = files.find((f) => f.id === e.target_file_id)?.path;
    if (sourcePath) {
      const arr = edgesByFile.get(sourcePath) ?? [];
      arr.push({ kind: e.kind, specifier: e.specifier, line: e.line, isSource: true });
      edgesByFile.set(sourcePath, arr);
    }
    if (targetPath) {
      const arr = edgesByFile.get(targetPath) ?? [];
      arr.push({ kind: e.kind, specifier: e.specifier, line: e.line, isSource: false });
      edgesByFile.set(targetPath, arr);
    }
  }

  // Ask the model once per changed file, with the diff hunk + graph context.
  const m = model("explain");
  const comments: Array<{ file: string; line: number | null; body: string }> = [];
  for (const cf of changedFiles) {
    const graphEdges = edgesByFile.get(cf.path) ?? [];
    const edgeText = graphEdges
      .map((e) => `  ${e.isSource ? "imports" : "imported by"} ${e.specifier} (${e.kind}, line ${e.line})`)
      .join("\n") || "  (no resolved edges in this analysis)";
    const diffText = cf.added.map((l) => `+ ${l}`).concat(cf.removed.map((l) => `- ${l}`)).join("\n").slice(0, 4000);
    const question = `File: ${cf.path}\n\nGraph edges:\n${edgeText}\n\nDiff (added/removed lines):\n${diffText}`;

    const completion = await ai().chat.completions.create({
      model: modelId(m),
      messages: [
        { role: "system", content: EXPLAIN_SYSTEM },
        { role: "user", content: question },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    // Best-effort parse: try JSON array, fall back to one comment per file.
    let parsed: Array<{ file: string; line: number | null; body: string }> = [];
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      parsed = [];
    }

    if (parsed.length === 0) {
      parsed = [{ file: cf.path, line: null, body: raw }];
    }

    for (const c of parsed) {
      comments.push({ file: c.file ?? cf.path, line: c.line ?? null, body: c.body ?? "" });
    }
  }

  // Write the review + comments to Supabase.
  const now = new Date().toISOString();
  const { data: review, error: reviewError } = await db
    .from("reviews")
    .insert({
      organization_id: orgId,
      analysis_id: analysisId,
      pr_number: body.prNumber ?? 0,
      repo_owner: "", // filled by caller later if needed
      repo_name: "",
      status: "complete",
      error: null,
      created_at: now,
      finished_at: now,
    })
    .select("id")
    .single();
  if (reviewError) return NextResponse.json({ error: reviewError.message }, { status: 500 });

  const reviewId = review.id;
  if (comments.length > 0) {
    const { error: commentsError } = await db.from("review_comments").insert(
      comments.map((c) => ({
        organization_id: orgId,
        review_id: reviewId,
        file_path: c.file,
        line_number: c.line,
        body: c.body,
        created_at: now,
      })),
    );
    if (commentsError) return NextResponse.json({ error: commentsError.message }, { status: 500 });
  }

  return NextResponse.json({
    reviewId,
    analysisId,
    prNumber: body.prNumber ?? null,
    commentCount: comments.length,
    comments,
  });
}
