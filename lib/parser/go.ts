// Go imports, read from the source rather than from an AST.
//
// Go is the second language beyond TypeScript/JavaScript, added for lane L3
// (#46). Like Python's scanner (python.ts), this is deliberately not a Go
// parser: a dependency map needs the import graph, and Go's import declarations
// are line-shaped enough to scan honestly.
//
//   1. `import "a/b"` contributes `a/b`; an alias (`x "a/b"`) or blank import
//      (`_ "a/b"`) never appears — the module is what matters.
//   2. A parenthesized block `import (\n "a/b"\n)` contributes each quoted
//      specifier inside it.
//   3. Line comments (`//`) and block comments (`/* */`) are stripped, so a
//      commented-out import never becomes an edge.
//
// The honest limits, stated rather than hidden:
// - Build constraints (`//go:build`, `_test.go`, `_foo.go`) are not inspected;
//   every .go file is scanned the same.
// - A file with a syntax error still produces its import lines: one broken
//   file does not remove every edge from a repository.
// - Bare (non-relative) module paths resolve only to files that exist in the
//   repository; everything else is an external package, never guessed.

import type { EdgeKind } from "./types.ts";

export type GoImport = {
  kind: EdgeKind;
  line: number;
  typeOnly: boolean;
  literal: true;
  specifier: string;
};

const STRING = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
const BLOCK_START = /\/\*/;
const BLOCK_END = /\*\//;
const LINE_COMMENT = /\/\//;

/** True for the file types this module claims. */
export function isGo(path: string): boolean {
  return path.endsWith(".go");
}

export function goImports(source: string): GoImport[] {
  const found: GoImport[] = [];
  const lines = source.split(/\r?\n/);
  // A /* ... */ comment that started on an earlier line.
  let blockOpen = false;
  // An import ( ... ) block that started on an earlier line.
  let importBlock = false;

  const scan = (raw: string, n: number): void => {
    // Strip comments, tracking block-comment state across lines.
    let line = "";
    let i = 0;
    while (i < raw.length) {
      if (blockOpen) {
        const close = raw.indexOf("*/", i);
        if (close === -1) { i = raw.length; break; }
        i = close + 2;
        blockOpen = false;
      } else {
        const block = raw.indexOf("/*", i);
        const lineComment = raw.indexOf("//", i);
        const b = block === -1 ? Infinity : block;
        const lc = lineComment === -1 ? Infinity : lineComment;
        const next = Math.min(b, lc);
        if (next === Infinity) { line += raw.slice(i); i = raw.length; }
        else if (b <= lc) { line += raw.slice(i, block); i = block + 2; blockOpen = true; }
        else { line += raw.slice(i, lineComment); i = raw.length; } // rest of the line is a comment
      }
    }
    if (blockOpen) return; // still inside a block comment: nothing usable here

    const trimmed = line.trim();
    const wasInBlock = importBlock;
    const isImportLine = wasInBlock || /^\bimport\b/.test(trimmed);

    if (!wasInBlock && /\bimport\s*\(/.test(trimmed)) importBlock = true;

    if (isImportLine) {
      let match: RegExpExecArray | null;
      STRING.lastIndex = 0;
      while ((match = STRING.exec(line)) !== null) {
        found.push({ kind: "import", line: n, typeOnly: false, literal: true, specifier: match[1] });
      }
    }

    if (importBlock && /\)/.test(trimmed)) importBlock = false;
  };

  lines.forEach((raw, index) => scan(raw, index + 1));
  return found;
}

/**
 * `a/b` → `a/b.go`, relative to the repository root for bare module paths and
 * to the importing file's directory for relative ones (`./pkg`, `../pkg`).
 *
 * Relative imports climb one directory per extra dot, exactly as Python's
 * resolver does. Climbing past the repository root is refused: Go raises an
 * error there, and an invented edge is worse than no edge.
 *
 * Bare module paths that name nothing in the repository return null so the
 * caller classifies them as external packages rather than guessing.
 */
export function resolveGo(fromPath: string, specifier: string, nodes: ReadonlySet<string>): string | null {
  const candidates: string[] = [];

  if (specifier.startsWith(".")) {
    const dots = specifier.match(/^\.+/)?.[0].length ?? 1;
    const rest = specifier.slice(dots).replace(/^\./, "");
    const segments = fromPath.split("/").slice(0, -1);
    const up = dots - 1;
    if (up >= segments.length) return null;
    const base = segments.slice(0, segments.length - up).join("/");
    const tail = rest.replace(/\./g, "/");
    candidates.push([base, tail].filter((segment) => segment.length > 0).join("/"));
  } else {
    candidates.push(specifier);
  }

  for (const candidate of candidates) {
    if (candidate.length === 0) continue;
    const file = `${candidate}.go`;
    if (nodes.has(file)) return file;
  }
  return null;
}
