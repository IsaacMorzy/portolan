// Signed-in journey: a Clerk ticket, a session, and a real dashboard render.
//
//   node scripts/e2e/sign-in.mjs [base]
//
// Needs CLERK_SECRET_KEY and the test user's id in the environment:
//   node --env-file=.env.local scripts/e2e/sign-in.mjs
//
// Clerk's production instance refuses server-minted sessions, so this mints a
// ticket and redeems it against the proxy. Run it against the deployed host;
// against localhost the Clerk host has no certificate and the page cannot load.

import { check, launch, report } from "./harness.mjs";

const BASE = process.argv[2] ?? "https://codegraph-navy.vercel.app";
const SECRET = process.env.CLERK_SECRET_KEY;
const USER = process.env.CLERK_TEST_USER_ID ?? "user_3Lkl0pNNiNdWT044Yer13X1ajga";

if (!SECRET) {
  console.error("CLERK_SECRET_KEY is not set. Run with --env-file=.env.local");
  process.exit(2);
}

const ticket = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
  method: "POST",
  headers: { Authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
  body: JSON.stringify({ user_id: USER, expires_in_seconds: 900 }),
}).then((r) => r.json());

if (!ticket.token) {
  console.error("Clerk refused to mint a ticket:", JSON.stringify(ticket.errors ?? ticket).slice(0, 200));
  process.exit(2);
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

await page.goto(`${BASE}/sign-in?__clerk_ticket=${ticket.token}`, { waitUntil: "domcontentloaded" });
await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 45_000 }).catch(() => {});
await page.waitForTimeout(2500);

const path = new URL(page.url()).pathname;
const heading = await page.locator("h1").first().textContent().catch(() => null);
check("a ticket lands somewhere other than /sign-in", !path.startsWith("/sign-in"), path);
check("the workspace renders a heading", Boolean(heading), (heading ?? "").slice(0, 48));
check("no page errors", errors.length === 0, errors[0] ?? "none");

await browser.close();
report();
