// The rule runner: parse a repository, evaluate boundary rules, exit non-zero on a
// violation. This is lane #44 — dependency-cruiser's one real advantage over the
// product was that its rules can fail CI, and a rule that cannot fail a build is a
// comment.
//
//   node --experimental-strip-types scripts/deps-rules.ts [root]
//
// Rules live in `.deps-rules.json` at the repository root. Nothing here is
// product code: the product still has no rule enforcement, and the Compare section
// says so. What exists is this repo's own gate, using the same `checkRules` the
// tests exercise, over the same parser the product runs.
//
// Read-only. Writes nothing, touches no network.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseRepository } from "../lib/parser/index.ts";
import { checkRules, parseRules, type Rules } from "../lib/graph/rules.ts";

const root = resolve(process.argv[2] ?? process.cwd());
const configPath = join(root, ".deps-rules.json");

function loadRules(path: string): Rules {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    // A missing config is not a pass. Silent absence is how a gate stops gating.
    throw new Error(`cannot read ${path}: ${(error as Error).message}`);
  }
  return parseRules(raw);
}

const rules = loadRules(configPath);
const parsed = parseRepository(root);
const edges = parsed.edges ?? [];

if (edges.length === 0) {
  console.error(`deps-rules: parsed 0 edges from ${root} — refusing to report success on nothing`);
  process.exit(2);
}

const violations = checkRules(edges, rules);
const ruleCount = (rules.deny?.length ?? 0) + (rules.allow?.length ?? 0);

if (violations.length === 0) {
  console.log(`deps-rules: ${ruleCount} rules hold across ${edges.length} resolved edges`);
  process.exit(0);
}

console.error(`deps-rules: ${violations.length} violation${violations.length === 1 ? "" : "s"}`);
const seen = new Set<string>();
for (const v of violations) {
  const key = `${v.source} -> ${v.target}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.error(`  ${v.source} -> ${v.target}${v.why ? `   (${v.why})` : ""}`);
}
process.exit(1);
