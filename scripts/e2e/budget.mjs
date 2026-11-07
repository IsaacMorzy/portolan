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

// Contrast, computed from what the browser actually painted rather than from
// the token file. Dark mode read as dim twice in a row and both times it was a
// pair nobody had added up: #8d8d96 on #131315 is 5.6:1 — technically passing,
// perceptibly muddy at 12px. The rule here is the WCAG one, so a failure is
// arguable; the point is that it is now measured on every run instead of being
// noticed on a screenshot three weeks later.
const contrast = await page.evaluate(() => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.5) return c;
      n = n.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
  };
  const bad = [];
  for (const el of document.querySelectorAll("p, span, li, a, h1, h2, h3, div")) {
    // Only elements that paint their own text.
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.9) continue;
    const fg = parse(cs.color);
    if (!fg || fg.a < 0.9) continue;
    const bg = bgOf(el);
    const l1 = lum(fg), l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = Number(cs.fontSize.replace("px", ""));
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) bad.push(`${(el.textContent ?? "").trim().slice(0, 24)} ${ratio.toFixed(2)}:1 < ${need}`);
  }
  return { checked: document.querySelectorAll("p, span, li, a, h1, h2, h3").length, bad: bad.slice(0, 3), count: bad.length };
});
check("every text pair clears WCAG AA in light", contrast.count === 0, contrast.bad.join(" | ") || "none");

// The same pass in dark, because a token can exist in one mode and be absent in
// the other, and that is the failure this project actually hit twice.
await page.context().addCookies([{ name: "theme", value: "dark", url: BASE }]);
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(1200);
const darkContrast = await page.evaluate(() => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.5) return c;
      n = n.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor) ?? { r: 0, g: 0, b: 0, a: 1 };
  };
  const bad = [];
  for (const el of document.querySelectorAll("p, span, li, a, h1, h2, h3, div")) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.9) continue;
    const fg = parse(cs.color);
    if (!fg || fg.a < 0.9) continue;
    const bg = bgOf(el);
    const l1 = lum(fg), l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = Number(cs.fontSize.replace("px", ""));
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) bad.push(`${(el.textContent ?? "").trim().slice(0, 24)} ${ratio.toFixed(2)}:1 < ${need}`);
  }
  return { count: bad.length, bad: bad.slice(0, 3), theme: document.documentElement.dataset.theme ?? "?" };
});
// Section padding (docs/design-system.md §5). Checking padding rather than the
// resulting gap is deliberate: the gap depends on how much text a band happens
// to hold, so a gap test fails on content and says nothing about the system.
// Padding is the thing someone actually typed, and it has two legal values.
// 128 is the closing band only: the last section gets more air than a mid-page
// one because nothing follows it to carry the eye onward.
const SECTION_PAD = ["80px", "112px", "128px"];
const pads = await page.evaluate(() =>
  [...document.querySelectorAll("main section, section")]
    .map((el) => {
      const cs = getComputedStyle(el);
      const inner = el.firstElementChild ?? el;
      const ics = getComputedStyle(inner);
      return { pt: ics.paddingTop, pb: ics.paddingBottom, own: cs.paddingTop };
    })
    .filter((x) => x.pt !== "0px" || x.pb !== "0px"),
);
const offPad = pads.filter((x) => !SECTION_PAD.includes(x.pt) || x.pt !== x.pb);
check(
  "every landing section is padded symmetrically from the scale",
  offPad.length === 0,
  offPad.map((x) => `${x.pt}/${x.pb}`).join(", ") || `${pads.length} sections`,
);

// The type scale (docs/design-system.md §4). Twelve sizes exist; a thirteenth is
// a design decision, not a `text-[19px]` typed at 1am. This has to be read from
// the browser rather than grepped from source, because Tailwind resolves rem
// against a page-level font-size the source never mentions.
const SCALE = [11, 12, 13, 14, 15, 17, 20, 26, 32, 40, 56, 80];
const drift = (sizes) =>
  [...new Set(sizes.map((s) => Math.round(Number(s.replace("px", "")))))].filter((px) => !SCALE.includes(px));

const lightSizes = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    out.push(getComputedStyle(el).fontSize);
  }
  return out;
});
const lightDrift = drift(lightSizes);
check("every rendered type size is on the scale", lightDrift.length === 0, lightDrift.join("px, ") + (lightDrift.length ? "px — not in docs/design-system.md §4" : "none"));

check("and in dark, where the failures actually were", darkContrast.count === 0, `${darkContrast.theme}: ${darkContrast.bad.join(" | ") || "none"}`);

// A page that is 200 while everything it needs is 404 is a page that is broken
// and pretending not to be.
check("no subresource failed", failed.length === 0, failed.slice(0, 3).join(", ") || "none");

await browser.close();
report();
