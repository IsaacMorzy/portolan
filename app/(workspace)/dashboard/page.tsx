import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { AnalysesTable } from "@/components/progress/analyses-table";
import type { RowData } from "@/components/progress/analysis-row";
import { StateMark } from "@/components/state-mark";
import { SubmitForm } from "@/components/submit-form";
import { FileTree, type FileNode } from "@/components/velora/file-tree";
import { isStale, type Status } from "@/lib/pipeline/stages";
import { createServerSupabase } from "@/lib/supabase/server";
import { ago, span } from "@/lib/time";

const LIST_LIMIT = 100;

// Fixture, not a real repository: an empty state should not fake data, and a
// sample that looks like somebody's code invites the question of whose.
const SAMPLE_TREE: FileNode[] = [
  {
    name: "app",
    children: [{ name: "dashboard" }, { name: "analyses" }, { name: "api" }],
  },
  {
    name: "lib",
    children: [{ name: "parser" }, { name: "graph" }, { name: "pipeline" }],
  },
  { name: "components" },
];
type Tally = Status | "stale";
const TALLY_ORDER: Tally[] = ["running", "queued", "stale", "complete", "failed"];

export default async function DashboardPage() {
  const { sessionClaims, orgId } = await auth();

  // Read off the token, never fetched from Clerk. If the claim is missing the
  // session token hasn't been customised yet, and that should be obvious.
  const orgName = sessionClaims?.org_name;
  if (!orgName) {
    throw new Error(
      'Session token has no org_name claim. Add "org_name": "{{org.name}}" in Clerk → Sessions → Customize session token.',
    );
  }

  if (!orgId) throw new Error("No active organization on the session token");
  const rows = await loadRows(orgId);

  const counts = new Map<Tally, number>();
  for (const r of rows) {
    const tally: Tally = r.staleAtRender ? "stale" : r.progress.status;
    counts.set(tally, (counts.get(tally) ?? 0) + 1);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center gap-4 border-b border-line px-3">
        <h1 className="text-[13px] font-semibold">{orgName}</h1>
        <span className="text-xs text-fg-muted tabular-nums">
          {rows.length === LIST_LIMIT
            ? `Latest ${LIST_LIMIT} analyses`
            : `${rows.length} ${rows.length === 1 ? "analysis" : "analyses"}`}
        </span>
        <SubmitForm />
        {rows.length > 0 && (
          <ul className="ml-auto flex items-center gap-3 text-xs text-fg-muted tabular-nums">
            {TALLY_ORDER.filter((s) => counts.has(s)).map((s) => (
              <li key={s} className="flex h-7 items-center gap-1.5">
                <StateMark status={s === "stale" ? "running" : s} stale={s === "stale"} />
                {counts.get(s)} {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {rows.length === 0 ? (
        /* A sentence says there is nothing here; a tree says what will be here.
           Kept to five nodes because the point is the shape — folders, files and
           the edges between them — not a tutorial. */
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 px-3 py-8">
          <div className="text-xs text-fg-muted">
            <p className="text-fg">No analyses yet.</p>
            <p className="mt-1 leading-5">
              Paste a public GitHub repository above. A run resolves every import into a
              directory graph, lists the routes it finds, and explains what a folder is
              for — so the answer looks like this, not like a summary.
            </p>
          </div>
          <div className="min-w-0">
            <FileTree tree={SAMPLE_TREE} />
          </div>
        </div>
      ) : (
        <AnalysesTable rows={rows} />
      )}
    </div>
  );
}

// Loaded before rendering, and the clock read here: stale and "3m ago" are
// facts about the moment of the request, worked out once. Nothing ticks in
// the browser.
async function loadRows(orgId: string): Promise<RowData[]> {
  // The secret key bypasses row policies, so the workspace boundary is this
  // filter. Switching organization changes orgId, not the query.
  const supabase = await createServerSupabase();
  const { data: analyses, error } = await supabase
    .from("analyses")
    .select("id, status, stage, stage_message, commit_sha, error, created_at, started_at, finished_at, projects(repo_owner, repo_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw new Error(`Couldn't load analyses: ${error.message}`);

  await connection();
  const now = Date.now();
  return analyses.map((a) => ({
    id: a.id,
    repository: a.projects ? { owner: a.projects.repo_owner, name: a.projects.repo_name } : null,
    commitSha: a.commit_sha,
    progress: { status: a.status, stage: a.stage, message: a.status === "failed" ? a.error : a.stage_message },
    staleAtRender: isStale(a, now),
    created: { iso: a.created_at, ago: ago(a.created_at, now) },
    finished: a.finished_at ? { iso: a.finished_at, ago: ago(a.finished_at, now) } : null,
    // Only a finished run has a duration. A failed one has no finished_at, and
    // measuring it to "when we looked" would be a number that changes every
    // refresh — worse than an em dash.
    took: a.started_at && a.finished_at ? span(a.started_at, a.finished_at) : null,
  }));
}
