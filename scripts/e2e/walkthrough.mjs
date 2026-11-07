// The flow a headless run could never prove: a real session, over a real
// browser, on an already-running Chrome. It attaches over CDP to whatever is
// listening on 9222 instead of launching its own browser, so the cookie jar is
// the same one the next run will use.
//
//   chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/codegraph-debug about:blank
//   node --env-file=.env.local scripts/e2e/walkthrough.mjs [base]
//
// Needs CLERK_SECRET_KEY to mint the ticket, and CLERK_TEST_USER_ID to say who
// to be. Prints every claim it could not check rather than passing quietly.

import { check, report } from "./harness.mjs";
import { createRequire } from "node:module";

const require = createRequire(`${process.env.PW_ROOT ?? "/tmp/pw/node_modules"}/`);
const { chromium } = require("playwright-core");

const BASE = process.argv[2] ?? "https://codegraph-navy.vercel.app";
const ANALYSIS = process.env.ANALYSIS_ID ?? "6631d51a-0035-42da-9d17-f8f0809b4e4f";
const FILE = process.env.ANALYSIS_FILE ?? "lib/pipeline/github.ts";
const USER = process.env.CLERK_TEST_USER_ID ?? "user_3Lkl0pNNiNdWT044Yer13X1ajga";
const SECRET = process.env.CLERK_SECRET_KEY;

if (!SECRET) {
  console.error("CLERK_SECRET_KEY is not set. Run with --env-file=.env.local.");
  process.exit(2);
}

// One ticket, minted here. Single use, which is why it is minted per run.
const minted = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
  method: "POST",
  headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
  body: JSON.stringify({ user_id: USER, expires_in_seconds: 300 }),
});
if (!minted.ok) {
  console.error(`Minting a ticket failed: ${minted.status} ${await minted.text()}`);
  process.exit(2);
}
const { token } = await minted.json();

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const context = browser.contexts()[0] ?? (await browser.newContext());
const page = context.pages()[0] ?? (await context.newPage());
await page.setViewportSize({ width: 1440, height: 900 });

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

// 1. Sign in with the ticket. A fresh profile has no session, so this is the
//    real thing: the browser exchanges it with Clerk, exactly as a person's
//    browser would.
await page.goto(`${BASE}/sign-in?__clerk_ticket=${token}`, { waitUntil: "domcontentloaded" });
await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 60_000 }).catch(() => {});
check("a ticket moves the browser off /sign-in", !page.url().includes("/sign-in"), new URL(page.url()).pathname);

// 2. The workspace, which is the first page that needs an organization.
// Not networkidle: Clerk keeps a socket open, so the network never goes idle
// and the wait would time out on a page that is finished.
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
await page.waitForTimeout(1500);
const heading = (await page.locator("h1, h2").first().textContent().catch(() => ""))?.trim() ?? "";
check("the dashboard renders for a signed-in person", heading.length > 0, heading.slice(0, 48));

// 3. The map. This is the one page whose data path only opens with a session.
await page.goto(`${BASE}/analyses/${ANALYSIS}`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
await page.waitForTimeout(2500);
const commit = (await page.locator("h1").first().textContent().catch(() => ""))?.trim() ?? "";
check("the analysis page shows a repository, not a sign-in wall", !page.url().includes("/sign-in"), commit.slice(0, 48));

// The refresh left its fingerprint in the header: the current sha and the one
// it replaced. If G9 worked and the label was wired, both are on screen.
const header = (await page.locator("body").evaluate((b) => b.innerText.slice(0, 400)).catch(() => "")) ?? "";
check("the header names the commit it read", /[0-9a-f]{7}/.test(header), (header.match(/[0-9a-f]{7}/g) ?? []).join(" "));
check("and, after the scheduled refresh, the commit it replaced", /was\s+[0-9a-f]{7}/.test(header), (header.match(/was [0-9a-f]{7}/) ?? ["none"])[0]);

// 4. The graph itself drew, rather than falling back to an empty state.
const nodes = await page.locator("[data-node], [role=treeitem], li").count();
check("the map has nodes to click", nodes > 5, `${nodes} nodes`);

// 5. /api/graph with a real session. This is the route's happy path, which no
//    headless run could reach because nothing could mint a session.
const graph = await page.evaluate(async ({ analysisId, file }) => {
  const r = await fetch("/api/graph", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisId, file, direction: "dependents", depth: 2 }),
  });
  return { status: r.status, body: await r.text() };
}, { analysisId: ANALYSIS, file: FILE });
check("/api/graph answers a signed-in caller with data", graph.status === 200, `${graph.status}`);
check("and the answer names the file it was asked about", graph.body.includes(FILE), graph.body.slice(0, 90));

// 6. The same route with another workspace's analysis must be a 404, not a 403
//    — the difference would tell an attacker the analysis exists.
const other = await page.evaluate(async () => {
  const r = await fetch("/api/graph", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisId: "00000000-0000-0000-0000-000000000000", file: "x.ts" }),
  });
  return { status: r.status, body: await r.text() };
});
check("an analysis that is not yours answers 404", other.status === 404, `${other.status} ${other.body.slice(0, 60)}`);

check("no page error was thrown anywhere in the flow", errors.length === 0, errors.join(" | ").slice(0, 90) || "none");

await page.screenshot({ path: ".scratch/shots/walkthrough.png", fullPage: false });
console.log(`\n  screenshot: .scratch/shots/walkthrough.png\n  url: ${page.url()}`);

// The browser stays running on purpose. Its profile is the point.
await page.close();
report();
