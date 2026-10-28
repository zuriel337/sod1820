// @ts-nocheck
// Request-locked, token-gated pass-through to the Anthropic API for ONE experiment (EXP-15). It is deployed as a NEW, temporary edge function and replaced by a
// 410 stub after the run. It has no database access, writes no logs, stores nothing, and only forwards:
//   GET  /v1/models, /v1/models/{id}                    (listing and capabilities: no tokens billed)
//   POST /v1/messages/count_tokens                      (exact token count: no tokens billed; model allow-listed)
//   POST /v1/messages/batches                           (exactly one request whose canonical params hash is on the approved list; model allow-listed)
//   GET  /v1/messages/batches/{id}[/results], POST .../cancel
// Everything else is refused. The credential used upstream is the site's existing ANTHROPIC_API_KEY secret, which never leaves the function.

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const same = (a, b) => { if (!a || !b || a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; };
const refuse = (status, error) => new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json" } });
const BATCH_ID = /^msgbatch_[A-Za-z0-9]{8,64}$/;
const MODEL_ID = /^[a-z0-9][a-z0-9.-]{2,60}$/;
const CUSTOM_ID = /^els-live-[a-z0-9-]{1,32}$/;

const CARD_HEADER = /^### r1\.f\d+:/gm;

/**
 * Continuation rule. A round-2 request is the approved round-1 request plus the model's own answer plus one user message of cards. It is accepted only if (1) everything except
 * messages[1..2] and cache_control equals an approved round-1 request that is marked for continuation (its "base"), (2) cache_control is exactly ephemeral, (3) messages[1] is an
 * assistant turn made only of thinking / text blocks and not larger than the limit, (4) messages[2] is a user string that starts with the fixed round-2 text, is not larger than the
 * limit and holds between 1 and `round2MaxCards` card headers. Anything else is refused. The content of the cards themselves cannot be checked here (the function has no letters).
 */
async function round2Verdict(params, cfg) {
  const notApproved = { ok: false, error: "request_not_approved" };
  if (!cfg.round2Bases || !cfg.round2Bases.size || !params || !Array.isArray(params.messages) || params.messages.length !== 3) return notApproved;
  const { messages, cache_control: cacheControl, ...rest } = params;
  if (canonicalJson(cacheControl) !== '{"type":"ephemeral"}') return notApproved;
  if (!cfg.round2Bases.has(await sha256Hex(canonicalJson({ ...rest, messages: [messages[0]] })))) return notApproved;
  const bad = (why) => ({ ok: false, error: `round2_rule:${why}` });
  const [, assistant, user] = messages;
  if (!assistant || assistant.role !== "assistant" || !Array.isArray(assistant.content) || !assistant.content.length) return bad("assistant_turn");
  if (!assistant.content.every((block) => block && (block.type === "thinking" || block.type === "text"))) return bad("assistant_blocks");
  if (JSON.stringify(assistant.content).length > cfg.round2MaxAssistant) return bad("assistant_size");
  if (!user || user.role !== "user" || typeof user.content !== "string" || !user.content.startsWith(cfg.round2Prefix)) return bad("user_prefix");
  if (user.content.length > cfg.round2MaxUser) return bad("user_size");
  const cards = (user.content.slice(cfg.round2Prefix.length).match(CARD_HEADER) || []).length;
  if (cards < 1 || cards > cfg.round2MaxCards) return bad("cards");
  return { ok: true };
}

/**
 * cfg = { apiKey, tokenSha256, approved: Set of lock hashes (round-1 requests), models: string[], maxBody, expiresAt (epoch ms), now (optional clock),
 *         round2Bases: Set of the approved hashes that may be continued, round2Prefix, round2MaxCards, round2MaxAssistant, round2MaxUser }. `upstream(url, init)` is fetch.
 */
export async function handle(req, cfg, upstream) {
  if (!cfg.apiKey) return refuse(503, "not_configured");
  if (cfg.expiresAt && (cfg.now ? cfg.now() : Date.now()) > cfg.expiresAt) return refuse(410, "expired");
  const supplied = req.headers.get("x-els-token") || "";
  if (!supplied || !same(await sha256Hex(supplied), cfg.tokenSha256)) return refuse(403, "forbidden");
  const url = new URL(req.url);
  const at = url.pathname.lastIndexOf("/v1/"); // the platform prefix ("/functions/v1/<name>") also contains "/v1/": the API route is the last one
  const path = at >= 0 ? url.pathname.slice(at) : "";
  const method = req.method;
  let target = null;
  let body = null;

  if (method === "GET" && path === "/v1/models") {
    const query = new URLSearchParams();
    for (const key of ["limit", "after_id", "before_id"]) if (url.searchParams.get(key)) query.set(key, url.searchParams.get(key));
    target = `https://api.anthropic.com/v1/models${query.size ? `?${query}` : ""}`;
  } else if (method === "GET" && path.startsWith("/v1/models/") && MODEL_ID.test(path.slice("/v1/models/".length))) {
    target = `https://api.anthropic.com${path}`;
  } else if (method === "GET" && /^\/v1\/messages\/batches\/[^/]+(\/results)?$/.test(path) && BATCH_ID.test(path.split("/")[4])) {
    target = `https://api.anthropic.com${path}`;
  } else if (method === "POST" && /^\/v1\/messages\/batches\/[^/]+\/cancel$/.test(path) && BATCH_ID.test(path.split("/")[4])) {
    target = `https://api.anthropic.com${path}`;
    body = "";
  } else if (method === "POST" && (path === "/v1/messages/count_tokens" || path === "/v1/messages/batches")) {
    const text = await req.text();
    if (text.length > cfg.maxBody) return refuse(413, "too_large");
    let parsed;
    try { parsed = JSON.parse(text); } catch { return refuse(400, "invalid_json"); }
    if (path === "/v1/messages/count_tokens") {
      if (!parsed || !cfg.models.includes(parsed.model)) return refuse(403, "model_not_allowed");
    } else {
      if (!parsed || Object.keys(parsed).join() !== "requests" || !Array.isArray(parsed.requests) || parsed.requests.length !== 1) return refuse(400, "one_request_only");
      const [only] = parsed.requests;
      if (!only || Object.keys(only).sort().join() !== "custom_id,params" || !CUSTOM_ID.test(String(only.custom_id))) return refuse(400, "bad_request_shape");
      if (!cfg.models.includes(only.params?.model)) return refuse(403, "model_not_allowed");
      if (!cfg.approved.has(await sha256Hex(canonicalJson(only.params)))) {
        const verdict = await round2Verdict(only.params, cfg);
        if (!verdict.ok) return refuse(403, verdict.error);
      }
    }
    target = `https://api.anthropic.com${path}`;
    body = text;
  } else {
    return refuse(404, "not_found");
  }

  const headers = { "x-api-key": cfg.apiKey, "anthropic-version": req.headers.get("anthropic-version") || "2026-10-21" };
  if (body !== null) headers["content-type"] = "application/json";
  const response = await upstream(target, { method, headers, body: body === null || body === "" ? undefined : body });
  return new Response(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json" } });
}
