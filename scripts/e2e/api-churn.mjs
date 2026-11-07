// G4 (#26) turns our GITHUB_TOKEN into something a caller could point at any
// repository on GitHub, so the route must be closed to an anonymous caller
// before it is checked for anything else.
//
//   node scripts/e2e/api-churn.mjs [base]

import { check, launch, report } from "./harness.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const browser = await launch();
const page = await browser.newPage();

const post = async (data) => {
  const r = await page.request.post(`${BASE}/api/churn`, { data, maxRedirects: 0 });
  return { status: r.status(), body: (await r.text()).slice(0, 120) };
};

const anonymous = await post({ analysisId: "00000000-0000-0000-0000-000000000000", path: "lib/env.ts" });
check(
  "an anonymous churn request never reaches the route",
  anonymous.status === 307 || anonymous.status === 401,
  String(anonymous.status),
);
check(
  "and no commit count comes back",
  !anonymous.body.includes("commits"),
  anonymous.body.replace(/\s+/g, " ").slice(0, 60),
);

await browser.close();
report();
