// SOD1820 — M0-B server-derived caller identity + limits (paid AI fail CLOSED, public compute fail OPEN).
//
// EXTEND_EXISTING only. Thin decision layer over the two live atomic limiters:
//   - public.edge_rate_limit_check(p_key_hash, p_window_seconds, p_limit)  (service_role only;
//     the live body clamps the window to 60..3600 seconds and the limit to 1..120 per bucket);
//   - public.ai_quota_check(p_identity, p_tier, p_limit_override)           (daily, Asia/Jerusalem day).
// It creates NO limiter, quota store, identity system or contract.
//
// Identity rules (ZURIEL, 12.11.2026):
//   - a quota/limit identity is NEVER a browser claim: not body.visitor_id, not user-agent, not the
//     client-controlled first X-Forwarded-For hop; changing any of them never yields a fresh bucket;
//   - a verified signed-in user is keyed by the user id that Supabase Auth returned for the JWT;
//   - a guest of PUBLIC compute is keyed by a salted hash (HMAC-SHA256 under the server-only service
//     key) of the platform client address; raw addresses, user ids and user-agents are never sent to
//     the database;
//   - paid AI admits only a verified user; a guest gets a stable `sign_in_required` refusal.

export const LIMITER_MAX_LIMIT = 120;
export const LIMITER_MAX_WINDOW_SECONDS = 3600;
export const LIMITER_MIN_WINDOW_SECONDS = 60;
export const SIGN_IN_REQUIRED = "sign_in_required";
export const SIGN_IN_REQUIRED_MESSAGE = "הפעולה הזאת זמינה למשתמשים מחוברים. התחברו כדי להמשיך.";

const KEY_VERSION = "sod1820-edge-limit-v1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX64_RE = /^[0-9a-f]{64}$/;

// Platform-injected client address. Cloudflare sets CF-Connecting-IP on ingress (observed on 100% of
// function requests, equal to X-Real-IP). Fallback: the LAST X-Forwarded-For hop (appended by the proxy),
// never the first one, which the client controls.
export function platformClientIp(req) {
  const headers = req?.headers;
  if (!headers || typeof headers.get !== "function") return "";
  const cf = String(headers.get("cf-connecting-ip") || "").trim();
  if (cf) return cf.slice(0, 64);
  const hops = String(headers.get("x-forwarded-for") || "").split(",").map((part) => part.trim()).filter(Boolean);
  return (hops.at(-1) || "").slice(0, 64);
}

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 64-hex bucket key (the format edge_rate_limit_check accepts). null when no server secret exists:
// callers then treat the limiter as unavailable (paid AI refuses, public compute stays open).
export async function limiterKey(secret, ...parts) {
  const s = String(secret || "");
  if (!s) return null;
  try { return await hmacHex(s, [KEY_VERSION, ...parts.map((p) => String(p))].join("|")); }
  catch { return null; }
}

export function isVerifiedUser(caller) {
  return caller?.verified === true && UUID_RE.test(String(caller?.userRef || ""));
}

// Pure admission decision for paid AI. A trusted server path never reaches this function.
export function paidAiAdmission(caller) {
  if (isVerifiedUser(caller)) return { ok: true, userRef: String(caller.userRef), tier: caller.tier === "admin" ? "admin" : "user" };
  return { ok: false, status: 401, error: SIGN_IN_REQUIRED, message: SIGN_IN_REQUIRED_MESSAGE };
}

// Rate-limit subject for public compute: verified user, else hashed platform address.
export function publicComputeSubject({ userId = null, req = null } = {}) {
  if (UUID_RE.test(String(userId || ""))) return { kind: "user", part: `user:${String(userId).toLowerCase()}` };
  const ip = platformClientIp(req);
  return ip ? { kind: "ip", part: `ip:${ip}` } : { kind: "ip_unknown", part: "ip:unknown" };
}

export function retryAfterSeconds(windowSeconds, nowMs = Date.now()) {
  const supplied = Number(windowSeconds);
  const safe = Number.isFinite(supplied) && supplied > 0
    ? Math.min(LIMITER_MAX_WINDOW_SECONDS, Math.max(LIMITER_MIN_WINDOW_SECONDS, Math.floor(supplied)))
    : LIMITER_MAX_WINDOW_SECONDS;
  const seconds = Math.floor(nowMs / 1000);
  return Math.max(1, safe - (seconds % safe));
}

// One atomic bucket. allowed | denied | unavailable — never throws.
export async function checkBucket(serviceRpc, keyHash, windowSeconds, limit, nowMs = Date.now()) {
  if (!keyHash || !HEX64_RE.test(keyHash)) return { state: "unavailable" };
  let decision = null;
  try {
    decision = await serviceRpc("edge_rate_limit_check", {
      p_key_hash: keyHash,
      p_window_seconds: windowSeconds,
      p_limit: Math.min(LIMITER_MAX_LIMIT, Math.max(1, Math.floor(limit))),
    });
  } catch { decision = null; }
  if (!decision || typeof decision.allowed !== "boolean") return { state: "unavailable" };
  if (!decision.allowed) return { state: "denied", retryAfter: retryAfterSeconds(decision.window_seconds ?? windowSeconds, nowMs), decision };
  return { state: "allowed", decision };
}

// PUBLIC COMPUTE: per-subject bucket + one global bucket. Limiter infrastructure failure fails OPEN
// (availability of the public gematria/ELS engines); an explicit denial is still a 429.
export async function enforcePublicComputeLimits({
  serviceRpc, secret, scope, req = null, userId = null,
  subjectLimit, subjectWindowSeconds = LIMITER_MAX_WINDOW_SECONDS,
  globalLimit = LIMITER_MAX_LIMIT, globalWindowSeconds = LIMITER_MIN_WINDOW_SECONDS,
  nowMs = Date.now(),
} = {}) {
  const subject = publicComputeSubject({ userId, req });
  const degraded = [];
  const subjectKey = await limiterKey(secret, scope, subject.part);
  const own = await checkBucket(serviceRpc, subjectKey, subjectWindowSeconds, subjectLimit, nowMs);
  if (own.state === "denied") return { state: "denied", bucket: "subject", subject: subject.kind, retryAfter: own.retryAfter, decision: own.decision, degraded };
  if (own.state === "unavailable") degraded.push("subject");
  const globalKey = await limiterKey(secret, scope, "global");
  const all = await checkBucket(serviceRpc, globalKey, globalWindowSeconds, globalLimit, nowMs);
  if (all.state === "denied") return { state: "denied", bucket: "global", subject: subject.kind, retryAfter: all.retryAfter, decision: all.decision, degraded };
  if (all.state === "unavailable") degraded.push("global");
  return { state: "allowed", subject: subject.kind, decision: own.decision || null, degraded };
}

// PAID AI: verified account bucket + global hourly bucket + global daily cap. Fails CLOSED on any
// limiter/quota infrastructure failure. The global daily cap reuses ai_quota_check (the only live daily
// atomic counter; edge_rate_limit_check cannot hold a window longer than one hour) under an opaque,
// server-keyed identity. Admin calls are not counted against, nor blocked by, the global DAILY cap
// (the same admin bypass ai_quota_check already applies per account); hourly buckets apply to everyone.
export async function enforcePaidAiLimits({
  serviceRpc, secret, scope, caller,
  accountLimit, accountWindowSeconds = LIMITER_MAX_WINDOW_SECONDS,
  globalLimit, globalWindowSeconds = LIMITER_MAX_WINDOW_SECONDS,
  globalDailyCap = null, nowMs = Date.now(),
} = {}) {
  const admission = paidAiAdmission(caller);
  if (!admission.ok) return { state: "refused", status: admission.status, error: admission.error, message: admission.message };
  const accountKey = await limiterKey(secret, scope, "account", `user:${admission.userRef.toLowerCase()}`);
  const own = await checkBucket(serviceRpc, accountKey, accountWindowSeconds, accountLimit, nowMs);
  if (own.state !== "allowed") return own.state === "denied" ? { state: "denied", bucket: "account", retryAfter: own.retryAfter } : { state: "unavailable", bucket: "account" };
  const globalKey = await limiterKey(secret, scope, "global");
  const all = await checkBucket(serviceRpc, globalKey, globalWindowSeconds, globalLimit, nowMs);
  if (all.state !== "allowed") return all.state === "denied" ? { state: "denied", bucket: "global", retryAfter: all.retryAfter } : { state: "unavailable", bucket: "global" };
  if (globalDailyCap != null && admission.tier !== "admin") {
    const dailyKey = await limiterKey(secret, scope, "global-daily");
    if (!dailyKey) return { state: "unavailable", bucket: "global_daily" };
    let daily = null;
    try {
      daily = await serviceRpc("ai_quota_check", { p_identity: `g:${dailyKey}`, p_tier: "global_cap", p_limit_override: Math.max(1, Math.floor(globalDailyCap)) });
    } catch { daily = null; }
    if (!daily || typeof daily.allowed !== "boolean") return { state: "unavailable", bucket: "global_daily" };
    if (!daily.allowed) return { state: "denied", bucket: "global_daily", retryAfter: secondsToJerusalemMidnight(nowMs) };
  }
  return { state: "allowed", tier: admission.tier };
}

// ai_quota_check rolls over at Asia/Jerusalem midnight. Approximation for Retry-After only (never a gate).
export function secondsToJerusalemMidnight(nowMs = Date.now()) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      .formatToParts(new Date(nowMs)).filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)]));
    const elapsed = ((parts.hour % 24) * 3600) + (parts.minute * 60) + parts.second;
    return Math.max(60, 86400 - elapsed);
  } catch { return 3600; }
}

// HTTP mapping shared by the paid endpoints (the body shape stays each endpoint's own).
export function paidAiLimitHttp(decision) {
  if (decision.state === "refused") return { status: 401, error: SIGN_IN_REQUIRED, message: SIGN_IN_REQUIRED_MESSAGE, headers: {} };
  if (decision.state === "unavailable") return { status: 503, error: "rate_limit_unavailable", headers: {} };
  if (decision.state === "denied") {
    const retry = String(decision.retryAfter || 60);
    return { status: 429, error: decision.bucket === "global_daily" ? "daily_cap_reached" : "rate_limited", retryAfter: Number(retry), headers: { "Retry-After": retry } };
  }
  return null;
}
