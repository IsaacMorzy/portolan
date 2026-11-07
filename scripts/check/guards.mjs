// Guards: the architecture rules that are security, not taste.
//
// docs/architecture.md names four doors into the product and one gate behind them.
// A document cannot hold that line — the failure it describes is a new route that
// forgets the check, and a route that forgets the check looks exactly like one that
// has it until somebody with the wrong organisation asks for the right row.
//
// Four rules, each from a decision that is already written down:
//
//   1. Every entry point references a guard. A page under (workspace) or a route
//      handler that never asks who is calling is open by accident.
//   2. The secret-key Supabase client never reaches a client component. It
//      bypasses RLS by design; importing it into anything that ships to a browser
//      hands out the database.
//   3. A route that spends money imports the rate limiter. "Fails closed for
//      anything that spends money" is only true if every such route opts in.
//   4. The cron route authenticates itself, because the middleware cannot: the
//      scheduler has no session.
//
// Run: node scripts/check/guards.mjs

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Any of these means the caller's identity was consulted. */
const GUARDS = ["auth()", "resolveOrganization", "loadStoredAnalysis", "CRON_SECRET", "currentUser"];

/** Files that ship to the browser. */
const CLIENT_BOUNDARY = /^\s*["']use client["']/;

/** Importing these from a "use client" file is a data leak or a cost leak. */
const SERVER_ONLY = [
  { spec: "lib/supabase/admin", why: "The secret-key client bypasses RLS. In a client component it is a public database." },
  { spec: "lib/ai/client", why: "Model calls belong on the server; a client import ships the provider key path with it." },
  { spec: "lib/pipeline/github", why: "Uses GITHUB_TOKEN. Client-side it either breaks or leaks." },
  { spec: "SUPABASE_SECRET_KEY", why: "A secret key name in a client file is a secret key in a bundle." },
];

/** Routes that cost money per call and must therefore be limited. */
const PAID = /lib\/(ai\/client|pipeline\/github)/;

const findings = [];
const add = (file, note, why) => findings.push({ file, note, why });

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const source = ["app", "components", "lib"].flatMap((d) => walk(d)).filter((f) => /\.(tsx?|jsx?)$/.test(f));

for (const file of source) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf8");

  // 1. Entry points must guard.
  const isEntry =
    /^app\/\(workspace\)\/.*page\.tsx$/.test(rel) ||
    /^app\/api\/.*route\.ts$/.test(rel);
  if (isEntry && !GUARDS.some((g) => text.includes(g))) {
    add(rel, "no guard", `Entry point never asks who is calling. One of: ${GUARDS.join(", ")}. See docs/architecture.md.`);
  }

  // 2. Server-only modules must not cross into the browser bundle.
  if (CLIENT_BOUNDARY.test(text)) {
    for (const entry of SERVER_ONLY) {
      if (text.includes(entry.spec)) add(rel, `"use client" imports ${entry.spec}`, entry.why);
    }
  }

  // 3. Paid routes must be limited.
  if (/^app\/api\/.*route\.ts$/.test(rel) && PAID.test(text) && !text.includes("lib/ratelimit")) {
    add(rel, "spends money without a limiter", "Import lib/ratelimit and add the route to LIMITS. Reads fail open; anything that spends money fails closed.");
  }

  // 4. The cron route is outside the middleware's protection by design.
  if (rel === "app/api/cron/refresh/route.ts" && !text.includes("CRON_SECRET")) {
    add(rel, "cron route has no bearer check", "The scheduler has no session, so the middleware cannot protect this route. It authorises itself with CRON_SECRET.");
  }
}

// The limiter's table and the call sites must agree. The convention in this repo
// is `LIMITS.<key>`, so the key is read from the call rather than guessed from the
// path — a route at api/cron/refresh/route.ts legitimately uses LIMITS.refresh.
const LIMITS_SRC = readFileSync("lib/ratelimit.ts", "utf8");
const DECLARED = new Set([...LIMITS_SRC.matchAll(/^\s{2}([a-z][A-Za-z0-9]*):\s*\{/gm)].map((m) => m[1]));

for (const file of source.filter((f) => /^app\/api\/.*route\.ts$/.test(relative(process.cwd(), f)))) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf8");
  if (!text.includes("lib/ratelimit")) continue;

  const used = [...text.matchAll(/LIMITS\.([A-Za-z0-9]+)/g)].map((m) => m[1]);
  if (used.length === 0) {
    add(rel, "imports the limiter but limits nothing", "Importing lib/ratelimit without calling it with LIMITS.<key> looks protected and is not.");
    continue;
  }
  for (const key of new Set(used)) {
    if (!DECLARED.has(key)) {
      add(rel, `LIMITS.${key} does not exist`, `Declared keys: ${[...DECLARED].join(", ")}. A typo here removes the limit silently.`);
    }
  }
}

if (findings.length === 0) {
  console.log(`guards hold across ${source.length} files`);
  process.exit(0);
}

for (const f of findings) {
  console.error(`${f.file}  [${f.note}]`);
  console.error(`    ${f.why}`);
}
console.error(`\n${findings.length} guard violation(s). docs/architecture.md is the source of truth.`);
process.exit(1);
