// The bar: things that lower the quality bar instead of meeting it.
//
// A suppression is a promise to come back. Nobody comes back, so the count only
// grows, and six months later `@ts-expect-error` is wallpaper and `as any` is how
// types are done here. The rule is not "never" — it is "not silently, and not more
// of them than the number already argued for".
//
// This is the cheapest check in the set and the one most likely to be argued with,
// which is why every finding prints the reason and the exact count rather than a
// bare line number.
//
// Run: node scripts/check/bar.mjs

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Each suppression has a ceiling: the number of times it may appear across the
 * source. The number is what exists today, so the rule is "no more" rather than
 * "none", and lowering a ceiling is a win somebody can measure.
 *
 * The one entry that is a ceiling of 1, not 0, is dangerouslySetInnerHTML: the
 * JSON-LD block on the landing page has to be raw script, and it is built from a
 * literal in the same file, not from a request.
 */
const BUDGETS = [
  { id: "ts-ignore", pattern: /@ts-ignore/g, max: 0, why: "Suppresses the error and the next line's too. Use @ts-expect-error so it fails when the error goes away, or fix the type." },
  { id: "ts-expect-error", pattern: /@ts-expect-error/g, max: 0, why: "Allowed only with a comment saying what would make it go away. At zero today, so the first one needs that argument." },
  { id: "eslint-disable", pattern: /eslint-disable/g, max: 0, why: "Disabling a rule for a line is usually a rule that should be configured. If it is genuinely wrong here, the config says so once instead." },
  { id: "as-any", pattern: /\bas any\b/g, max: 0, why: "`as any` deletes the check rather than answering it. `as unknown as T` at a real boundary with a comment is the honest version." },
  { id: "dangerous-html", pattern: /dangerouslySetInnerHTML/g, max: 1, why: "Only for the JSON-LD block on the landing page, which is built from a literal in the same file. Anything else is untrusted HTML." },
];

const ROOTS = ["app", "components", "lib"];
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (EXTS.has(path.slice(path.lastIndexOf(".")))) out.push(path);
  }
  return out;
}

const files = ROOTS.filter((r) => {
  try {
    return statSync(r).isDirectory();
  } catch {
    return false;
  }
}).flatMap((r) => walk(r));

const counts = new Map(BUDGETS.map((b) => [b.id, []]));

for (const file of files) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const budget of BUDGETS) {
      budget.pattern.lastIndex = 0;
      if (budget.pattern.test(line)) counts.get(budget.id).push(`${rel}:${i + 1}`);
    }
  });
}

let over = 0;
for (const budget of BUDGETS) {
  const hits = counts.get(budget.id);
  if (hits.length <= budget.max) {
    console.log(`ok    ${budget.id}: ${hits.length}/${budget.max}`);
    continue;
  }
  over += hits.length - budget.max;
  console.error(`OVER  ${budget.id}: ${hits.length}/${budget.max}`);
  for (const hit of hits.slice(0, 4)) console.error(`        ${hit}`);
  console.error(`      ${budget.why}`);
}

if (over > 0) {
  console.error(`\n${over} finding(s) above the ceiling. Lowering a ceiling is progress; raising one needs a reason in the commit.`);
  process.exit(1);
}

console.log("bar held");
