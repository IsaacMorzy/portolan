// Screenshots of the inspector, taken from the development preview so that the
// question "does this look right" is answered by a picture instead of a guess.
//
// Run: node scripts/e2e/inspector-preview.mjs
import { mkdirSync } from "node:fs";
import { launch } from "./harness.mjs";

const BASE = "http://localhost:3100/dev/inspector";
const OUT = new URL("./shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector("tbody tr");
await page.screenshot({ path: `${OUT}inspector-closed.png` });

await page.locator("tbody tr").first().locator("button").first().click();
await page.waitForSelector('section[aria-label="Selected analysis"]');
await page.screenshot({ path: `${OUT}inspector-open.png` });

// The failed row carries the longest message, which is where a panel overflows.
await page.locator("tbody tr").nth(2).click();
await page.screenshot({ path: `${OUT}inspector-failed.png` });

const measured = await page.evaluate(() => {
  const panel = document.querySelector('section[aria-label="Selected analysis"]');
  const labels = [...panel.querySelectorAll("dt")].map((n) => n.getBoundingClientRect());
  const values = [...panel.querySelectorAll("dd")].map((n) => n.getBoundingClientRect());
  const box = panel.getBoundingClientRect();
  return {
    height: Math.round(box.height),
    top: Math.round(box.top),
    pairs: labels.length,
    misaligned: labels.filter((l, i) => values[i] && Math.abs(l.x - values[i].x) > 1).length,
    panelScrolls: panel.scrollHeight > panel.clientHeight + 1,
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight,
    bottomGap: Math.round(window.innerHeight - box.bottom),
    sizes: [...new Set([...panel.querySelectorAll("dt,dd,h2,span,p,a,button")].map((n) => getComputedStyle(n).fontSize))],
  };
});

console.log(JSON.stringify(measured, null, 2));
await browser.close();
