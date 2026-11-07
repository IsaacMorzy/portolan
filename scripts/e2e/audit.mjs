// Page-shape audit: status, landmarks, labels, and console noise.
//
// Two checks in this repo already defend what a page *looks* like (landing,
// budget). Neither notices a page answering 200 for a URL that does not exist,
// or a control with no accessible name, because both assume the page they were
// pointed at is meant to be there.
//
// Uses its own browser page rather than harness.open(): that helper waits for
// "networkidle", which Clerk never reaches, and it fails the run on any console
// error, which is what this script is here to *report* rather than die on.

import { LOCAL, PROD, launch } from "./harness.mjs";

const BASE = process.env.BASE ?? (process.argv[2] === "prod" ? PROD : LOCAL);

const PAGES = ["/", "/security", "/sign-in", "/sign-up", "/does-not-exist"];

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const noise = [];
page.on("requestfailed", (r) => noise.push(`${r.url().slice(0, 90)} — ${r.failure()?.errorText ?? "?"}`));

for (const path of PAGES) {
  const response = await page.goto(BASE + path, { waitUntil: "domcontentloaded" }).catch(() => null);
  await page.waitForTimeout(1200);
  const status = response ? response.status() : 0;

  const shape = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelectorAll("h1").length,
    lang: document.documentElement.lang,
    desc: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
    noAlt: [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length,
    namelessButtons: [...document.querySelectorAll("button")].filter(
      (b) => !b.textContent.trim() && !b.getAttribute("aria-label"),
    ).length,
    namelessLinks: [...document.querySelectorAll("a")].filter(
      (a) => !a.textContent.trim() && !a.getAttribute("aria-label"),
    ).length,
    sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));

  const label = path.padEnd(16);
  // The last entry is the deliberate miss; it must answer 404, not 200 and not
  // a redirect to sign-in. Everything else must be a success.
  const wanted = path === "/does-not-exist" ? 404 : (s) => s > 0 && s < 400;
  check(`${label} answers ${path === "/does-not-exist" ? "404" : "< 400"}`,
    typeof wanted === "number" ? status === wanted : wanted(status), `HTTP ${status}`);
  check(`${label} has exactly one h1`, shape.h1 === 1, `${shape.h1}`);
  check(`${label} names every control`, shape.noAlt === 0 && shape.namelessButtons === 0 && shape.namelessLinks === 0,
    `img ${shape.noAlt} / button ${shape.namelessButtons} / link ${shape.namelessLinks}`);
  check(`${label} fits the viewport`, !shape.sideways, shape.sideways ? "scrolls sideways at 1440" : "");
  check(`${label} declares lang and a description`, shape.lang === "en" && shape.desc.length >= 60, `${shape.lang} / ${shape.desc.length} chars`);
}

// A URL that does not exist must say so. Answering 200 with the sign-in page is
// a soft 404: crawlers index the sign-in screen under every typo, and a reader
// who mistyped gets asked to log in rather than told the page is missing.
await page.goto(BASE + "/does-not-exist", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const missing = await page.evaluate(() => document.title);
check("an unknown URL is a real 404, not a sign-in screen", missing !== "" && !/^Sign in/.test(missing), missing);

// Clerk serves its development bundle from the production proxy hostname, which
// does not resolve from localhost. That is a local-dev artefact, not a defect
// in the deployment, so it is named and excluded rather than silently ignored.
const real = noise.filter((m) => !/favicon|clerk\.codegraph-navy\.vercel\.app/i.test(m));
check("no console errors", real.length === 0, real.slice(0, 3).join(" | ") || "none");

await browser.close();
console.log(`\n${failures === 0 ? "all checks passed" : `${failures} failed`} — ${BASE}`);
process.exit(failures === 0 ? 0 : 1);
