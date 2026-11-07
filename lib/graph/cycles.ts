import type { Edge } from "../parser/types.ts";

// Circular imports. Tarjan's algorithm over the resolved edge list: every
// strongly connected component larger than one file is a cluster of imports
// that can only be untangled together, and one concrete path through it is the
// thing a person can actually act on.
//
// Iterative, not recursive: a large repository can nest deeply enough to blow
// the call stack, and a crash on the biggest repository is the worst failure
// this function has.

export type Cycle = {
  /** e.g. ["lib/a.ts", "lib/b.ts", "lib/a.ts"] — first and last are the same file. */
  path: string[];
};

export function cycles(edges: readonly Edge[]): Cycle[] {
  const adj = new Map<string, string[]>();
  const self = new Set<string>();
  const touch = (file: string) => {
    if (!adj.has(file)) adj.set(file, []);
  };

  for (const e of edges) {
    touch(e.source);
    touch(e.target);
    if (e.source === e.target) self.add(e.source);
    else adj.get(e.source)!.push(e.target);
  }
  for (const list of adj.values()) list.sort();

  const nodes = [...adj.keys()].sort();
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let counter = 0;
  const components: string[][] = [];

  for (const start of nodes) {
    if (index.has(start)) continue;
    const work: { node: string; next: number }[] = [{ node: start, next: 0 }];
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const v = frame.node;
      if (frame.next === 0) {
        index.set(v, counter);
        low.set(v, counter);
        counter += 1;
        stack.push(v);
        onStack.add(v);
      }

      const neighbours = adj.get(v)!;
      let descended = false;
      while (frame.next < neighbours.length) {
        const w = neighbours[frame.next];
        frame.next += 1;
        if (!index.has(w)) {
          work.push({ node: w, next: 0 });
          descended = true;
          break;
        }
        if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
      if (descended) continue;

      if (low.get(v) === index.get(v)) {
        const component: string[] = [];
        let popped: string;
        do {
          popped = stack.pop()!;
          onStack.delete(popped);
          component.push(popped);
        } while (popped !== v);
        if (component.length > 1) components.push(component.reverse());
      }

      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1].node;
        low.set(parent, Math.min(low.get(parent)!, low.get(v)!));
      }
    }
  }

  const result: Cycle[] = [];
  for (const file of [...self].sort()) result.push({ path: [file, file] });
  for (const component of components) result.push({ path: pathThrough(adj, component) });
  return result.sort((a, b) => a.path[0].localeCompare(b.path[0]));
}

/** Shortest loop from the component's first file back to itself, inside the
 * component only. BFS, so the path shown is the shortest one that exists. */
function pathThrough(adj: ReadonlyMap<string, readonly string[]>, component: readonly string[]): string[] {
  const start = component[0];
  const inside = new Set(component);
  const previous = new Map<string, string>();
  const queue = [start];
  const seen = new Set([start]);

  while (queue.length > 0) {
    const v = queue.shift()!;
    for (const w of adj.get(v) ?? []) {
      if (!inside.has(w)) continue;
      if (w === start) {
        const path = [start];
        for (let at = v; at !== start; at = previous.get(at)!) path.splice(1, 0, at);
        return [...path, start];
      }
      if (seen.has(w)) continue;
      seen.add(w);
      previous.set(w, v);
      queue.push(w);
    }
  }

  // Tarjan says a loop exists; if it cannot be reconstructed, report the
  // component rather than inventing an edge order.
  return [...component, component[0]];
}
