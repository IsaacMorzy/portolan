/**
 * The two pieces of logic that can be silently wrong without anyone noticing:
 * blast radius (the product's actual claim) and the staleness rule (which
 * decides whether a run is offered again).
 *
 * node --test, node:assert, no framework. Run with `pnpm test`.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { adjacency, reach } from "../lib/graph/reach.ts";
import { isStale, STALE_AFTER_MS } from "../lib/pipeline/stages.ts";
import type { Edge } from "../lib/parser/types.ts";

const edge = (source: string, target: string, typeOnly = false): Edge => ({
  source,
  target,
  kind: "import",
  typeOnly,
  specifier: target,
  line: 1,
});

// a → b → c → d, plus e → a: a's blast radius is {b, e} then {c}.
const CHAIN = adjacency([
  edge("a", "b"),
  edge("b", "c"),
  edge("c", "d"),
  edge("e", "a"),
]);

test("dependents are what imports the file, at each step", () => {
  const { steps } = reach(CHAIN, "d", "dependents");
  assert.deepEqual(steps[0], ["c"]);
  assert.deepEqual(steps[1], ["b"]);
});

test("dependencies walk the other way down the same edges", () => {
  const { steps } = reach(CHAIN, "a", "dependencies");
  assert.deepEqual(steps[0], ["b"]);
  assert.deepEqual(steps[1], ["c"]);
});

test("a file past the depth is counted, not dropped", () => {
  const { steps, beyond } = reach(CHAIN, "d", "dependents", 1);
  assert.deepEqual(steps, [["c"]]);
  assert.equal(beyond, 3, "b, a and e are reachable at steps 2, 3 and 4 and must show up in the count");
});

test("a cycle terminates and reports each file once", () => {
  const loop = adjacency([edge("x", "y"), edge("y", "x"), edge("y", "z")]);
  const { steps } = reach(loop, "x", "dependents", 5);
  const seen = steps.flat();
  assert.deepEqual(seen, ["y"], "x imports itself back through y but is not its own dependent");
});

test("duplicate edges count once, and type-only edges still count", () => {
  const dupes = adjacency([edge("a", "b"), edge("a", "b", true)]);
  const { steps } = reach(dupes, "a", "dependencies");
  assert.deepEqual(steps[0], ["b"], "a type-only import still breaks what imports it");
});

test("an unimported file has an empty radius, not a crash", () => {
  const { steps, beyond } = reach(CHAIN, "nobody", "dependents");
  assert.deepEqual(steps, [[], []]);
  assert.equal(beyond, 0);
});

const T0 = Date.parse("2026-10-01T12:00:00.000Z");
const at = (ms: number) => T0 + ms;
const row = (status: "queued" | "running" | "complete" | "failed", created: number, started: number | null) => ({
  status,
  created_at: new Date(created).toISOString(),
  started_at: started === null ? null : new Date(started).toISOString(),
});

test("a queued row is measured from its creation", () => {
  assert.equal(isStale(row("queued", T0, null), at(STALE_AFTER_MS - 1)), false);
  assert.equal(isStale(row("queued", T0, null), at(STALE_AFTER_MS + 1)), true);
});

test("a running row is measured from when it started, not when it was queued", () => {
  // sat queued for an hour before a worker claimed it: still running, not stale
  assert.equal(isStale(row("running", T0, T0 + 3_600_000), at(3_600_000 + 1000)), false);
  assert.equal(isStale(row("running", T0, T0), at(STALE_AFTER_MS + 1)), true);
});

test("a finished run is never stale, however old", () => {
  assert.equal(isStale(row("complete", T0, T0), at(STALE_AFTER_MS * 100)), false);
  assert.equal(isStale(row("failed", T0, T0), at(STALE_AFTER_MS * 100)), false);
});
