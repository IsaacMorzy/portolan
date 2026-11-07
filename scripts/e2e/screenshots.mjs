// Screenshots for a look, not for a pass/fail. Writes the three widths that
// matter to .scratch/shots/, which is gitignored.
//
//   node scripts/e2e/screenshots.mjs [base] [path]

import { mkdirSync } from "node:fs";
import { launch } from "./harness.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const PATH = process.argv[3] ?? "/";
const OUT = process.env.SHOTS_DIR ?? ".scratch/shots";
mkdirSync(OUT, { recursive: true });

const browser = await launch();
const slug = (s) => (s === "/" ? "home" : s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""));

for (const [name, width, theme] of [
  ["light", 1440, "light"],
  ["dark", 1440, "dark"],
  ["mobile", 390, "light"],
]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  if (theme === "dark") {
    await context.addCookies([{ name: "theme", value: "dark", domain: new URL(BASE).hostname, path: "/" }]);
  }
  const page = await context.newPage();
  await page.goto(`${BASE}${PATH}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(900);
  const file = `${OUT}/${slug(PATH)}-${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
  await context.close();
}

await browser.close();
