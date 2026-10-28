// The only place that talks to the Anthropic API. It fails closed: without the experiment's own credential no client is built and no request is made; there is no
// mock path, no default-credential fallback and no retry through another route. The credential is read from one environment variable and is never printed or stored.
import Anthropic from "@anthropic-ai/sdk";
import { API_BASE, KEY_ENV, NoCredentialError, MAX_INPUT_TOKENS_GUARD, PRICES, requestSha256 } from "./request.mjs";

export { KEY_ENV, NoCredentialError };

export function makeClient(env = process.env) {
  const apiKey = (env[KEY_ENV] || "").trim();
  if (!apiKey) throw new NoCredentialError();
  return new Anthropic({ apiKey, authToken: null, baseURL: API_BASE, maxRetries: 2, timeout: 20 * 60 * 1000 });
}

/** Everything that can be learned without spending tokens: the model is listed, its limits and capabilities, and the exact token count of the request. */
export async function preflight(client, request) {
  const ids = [];
  for await (const model of client.models.list()) ids.push(model.id);
  if (!ids.includes(request.model)) return { ok: false, reason: `model ${request.model} is not available to this credential`, availableSample: ids.slice(0, 30) };
  const info = await client.models.retrieve(request.model);
  const caps = info.capabilities ?? {};
  const effortOk = caps.effort?.[request.output_config.effort]?.supported === true;
  const checks = {
    structured_outputs: caps.structured_outputs?.supported === true,
    adaptive_thinking: caps.thinking?.types?.adaptive?.supported === true,
    effort_level: effortOk,
    max_tokens_within_model_limit: request.max_tokens <= (info.max_tokens ?? 0),
  };
  const counted = await client.messages.countTokens({ model: request.model, system: request.system, messages: request.messages, thinking: request.thinking });
  const price = PRICES[request.model];
  const record = {
    ok: Object.values(checks).every(Boolean) && counted.input_tokens < MAX_INPUT_TOKENS_GUARD && counted.input_tokens + request.max_tokens <= (info.max_input_tokens ?? 0),
    model: request.model, display_name: info.display_name, listed: true, max_input_tokens: info.max_input_tokens, max_tokens_limit: info.max_tokens, checks,
    input_tokens_counted: counted.input_tokens, note: "count excludes the structured-output schema, which the API adds; the real input is slightly larger",
    upper_bound_usd: price ? Number(((counted.input_tokens * price.input * 1.25 + request.max_tokens * price.output) / 1e6).toFixed(4)) : null,
    request_sha256: requestSha256(request),
  };
  return record;
}

/** One streamed call. Returns the final message and the wall-clock time; the caller decides what to do with refusals and truncation. */
export async function callRound(client, request) {
  const started = Date.now();
  const message = await client.messages.stream(request).finalMessage();
  return { message, ms: Date.now() - started };
}
