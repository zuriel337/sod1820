// The only place that talks to the Anthropic API. It fails closed: without the experiment's own credential no client is built and no request is made; there is no
// mock path, no default-credential fallback and no retry through another route. The credential is read from one environment variable and is never printed or stored.
import Anthropic from "@anthropic-ai/sdk";
import { API_BASE, KEY_ENV, NoCredentialError, MAX_INPUT_TOKENS_GUARD, PRICES, PROXY_JWT_ENV, PROXY_TOKEN_ENV, PROXY_URL_ENV, lockSha256, requestSha256 } from "./request.mjs";

export { KEY_ENV, NoCredentialError };

/** "direct" = the experiment's own key against the API; "proxy" = the site's request-locked pass-through (edge/handler.mjs). Neither: no client. */
export function transportOf(env = process.env) {
  if ((env[KEY_ENV] || "").trim()) return "direct";
  if ((env[PROXY_URL_ENV] || "").trim() && (env[PROXY_TOKEN_ENV] || "").trim() && (env[PROXY_JWT_ENV] || "").trim()) return "proxy";
  return null;
}

export function makeClient(env = process.env) {
  const transport = transportOf(env);
  if (!transport) throw new NoCredentialError();
  if (transport === "direct") return new Anthropic({ apiKey: env[KEY_ENV].trim(), authToken: null, baseURL: API_BASE, maxRetries: 2, timeout: 20 * 60 * 1000 });
  // the platform gateway wants a JWT in Authorization (the site's public anon key); the pass-through wants its own one-time token in x-els-token
  return new Anthropic({ apiKey: env[PROXY_JWT_ENV].trim(), authToken: null, baseURL: env[PROXY_URL_ENV].trim().replace(/\/$/, ""), defaultHeaders: { "x-els-token": env[PROXY_TOKEN_ENV].trim() }, maxRetries: 2, timeout: 5 * 60 * 1000 });
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
    thinking_setting: request.thinking?.type === "adaptive" ? caps.thinking?.types?.adaptive?.supported === true : true, // other settings are validated by the free count_tokens call below
    effort_level: effortOk,
    max_tokens_within_model_limit: request.max_tokens <= (info.max_tokens ?? 0),
  };
  const counted = await client.messages.countTokens({ model: request.model, system: request.system, messages: request.messages, ...(request.thinking ? { thinking: request.thinking } : {}) });
  const price = PRICES[request.model];
  const record = {
    ok: Object.values(checks).every(Boolean) && counted.input_tokens < MAX_INPUT_TOKENS_GUARD && counted.input_tokens + request.max_tokens <= (info.max_input_tokens ?? 0),
    model: request.model, display_name: info.display_name, listed: true, max_input_tokens: info.max_input_tokens, max_tokens_limit: info.max_tokens, checks,
    input_tokens_counted: counted.input_tokens, note: "count excludes the structured-output schema, which the API adds; the real input is slightly larger",
    upper_bound_usd: price ? Number(((counted.input_tokens * price.input * 1.25 + request.max_tokens * price.output) / 1e6).toFixed(4)) : null,
    request_sha256: requestSha256(request),
    lock_sha256: lockSha256(request),
  };
  return record;
}

/** One streamed call. Returns the final message and the wall-clock time; the caller decides what to do with refusals and truncation. */
export async function callRound(client, request) {
  const started = Date.now();
  const message = await client.messages.stream(request).finalMessage();
  return { message, ms: Date.now() - started };
}

/**
 * Batch results through the pass-through. The SDK follows the absolute `results_url` of the batch straight to the API, which would bypass the pass-through (and
 * the credential it holds), so in proxy mode the results are fetched from the pass-through itself. JSON Lines, one entry per request.
 */
export async function fetchBatchResults(env, batchId, fetchImpl = fetch) {
  const base = env[PROXY_URL_ENV].trim().replace(/\/$/, "");
  const response = await fetchImpl(`${base}/v1/messages/batches/${encodeURIComponent(batchId)}/results`, { headers: { authorization: `Bearer ${env[PROXY_JWT_ENV].trim()}`, "x-els-token": env[PROXY_TOKEN_ENV].trim(), "anthropic-version": "2026-10-21" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`results: HTTP ${response.status} ${text.slice(0, 200)}`);
  return text.split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
}

/**
 * The same request as a one-request Message Batch (used through the pass-through, whose platform wall clock is shorter than a long thinking call). Polls until the batch
 * has ended and returns the single result with the batch timestamps. A result that is not "succeeded" is returned as it is, never replaced.
 */
export async function callBatch(client, request, { customId = "els-live-1", pollMs = 15_000, maxWaitMs = 3 * 60 * 60 * 1000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), onPoll = () => {}, results = null } = {}) {
  const started = Date.now();
  const created = await client.messages.batches.create({ requests: [{ custom_id: customId, params: request }] });
  let current = created;
  while (current.processing_status !== "ended") {
    if (Date.now() - started > maxWaitMs) throw new Error(`batch ${created.id} did not end within ${maxWaitMs} ms`);
    await sleep(pollMs);
    current = await client.messages.batches.retrieve(created.id);
    onPoll(current);
  }
  let result = null;
  const entries = results ? await results(created.id) : await client.messages.batches.results(created.id);
  for await (const entry of entries) if (entry.custom_id === customId) result = entry.result;
  return { batch: { id: created.id, created_at: current.created_at ?? created.created_at, ended_at: current.ended_at, request_counts: current.request_counts }, result, ms: Date.now() - started };
}
