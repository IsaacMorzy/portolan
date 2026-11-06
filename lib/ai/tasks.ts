import { createHash } from "node:crypto";
import { isModelRole, MODEL_ROLES, type ModelRole } from "../roles.ts";
import { traceable } from "langsmith/traceable";
import { ai, model, modelId, provider, traceConfig } from "./client.ts";
import {
  CLASSIFY_SYSTEM,
  classifyMessage,
  EXPLAIN_FILE_SYSTEM,
  EXPLAIN_FOLDER_SYSTEM,
  explainFileMessage,
  explainFolderMessage,
  PROMPT_VERSION,
  type ClassifyInput,
  type FileInput,
  type FolderInput,
} from "./prompts.ts";

// The model calls, each behind its cache. The cache read is the first thing
// inside the traced function, so a hit is still a recorded run, one with no
// model call in it, and a broken cache is visible as a trace full of calls.

export type Task = "explain-file" | "explain-folder" | "classify-file";

export type Cache = {
  read: (key: string) => Promise<string | null>;
  write: (entry: { key: string; task: Task; model: string; body: string }) => Promise<void>;
};

export type Explanation = { body: string; model: string; cached: boolean };

// The source is only fetched on a miss: a hit answers from the stored hash alone.
export type SourceOf = () => Promise<string>;

// The largest file the parser reads is well under this; it's a backstop
// against an unexpectedly huge prompt, and the model is told when it applies.
const MAX_SOURCE_CHARS = 120_000;
const EXCERPT_LINES = 60;

export function cacheKey(task: Task, model: string, input: unknown): string {
  return createHash("sha256").update(JSON.stringify({ task, version: PROMPT_VERSION, model, input })).digest("hex");
}

export async function explainFile(input: FileInput, deps: { cache: Cache; source: SourceOf }): Promise<Explanation> {
  const m = model("explain");
  const run = traceable(async (question: FileInput): Promise<Explanation> => {
    const key = cacheKey("explain-file", m, question);
    const hit = await deps.cache.read(key);
    if (hit !== null) return { body: hit, model: m, cached: true };
    const body = await complete(m, EXPLAIN_FILE_SYSTEM, explainFileMessage(question, capped(await deps.source())));
    await deps.cache.write({ key, task: "explain-file", model: m, body });
    return { body, model: m, cached: false };
  }, traceConfig("explain-file"));
  return run(input);
}

export async function explainFolder(input: FolderInput, deps: { cache: Cache }): Promise<Explanation> {
  const m = model("explain");
  const run = traceable(async (question: FolderInput): Promise<Explanation> => {
    const key = cacheKey("explain-folder", m, question);
    const hit = await deps.cache.read(key);
    if (hit !== null) return { body: hit, model: m, cached: true };
    const body = await complete(m, EXPLAIN_FOLDER_SYSTEM, explainFolderMessage(question));
    await deps.cache.write({ key, task: "explain-folder", model: m, body });
    return { body, model: m, cached: false };
  }, traceConfig("explain-folder"));
  return run(input);
}

// "none" is a real answer, and cached like any other: the model wasn't made
// to pick something when nothing fits, and the file stays unclassified.
const NONE = "none";

export async function classifyFile(input: ClassifyInput, deps: { cache: Cache; source: SourceOf }): Promise<{ role: ModelRole | null; cached: boolean }> {
  const m = model("classify");
  const run = traceable(async (question: ClassifyInput): Promise<{ role: ModelRole | null; cached: boolean }> => {
    const key = cacheKey("classify-file", m, question);
    const hit = await deps.cache.read(key);
    if (hit !== null) return { role: parseRole(hit), cached: true };
    const excerpt = (await deps.source()).split("\n").slice(0, EXCERPT_LINES).join("\n");
    const response = await ai().chat.completions.create({
      model: modelId(m),
      messages: [
        { role: "system", content: classifySystem() },
        { role: "user", content: classifyMessage(question, excerpt) },
      ],
      ...reasoning("low"),
      ...roleSchema(),
    });
    const answer = readRole(response.choices[0]?.message.content ?? null);
    // Parsed before caching, so a refused answer is never stored and served.
    const role = parseRole(answer);
    await deps.cache.write({ key, task: "classify-file", model: m, body: answer });
    return { role, cached: false };
  }, traceConfig("classify-file"));
  return run(input);
}

/**
 * Both providers accept `reasoning_effort`, but with different value sets:
 * OpenAI wants none/low/medium/high, DeepSeek none/low/high/max. "low" is
 * valid for both, so the call sites pass that and this keeps the field
 * explicit for each backend.
 */
function reasoning(level: "low") {
  return { reasoning_effort: level } as const;
}

/**
 * The role answer must be JSON, but the two backends enforce that differently.
 * OpenAI supports a strict `json_schema`; DeepSeek only supports
 * `json_object`, which guarantees syntactically valid JSON but not a shape,
 * so the enum is restated in the instruction and the answer is validated by
 * parseRole either way. A provider that gained schema support should be
 * switched here, not at the call site.
 */
function roleSchema() {
  const allowed = [...MODEL_ROLES, NONE];
  if (provider() === "openai") {
    return {
      response_format: {
        type: "json_schema" as const,
        json_schema: {
          name: "file_role",
          strict: true,
          schema: {
            type: "object",
            properties: { role: { type: "string", enum: allowed } },
            required: ["role"],
            additionalProperties: false,
          },
        },
      },
    };
  }
  // DeepSeek's json_object mode only guarantees valid JSON, and its docs warn
  // that without a JSON instruction in the prompt the model can emit
  // whitespace until the token limit. The shape is therefore spelled out in
  // the system message below.
  return { response_format: { type: "json_object" as const } };
}

/** The system message for classification, adding the JSON shape only for the
 * provider whose response_format can't enforce it. */
function classifySystem(): string {
  if (provider() === "openai") return CLASSIFY_SYSTEM;
  const allowed = [...MODEL_ROLES, NONE];
  return `${CLASSIFY_SYSTEM}\n\nReply with only a JSON object of the form {"role": "<one of: ${allowed.join(", ")}>"} and nothing else.`;
}

function parseRole(answer: string): ModelRole | null {
  if (answer === NONE) return null;
  // Structural roles aren't in the schema, but the answer is checked rather
  // than trusted: convention alone decides what's routable.
  if (!isModelRole(answer)) throw new Error(`The model answered the role "${answer}", which it isn't allowed to give`);
  return answer;
}

function readRole(content: string | null): string {
  if (!content) throw new Error("The model returned no role");
  const parsed: unknown = JSON.parse(content);
  const role: unknown = typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "role") : undefined;
  if (typeof role !== "string") throw new Error(`The model's answer had no role: ${content}`);
  return role;
}

async function complete(tag: ReturnType<typeof model>, system: string, user: string): Promise<string> {
  const id = modelId(tag);
  const response = await ai().chat.completions.create({
    model: id,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    ...reasoning("low"),
    // `verbosity` is OpenAI-only; DeepSeek rejects unknown fields, so it is
    // sent only where the backend accepts it.
    ...(provider() === "openai" ? { verbosity: "low" as const } : {}),
  });
  const body = response.choices[0]?.message.content?.trim();
  if (!body) throw new Error(`${id} returned an empty answer (finish reason: ${response.choices[0]?.finish_reason ?? "none"})`);
  return body;
}

function capped(source: string): string {
  if (source.length <= MAX_SOURCE_CHARS) return source;
  const kept = source.slice(0, MAX_SOURCE_CHARS);
  return `${kept}\n[… source truncated here: ${source.length - MAX_SOURCE_CHARS} more characters not shown]`;
}
