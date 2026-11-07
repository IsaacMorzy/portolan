// The numbers this audit measured, asserted, so a later change cannot quietly
// make them worse. Every failure prints the value it saw — a verdict without a
// number is a verdict nobody can argue with or fix.
//
//   node scripts/e2e/budget.mjs [base]
//
// Deliberately not Lighthouse: a score floor invites tuning the score, while
// these are facts with a yes/no answer.

import { check, launch, report } from "./harness.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const failed = [];
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith(BASE)) failed.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

await page.goto(BASE, { waitUntil: "load" });
// A layout shift only counts once it has happened; this gives the fonts and
// the code block time to arrive and move something.
await page.waitForTimeout(1500);

const m = await page.evaluate(() => {
  const de = document.documentElement;
  const nav = performance.getEntriesByType("navigation")[0] ?? {};
  return {
    cls: Math.round(
      performance
        .getEntriesByType("layout-shift")
        .filter((e) => !e.hadRecentInput)
        .reduce((a, e) => a + e.value, 0) * 1000,
    ) / 1000,
    h1: [...document.querySelectorAll("h1")].length,
    h1Text: document.querySelector("h1")?.textContent?.trim().slice(0, 60) ?? "",
    h2: document.querySelectorAll("h2").length,
    domNodes: de.querySelectorAll("*").length,
    scrollW: de.scrollWidth,
    clientW: de.clientWidth,
    canonical: document.querySelector('link[rel="canonical"]')?.href ?? "",
    ogImage: document.querySelector('meta[property="og:image"]')?.content ?? "",
    jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content?.length ?? 0,
    dcl: Math.round(nav.domContentLoadedEventEnd ?? 0),
  };
});

check("cumulative layout shift stays under 0.02", m.cls < 0.02, String(m.cls));
check("exactly one h1", m.h1 === 1, `${m.h1} (${m.h1Text})`);
check("the page does not scroll sideways", m.scrollW <= m.clientW, `${m.scrollW} > ${m.clientW}`);
check("the DOM stays under 1200 nodes", m.domNodes < 1200, String(m.domNodes));

// The three SEO facts added in 04c1193. All of them are invisible until a
// crawler finds them missing, which is why they are asserted rather than
// trusted.
check("a canonical URL is declared", m.canonical.startsWith("https://"), m.canonical || "none");
check("a social card is declared", m.ogImage.length > 0, m.ogImage || "none");
check("structured data is present", m.jsonLd === 1, String(m.jsonLd));
check("a description of useful length is present", m.description >= 60, `${m.description} chars`);

// The card itself, not just the tag pointing at it. A meta tag pointing at a
// 500 is the exact failure mode a tag-only check misses.
const card = await page.request.get(`${BASE}/opengraph-image`, { maxRedirects: 0 });
check("the social card renders", card.status() === 200, `${card.status()}`);
check("and is a PNG", (card.headers()["content-type"] ?? "").includes("image/png"), card.headers()["content-type"] ?? "none");

// A page that is 200 while everything it needs is 404 is a page that is broken
// and pretending not to be.
check("no subresource failed", failed.length === 0, failed.slice(0, 3).join(", ") || "none");

await browser.close();
report();
