import type { Edge } from "../parser/types.ts";

/**
 * G10 (#24): a tour, computed from the graph rather than written by hand.
 *
 * The ticket was blocked on a real question — are tours authored content or
 * generated? Authored wins on polish and loses on the only thing that matters
 * here: a hand-written walk through `app/api/projects/route.ts` is wrong the
 * first time that file is renamed, and nothing fails when it goes wrong. It
 * just quietly stops being true, which is the failure mode this entire product
 * exists to complain about.
 *
 * So a tour is derived. The reader picks a file and a question, and the tour is
 * the answer with its reasons attached:
 *
 * - **follow**: what this file pulls in, in order, so a newcomer can read down
 *   a request path instead of opening forty files.
 * - **surface**: what depends on this file, so a small change has a visible
 *   blast radius before it is made.
 *
 * Every step carries the specifier and line that justify it, because a tour
 * step a reader cannot check is a suggestion.
 */

export type TourMode = "follow" | "surface";

export type TourStep = {
  /** 1-based, so a step can be referred to as "step 3" out loud. */
  n: number;
  path: string;
  /** The edge that got us here, verbatim from the parse. */
  via: { from: string; specifier: string; line: number; kind: Edge["kind"]; typeOnly: boolean } | null;
  /** How far from the start, in edges. */
  depth: number;
  /** True when following this step would revisit a file already on the tour. */
  repeat: boolean;
};

export type Tour = {
  start: string;
  mode: TourMode;
  steps: TourStep[];
  /** Files reachable but not walked, because the depth or the branch budget ran out. */
  beyond: number;
};

export const MAX_TOUR_STEPS = 24;

/**
 * Breadth-first, so a tour reads as concentric rings rather than one deep
 * rabbit hole. A depth-first walk of a well-connected file disappears into the
 * first import and never comes back.
 *
 * No cycle risk beyond the `repeat` flag: a file is expanded once, and a step
 * that would revisit an earlier one is marked rather than dropped, because a
 * loop back to somewhere you have been is information.
 */
export function tour(edges: readonly Edge[], start: string, mode: TourMode, depth = 3): Tour {
  const out = mode === "follow" ? bySource(edges) : byTarget(edges);

  const steps: TourStep[] = [];
  const seen = new Set<string>([start]);
  let frontier = [start];
  let cut = 0;

  for (let d = 1; d <= depth && frontier.length > 0; d++) {
    const next: string[] = [];
    for (const from of frontier) {
      for (const edge of out.get(from) ?? []) {
        const path = mode === "follow" ? edge.target : edge.source;
        const repeat = seen.has(path);
        if (steps.length >= MAX_TOUR_STEPS) {
          cut++;
          continue;
        }
        steps.push({
          n: steps.length + 1,
          path,
          via: { from, specifier: edge.specifier, line: edge.line, kind: edge.kind, typeOnly: edge.typeOnly },
          depth: d,
          repeat,
        });
        if (!repeat) {
          seen.add(path);
          next.push(path);
        }
      }
    }
    frontier = next;
  }

  return { start, mode, steps, beyond: cut };
}

function bySource(edges: readonly Edge[]): Map<string, Edge[]> {
  const map = new Map<string, Edge[]>();
  for (const e of edges) (map.get(e.source) ?? map.set(e.source, []).get(e.source)!).push(e);
  return map;
}

function byTarget(edges: readonly Edge[]): Map<string, Edge[]> {
  const map = new Map<string, Edge[]>();
  for (const e of edges) (map.get(e.target) ?? map.set(e.target, []).get(e.target)!).push(e);
  return map;
}

/** The tour as a person reads it: numbered, indented by depth, with the line that proves it. */
export function formatTour(result: Tour): string {
  const head =
    result.mode === "follow"
      ? `${result.start} — what it pulls in, in reading order`
      : `${result.start} — what depends on it, nearest first`;
  const lines = [head, ""];
  for (const step of result.steps) {
    const indent = "  ".repeat(step.depth - 1);
    const why = step.via ? `  ${step.via.specifier}:${step.via.line}` : "";
    const note = step.repeat ? "  (already on this tour)" : step.via?.typeOnly ? "  (type-only)" : "";
    lines.push(`${indent}${step.n}. ${step.path}${why}${note}`);
  }
  if (result.beyond > 0) lines.push("", `${result.beyond} more not walked — the tour stops at ${MAX_TOUR_STEPS}.`);
  return lines.join("\n");
}
