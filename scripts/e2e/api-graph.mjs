// The agent route's guards. The authenticated happy path needs a browser
// session, which this repository cannot mint outside one; what can be checked
// without a session is that the route is not open to the world.
//
//   node scripts/e2e/api-graph.mjs [base]

import { check, launch, report } from "./harness.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const browser = await launch();
const page = await browser.newPage();

const post = async (data, headers = {}) => {
  const r = await page.request.post(`${BASE}/api/graph`, { data, headers, maxRedirects: 0 });
  return { status: r.status(), body: (await r.text()).slice(0, 120) };
};

const anonymous = await post({ analysisId: "00000000-0000-0000-0000-000000000000", file: "lib/env.ts" });
check(
  "an anonymous request never reaches the route",
  anonymous.status === 307 || anonymous.status === 401,
  String(anonymous.status),
);
check(
  "and is pointed at sign-in rather than handed data",
  !anonymous.body.includes("steps"),
  anonymous.body.replace(/\s+/g, " ").slice(0, 60),
);

await browser.close();
report();
