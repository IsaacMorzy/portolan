"use client";

import { useState } from "react";
import { AnalysisInspector } from "./analysis-inspector";
import { AnalysisRow, type RowData } from "./analysis-row";

/**
 * The table and the inspector, sharing one piece of state: which row is selected.
 *
 * Selection lives here rather than in the page because the page is a server
 * component, and the answer is not worth a route: every row's data is already on
 * the client, so opening the inspector is a state change, not a fetch. That also
 * means there is nothing new to scope — no endpoint, no query, no org check, and
 * therefore no way to read another workspace's analysis through it.
 *
 * Clicking a row selects it. Escape or Close clears it. Nothing navigates.
 */
export function AnalysesTable({ rows }: { rows: RowData[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (event.key === "Escape") setSelectedId(null);
      }}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="hidden w-20 sm:table-column" />
            <col className="w-20" />
            <col className="hidden w-20 sm:table-column" />
          </colgroup>
          <thead className="sticky top-0 bg-canvas text-left text-fg-muted">
            <tr className="h-7 border-b border-line">
              <th scope="col" className="px-3 font-normal">
                Repository
              </th>
              <th scope="col" className="px-3 font-normal">
                State
              </th>
              <th scope="col" className="hidden px-3 font-normal sm:table-cell">
                Commit
              </th>
              <th scope="col" className="px-3 text-right font-normal">
                Started
              </th>
              {/* Duration is the column that makes two runs comparable without
                  opening either: age says when, took says how long. */}
              <th scope="col" className="hidden px-3 text-right font-normal md:table-cell">
                Took
              </th>
              <th scope="col" className="hidden px-3 text-right font-normal sm:table-cell">
                Finished
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AnalysisRow
                key={row.id}
                row={row}
                selected={row.id === selectedId}
                onSelect={() => setSelectedId(row.id === selectedId ? null : row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {selected && <AnalysisInspector row={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
