/**
 * #45 — packages, not files. The two questions a monorepo reader asks: which
 * package owns this file, and which packages depend on which. Both are answered
 * from the repository's own manifests, so the tests use manifests rather than
 * mocks.
 */
import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { parseRepository } from "../lib/parser/index.ts";
import { packageEdges, readWorkspace } from "../lib/workspace/packages.ts";

const mono = join(import.meta.dirname, "fixtures/mono");
const monoNpm = join(import.meta.dirname, "fixtures/mono-npm");

test("a pnpm workspace yields its packages, by the name in each manifest", () => {
  const workspace = readWorkspace(mono);
  const names = workspace.packages.map((p) => `${p.name}@${p.dir}`).sort();
  assert.deepEqual(names, ["@acme/ui@packages/ui", "web@apps/web"]);
});

test("a package.json workspaces array is read when there is no pnpm file", () => {
  const workspace = readWorkspace(monoNpm);
  assert.deepEqual(
    workspace.packages.map((p) => `${p.name}@${p.dir}`),
    ["a@libs/a"],
  );
});

test("a file outside every workspace directory has no package", () => {
  const workspace = readWorkspace(mono);
  assert.equal(workspace.packageOf("README.md"), null);
  assert.equal(workspace.packageOf("apps/web/package.json"), "web");
});

test("the parsed graph attributes every file to its package", () => {
  const parsed = parseRepository(mono);
  const byPath = new Map(parsed.files.map((f) => [f.path, f.pkg]));
  assert.equal(byPath.get("apps/web/src/page.ts"), "web");
  assert.equal(byPath.get("packages/ui/src/button.ts"), "@acme/ui");
});

test("edges collapse to the packages they cross, and only the crossings", () => {
  const workspace = readWorkspace(mono);
  const parsed = parseRepository(mono);
  const crossings = packageEdges(parsed.edges, workspace.packageOf);
  assert.deepEqual(crossings, [{ from: "web", to: "@acme/ui", count: 1 }]);

  // route.ts imports page.ts inside web. It is a real edge and it is not a
  // crossing, so it must not appear above — one assertion for each direction.
  assert.ok(parsed.edges.length > crossings.length);
});

test("a repository with no workspace globs has no packages at all", () => {
  const workspace = readWorkspace(join(import.meta.dirname, ".."));
  assert.deepEqual(workspace.packages, []);
  assert.equal(workspace.packageOf("lib/parser/index.ts"), null);
});
