// The public surface: every page renders, nothing overflows, nothing throws.
//
//   node scripts/e2e/landing.mjs [base]      default http://localhost:3100
//
// Runs at three widths because a section that holds at 1440 can still push the
// page sideways at 390, and that failure is invisible in a desktop screenshot.

import { check, launch, open, report } from "./harness.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const PAGES = ["/", "/security", "/sign-in", "/sign-up"];

const browser = await launch();

for (const width of [1440, 390]) {
  for (const path of PAGES) {
    const { page, context, response, errors } = await open(browser, `${BASE}${path}`, {
      width,
      height: 900,
    });
    const facts = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      h1: document.querySelector("h1")?.textContent?.trim() ?? "",
    }));
    const label = `${width}px ${path}`;
    check(`${label} responds 200`, response?.status() === 200, String(response?.status()));
    check(`${label} has a heading`, facts.h1.length > 0, facts.h1.slice(0, 40));
    check(`${label} does not scroll sideways`, !facts.overflow);
    check(`${label} throws nothing`, errors.length === 0, errors[0] ?? "none");
    await context.close();
  }
}

await browser.close();
report();
