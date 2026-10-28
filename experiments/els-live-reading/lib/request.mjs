// Request construction, cost arithmetic and message summaries. No SDK import here: these pieces are testable without the experiment's dependencies and
// never touch the network.
import { createHash } from "node:crypto";
import { FINDINGS_SCHEMA } from "./prompt.mjs";

export const KEY_ENV = "ELS_EXPERIMENT_ANTHROPIC_KEY";
export const API_BASE = "https://api.anthropic.com";
export const MAX_INPUT_TOKENS_GUARD = 150_000; // refuse rather than truncate

export class NoCredentialError extends Error {
  constructor() { super(`no credential: ${KEY_ENV} is not set. Refusing to call any model; nothing was sent.`); this.name = "NoCredentialError"; }
}

/** USD per million tokens, from the Claude API model table cached 2026-10-06 (prompts up to 100K tokens for Haiku 5.5). cacheRead defaults to 0.1x input. */
export const PRICES = Object.freeze({
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
});

/** How thinking is requested. "adaptive" is the default (summaries on); some models take other settings: "between_tools" turns reasoning off on Sonnet 5.5, "disabled" on models that allow it, "none" omits the field. */
export const THINKING_MODES = Object.freeze({
  adaptive: { type: "adaptive", display: "summarized" },
  "adaptive-plain": { type: "adaptive" },
  between_tools: { type: "between_tools" },
  disabled: { type: "disabled" },
  none: undefined,
});

export function buildRequest({ model, system, messages, effort = "high", maxTokens = 32_000, cache = false, thinkingMode = "adaptive" }) {
  if (!(thinkingMode in THINKING_MODES)) throw new Error(`unknown thinking mode: ${thinkingMode}`);
  const request = { model, max_tokens: maxTokens, system, messages };
  if (THINKING_MODES[thinkingMode]) request.thinking = THINKING_MODES[thinkingMode];
  request.output_config = { effort, format: { type: "json_schema", schema: FINDINGS_SCHEMA } };
  if (cache) request.cache_control = { type: "ephemeral" };
  return request;
}

export const requestSha256 = (request) => createHash("sha256").update(JSON.stringify(request), "utf8").digest("hex");

/** Key-sorted JSON: the same text in every runtime, so the same hash on both sides of the pass-through (see edge/handler.mjs). */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
/** The hash the pass-through checks: SHA-256 of the canonical JSON of the request parameters (a streaming flag, if any, is not part of the parameters). */
export const lockSha256 = (request) => createHash("sha256").update(canonicalJson(request), "utf8").digest("hex");

export const PROXY_URL_ENV = "ELS_PROXY_URL";
export const PROXY_TOKEN_ENV = "ELS_PROXY_TOKEN";
export const PROXY_JWT_ENV = "ELS_PROXY_JWT";

/** Cost computed from the usage object and the list prices above (not an invoice). Thinking tokens are part of output_tokens. */
export function costOf(model, usage, { batch = false } = {}) {
  const price = PRICES[model];
  if (!price || !usage) return { usd: null, basis: price ? "no usage" : `no list price recorded for ${model}` };
  const read = price.cacheRead ?? price.input * 0.1;
  const parts = {
    input: ((usage.input_tokens ?? 0) * price.input) / 1e6,
    cacheWrite: ((usage.cache_creation_input_tokens ?? 0) * price.input * 1.25) / 1e6,
    cacheRead: ((usage.cache_read_input_tokens ?? 0) * read) / 1e6,
    output: ((usage.output_tokens ?? 0) * price.output) / 1e6,
  };
  const factor = batch ? 0.5 : 1;
  return { usd: Number((Object.values(parts).reduce((a, b) => a + b, 0) * factor).toFixed(6)), parts, basis: `list prices, claude-api model table cached 2026-10-06; cache writes at 1.25x input${batch ? "; Message Batches at 50% of list" : ""}` };
}

export function summarizeMessage(message) {
  const text = (message.content ?? []).filter((block) => block.type === "text").map((block) => block.text).join("");
  const thinking = (message.content ?? []).filter((block) => block.type === "thinking").map((block) => block.thinking);
  return { text, thinking, stop_reason: message.stop_reason, stop_details: message.stop_details ?? null, model: message.model, usage: message.usage, id: message.id };
}
