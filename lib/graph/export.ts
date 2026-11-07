import type { Edge } from "../parser/types.ts";

// The graph leaving the app. Two formats, both of them text, because the
// question is always "how do I get this into the tool I already draw in".

/** Every file appears once, whether it imports or is imported. */
function nodes(edges: readonly Edge[]): string[] {
  const seen = new Set<string>();
  for (const e of edges) {
    seen.add(e.source);
    seen.add(e.target);
  }
  return [...seen].sort();
}

export function toDot(edges: readonly Edge[]): string {
  const lines = ["digraph cartograph {", "  rankdir=LR;", "  node [shape=box, fontname=\"monospace\"];"];
  for (const node of nodes(edges)) lines.push(`  "${node}";`);
  for (const e of [...edges].sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target))) {
    // Type-only edges are dashed: they break the build, not the runtime.
    lines.push(`  "${e.source}" -> "${e.target}"${e.typeOnly ? " [style=dashed]" : ""};`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function toMermaid(edges: readonly Edge[]): string {
  const id = new Map(nodes(edges).map((node, i) => [node, `n${i}`]));
  const lines = ["graph LR"];
  for (const [node, alias] of id) lines.push(`  ${alias}["${node}"]`);
  for (const e of edges) {
    lines.push(`  ${id.get(e.source)} ${e.typeOnly ? "-.->" : "-->"} ${id.get(e.target)}`);
  }
  return lines.join("\n");
}
