// AI slop: the visual and copy tics that make a product read as machine-made.
//
// Every rule here exists because it shipped in this repo or in a registry block
// that was nearly accepted. The list is deliberately short: a linter that flags
// thirty things gets muted, and a muted linter is a file that pretends to
// enforce something.
//
// Two exemptions, both real and both narrow:
//   app/opengraph-image.tsx  renders through Satori, which has no CSS variables.
//                            Hex there is the only way to express the palette.
//   components/velora/globe.tsx
//                            the one sanctioned animation; its radial gradient is
//                            the planet, not decoration behind text.
//
// Run: node scripts/check/slop.mjs [files...]   (defaults to the whole source tree)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOTS = ["app", "components", "lib"];
const EXTS = new Set([".tsx", ".ts", ".jsx", ".js", ".css"]);

const EXEMPT = [
  // The token layer is where hex belongs: every other rule in this file depends on
  // these definitions existing. The #000s are mask stops, not paint.
  { file: "app/globals.css", rules: ["hex", "gradient"] },
  { file: "app/opengraph-image.tsx", rules: ["hex"] },
  { file: "components/velora/globe.tsx", rules: ["gradient"] },
];

const RULES = [
  {
    id: "gradient",
    why: "A gradient is the most reliable 'AI made this' signal, and on a dark canvas it is also a banded mess.",
    pattern: /\b(bg-gradient-to-|bg-linear|bg-radial|bg-conic)\b/g,
  },
  {
    id: "palette",
    why: "Tailwind's default palette is not our palette. A gray-200 cannot follow the theme, so it breaks in one mode.",
    pattern: /\b(?:bg|text|border|ring|from|via|to|divide)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g,
  },
  {
    id: "glass",
    why: "Blur costs frames to make text harder to read, and it hides what is behind it for no reason.",
    pattern: /\b(backdrop-blur|backdrop-filter|bg-white\/\d|bg-black\/\d)/g,
  },
  {
    id: "shadow",
    why: "Depth here is surface-on-canvas plus a line. A shadow is invisible on dark and Bootstrap on light.",
    pattern: /\bshadow-(sm|md|lg|xl|2xl)\b/g,
  },
  {
    id: "hex",
    why: "A raw hex in a component cannot be reached by the theme: it is correct in one mode and wrong in the other.",
    pattern: /(?<![\w-])#[0-9a-fA-F]{3,8}\b/g,
  },
  {
    id: "emoji",
    why: "Emoji render differently per OS and know nothing about our intent.",
    pattern: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
  },
  {
    id: "eyebrow",
    why: "A small all-caps label above a heading is a tell, not a hierarchy.",
    pattern: /\btext-(?:xs|\[1[01]px\])\s+uppercase\b/g,
  },
  {
    id: "marker",
    why: "01 / 02 / 03 markers claim sequence is information. It is decoration wearing a number.",
    pattern: /(?:>|"|')(?:0[1-9])(?:\s*[—–-]\s*[A-Z])/g,
  },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (EXTS.has(extname(entry))) out.push(path);
  }
  return out;
}

const files = process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : ROOTS.flatMap((root) => walk(root));

const findings = [];

for (const file of files) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  const exempt = EXEMPT.find((e) => rel === e.file)?.rules ?? [];
  const lines = readFileSync(file, "utf8").split("\n");

  for (const rule of RULES) {
    if (exempt.includes(rule.id)) continue;
    rule.pattern.lastIndex = 0;
    lines.forEach((line, i) => {
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(line);
      if (match) findings.push({ rel, line: i + 1, rule: rule.id, hit: match[0], why: rule.why });
    });
  }
}

if (findings.length === 0) {
  console.log(`no slop in ${files.length} files`);
  process.exit(0);
}

for (const f of findings) {
  console.error(`${f.rel}:${f.line}  [${f.rule}] ${f.hit}`);
  console.error(`    ${f.why}`);
}
console.error(`\n${findings.length} finding(s) across ${new Set(findings.map((f) => f.rel)).size} file(s).`);
console.error("docs/design-system.md §8 is the list these come from.");
process.exit(1);
