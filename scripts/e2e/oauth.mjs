// Opens an MCP OAuth authorization URL in a browser that already has a session.
//
// Why this exists: `hermes mcp login <server>` and `opencode mcp auth <server>`
// both start a PKCE flow and bind a listener on 127.0.0.1, then wait. The
// authorize page is usually behind a bot check, and a fresh headless Chrome
// fails it — Vercel answers `Failed to verify your browser — Code 29`, which is
// a rejection, not a rotate-and-retry. So the step needs a browser with a real
// profile, and this script attaches to one over CDP instead of launching its own.
//
// Usage:
//   chrome --remote-debugging-port=9222 --user-data-dir=<a profile you have signed in with>
//   node scripts/e2e/oauth.mjs "<authorize url>"
//
// If the redirect then lands on 127.0.0.1:<port>/callback and nothing is
// listening there (a phone, a different machine), close the loop by hand — the
// listener takes the callback over plain HTTP:
//
//   curl "http://127.0.0.1:<port>/callback?code=...&state=..."
//
// That is how the hermes TypeUI session was completed, after the browser path
// was refused.

const url = process.argv[2];
if (!url?.startsWith("http")) {
  console.error("usage: node scripts/e2e/oauth.mjs \"<authorize url>\"");
  process.exit(2);
}

const CDP = process.env.CDP ?? "http://localhost:9222";
const { chromium } = await import(`${process.env.PW_ROOT ?? "/tmp/pw/node_modules"}/playwright-core/index.mjs`);

let browser;
try {
  browser = await chromium.connectOverCDP(CDP);
} catch {
  console.error(`No browser on ${CDP}. Start one with --remote-debugging-port=9222, or set CDP=...`);
  process.exit(2);
}

const context = browser.contexts()[0];
const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(4000);

const title = await page.title().catch(() => "");
const body = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);

// Three outcomes matter, and they need different actions: the consent screen
// (click through), a bot check (use a real profile, this browser cannot pass),
// and an already-authorized session (the redirect has happened, nothing to do).
if (/Security Checkpoint|verify your browser/i.test(title + body)) {
  console.log(`BLOCKED  ${title}`);
  console.log(`  ${body}`);
  console.log("\nThis browser cannot pass the check. Open the URL in a signed-in browser,");
  console.log("or post the callback to the waiting listener with curl (see the header of this file).");
  process.exit(1);
}

console.log(`PAGE  ${title}`);
console.log(`URL   ${page.url().slice(0, 140)}`);
console.log(`BODY  ${body || "(empty)"}`);
console.log("\nIf this is the consent screen, finish it in the browser. Nothing to paste back.");
