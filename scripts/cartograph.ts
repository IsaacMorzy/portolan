// The graph, outside the app.
//
//   node scripts/cartograph.ts cycles  <dir>
//   node scripts/cartograph.ts rules   <dir> [--rules cartograph.rules.json]
//   node scripts/cartograph.ts export  <dir> [--format dot|mermaid] [--from file --depth n]
//   node scripts/cartograph.ts diff    <before.json> <after.json>
//
// cycles and rules exit 1 when they find something, so CI can fail on them.
// export prints to stdout so it pipes into dot, a gist, or a README.

import { readFileSync } from "node:fs";
import { cycles } from "../lib/graph/cycles.ts";
import { diffEdges } from "../lib/graph/diff.ts";
import { toDot, toMermaid } from "../lib/graph/export.ts";
import { adjacency, reach } from "../lib/graph/reach.ts";
import { checkRules, parseRules } from "../lib/graph/rules.ts";
import { deserializeParseResult } from "../lib/parser/contract.ts";
import { parseRepository } from "../lib/parser/index.ts";
import type { Edge } from "../lib/parser/types.ts";

const VALUE_FLAGS = ["--rules", "--format", "--from", "--depth"];

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

function positional(argv: string[]): string[] {
  return argv.filter((arg, i) => !arg.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1] ?? ""));
}

function edgesOf(path: string): Edge[] {
  if (path.endsWith(".json")) return deserializeParseResult(readFileSync(path, "utf8")).edges;
  return parseRepository(path).edges;
}

function neighbourhood(edges: Edge[], from: string, depth: number): Edge[] {
  const { steps } = reach(adjacency(edges), from, "dependents", depth);
  const keep = new Set<string>([from, ...steps.flat()]);
  return edges.filter((e) => keep.has(e.source) || keep.has(e.target));
}

function main(argv: string[]): void {
  const [command] = argv;
  const args = positional(argv);
  const target = args[1];

  if (!command || !target) {
    console.error(
      "usage: cartograph cycles <dir> | rules <dir> [--rules f.json] | export <dir> [--format dot|mermaid] [--from f --depth n] | diff <a.json> <b.json>",
    );
    process.exit(2);
  }

  if (command === "cycles") {
    const found = cycles(edgesOf(target));
    if (found.length === 0) {
      console.log("no cycles");
      return;
    }
    for (const c of found) console.log(c.path.join(" -> "));
    console.log(`\n${found.length} cycle(s)`);
    process.exit(1);
  }

  if (command === "rules") {
    const file = flag(argv, "--rules") ?? "cartograph.rules.json";
    const rules = parseRules(JSON.parse(readFileSync(file, "utf8")));
    const violations = checkRules(edgesOf(target), rules);
    if (violations.length === 0) {
      console.log("no violations");
      return;
    }
    for (const v of violations) {
      console.log(`${v.source} -> ${v.target}  (${v.rule}${v.why ? `: ${v.why}` : ""})`);
    }
    console.log(`\n${violations.length} violation(s)`);
    process.exit(1);
  }

  if (command === "export") {
    let edges = edgesOf(target);
    const from = flag(argv, "--from");
    if (from) edges = neighbourhood(edges, from, Number(flag(argv, "--depth") ?? 2));
    const format = flag(argv, "--format") ?? "dot";
    if (format !== "dot" && format !== "mermaid") {
      console.error(`--format is "${format}"; use dot or mermaid`);
      process.exit(2);
    }
    console.log(format === "dot" ? toDot(edges) : toMermaid(edges));
    return;
  }

  if (command === "diff") {
    const after = args[2];
    if (!after) {
      console.error("diff needs two files: cartograph diff <before.json> <after.json>");
      process.exit(2);
    }
    const d = diffEdges(edgesOf(target), edgesOf(after));
    for (const e of d.added) console.log(`+ ${e.source} -> ${e.target}`);
    for (const e of d.removed) console.log(`- ${e.source} -> ${e.target}`);
    for (const r of d.reversed) console.log(`~ ${r.before.source} -> ${r.before.target} is now ${r.after.source} -> ${r.after.target}`);
    console.log(`\n${d.added.length} added, ${d.removed.length} removed, ${d.reversed.length} reversed`);
    return;
  }

  console.error(`unknown command "${command}"`);
  process.exit(2);
}

main(process.argv.slice(2));
