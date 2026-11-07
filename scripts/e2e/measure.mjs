// Design measurements, printed rather than asserted.
//
// budget.mjs decides pass/fail. This prints the numbers behind those decisions
// so a change can be reasoned about before it is judged — which type sizes a page
// actually renders, and how much air each section carries.
//
// Both quantities have to come from the browser. Tailwind resolves rem against a
// page-level font-size the source never mentions, and section padding is set on
// inner wrappers, so grepping the class names reports 0px for every section.

import { LOCAL, PROD, launch } from "./harness.mjs";
import { open } from "./harness.mjs";

const BASE = process.env.BASE ?? (process.argv[2] === "prod" ? PROD : LOCAL);
const PATHS = (process.argv[3] ?? "/").split(",");

const browser = await launch();

for (const path of PATHS) {
  const { page, errors } = await open(browser, BASE + path);

  const sizes = await page.evaluate(() => {
    const counts = {};
    for (const el of document.querySelectorAll("body *")) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const s = Math.round(Number(getComputedStyle(el).fontSize.replace("px", "")));
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  });

  // Padding is what is set; the gap is what results. A section with py-28 top and
  // bottom puts 224px between the last text of one band and the first of the next,
  // so the two numbers describe the same design and must not be confused.
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll("section")].map((el) => {
      const inner = el.firstElementChild ?? el;
      const cs = getComputedStyle(inner);
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let top = Infinity;
      let bottom = -Infinity;
      while (walk.nextNode()) {
        const node = walk.currentNode;
        if (!node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const box = range.getBoundingClientRect();
        if (box.height === 0) continue;
        top = Math.min(top, box.top + window.scrollY);
        bottom = Math.max(bottom, box.bottom + window.scrollY);
      }
      return {
        id: el.id || "—",
        padding: `${cs.paddingTop}/${cs.paddingBottom}`,
        textHeight: Number.isFinite(top) ? Math.round(bottom - top) : 0,
        top: Number.isFinite(top) ? Math.round(top) : 0,
      };
    }),
  );

  console.log(`\n${path}  (${BASE})`);

  console.log("\n  type sizes  px × count");
  for (const [px, n] of Object.entries(sizes).sort((a, b) => a[0] - b[0])) {
    console.log(`    ${px.padStart(3)}  ×${String(n).padStart(3)}  ${"█".repeat(Math.min(n, 40))}`);
  }

  console.log("\n  sections   id · padding · painted text height · gap from the section above");
  let prevBottom = null;
  for (const s of sections) {
    const gap = prevBottom === null ? "—" : `${s.top - prevBottom}px`;
    console.log(`    ${s.id.padEnd(12)} ${s.padding.padEnd(14)} ${String(s.textHeight).padStart(5)}px   ${gap}`);
    prevBottom = s.top + s.textHeight;
  }

  if (errors.length > 0) console.log(`\n  page errors: ${errors.slice(0, 3).join(" | ")}`);
  await page.context().close();
}

await browser.close();
