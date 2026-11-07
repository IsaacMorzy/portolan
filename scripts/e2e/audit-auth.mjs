// The authenticated half of the audit: /dashboard and /analyses/:id.
//
// audit.mjs covers what a signed-out visitor can reach, which is the landing
// page and the auth screens. The two surfaces this product actually exists for
// were the only ones with no landmark, naming or description coverage — a
// contrast and type-scale pass is not the same as asking whether the screen has
// one h1 and a label on every control.
//
// Signing in uses a Clerk sign-in token, which is single-use and minted per run:
//
//   POST https://api.clerk.com/v1/sign_in_tokens  {"user_id","expires_in_seconds"}
//   open  /sign-in?__clerk_ticket=<token>   ->  lands on /dashboard
//
// Needs CLERK_SECRET_KEY and a user id in the environment, so it is not part of
// `pnpm e2e`; run it deliberately:
//
//   node --env-file=.env.local scripts/e2e/audit-auth.mjs
//
// ANALYSIS_ID defaults to the repository probe recorded in AGENTS.md.

import { LOCAL, PROD, launch } from "./harness.mjs";

const BASE = process.env.BASE ?? (process.argv[2] === "prod" ? PROD : LOCAL);
const SECRET = process.env.CLERK_SECRET_KEY;
const USER = process.env.E2E_USER_ID ?? "user_3Lkl0pNNiNdWT044Yer13X1ajga";
const ANALYSIS = process.env.ANALYSIS_ID ?? "6631d51a-0035-42da-9d17-f8f0809b4e4f";

if (!SECRET) {
  console.error("CLERK_SECRET_KEY is not set. Run with --env-file=.env.local");
  process.exit(2);
}

const minted = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
  method: "POST",
  headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
  body: JSON.stringify({ user_id: USER, expires_in_seconds: 300 }),
});
if (!minted.ok) {
  console.error(`could not mint a sign-in token: HTTP ${minted.status} ${(await minted.text()).slice(0, 120)}`);
  process.exit(2);
}
const { token } = await minted.json();

// Vercel's per-IP checkpoint answers 403 with a challenge page for a burst of
// document requests. It is temporary, it is not a defect in the page, and the
// header names it — so wait it out instead of reporting a broken dashboard.
async function visit(page, url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => null);
    const challenged = response?.status() === 403 || response?.headers()["x-vercel-mitigated"] === "challenge";
    if (!challenged) return response;
    if (attempt === 3) {
      console.error(`
  BLOCKED  ${url}\n  Vercel's per-IP checkpoint is challenging this address. Not a page defect.\n  Wait it out, or run against ${LOCAL} once Clerk is configured for it.\n`);
      process.exit(3);
    }
    await page.waitForTimeout(15_000);
  }
}

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const noise = [];
page.on("requestfailed", (r) => noise.push(`${r.url().slice(0, 80)} — ${r.failure()?.errorText ?? "?"}`));

// Sign in. The ticket is single-use, so this happens once and the session is
// reused for both pages afterwards.
await page.goto(`${BASE}/sign-in?__clerk_ticket=${token}`, { waitUntil: "domcontentloaded" });
await page.waitForURL(/\/dashboard/, { timeout: 60_000 }).catch(() => {});
await page.waitForTimeout(2500);

const landed = new URL(page.url()).pathname;
check("a single-use ticket lands on /dashboard", landed.startsWith("/dashboard"), landed);

for (const [label, path] of [
  ["/dashboard", "/dashboard"],
  ["/analyses/:id", `/analyses/${ANALYSIS}`],
]) {
  const response = await visit(page, BASE + path);
  await page.waitForTimeout(2600);
  const status = response ? response.status() : 0;

  const shape = await page.evaluate(() => {
    const text = (el) => (el.textContent ?? "").trim();
    return {
      title: document.title,
      h1: document.querySelectorAll("h1").length,
      headings: [...document.querySelectorAll("h1,h2,h3")].map((h) => `${h.tagName}:${text(h).slice(0, 28)}`),
      namelessButtons: [...document.querySelectorAll("button")].filter(
        (b) => !text(b) && !b.getAttribute("aria-label") && !b.querySelector("img[alt]"),
      ).length,
      namelessLinks: [...document.querySelectorAll("a")].filter(
        (a) => !text(a) && !a.getAttribute("aria-label"),
      ).length,
      imgsNoAlt: [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length,
      inputsUnlabelled: [...document.querySelectorAll("input,select,textarea")].filter((i) => {
        if (i.type === "hidden") return false;
        const id = i.getAttribute("id");
        return !(i.getAttribute("aria-label") || i.getAttribute("aria-labelledby") || (id && document.querySelector(`label[for="${id}"]`))
          || i.closest("label"));
      }).length,
      sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
      // A screen that renders an empty shell still passes every structural check,
      // so the length of painted text is the assertion that it has content.
      textLength: document.body.innerText.replace(/\s+/g, " ").trim().length,
    };
  });

  const pad = label.padEnd(15);
  check(`${pad} answers < 400`, status > 0 && status < 400, `HTTP ${status}`);
  check(`${pad} has exactly one h1`, shape.h1 === 1, `${shape.h1}`);
  check(`${pad} names every control`, shape.namelessButtons === 0 && shape.namelessLinks === 0 && shape.imgsNoAlt === 0
    && shape.inputsUnlabelled === 0,
    `btn ${shape.namelessButtons} / a ${shape.namelessLinks} / img ${shape.imgsNoAlt} / input ${shape.inputsUnlabelled}`);
  check(`${pad} fits the viewport`, !shape.sideways, shape.sideways ? "scrolls sideways at 1440" : "");
  check(`${pad} renders content`, shape.textLength > 120, `${shape.textLength} chars of painted text`);
  check(`${pad} is not the sign-in screen`, !/^Sign in/.test(shape.title), shape.title);

  console.log(`      headings: ${shape.headings.join(" › ") || "(none)"}`);
}

const real = noise.filter((m) => !/favicon|clerk\.codegraph-navy\.vercel\.app/i.test(m));
check("no failed subresource", real.length === 0, real.slice(0, 2).join(" | ") || "none");

await browser.close();
console.log(`\n${failures === 0 ? "all checks passed" : `${failures} failed`} — ${BASE}`);
process.exit(failures === 0 ? 0 : 1);
