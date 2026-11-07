import { notFound } from "next/navigation";
import { AnalysesTable } from "@/components/progress/analyses-table";
import type { RowData } from "@/components/progress/analysis-row";

/**
 * A visual harness for the dashboard table and inspector, in development only.
 *
 * The real screen needs a signed-in session, and the preview deployment answers
 * automated sign-in with a bot checkpoint — so the only way to *look* at a layout
 * change was to describe it. Describing a layout is how a 3px misalignment ships.
 *
 * This page exists so that "does it look right" has an answer that is a picture
 * rather than an opinion. It is refused in production, so it is not a route
 * anybody can reach, and it renders the real components with fake rows rather
 * than a copy of them — a harness that reimplements the thing under test measures
 * the harness.
 */
export const metadata = { robots: { index: false, follow: false } };

const row = (over: Partial<RowData> & Pick<RowData, "id">): RowData => ({
  repository: { owner: "IsaacMorzy", name: "codegraph" },
  commitSha: "9fcd7e4a1b2c3d4e5f60718293a4b5c6d7e8f901",
  progress: { status: "complete", stage: null, message: null },
  staleAtRender: false,
  created: { iso: "2026-11-07T03:40:00.000Z", ago: "24m ago" },
  finished: { iso: "2026-11-07T03:41:12.000Z", ago: "23m ago" },
  ...over,
});

const ROWS: RowData[] = [
  row({ id: "a1", repository: { owner: "IsaacMorzy", name: "codegraph" } }),
  row({
    id: "a2",
    repository: { owner: "vercel", name: "next.js" },
    progress: {
      status: "running",
      stage: "parse",
      message: "Resolving imports in 4,182 files",
    },
    finished: null,
    commitSha: "a4b5c6d7e8f901234567890abcdef1234567890ab",
  }),
  row({
    id: "a3",
    repository: { owner: "dioiaztakmp", name: "warehouse" },
    progress: {
      status: "failed",
      stage: "fetch",
      message: "github 404: repository not found — the name may have changed, or it may be private.",
    },
    staleAtRender: true,
    finished: null,
  }),
];

export default function InspectorPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex h-9 shrink-0 items-center gap-4 border-b border-line px-3">
        <h1 className="text-[13px] font-semibold">Preview organization</h1>
        <span className="text-xs text-fg-muted tabular-nums">3 analyses</span>
      </div>
      <AnalysesTable rows={ROWS} />
    </div>
  );
}
