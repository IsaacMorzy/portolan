import { generateKeyPairSync, verify } from "node:crypto";
/**
 * The gap work from #21, #22 and #23: cycles, boundary rules, export and diff.
 * Same rule as the other file — node --test, node:assert, no framework.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { totalCommits } from "../lib/graph/churn.ts";
import { rateLimit, resetLimits } from "../lib/ratelimit.ts";
import { formatTour, MAX_TOUR_STEPS, tour } from "../lib/graph/tour.ts";
import { pythonImports, resolvePython } from "../lib/parser/python.ts";
import { goImports, resolveGo } from "../lib/parser/go.ts";
import { appJwt, appManifest, installUrl } from "../lib/github/app.ts";
import { mayRead } from "../lib/github/credential.ts";
import { placementRole } from "../lib/parser/adapters/conventions.ts";

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

// --- G4 (#26) churn: the Link header is the whole trick ---------------------
//
// One request per file instead of a paginated walk, and the total comes from
// the page number of rel="last". Getting that arithmetic wrong reports 1
// commit for a file that has 400, which reads as "nobody touches this" — the
// exact opposite of the truth.

test("churn reads the total commit count from the Link header", () => {
  const link =
    '<https://api.github.com/repositories/1/commits?path=a.ts&per_page=1&page=2>; rel="next", ' +
    '<https://api.github.com/repositories/1/commits?path=a.ts&per_page=1&page=412>; rel="last"';
  assert.equal(totalCommits(link), 412);
});

test("churn reads the last page even when it comes first", () => {
  const link = '<https://x/commits?path=a&per_page=1&page=7>; rel="last", <https://x/commits?path=a&per_page=1&page=1>; rel="prev"';
  assert.equal(totalCommits(link), 7);
});

test("churn treats a missing Link header as one page, not as zero", () => {
  // A repository with fewer commits than the page size sends no Link at all.
  assert.equal(totalCommits(null), null);
  assert.equal(totalCommits(""), null);
});

test("churn does not read a page number out of an unrelated header", () => {
  assert.equal(totalCommits('<https://api.github.com/x?since=2024-01-01>; rel="next"'), null);
});

// --- Rate limiting ---------------------------------------------------------
//
// The limit exists because two routes could be driven in a loop: /api/graph
// spends model tokens and /api/churn spends the GitHub token. A limiter that
// never fires is a comment, so it is tested at the boundaries — the call that
// is allowed, the one that is refused, and the one that is allowed again once
// the window has moved.

test("a limit allows exactly its allowance, then refuses", () => {
  resetLimits();
  const rule = { limit: 3, windowMs: 60_000 };
  assert.deepEqual(rateLimit("a", rule), { ok: true });
  assert.deepEqual(rateLimit("a", rule), { ok: true });
  assert.deepEqual(rateLimit("a", rule), { ok: true });
  const refused = rateLimit("a", rule);
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.ok(refused.retryAfter >= 1, "a caller must be told when to come back");
});

test("one key's spending does not stop another", () => {
  resetLimits();
  const rule = { limit: 1, windowMs: 60_000 };
  assert.equal(rateLimit("org_a", rule).ok, true);
  assert.equal(rateLimit("org_a", rule).ok, false);
  assert.equal(rateLimit("org_b", rule).ok, true, "a noisy organization must not lock out a quiet one");
});

test("the window slides rather than resets on a clock boundary", () => {
  resetLimits();
  const rule = { limit: 2, windowMs: 50 };
  assert.equal(rateLimit("b", rule).ok, true);
  assert.equal(rateLimit("b", rule).ok, true);
  assert.equal(rateLimit("b", rule).ok, false);
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      assert.equal(rateLimit("b", rule).ok, true, "after the window, the allowance is back");
      resolve();
    }, 60);
  });
});

// --- G10 (#24) tours: derived, not authored --------------------------------
//
// The whole reason a tour is computed instead of written is that a hand-written
// walk goes stale silently. These tests pin the two properties that make the
// generated one trustworthy: it starts where you asked, and every step carries
// the line that justifies it.

const TOUR_EDGES = [
  { source: "app/route.ts", target: "lib/handler.ts", kind: "import" as const, typeOnly: false, specifier: "@/lib/handler", line: 3 },
  { source: "lib/handler.ts", target: "lib/db.ts", kind: "import" as const, typeOnly: false, specifier: "./db", line: 1 },
  { source: "lib/db.ts", target: "app/route.ts", kind: "import" as const, typeOnly: true, specifier: "../app/route", line: 9 },
];

test("a follow tour starts at the file asked about and walks downward", () => {
  const t = tour(TOUR_EDGES, "app/route.ts", "follow");
  assert.equal(t.start, "app/route.ts");
  assert.deepEqual(t.steps.map((s) => s.path), ["lib/handler.ts", "lib/db.ts", "app/route.ts"]);
  assert.deepEqual(t.steps.map((s) => s.depth), [1, 2, 3]);
});

test("a surface tour walks upward, so a blast radius is nearest-first", () => {
  const t = tour(TOUR_EDGES, "lib/db.ts", "surface");
  assert.equal(t.steps[0].path, "lib/handler.ts", "the thing that imports it comes first");
});

test("every step names the line that put it on the tour", () => {
  const t = tour(TOUR_EDGES, "app/route.ts", "follow");
  for (const step of t.steps) {
    assert.ok(step.via, `${step.path} has no justification`);
    assert.ok(step.via.line > 0, `${step.path} cites no line`);
    assert.ok(step.via.specifier.length > 0, `${step.path} cites no specifier`);
  }
});

test("a loop back is marked rather than dropped", () => {
  const t = tour(TOUR_EDGES, "app/route.ts", "follow");
  const back = t.steps.find((s) => s.path === "app/route.ts");
  assert.ok(back, "returning to the start is information, not noise");
  assert.equal(back.repeat, true);
});

test("a type-only edge is reported as one, because changing a type still breaks callers", () => {
  const t = tour(TOUR_EDGES, "lib/db.ts", "follow");
  const edge = t.steps.find((s) => s.path === "app/route.ts");
  assert.equal(edge?.via?.typeOnly, true);
});

test("a deep tour is bounded, and says how much it left behind", () => {
  const wide = Array.from({ length: 40 }, (_, i) => ({
    source: "root.ts",
    target: `f${i}.ts`,
    kind: "import" as const,
    typeOnly: false,
    specifier: `./f${i}`,
    line: i + 1,
  }));
  const t = tour(wide, "root.ts", "follow");
  assert.equal(t.steps.length, MAX_TOUR_STEPS);
  assert.ok(t.beyond > 0, "an unbounded tour that silently truncates is a lie");
});

test("the rendered tour is readable and numbered", () => {
  const text = formatTour(tour(TOUR_EDGES, "app/route.ts", "follow"));
  assert.match(text, /^app\/route\.ts — what it pulls in/);
  assert.match(text, /\n1\. lib\/handler\.ts\s+@\/lib\/handler:3/);
});

// --- G5 (#29) Python imports ------------------------------------------------

test("python: plain and aliased imports keep the module, not the alias", () => {
  const found = pythonImports("import os\nimport a.b as c, d\n");
  assert.deepEqual(found.map((f) => f.specifier), ["os", "a.b", "d"]);
});

test("python: from-import keeps the module and drops the names", () => {
  const found = pythonImports("from .base import Thing\nfrom pkg.sub import (a, b)\n");
  assert.deepEqual(found.map((f) => f.specifier), [".base", "pkg.sub"]);
});

test("python: a docstring does not become imports", () => {
  const source = '"""\nimport notreal\nfrom also.not.real import x\n"""\nimport real\n';
  assert.deepEqual(pythonImports(source).map((f) => f.specifier), ["real"]);
});

test("python: comments and __future__ are skipped", () => {
  const source = "# import commented\nfrom __future__ import annotations\nimport kept\n";
  assert.deepEqual(pythonImports(source).map((f) => f.specifier), ["kept"]);
});

test("python: line numbers point at the import, not the file start", () => {
  const found = pythonImports("\n\nimport late\n");
  assert.equal(found[0].line, 3);
});

test("python: absolute specifiers resolve to a module or a package init", () => {
  const nodes = new Set(["pkg/mod.py", "pkg/__init__.py"]);
  assert.equal(resolvePython("app/main.py", "pkg.mod", nodes), "pkg/mod.py");
  assert.equal(resolvePython("app/main.py", "pkg", nodes), "pkg/__init__.py");
  assert.equal(resolvePython("app/main.py", "missing.mod", nodes), null);
});

test("python: one dot is this package, two is the parent", () => {
  const nodes = new Set(["app/base.py", "base.py", "app/sub/x.py"]);
  assert.equal(resolvePython("app/mod.py", ".base", nodes), "app/base.py");
  assert.equal(resolvePython("app/sub/mod.py", "..base", nodes), "app/base.py");
  assert.equal(resolvePython("app/sub/mod.py", "...base", nodes), null, "climbing past the root is not a path");
});

test("python: `from . import x` resolves to the package, never to an invented module", () => {
  const nodes = new Set(["pkg/__init__.py", "pkg/deep.py"]);
  assert.equal(resolvePython("pkg/util.py", ".", nodes), "pkg/__init__.py");
});

// --- G6 (#46) Go imports -----------------------------------------------------

test("go: single and aliased imports keep the module, not the alias", () => {
  const found = goImports('import "fmt"\nimport x "a/b"\nimport _ "c/d"\n');
  assert.deepEqual(found.map((f) => f.specifier), ["fmt", "a/b", "c/d"]);
});

test("go: a parenthesized block contributes every quoted specifier", () => {
  const source = `import (
	"fmt"
	"a/b"
	y "c/d"
)`;
  assert.deepEqual(goImports(source).map((f) => f.specifier), ["fmt", "a/b", "c/d"]);
});

test("go: commented-out imports never become edges", () => {
  const source = `// import "commented"
import "kept"
/* import "blocked" */
import "also-kept"
`;
  assert.deepEqual(goImports(source).map((f) => f.specifier), ["kept", "also-kept"]);
});

test("go: line numbers point at the import, not the file start", () => {
  const found = goImports("\n\nimport \"late\"\n");
  assert.equal(found[0].line, 3);
});

test("go: absolute specifiers resolve to a module file", () => {
  const nodes = new Set(["pkg/mod.go", "pkg/thing.go"]);
  assert.equal(resolveGo("app/main.go", "pkg/mod", nodes), "pkg/mod.go");
  assert.equal(resolveGo("app/main.go", "pkg/thing", nodes), "pkg/thing.go");
  assert.equal(resolveGo("app/main.go", "missing/mod", nodes), null);
});

test("go: one dot is this package, two is the parent", () => {
  const nodes = new Set(["app/base.go", "base.go", "app/sub/x.go"]);
  assert.equal(resolveGo("app/mod.go", ".base", nodes), "app/base.go");
  assert.equal(resolveGo("app/sub/mod.go", "..base", nodes), "app/base.go");
  assert.equal(resolveGo("app/sub/mod.go", "...base", nodes), null, "climbing past the root is not a path");
});

// --- G1 (#27) GitHub App ------------------------------------------------

test("manifest asks for read-only contents and nothing else", () => {
  const manifest = appManifest({ redirectUrl: "https://x/api", setupUrl: "https://x/d" }, "portolan");
  assert.deepEqual(manifest.default_permissions, { contents: "read", metadata: "read" });
  assert.equal(manifest.public, false);
  // A webhook endpoint that does not exist yet would be retried forever.
  assert.equal(manifest.hook_attributes.active, false);
});

test("the App JWT verifies against its own public key", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
  const jwt = appJwt(12345, pem, 1_700_000_000);
  const [header, payload, signature] = jwt.split(".");

  assert.equal(JSON.parse(Buffer.from(header, "base64url").toString()).alg, "RS256");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  assert.equal(claims.iss, 12345);
  assert.equal(claims.iat, 1_700_000_000 - 60, "a token from the future is rejected by GitHub's clock");
  assert.equal(claims.exp, 1_700_000_000 + 540, "ten minutes is the maximum GitHub allows");

  const verified = verify(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    { key: publicKey.export({ type: "spki", format: "pem" }) as string },
    Buffer.from(signature, "base64url"),
  );
  assert.equal(verified, true);
});

test("the install URL carries the workspace, encoded", () => {
  assert.equal(installUrl("portolan", "org_1/2"), "https://github.com/apps/portolan/installations/new?state=org_1%2F2");
});

test("mayRead compares full names, not prefixes or owners", () => {
  const credential = { token: "t", expiresAt: "", repositories: ["IsaacMorzy/codegraph", "vercel/next.js"] };
  assert.equal(mayRead(credential, "IsaacMorzy", "codegraph"), true);
  assert.equal(mayRead(credential, "isaacmorzy", "CodeGraph"), true, "GitHub names are case-insensitive");
  assert.equal(mayRead(credential, "IsaacMorzy", "codegraph-private"), false, "a prefix is not a member");
  assert.equal(mayRead(credential, "vercel", "codegraph"), false, "the owner alone is not a member");
});

test("placement classifies by position, and only as a fallback", () => {
  assert.equal(placementRole("lib/parser/index.ts"), "module");
  assert.equal(placementRole("src/lib/db.ts"), "module", "a src/ prefix is the same root");
  assert.equal(placementRole("packages/web/src/a.ts"), "module", "workspace packages too");
  assert.equal(placementRole("scripts/e2e/audit.mjs"), "script");
  assert.equal(placementRole("app/page.tsx"), null, "app/ is not a module root");
  assert.equal(placementRole("libx/a.ts"), null, "libx is not lib");
  assert.equal(placementRole("components/lib/thing.tsx"), null, "nested lib/ is not a root");
});
