// Which package a file belongs to.
//
// The map draws files; this is the only place that knows a file sits inside
// `packages/ui`. It reads the two manifests people actually use — pnpm's
// `pnpm-workspace.yaml` and npm/yarn's `workspaces` array (or object) — and then
// answers the one question the graph needs: given a repository-relative path, which
// package owns it.
//
// Globs are deliberately not implemented: `apps/*` and `packages/*` are expanded by
// listing the directory, and anything else is matched literally. A glob dialect is
// a language to document and a source of "why didn't my package match" questions;
// this is the smallest thing that answers the question for real monorepos.
//
// js-yaml is in node_modules only as a transitive dependency, so it is not imported
// here. `packages:` in a pnpm workspace file is a list of single-quoted strings, and
// reading that costs three lines.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Edge } from "../parser/types.ts";

export type WorkspacePackage = {
  /** The name from the package's own package.json. */
  name: string;
  /** Repository-relative directory, forward slashes, no trailing slash. */
  dir: string;
};

export type Workspace = {
  packages: WorkspacePackage[];
  /** The package owning a repository-relative file path, or null outside all of them. */
  packageOf: (file: string) => string | null;
};

const EMPTY: Workspace = { packages: [], packageOf: () => null };

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isDirectory(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false;
}

/** The workspace patterns a root declares, pnpm first, then package.json. */
function patterns(root: string): string[] {
  const yamlPath = join(root, "pnpm-workspace.yaml");
  const yaml = existsSync(yamlPath) ? readFileSync(yamlPath, "utf8").split("\n") : [];
  const fromYaml: string[] = [];
  let inPackages = false;
  for (const line of yaml) {
    if (/^packages\s*:/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      // Any other top-level key ends the list.
      if (/^\S/.test(line) && line.trim() !== "") break;
      const item = /^\s*-\s*(.+?)\s*$/.exec(line);
      if (item) fromYaml.push(item[1].replace(/^['"]|['"]$/g, ""));
    }
  }
  if (fromYaml.length > 0) return fromYaml;

  const manifest = readJson(join(root, "package.json"));
  const workspaces = manifest?.workspaces;
  if (Array.isArray(workspaces)) return workspaces.filter((w): w is string => typeof w === "string");
  if (workspaces && typeof workspaces === "object") {
    const packages = (workspaces as { packages?: unknown }).packages;
    if (Array.isArray(packages)) return packages.filter((w): w is string => typeof w === "string");
  }
  return [];
}

/** `apps/*` lists the directory's children; everything else is a literal directory. */
function expand(root: string, pattern: string): string[] {
  const clean = pattern.replace(/\/+$/, "");
  if (clean.endsWith("/*")) {
    const parent = clean.slice(0, -2);
    const at = join(root, parent);
    if (!isDirectory(at)) return [];
    return readdirSync(at)
      .filter((name) => isDirectory(join(at, name)))
      .map((name) => `${parent}/${name}`);
  }
  return isDirectory(join(root, clean)) ? [clean] : [];
}

export function readWorkspace(root: string): Workspace {
  const found = patterns(root);
  if (found.length === 0) return EMPTY;

  const packages: WorkspacePackage[] = [];
  for (const pattern of found) {
    for (const dir of expand(root, pattern)) {
      const manifest = readJson(join(root, dir, "package.json"));
      const name = typeof manifest?.name === "string" ? manifest.name : null;
      // A directory in a workspace glob with no package.json is a folder, not a
      // package: naming it after its path would invent a boundary.
      if (name) packages.push({ name, dir });
    }
  }
  if (packages.length === 0) return EMPTY;

  // Longest directory wins, so `packages/ui/nested` inside `packages/ui` stays with
  // the outer package unless it declares its own.
  const sorted = [...packages].sort((a, b) => b.dir.length - a.dir.length);
  return {
    packages: sorted,
    packageOf(file) {
      for (const pkg of sorted) {
        if (file === pkg.dir || file.startsWith(`${pkg.dir}/`)) return pkg.name;
      }
      return null;
    },
  };
}

export type PackageEdge = {
  from: string;
  to: string;
  count: number;
};

/**
 * Edges that leave their package, collapsed per pair.
 *
 * The interior of a package is not interesting at this level: what a reader of a
 * monorepo wants is "web depends on ui, and on nothing else", which is the list of
 * crossings rather than the file edges behind it.
 */
export function packageEdges(
  edges: readonly Edge[],
  packageOf: (file: string) => string | null,
): PackageEdge[] {
  const counts = new Map<string, PackageEdge>();
  for (const edge of edges) {
    const from = packageOf(edge.source);
    const to = packageOf(edge.target);
    if (from === null || to === null || from === to) continue;
    const key = `${from}\u0000${to}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { from, to, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || b.count - a.count,
  );
}
