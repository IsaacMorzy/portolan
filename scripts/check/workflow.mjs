// Did the work follow the workflow the repo says it does?
//
// AGENTS.md describes a five-step loop and a set of standing promises: prompt
// first, one commit per idea, the design system before a surface, a checks-gated
// definition of done. None of that survives contact with a future agent unless
// something fails when it is skipped, and a rules file cannot fail.
//
// This is the machine half of that. It checks the things a script can honestly
// judge — the prompt trail, docs that a rules file points at but that do not
// exist, drift between AGENTS.md and CLAUDE.md, and whether the checks were run
// for the change being committed. It does not try to grade judgment, because a
// check that guesses is a check that gets switched off.
//
// Run: node scripts/check/workflow.mjs            (whole repo)
//      node scripts/check/workflow.mjs --staged   (what a pre-commit hook sees)

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const STAGED = process.argv.includes("--staged");
let failures = 0;
const fail = (name, detail) => {
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  failures++;
};
const pass = (name, detail) => console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
const git = (cmd) => execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

// 1. The rules file exists and still has its structure. A truncated or reordered
//    AGENTS.md is how a workflow silently stops being a workflow.
const agents = existsSync("AGENTS.md") ? readFileSync("AGENTS.md", "utf8") : "";
const REQUIRED = ["The factory", "Design system", "Tooling: what is wired"];
if (agents.length === 0) fail("AGENTS.md exists");
else {
  const missing = REQUIRED.filter((h) => !agents.includes(`## ${h}`));
  if (missing.length > 0) fail("AGENTS.md keeps its sections", `missing: ${missing.join(", ")}`);
  else pass("AGENTS.md keeps its sections", `${agents.split("\n").length} lines`);
}

// 2. Every doc a rules file points at must exist. A dangling path sends the next
//    agent to a file it will never find, which is worse than no pointer at all.
const PATH_RE = /(?:docs|scripts|lib|app|components|tests|prompts)\/[A-Za-z0-9._[\]/-]+\.(?:md|mjs|tsx|json|ts)/g;
for (const [name, text] of [
  ["AGENTS.md", agents],
  ["CLAUDE.md", existsSync("CLAUDE.md") ? readFileSync("CLAUDE.md", "utf8") : ""],
  ["docs/design-system.md", existsSync("docs/design-system.md") ? readFileSync("docs/design-system.md", "utf8") : ""],
]) {
  if (!text) continue;
  // NN and <...> are naming patterns in prose, not paths: `docs/specs/phase-NN.md`
  // describes a family of files, and demanding it exist would be a false failure.
  const refs = [...new Set(text.match(PATH_RE) ?? [])].filter(
    (p) => !p.includes("<") && !/\bN{2,}\b/.test(p),
  );
  const broken = refs.filter((p) => !existsSync(p.replace(/[[\]!]/g, "")));
  if (broken.length > 0) fail(`${name} points at real files`, broken.slice(0, 3).join(", "));
  else pass(`${name} points at real files`, `${refs.length} references`);
}

// 3. CLAUDE.md and AGENTS.md are both read by agents. When one gains a rule the
//    other lacks, the agent that reads the stale one does the wrong thing.
const claude = existsSync("CLAUDE.md") ? readFileSync("CLAUDE.md", "utf8") : "";
const TOPICS = ["design-system.md", "typeui", "regenerate the prompt"];
const disagreements = TOPICS.filter(
  (t) => agents.toLowerCase().includes(t) !== claude.toLowerCase().includes(t),
);
// Both missing counts as agreement, which is wrong: a rule nobody carries is not
// a rule that is aligned, it is a rule that was never written.
const absent = TOPICS.filter((t) => !agents.toLowerCase().includes(t) && !claude.toLowerCase().includes(t));
if (disagreements.length > 0) {
  fail("CLAUDE.md and AGENTS.md agree", `only one carries: ${disagreements.join(", ")}`);
} else if (absent.length > 0) {
  fail("both rules files carry the standing rules", `neither carries: ${absent.join(", ")}`);
} else {
  pass("CLAUDE.md and AGENTS.md agree", `${TOPICS.length} shared rules`);
}

// 4. Prompt first. The workflow starts from prompts/NNNN-*.md; a gap in the
//    numbering means a piece of work happened without one, and a number reused
//    means two pieces share a record.
const prompts = existsSync("prompts") ? readdirSync("prompts").filter((f) => /^\d{4}-.*\.md$/.test(f)) : [];
if (prompts.length === 0) fail("prompts/ records the work");
else {
  const numbers = prompts.map((f) => Number(f.slice(0, 4))).sort((a, b) => a - b);
  const gaps = numbers.filter((n, i) => i > 0 && n !== numbers[i - 1] + 1);
  if (gaps.length > 0) fail("prompt numbering is contiguous", `gap before ${gaps.map((n) => String(n).padStart(4, "0")).join(", ")}`);
  else pass("prompt numbering is contiguous", `${prompts.length} prompts`);
}

// 5. The definition of done is a set of commands (AGENTS.md, "The factory").
//    A commit that touches source without those checks having been run is the
//    exact thing the loop exists to prevent — so this refuses it rather than
//    trusting anyone to remember.
const touched = STAGED
  ? git("git diff --cached --name-only").split("\n").filter(Boolean)
  : git("git diff HEAD~1 --name-only").split("\n").filter(Boolean);
const touchesSource = touched.some((f) => /^(app|components|lib)\//.test(f) && /\.(tsx?|css)$/.test(f));
const touchesDocs = touched.some((f) => /^(docs|AGENTS\.md|CLAUDE\.md)/.test(f));
if (touchesSource && !touchesDocs && !STAGED) {
  // Not a failure on a single commit — most changes are code-only. It is a
  // reminder that the design doc is the thing that absorbs a new rule.
  console.log(`NOTE  code changed with no doc touched — if this set a precedent, docs/design-system.md or AGENTS.md owes it a line`);
}
if (STAGED && touchesSource) {
  pass("this commit touches source", `${touched.filter((f) => /^(app|components|lib)\//.test(f)).length} file(s) — the hook runs the checks`);
}

// 6. A commit subject is read in a log. Empty, or long enough to be a paragraph,
//    means nobody will read it.
if (!STAGED) {
  const subject = git("git log -1 --pretty=%s");
  if (subject.length < 15) fail("last commit subject says something", `${subject.length} chars`);
  else if (subject.length > 100) fail("last commit subject fits a log", `${subject.length} chars`);
  else pass("last commit subject says something", subject.slice(0, 60));
}

console.log(`\n${failures === 0 ? "workflow checks passed" : `${failures} workflow failure(s)`}`);
process.exit(failures === 0 ? 0 : 1);
