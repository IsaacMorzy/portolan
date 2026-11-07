// Shared harness for the browser checks in scripts/e2e/.
//
// playwright-core is not a dependency of this app: it is installed globally here
// and used through an absolute path, so the checks run without putting a browser
// driver in the production dependency tree. A missing install is a clear message,
// not a stack trace.

import { existsSync } from "node:fs";

export const LOCAL = process.env.BASE ?? "http://localhost:3100";
export const PROD = "https://codegraph-navy.vercel.app";

const PW_ROOT = process.env.PW_ROOT ?? "/tmp/pw/node_modules";
const CHROME =
  process.env.CHROME_PATH ?? "/home/sage/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome";

export async function launch() {
  if (!existsSync(`${PW_ROOT}/playwright-core`)) {
    console.error(
      `playwright-core is not installed at ${PW_ROOT}.\n` +
        `Install it somewhere and point PW_ROOT at it, e.g.  npm i playwright-core --prefix /tmp/pw`,
    );
    process.exit(2);
  }
  if (!existsSync(CHROME)) {
    console.error(`No Chrome at ${CHROME}. Set CHROME_PATH, or run: npx playwright-core install chromium`);
    process.exit(2);
  }
  const { chromium } = await import(`${PW_ROOT}/playwright-core/index.mjs`);
  return chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
}

/** Opens a page and collects page errors, so a check fails on a broken render. */
export async function open(browser, url, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(600);
  return { page, context, response, errors };
}

let failures = 0;
export function check(label, ok, detail = "") {
  if (ok) console.log(`PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  else {
    failures += 1;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

export function report() {
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}
