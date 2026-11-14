"use client";

import { useCallback, useMemo, useState } from "react";
import type { ParsedFile } from "@/lib/parser/types";
import type { Selection } from "@/lib/graph/highlight";
import { groupId } from "@/lib/graph/view";

/** One stop on a guided tour: a file and the sentence that explains it. */
export type TourStop = {
  path: string;
  label: string;
  explanation: string;
};

/** What the tour section renders: current stop, navigation, and explanation. */
export type TourState = {
  stops: TourStop[];
  index: number | null;
};

/** Set a new tour: replace all stops and start at the first. */
export type SetTour = (stops: TourStop[]) => void;
/** Move to the next stop, wrapping at the end. */
export type NextStop = () => void;
/** Move to the previous stop, wrapping at the start. */
export type PrevStop = () => void;
/** Jump to a specific stop index. */
export type GoToStop = (index: number) => void;
/** Clear the tour. */
export type EndTour = () => void;

/**
 * Tour controls: stops, navigation, and explanation. The caller wires
 * `onGoToStop` to highlight the stop on the map and show its explanation.
 */
export function Tour({
  stops,
  index,
  onGoToStop,
  onEnd,
}: {
  stops: TourStop[];
  index: number | null;
  onGoToStop: (index: number) => void;
  onEnd: () => void;
}) {
  if (index === null || stops.length === 0) return null;

  const stop = stops[index];
  const isFirst = index === 0;
  const isLast = index === stops.length - 1;

  return (
    <section
      className="fixed top-6 right-6 z-50 flex flex-col gap-3 rounded-lg border-line bg-surface p-6"
      aria-label="Guided tour"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">Guided tour</h3>
        <button
          type="button"
          onClick={onEnd}
          className="h-8 w-8 rounded border-line bg-surface flex items-center justify-center text-xs text-fg-muted hover:bg-accent/10"
          title="End tour"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        {/* Stop indicator */}
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <span>{index + 1}</span>
          <span>/</span>
          <span>{stops.length}</span>
          <span className="mx-2">•</span>
          <span className="truncate flex-1 font-mono">{stop.path}</span>
        </div>

        {/* Explanation */}
        <div className="rounded border-line bg-raised p-4 text-sm text-fg">
          <p className="leading-relaxed">{stop.explanation}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onGoToStop(index - 1)}
            disabled={isFirst}
            className="flex-1 px-3 py-2 rounded border-line bg-surface text-sm text-fg-muted disabled:opacity-50 hover:bg-accent/10"
            title="Previous stop"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => onGoToStop(index + 1)}
            disabled={isLast}
            className="flex-1 px-3 py-2 rounded border-accent bg-accent text-xs text-accent-fg hover:bg-accent/80"
            title="Next stop"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}