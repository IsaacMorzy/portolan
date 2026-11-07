// Why this exists: the live analysis of this repo shows "Unclassified 58" out of
// 113 files (issue #35). A number like that invites a taxonomy invented on the
// spot, and an invented taxonomy is how the bucket grows. So the first step is to
// print the paths and read what they actually are.
//
// It runs the same adapter the product runs, on the same selection, so the count
// here can be compared with the count on screen rather than trusted beside it.
//
//   node --experimental-strip-types scripts/unclassified.ts
//
// Read-only. Writes nothing, touches no network.

import { execFileSync } from "node:child_process";
import { parseRepository } from "../lib/parser/index.ts";

const root = process.cwd();
const parsed = parseRepository(root);
// `role` is already on the parsed file: the adapter ran during the walk, exactly
// as it does for the live analysis. Recomputing it here would be a second
// implementation of the thing being measured.
const files = parsed.files ?? [];
const buckets = new Map<string, string[]>();

for (const file of files) {
  const role = file.role ?? "unclassified";
  const list = buckets.get(role) ?? [];
  list.push(file.path);
  buckets.set(role, list);
}

const total = files.length;
const unclassified = buckets.get("unclassified") ?? [];

// Grouped by first two segments: the question is not "which 58 files" so much as
// "which parts of the repo have no convention at all", and that is a folder
// question.
const byFolder = new Map<string, number>();
for (const path of unclassified) {
  const key = path.split("/").slice(0, 2).join("/");
  byFolder.set(key, (byFolder.get(key) ?? 0) + 1);
}

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean).length;

console.log(`files parsed      ${total}`);
console.log(`files in checkout ${tracked}`);
console.log(`unclassified      ${unclassified.length} (${Math.round((unclassified.length / total) * 100)}%)`);
console.log("");
console.log("categorised:");
for (const [role, list] of [...buckets].sort((a, b) => b[1].length - a[1].length)) {
  if (role === "unclassified") continue;
  console.log(`  ${String(list.length).padStart(3)}  ${role}`);
}
console.log("");
console.log("unclassified, by folder:");
for (const [folder, count] of [...byFolder].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${folder}/`);
}
console.log("");
console.log("unclassified, every path:");
for (const path of unclassified.sort()) console.log(`  ${path}`);
