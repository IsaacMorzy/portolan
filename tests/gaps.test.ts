/**
 * The gap work from #21, #22 and #23: cycles, boundary rules, export and diff.
 * Same rule as the other file — node --test, node:assert, no framework.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { cycles } from "../lib/graph/cycles.ts";
import { diffEdges } from "../lib/graph/diff.ts";
import { toDot, toMermaid } from "../lib/graph/export.ts";
import { checkRules, parseRules, under } from "../lib/graph/rules.ts";
import type { Edge } from "../lib/parser/types.ts";

const edge = (source: string, target: string, typeOnly = false): Edge => ({
  source,
  target,
  kind: "import",
  typeOnly,
  specifier: target,
  line: 1,
});

test("a two-file loop is reported as the path a person can follow", () => {
  const found = cycles([edge("a.ts", "b.ts"), edge("b.ts", "a.ts")]);
  assert.equal(found.length, 1);
  assert.deepEqual(found[0].path, ["a.ts", "b.ts", "a.ts"]);
});

test("a three-file loop reports all three, and a clean graph reports none", () => {
  assert.deepEqual(cycles([edge("a", "b"), edge("b", "c"), edge("c", "a")])[0].path, ["a", "b", "c", "a"]);
  assert.deepEqual(cycles([edge("a", "b"), edge("b", "c")]), []);
});

test("a file that imports itself is a cycle of one", () => {
  assert.deepEqual(cycles([edge("a", "a")])[0].path, ["a", "a"]);
});

test("two separate loops are two results, not one", () => {
  const found = cycles([edge("a", "b"), edge("b", "a"), edge("x", "y"), edge("y", "x")]);
  assert.equal(found.length, 2);
});

test("prefix matching stops at the folder boundary", () => {
  assert.equal(under("lib/db/client.ts", "lib/db"), true);
  assert.equal(under("lib/db", "lib/db"), true);
  assert.equal(under("lib/dbadmin/x.ts", "lib/db"), false, "lib/db must not swallow lib/dbadmin");
});

test("a denied edge is a violation, and the same edge allowed elsewhere is not", () => {
  const rules = parseRules({ deny: [{ from: "lib", to: "app", why: "no upward imports" }] });
  const found = checkRules([edge("lib/x.ts", "app/y.ts"), edge("app/y.ts", "lib/x.ts")], rules);
  assert.equal(found.length, 1);
  assert.equal(found[0].source, "lib/x.ts");
  assert.equal(found[0].why, "no upward imports");
});

test("an allow list blocks every source it does not name", () => {
  const rules = parseRules({ allow: [{ to: "lib/db", from: ["lib/db", "app/api"] }] });
  const found = checkRules(
    [edge("app/api/route.ts", "lib/db/client.ts"), edge("app/page.tsx", "lib/db/client.ts")],
    rules,
  );
  assert.deepEqual(found.map((v) => v.source), ["app/page.tsx"]);
});

test("malformed rules fail loudly instead of silently matching nothing", () => {
  assert.throws(() => parseRules({ deny: [{ from: "a" }] }), /deny\[0\]/);
  assert.throws(() => parseRules({ allow: [{ to: "a", from: "b" }] }), /allow\[0\]/);
});

test("exports contain every file once and every edge once", () => {
  const edges = [edge("a.ts", "b.ts"), edge("b.ts", "c.ts", true)];
  const dot = toDot(edges);
  assert.equal(dot.match(/"a\.ts"/g)!.length, 2, "a.ts is a node and the source of an edge");
  assert.match(dot, /"b\.ts" -> "c\.ts" \[style=dashed\]/);

  const mermaid = toMermaid(edges);
  assert.match(mermaid, /^graph LR/);
  assert.equal(mermaid.match(/n\d+\["/g)!.length, 3, "three distinct files");
  assert.equal(mermaid.match(/-->/g)!.length, 1, "one solid edge");
  assert.equal(mermaid.match(/-\.->/g)!.length, 1, "one dashed edge");
});

test("a diff of identical analyses is empty", () => {
  const edges = [edge("a", "b")];
  assert.deepEqual(diffEdges(edges, edges), { added: [], removed: [], reversed: [] });
});

test("one new import is one added edge and nothing else", () => {
  const d = diffEdges([edge("a", "b")], [edge("a", "b"), edge("a", "c")]);
  assert.deepEqual(d.added.map((e) => `${e.source}->${e.target}`), ["a->c"]);
  assert.deepEqual(d.removed, []);
  assert.deepEqual(d.reversed, []);
});

test("a flipped import is reversed, not added and removed", () => {
  const d = diffEdges([edge("a", "b")], [edge("b", "a")]);
  assert.deepEqual(d.added, []);
  assert.deepEqual(d.removed, []);
  assert.equal(d.reversed.length, 1);
});

test("an import turning type-only is a change even though both ends stayed", () => {
  const d = diffEdges([edge("a", "b")], [edge("a", "b", true)]);
  assert.equal(d.added.length, 1);
  assert.equal(d.removed.length, 1);
});
