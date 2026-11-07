// Visual proof that the dashboard inspector exists, is aligned, and reads.
//
// The other suites assert facts about the DOM, which is the right way to catch a
// missing h1 and the wrong way to catch a panel whose label column is 3px out of
// line with the value column. This one takes pictures and hands them to a vision
// model, because "does this look right" is a question a screenshot can answer and
// a selector cannot.
//
// It signs in the same way audit-auth.mjs does: a single-use Clerk sign-in ticket,
// minted per run. Tickets are single-use, so this must never be cached.
//
// Run: node scripts/e2e/dashboard-shots.mjs [prod]
// Needs CLERK_SECRET_KEY. Screenshots land in scripts/e2e/shots/.

import { mkdirSync } from "node:fs";
import { LOCAL, PROD, launch } from "./harness.mjs";

const BASE = process.env.BASE ?? (process.argv[2] === "prod" ? PROD : LOCAL);
const SECRET = process.env.CLERK_SECRET_KEY;
const USER = process.env.E2E_USER_ID ?? "user_3Lkl0pNNiNdWT044Yer13X1ajga";
const OUT = new URL("./shots/", import.meta.url).pathname;

if (!SECRET) {
  console.error("CLERK_SECRET_KEY is required to mint a sign-in ticket.");
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });

async function ticket() {
  const response = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: USER, expires_in_seconds: 300 }),
  });
  if (!response.ok) throw new Error(`mint failed: ${response.status} ${await response.text()}`);
  return (await response.json()).token;
}

// The checkpoint is per-IP and intermittent, and it answers the ticket URL more
// often than a plain page. Waiting it out is the only honest retry: the challenge
// is not a layout defect and must not be reported as one.
async function visit(page, url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => null);
    const challenged = response?.status() === 403 || response?.headers()["x-vercel-mitigated"] === "challenge";
    const title = await page.title();
    if (!challenged && !title.includes("Checkpoint")) return response;
    if (attempt === 4) {
      console.error(`\n  BLOCKED  ${url}\n  Vercel's checkpoint answered 4 times. Not a page defect.\n  Set VERCEL_AUTOMATION_BYPASS_SECRET to pass it deterministically.\n`);
      process.exit(3);
    }
    console.error(`  challenge on attempt ${attempt}, waiting 20s`);
    await page.waitForTimeout(20_000);
  }
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// A challenge page is not a dashboard, and reporting it as a layout defect would
// be the wrong conclusion from the wrong evidence.
if (process.argv[2] === "prod") {
  await visit(page, `${BASE}/sign-in?__clerk_ticket=${await ticket()}`);
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 }).catch(() => {});
  if (page.url().includes("/sign-in")) {
    const title = await page.title();
    console.error(`BLOCKED: did not reach /dashboard (landed ${page.url()}, title "${title}").`);
    await browser.close();
    process.exit(3);
  }
}

await visit(page, `${BASE}/dashboard`);
await page.waitForSelector("tbody tr", { timeout: 20_000 });
await page.screenshot({ path: `${OUT}dashboard-table.png` });

// Click the first row the way a person would: on the repository name.
const name = page.locator("tbody tr").first().locator("button").first();
const before = await page.evaluate(() => document.body.innerText.length);
await name.click();
await page.waitForSelector('section[aria-label="Selected analysis"]', { timeout: 5_000 });
await page.screenshot({ path: `${OUT}dashboard-inspector.png` });

const geometry = await page.evaluate(() => {
  const panel = document.querySelector('section[aria-label="Selected analysis"]');
  const labels = [...panel.querySelectorAll("dt")].map((n) => n.getBoundingClientRect());
  const values = [...panel.querySelectorAll("dd")].map((n) => n.getBoundingClientRect());
  return {
    panelHeight: Math.round(panel.getBoundingClientRect().height),
    viewportHeight: window.innerHeight,
    // Labels and their values share a column, so the pairs should start at the
    // same x. A pair that does not is a grid that wrapped unexpectedly.
    misaligned: labels.filter((l, i) => values[i] && Math.abs(l.x - values[i].x) > 1).length,
    rows: document.querySelectorAll("tbody tr").length,
    panelOverflow: panel.scrollHeight > panel.clientHeight,
  };
});

await page.locator('section[aria-label="Selected analysis"] button').last().click();
const closed = await page.locator('section[aria-label="Selected analysis"]').count();

console.log(`base            ${BASE}`);
console.log(`selected        inspector opened and ${closed === 0 ? "closed" : "DID NOT CLOSE"}`);
console.log(`panel height    ${geometry.panelHeight}px of ${geometry.viewportHeight}px viewport`);
console.log(`label/value     ${geometry.misaligned === 0 ? "aligned" : `${geometry.misaligned} misaligned`}`);
console.log(`rows            ${geometry.rows}`);
console.log(`overflow        ${geometry.panelOverflow ? "panel scrolls" : "panel fits"}`);
console.log(`text grew       ${before} → ${await page.evaluate(() => document.body.innerText.length)} chars`);
console.log(`shots           ${OUT}dashboard-table.png, ${OUT}dashboard-inspector.png`);

await browser.close();
process.exit(closed === 0 && geometry.misaligned === 0 ? 0 : 1);
