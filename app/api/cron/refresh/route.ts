import { NextResponse } from "next/server";
import { resolveHeadCommit } from "@/lib/pipeline/github";
import { claimAnalysis, continueRun } from "@/lib/pipeline/run";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { LIMITS, rateLimit } from "@/lib/ratelimit.ts";

/**
 * G9 (#30): keep a map fresh after the default branch moves.
 *
 * Called by Vercel's scheduler (vercel.json). Two guards that matter:
 *
 * - The secret. A public URL that re-analyses repositories on demand is a way
 *   to burn someone else's rate limit, and Clerk cannot help here because the
 *   caller is a scheduler, not a person.
 * - The organization comes from the row, not the request. There is no session,
 *   so nothing in the body is trusted; the query is the authorization.
 *
 * A refresh replaces the analysis in place, because one analysis per repository
 * is a constraint every read depends on. The commit it replaced is written to
 * previous_commit_sha first, so "this map moved" survives the replacement.
 *
 * Bounded deliberately: a handful per invocation, oldest first. A scheduled
 * function that tries to re-analyse everything at once is a timeout, not a
 * feature.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PER_RUN = 3;
const MIN_AGE_MS = 6 * 60 * 60 * 1000;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET isn't set" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The endpoint is reachable by anyone holding the secret, and each call can
  // re-parse three repositories. Its budget is a day, not a minute.
  const limited = rateLimit("cron:refresh", LIMITS.refresh);
  if (!limited.ok) {
    return NextResponse.json({ error: "Refresh already ran today" }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });
  }

  const db = createAdminSupabase();
  const cutoff = new Date(Date.now() - MIN_AGE_MS).toISOString();

  const { data: rows, error } = await db
    .from("analyses")
    .select("id, commit_sha, finished_at, project:projects(repo_owner, repo_name)")
    .eq("status", "complete")
    .lt("finished_at", cutoff)
    .order("finished_at", { ascending: true })
    .limit(PER_RUN * 4);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const moved: string[] = [];
  const unchanged: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (const row of rows ?? []) {
    if (moved.length >= PER_RUN) break;
    if (!row.project?.repo_owner || !row.project?.repo_name) continue;

    let head: string;
    try {
      head = await resolveHeadCommit({ owner: row.project.repo_owner, name: row.project.repo_name });
    } catch (e) {
      failed.push({ id: row.id, reason: e instanceof Error ? e.message : String(e) });
      continue;
    }
    if (head === row.commit_sha) {
      unchanged.push(row.id);
      continue;
    }

    // Record what is about to be replaced before anything overwrites it.
    const recorded = await db
      .from("analyses")
      .update({ previous_commit_sha: row.commit_sha, refreshed_at: new Date().toISOString() })
      .eq("id", row.id);
    if (recorded.error) {
      failed.push({ id: row.id, reason: recorded.error.message });
      continue;
    }

    try {
      const claimed = await claimAnalysis(db, row.id);
      await continueRun(db, claimed);
      moved.push(row.id);
    } catch (e) {
      failed.push({ id: row.id, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({
    considered: rows?.length ?? 0,
    refreshed: moved,
    unchanged: unchanged.length,
    failed,
  });
}
