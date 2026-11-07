import type { Role } from "../../roles.ts";

// Conventions that hold whatever the framework: tools that load their config by
// file name, and test runners that collect files by pattern. Every adapter falls
// back to these after its own.

// Named rather than matching any "*.config.*", so a module someone happened to
// call app.config.ts isn't claimed to be loaded by a tool.
const CONFIG_TOOLS = [
  "astro",
  "babel",
  "commitlint",
  "cypress",
  "eslint",
  "jest",
  "next",
  "playwright",
  "postcss",
  "prettier",
  "rollup",
  "stylelint",
  "svelte",
  "tailwind",
  "tsup",
  "vite",
  "vitest",
  "webpack",
];
const CONFIG_FILE = new RegExp(`^(${CONFIG_TOOLS.join("|")})\\.config\\.[cm]?[jt]s$`);
const RC_FILE = /^\.(babel|eslint|lintstaged|mocha|prettier|stylelint|commitlint)rc\.[cm]?js$/;
// The default include patterns of Jest and Vitest.
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const TEST_DIR = /(^|\/)__tests__\//;

export function toolConventions(path: string): string | null {
  const role = toolRole(path);
  if (role === "config") return "config file, loaded by its tool";
  if (role === "test") return "test file, collected by the test runner";
  return null;
}

export function toolRole(path: string): "config" | "test" | null {
  const name = path.slice(path.lastIndexOf("/") + 1);
  if (CONFIG_FILE.test(name) || RC_FILE.test(name)) return "config";
  if (TEST_FILE.test(name) || TEST_DIR.test(path)) return "test";
  return null;
}

// Where a file sits is a fact about the project, not a guess about its behaviour,
// so these are named once rather than inferred per repository. A library module
// has no placement convention to match — that is why half of this repo used to
// read as unknown (issue #35) — and its position is the only thing the path can
// honestly say.
const MODULE_ROOTS = [/^lib\//, /^src\/lib\//, /^src\/modules\//, /^packages\/[^/]+\/src\//];

export function placementRole(path: string): Role | null {
  if (/^scripts\//.test(path)) return "script";
  if (MODULE_ROOTS.some((root) => root.test(path))) return "module";
  return null;
}
