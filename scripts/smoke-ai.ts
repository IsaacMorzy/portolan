// Smoke test for the AI provider wiring. Runs without spending credit:
// every check is offline except the explicit live test at the end, which
// skips itself when the provider has no balance.
//
//   node --env-file=.env.local scripts/smoke-ai.ts
//
// Exits non-zero on the first failed check so it can gate a deploy.

import { model, modelId, provider } from "../lib/ai/client.ts";
import { cacheKey } from "../lib/ai/tasks.ts";

let failures = 0;

function check(name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
  if (!passed) failures++;
}

console.log(`provider: ${provider()}`);
console.log("");

// 1. Each role resolves to a provider-qualified model, and the bare id is what
//    goes in the request body.
const explain = model("explain");
const classify = model("classify");
check("explain model is provider-qualified", explain.includes("/"), explain);
check("classify model is provider-qualified", classify.includes("/"), classify);
check("explain model starts with the active provider", explain.startsWith(`${provider()}/`), explain);
check("modelId strips the provider prefix", modelId(explain) === explain.split("/")[1], modelId(explain));
check("modelId has no slash left", !modelId(classify).includes("/"), modelId(classify));

// 2. The provider is part of the cache key, so switching backends can't serve
//    an answer another backend produced.
const a = cacheKey("explain-file", "openai/gpt-5.5-2026-04-23", { file: "a.ts" });
const b = cacheKey("explain-file", "deepseek/deepseek-v4-pro", { file: "a.ts" });
check("cache key differs across providers", a !== b);
check("cache key is stable for one model", a === cacheKey("explain-file", "openai/gpt-5.5-2026-04-23", { file: "a.ts" }));

// 3. The model ids the configured provider will actually send.
const known: Record<string, string[]> = {
  deepseek: ["deepseek-flash", "deepseek-v4-pro"],
  openai: ["gpt-5.5-2026-04-23", "gpt-5.4-mini-2026-03-17"],
  cerebras: ["gpt-oss-120b", "qwen-3.8-27b"],
};
check("model id is a known id for this provider", known[provider()]?.includes(modelId(explain)) ?? false, modelId(explain));

// 4. Live call. Reported, not required: a provider with no credit still passes
//    the wiring checks above, which is the point of separating them.
const ENDPOINTS: Record<string, { keyVar: string; url: string; model: string }> = {
  openai: { keyVar: "OPENAI_API_KEY", url: "https://api.openai.com/v1/chat/completions", model: "gpt-5.4-mini-2026-03-17" },
  deepseek: { keyVar: "DEEPSEEK_API_KEY", url: "https://api.deepseek.com/chat/completions", model: "deepseek-flash" },
  cerebras: { keyVar: "CEREBRAS_API_KEY", url: "https://api.cerebras.ai/v1/chat/completions", model: "qwen-3.8-27b" },
};
const endpoint = ENDPOINTS[provider()];
const keyVar = endpoint.keyVar;
if (!process.env[keyVar]?.trim()) {
  console.log(`SKIP  live call — ${keyVar} is not set`);
} else {
  const res = await fetch(endpoint.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env[keyVar]}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: endpoint.model,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
      max_tokens: 5,
      reasoning_effort: "low",
    }),
  });
  const body = await res.text();
  if (res.ok) {
    console.log(`PASS  live call — HTTP ${res.status}: ${body.slice(0, 120)}`);
  } else if (body.includes("insufficient_balance") || body.includes("payment_required")) {
    console.log(`SKIP  live call — account has no balance (HTTP ${res.status}); add credit to enable`);
  } else {
    check("live call", false, `HTTP ${res.status}: ${body.slice(0, 160)}`);
  }
}

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("all wiring checks passed");
