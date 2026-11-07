import type { Edge } from "../parser/types.ts";

// What changed between two analyses of the same repository. Three states, not
// two: an edge that moved its direction is neither added nor removed, and
// reporting it as both would hide the one thing worth reading.

export type EdgeDiff = {
  added: Edge[];
  removed: Edge[];
  reversed: { before: Edge; after: Edge }[];
};

/** Kind is part of the identity: an import turning into a type-only import is
 * a change even though both ends stayed put. */
function key(e: Edge): string {
  return `${e.source}\u0000${e.target}\u0000${e.kind}\u0000${e.typeOnly}`;
}

export function diffEdges(before: readonly Edge[], after: readonly Edge[]): EdgeDiff {
  const beforeKeys = new Map(before.map((e) => [key(e), e]));
  const afterKeys = new Map(after.map((e) => [key(e), e]));

  const removed = before.filter((e) => !afterKeys.has(key(e)));
  const added = after.filter((e) => !beforeKeys.has(key(e)));

  const reversed: { before: Edge; after: Edge }[] = [];
  for (const gone of [...removed]) {
    const mirror = added.find((e) => e.source === gone.target && e.target === gone.source && e.kind === gone.kind);
    if (!mirror) continue;
    reversed.push({ before: gone, after: mirror });
    removed.splice(removed.indexOf(gone), 1);
    added.splice(added.indexOf(mirror), 1);
  }

  const byPath = (a: Edge, b: Edge) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target);
  return { added: added.sort(byPath), removed: removed.sort(byPath), reversed };
}
