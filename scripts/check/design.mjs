// Design drift: the ways a hand-built system quietly stops being a system.
//
// slop.mjs catches things that look wrong on sight. This catches things that look
// fine and are structurally wrong — an off-scale type size, a bare `border`, a
// spacing value that is not on the grid. Those are invisible in review because
// each one is defensible on its own; the drift is in the aggregate.
//
// Thresholds are not invented here, they are read out of docs/design-system.md,
// and the two lists live in this file so a change to one is a visible diff.
//
// Run: node scripts/check/design.mjs [files...]

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOTS = ["app", "components"];
const EXTS = new Set([".tsx"]);

/**
 * docs/design-system.md §4. Twelve sizes, no thirteenth. Written in px because
 * that is what a reader sees; rem values are converted at the 16px base the
 * project uses (a page-level clamp exists, and the browser check in budget.mjs
 * is what catches anything that clamp does to these).
 */
const TYPE_SCALE = [11, 12, 13, 14, 15, 17, 20, 26, 32, 40, 56, 80];

/** docs/design-system.md §5. A 4pt grid, and these values only. */
const SPACE_SCALE = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64, 96, 128];

/**
 * Docs and generated assets that legitimately hold their own values.
 * `opengraph-image.tsx` is a Satori render with no CSS pipeline at all.
 */
const EXEMPT = new Set(["app/opengraph-image.tsx", "components/velora/globe.tsx"]);

const findings = [];
const add = (rel, line, rule, hit, why) => findings.push({ rel, line, rule, hit, why });

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (EXTS.has(extname(entry))) out.push(path);
  }
  return out;
}

/** `text-[0.9375rem]` to px at a 16px base, so the scale comparison is honest. */
function toPx(value) {
  if (value.endsWith("rem")) return Math.round(Number.parseFloat(value) * 16);
  if (value.endsWith("em")) return null; // relative to its own parent: not a scale value
  return Math.round(Number.parseFloat(value));
}

const files = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ROOTS.flatMap((root) => walk(root));

for (const file of files) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  if (EXEMPT.has(rel)) continue;
  const lines = readFileSync(file, "utf8").split("\n");

  lines.forEach((line, i) => {
    const n = i + 1;

    // Type: an arbitrary size must be on the scale.
    for (const match of line.matchAll(/text-\[([0-9.]+)(rem|px)\]/g)) {
      const px = toPx(match[1] + match[2]);
      if (px !== null && !TYPE_SCALE.includes(px)) {
        add(rel, n, "type-size", match[0], `${px}px is not on the scale (${TYPE_SCALE.join(" ")}). Adding a size is a decision, not a typo.`);
      }
    }

    // A bare `border` resolves to currentColor in Tailwind v4, which is near-white
    // in dark mode. This shipped once as a file tree with glowing outlines.
    for (const match of line.matchAll(/(?:^|["'\s])border(?![-a-zA-Z])/g)) {
      add(rel, n, "bare-border", "border", "A border with no colour is currentColor in v4 — invisible on light, glaring on dark. Name the token.");
    }

    // Spacing: arbitrary values must land on the grid.
    for (const match of line.matchAll(/\b(?:p|m|gap|space-[xy]|inset)[trblxy]?-\[([0-9.]+)(px|rem)\]/g)) {
      const px = toPx(match[1] + match[2]);
      if (px !== null && !SPACE_SCALE.includes(px)) {
        add(rel, n, "space", match[0], `${px}px is not on the 4pt grid (${SPACE_SCALE.join(" ")}).`);
      }
    }

    // A colour utility that is not a semantic token means the theme cannot reach it.
    for (const match of line.matchAll(/\b(?:bg|text|border|ring|outline|fill|stroke)-(?!\[)([a-z][a-z0-9-]*)\b/g)) {
      const name = match[1];
      const known = [
        "canvas", "surface", "raised", "line", "fg", "accent", "incoming", "outgoing", "edge",
        "kind-1", "kind-2", "kind-3", "kind-4", "transparent", "current", "inherit", "none",
        "left", "right", "center", "start", "end", "justify", "nowrap", "balance", "pretty",
        "clip", "ellipsis", "hidden", "solid", "dashed", "b", "t", "r", "l", "x", "y",
        "sm", "md", "lg", "xl", "xs", "base", "full",
      ];
      if (/^(fg-muted|accent-fg)$/.test(name)) continue;
      if (known.includes(name)) continue;
      // border style and width utilities are not colours: border-collapse,
      // border-separate, border-r-0. Flagging them was most of this rule's output
      // before it was narrowed.
      if (/^(collapse|separate|[trblxy]-\d+|inset|offset-\d+)$/.test(name)) continue;
      // Anything else is either a scale index (handled by slop.mjs) or drift.
      if (/^\d/.test(name)) continue;
      add(rel, n, "token", match[0], `"${name}" is not a semantic token. docs/design-system.md §3 is the list.`);
    }
  });
}

if (findings.length === 0) {
  console.log(`no design drift in ${files.length} files`);
  process.exit(0);
}

for (const f of findings) {
  console.error(`${f.rel}:${f.line}  [${f.rule}] ${f.hit}`);
  console.error(`    ${f.why}`);
}
console.error(`\n${findings.length} finding(s). Source of truth: docs/design-system.md`);
process.exit(1);
