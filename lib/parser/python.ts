// Python imports, read from the source rather than from an AST.
//
// G5 asked for this and was blocked on "a parser that does not exist here". That
// was the wrong framing: a dependency *map* needs the import graph, not a full
// syntax tree, and Python's import syntax is the one place its grammar is kinder
// than JavaScript's — `import a.b` and `from a.b import c` are line-shaped.
//
// So this is a line scanner with three rules and one honest limit:
//
//   1. A line is code if it is not inside a triple-quoted string and its first
//      non-space character is not `#`.
//   2. `import a.b as x, c` contributes `a.b` and `c` — the aliases never appear.
//   3. `from .base import x` keeps its dots, because they are the whole path.
//
// The limit: a backslash continuation is not followed, and `importlib` and
// `__import__` are runtime lookups with no path to resolve. Those are reported the
// way unresolved specifiers always are — absent, not guessed.
//
// This is deliberately not a Python parser. A file with a syntax error still
// produces its import lines, which is the failure mode that matters for a map:
// the alternative is a repository where one broken script removes every edge.

import type { EdgeKind } from "./types.ts";

export type PythonImport = {
  kind: EdgeKind;
  line: number;
  typeOnly: boolean;
  literal: true;
  specifier: string;
};

const TRIPLE = /("""|''')/;

export function pythonImports(source: string): PythonImport[] {
  const found: PythonImport[] = [];
  const lines = source.split(/\r?\n/);

  // Which triple-quote delimiter is open, if any. A docstring spanning forty
  // lines would otherwise contribute forty lines of prose as imports.
  let open: string | null = null;

  lines.forEach((raw, index) => {
    const line = raw.replace(/\s+#.*$/, "");
    const trimmed = line.trim();

    if (open) {
      const close = trimmed.indexOf(open);
      if (close === -1) return;
      open = null;
      // Text after the closing delimiter can be code; fall through with it.
      const rest = trimmed.slice(close + 3).trim();
      if (rest.length === 0 || rest.startsWith("#")) return;
      scan(rest, index + 1, found);
      return;
    }

    if (trimmed.length === 0 || trimmed.startsWith("#")) return;

    const delimiters = [...trimmed.matchAll(new RegExp(TRIPLE, "g"))];
    if (delimiters.length % 2 === 1) open = delimiters[delimiters.length - 1][1];

    scan(trimmed, index + 1, found);
  });

  return found;
}

const IMPORT_MODULE = /^import\s+(.+)$/;
const FROM_MODULE = /^from\s+(\S+)\s+import\s+(.+)$/;

function scan(line: string, n: number, out: PythonImport[]) {
  const push = (specifier: string) => {
    // `from __future__ import annotations` is a compiler directive, not a file.
    if (specifier === "__future__") return;
    out.push({ kind: "import", line: n, typeOnly: false, literal: true, specifier });
  };

  const from = FROM_MODULE.exec(line);
  if (from) {
    const [, module, names] = from;
    // `from x import (a, b)` keeps the parenthesis; `from x import a as b` keeps
    // the name, not the alias.
    const cleaned = names.replace(/[()]/g, "").trim();
    if (cleaned === "*") {
      push(module);
      return;
    }
    // A relative import with no module (`from . import x`) resolves to the
    // package itself, which the dots already express.
    push(module);
    return;
  }

  const plain = IMPORT_MODULE.exec(line);
  if (!plain) return;
  for (const part of plain[1].split(",")) {
    // `import a.b as c` → a.b; `import a . b` is not valid Python, so no trimming
    // of inner spaces is attempted beyond the strip below.
    const specifier = part.trim().split(/\s+as\s+/)[0].trim();
    if (specifier.length > 0) push(specifier);
  }
}

/**
 * `a.b` → `a/b.py` or `a/b/__init__.py`, relative to the package root.
 *
 * Relative imports (`.base`, `..pkg.mod`) are anchored to the importing file's
 * directory and climb one level per extra dot. Getting this wrong is worse than
 * not supporting it: a wrong edge asserts a dependency that does not exist.
 */
export function resolvePython(fromPath: string, specifier: string, nodes: ReadonlySet<string>): string | null {
  const candidates: string[] = [];

  if (specifier.startsWith(".")) {
    const dots = specifier.match(/^\.+/)?.[0].length ?? 1;
    const rest = specifier.slice(dots).replace(/^\./, "");
    const segments = fromPath.split("/").slice(0, -1);
    // One dot means "this package", two means "the parent". So one dot removes
    // nothing and two removes one directory. Climbing as high as the repository
    // root is refused: Python raises "attempted relative import beyond top-level
    // package" there, because the root is not itself a package here.
    const up = dots - 1;
    if (up >= segments.length) return null;
    const base = segments.slice(0, segments.length - up).join("/");
    const tail = rest.replace(/\./g, "/");
    // `from . import x` names the package itself. The edge goes to the package,
    // not to x: touching the package is always true, whereas naming x's module
    // invents an edge when x is a name in __init__.py.
    candidates.push([base, tail].filter((segment) => segment.length > 0).join("/"));
  } else {
    candidates.push(specifier.replace(/\./g, "/"));
  }

  for (const candidate of candidates) {
    if (candidate.length === 0) continue;
    for (const file of [`${candidate}.py`, `${candidate}/__init__.py`]) {
      if (nodes.has(file)) return file;
    }
  }
  return null;
}

/** True for the file types this module claims. */
export function isPython(path: string): boolean {
  return path.endsWith(".py");
}
