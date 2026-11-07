import type { Edge } from "../parser/types.ts";

// Boundary rules over resolved imports. Two shapes, because two questions get
// asked: "this folder must never import that one" (deny) and "this folder may
// only be imported by these" (allow).
//
// Prefixes, not globs. A glob dialect is a language to implement and document;
// a folder prefix is what people already have in their heads, and the failure
// mode (matching one level too deep) is visible on the first run.

export type Rules = {
  /** Edges from `from` to `to` are violations. */
  deny?: { from: string; to: string; why?: string }[];
  /** Edges into `to` are violations unless the source is under one of `from`. */
  allow?: { to: string; from: string[]; why?: string }[];
};

export type Violation = {
  rule: "deny" | "allow";
  source: string;
  target: string;
  why?: string;
};

export function parseRules(raw: unknown): Rules {
  if (typeof raw !== "object" || raw === null) throw new Error("rules must be an object");
  const r = raw as Rules;
  for (const [i, d] of (r.deny ?? []).entries()) {
    if (typeof d?.from !== "string" || typeof d?.to !== "string")
      throw new Error(`rules.deny[${i}] needs string "from" and "to"`);
  }
  for (const [i, a] of (r.allow ?? []).entries()) {
    if (typeof a?.to !== "string" || !Array.isArray(a?.from) || a.from.some((f) => typeof f !== "string"))
      throw new Error(`rules.allow[${i}] needs string "to" and string array "from"`);
  }
  return { deny: r.deny ?? [], allow: r.allow ?? [] };
}

/** A file is under a prefix when it is the prefix or sits beneath it. */
export function under(file: string, prefix: string): boolean {
  const p = prefix.replace(/\/+$/, "");
  return file === p || file.startsWith(`${p}/`);
}

export function checkRules(edges: readonly Edge[], rules: Rules): Violation[] {
  const violations: Violation[] = [];
  for (const e of edges) {
    for (const d of rules.deny ?? []) {
      if (under(e.source, d.from) && under(e.target, d.to)) {
        violations.push({ rule: "deny", source: e.source, target: e.target, why: d.why });
      }
    }
    for (const a of rules.allow ?? []) {
      if (!under(e.target, a.to)) continue;
      if (a.from.some((f) => under(e.source, f))) continue;
      violations.push({ rule: "allow", source: e.source, target: e.target, why: a.why });
    }
  }
  return violations;
}
