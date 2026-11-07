import OpenAI from "openai";
import { wrapOpenAI } from "langsmith/wrappers/openai";

// The one place the AI client is constructed. A client built anywhere else
// would work and silently go untraced, so nothing else imports "openai".
//
// Two providers are supported. Both speak the OpenAI wire format, so one SDK
// serves both; what differs is the base URL, the model names, and which
// request fields each backend accepts. A caller asks for a model *role*
// ("explain"/"classify") and this file resolves it to a provider and a model,
// so no call site has to know which backend is configured.

export type Provider = "openai" | "deepseek" | "cerebras";

/** The models each provider uses, per role. Exact snapshots, never a moving
 * alias: an alias changes the model under a cached answer without changing its
 * key. Each model is part of its own tasks' cache keys, so re-pinning one
 * invalidates only its own answers. */
const PROVIDER_MODELS = {
  openai: {
    explain: "gpt-5.5-2026-04-23",
    classify: "gpt-5.4-mini-2026-03-17",
  },
  deepseek: {
    explain: "deepseek-v4-pro",
    classify: "deepseek-flash",
  },
  // Two models, not a family: the reasoning one explains, the small one
  // classifies. Split by role because classify runs once per file and a
  // reasoning model there costs latency for an answer that is a label.
  cerebras: {
    explain: "gpt-oss-120b",
    classify: "qwen-3.8-27b",
  },
} as const satisfies Record<Provider, Record<string, string>>;

/** The roles a model is selected for. */
export type ModelRoleName = keyof (typeof PROVIDER_MODELS)["openai"];

/** A provider-qualified model string, e.g. "deepseek/deepseek-flash". */
export type ModelTag = `${Provider}/${string}`;

function envProvider(): Provider {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (raw === "deepseek") return "deepseek";
  if (raw === "openai") return "openai";
  if (raw === "cerebras") return "cerebras";
  if (raw) throw new Error(`AI_PROVIDER is "${raw}", which isn't a provider; use "openai", "deepseek" or "cerebras"`);
  // Unset: pick whichever key exists, preferring OpenAI, so an existing setup
  // that never set AI_PROVIDER keeps working unchanged.
  return process.env.OPENAI_API_KEY?.trim() ? "openai" : "deepseek";
}

export function provider(): Provider {
  return envProvider();
}

/** The provider-qualified model string for a role. The provider is part of the
 * value, so a cached answer made by one backend is never served for the other. */
export function model(tag: ModelRoleName): ModelTag {
  const p = envProvider();
  return `${p}/${PROVIDER_MODELS[p][tag]}`;
}

/** The bare model id the provider expects in the request body. */
export function modelId(tag: ModelTag): string {
  return tag.slice(tag.indexOf("/") + 1);
}

export type TracingStatus = { on: true; project: string } | { on: false; reason: string };

// An absent key looks exactly like a working setup with no traffic, so the
// state is reported with every answer instead of being inferred.
export function tracingStatus(): TracingStatus {
  if (process.env.LANGSMITH_TRACING?.trim() !== "true") return { on: false, reason: "LANGSMITH_TRACING isn't \"true\"" };
  if (!process.env.LANGSMITH_API_KEY?.trim()) return { on: false, reason: "LANGSMITH_API_KEY isn't set" };
  return { on: true, project: process.env.LANGSMITH_PROJECT?.trim() || "default" };
}

const BASE_URLS: Record<Provider, string | undefined> = {
  openai: undefined, // SDK default
  deepseek: "https://api.deepseek.com",
  cerebras: "https://api.cerebras.ai/v1",
};

const KEY_VARS: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
};

let client: { provider: Provider; sdk: OpenAI } | null = null;

// Built on first use rather than at import, so a missing key fails the call
// that needed it with a message saying so, not the server's boot.
export function ai(): OpenAI {
  const p = envProvider();
  if (client?.provider === p) return client.sdk;
  const keyVar = KEY_VARS[p];
  const apiKey = process.env[keyVar]?.trim();
  if (!apiKey) throw new Error(`${keyVar} isn't set in .env.local, so nothing can be explained`);
  const sdk = wrapOpenAI(new OpenAI({ apiKey, baseURL: BASE_URLS[p] }), { tracingEnabled: tracingStatus().on });
  client = { provider: p, sdk };
  return sdk;
}

/**
 * How every traced step is recorded. Whatever runs inside it, the cache read
 * included, is one run, so a cache hit shows up as a run with no model call
 * under it. With tracing off the function runs exactly the same, untraced.
 */
export function traceConfig(name: string) {
  return { name, run_type: "chain", tracingEnabled: tracingStatus().on } as const;
}
