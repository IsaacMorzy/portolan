import Link from "next/link";
import { CodeBlock } from "@/components/velora/code-block";
import { StateMark } from "@/components/state-mark";
import { STALE_AFTER_MS } from "@/lib/pipeline/stages";
import type { RowData } from "./analysis-row";

/**
 * What the selected analysis *is*, without leaving the list.
 *
 * The table answers "what do I have"; this answers "what is this one". Navigating
 * to `/analyses/:id` for a commit hash and a stage message is what a list does
 * when it has no room to say anything — this screen has room.
 *
 * Every fact is a `dt`/`dd` pair rather than a row of labelled spans, so the
 * association survives being read aloud.
 */
export function AnalysisInspector({ row, onClose }: { row: RowData; onClose: () => void }) {
  const repository = row.repository ? `${row.repository.owner}/${row.repository.name}` : "Unknown repository";
  const finishedNow = !row.finished && (row.progress.status === "complete" || row.progress.status === "failed");
  const note =
    row.progress.status === "complete" ? null : row.progress.message;

  // Stale is a fact about the moment of the request, already decided on the
  // server. Recomputing it here would let the inspector disagree with the row.
  const state = row.staleAtRender ? "stale" : row.progress.status;

  const facts: { label: string; value: string; mono?: boolean }[] = [
    { label: "Status", value: state },
    { label: "Stage", value: row.progress.stage ?? "—" },
    { label: "Commit", value: row.commitSha ? row.commitSha.slice(0, 7) : "—", mono: true },
    { label: "Started", value: row.created.ago },
    { label: "Finished", value: row.finished ? row.finished.ago : finishedNow ? "just now" : "—" },
  ];

  return (
    <section
      aria-label="Selected analysis"
      className="flex max-h-[50%] shrink-0 flex-col overflow-auto border-t border-line bg-surface"
    >
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <StateMark status={row.progress.status} stale={row.staleAtRender} />
        <h2 className="truncate font-mono text-[13px] font-semibold">{repository}</h2>
        <Link href={`/analyses/${row.id}`} className="ml-auto shrink-0 text-[11px] text-accent">
          Open full map
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-[11px] text-fg-muted hover:text-fg"
        >
          Close
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-3 pb-3 sm:grid-cols-5">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-[11px] text-fg-muted">{fact.label}</dt>
            <dd className={`text-xs ${fact.mono ? "font-mono" : ""} tabular-nums`}>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {note && (
        <p className="px-3 pb-3 text-xs text-fg-muted">
          {row.staleAtRender
            ? `No progress for over ${STALE_AFTER_MS / 60000} minutes — ${note}`
            : note}
        </p>
      )}

      {/* A failed run's message is the one thing here that is machine output:
          newlines that mean something, a stack, a URL. It gets a code block so
          that it can be read and copied; a paragraph would re-wrap it into
          something that looks like prose and cannot be pasted anywhere. */}
      {row.progress.status === "failed" && note && (
        <div className="px-3 pb-3">
          {/* No `language`: the message is machine output, not bash, and the
              header would otherwise label it as a language it is not. */}
          <CodeBlock code={note} filename="failure" lineNumbers={false} />
        </div>
      )}

      {row.repository && row.progress.status === "complete" && (
        <div className="px-3 pb-3">
          <CodeBlock
            code={`npx cartograph tour . --mode surface`}
            language="bash"
            filename="the same graph, from a terminal"
            lineNumbers={false}
          />
        </div>
      )}
    </section>
  );
}
