// Cycle enforcement: parse the repository, detect circular imports, exit
// non-zero if any cycle exists. A circular import is an edge loop — file A
// imports B, B imports C, C imports A — and the product graph draws every
// edge it resolves, so a cycle in the parse is a cycle in the map.
//
//   node --experimental-strip-types scripts/cycle-enforcement.ts [root]
//
// Read-only. Writes nothing, touches no network.

import { resolve } from "node:path";
import { parseRepository } from "../lib/parser/index.ts";
import { cycles } from "../lib/graph/cycles.ts";

const root = resolve(process.argv[2] ?? process.cwd());

const parsed = parseRepository(root);
const edges = parsed.edges ?? [];

if (edges.length === 0) {
  console.error(`cycle-enforcement: parsed 0 edges from ${root} — refusing to report success on nothing`);
  process.exit(2);
}

const found = cycles(edges);

if (found.length === 0) {
  console.log(`cycle-enforcement: no cycles across ${edges.length} resolved edges`);
  process.exit(0);
}

console.error(`cycle-enforcement: ${found.length} circular import${found.length === 1 ? "" : "s"}`);
for (const c of found) {
  console.error(`  ${c.path.join(" -> ")}`);
}
process.exit(1);
