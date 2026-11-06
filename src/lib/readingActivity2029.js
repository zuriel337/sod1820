// Public-reading research-activity beacon (traffic_intelligence_law v12 draft, gematria compute).
//
// SCOPE. Counts settled, user-initiated gematria computes without shipping any content. It is the single
// source of record for the compute metric in the public-reading build; the legacy `track(...,"compute")`
// is a no-op there and is still the emitter in non-public builds, so the two are never active together.
//
// PRIVACY CONTRACT (enforced by test/reading-activity-beacon.test.mjs):
//  - never sends an expression, term, value, method, query, hash, route detail, sod_id or user id;
//  - the expression is used only IN MEMORY to decide first/repeat/recompute and is never serialized;
//  - the two UUIDs are random: `activity_session` lives in sessionStorage for one tab (30 min idle rotation),
//    `activity_event_id` exists only to make a replay idempotent;
//  - seeded loads (share link, handoff, URL seed) and automatic runs are not reported at all.
import { PUBLIC_READING_RELEASE } from "./publicReadingRelease2029.js";
import { supabase } from "./supabase.js";
import { appContext } from "./identity.js";
import { isBot } from "./botVerdict.js";
import { readingTelemetryPath, readingActivityBody } from "./publicReadingTelemetry2029.js";

export const ACTIVITY_SESSION_IDLE_MS = 30 * 60 * 1000;
export const ACTIVITY_DEDUPE_MS = 60 * 1000;
const STORAGE_KEY = "sod_act_s";
const APP_CONTEXTS = ["facebook", "instagram", "whatsapp", "telegram", "line", "chrome-ios", "edge", "opera", "firefox", "android-webview", "chrome", "safari", "other"];

const KILL_SWITCH_ON = (typeof import.meta !== "undefined" && import.meta.env?.VITE_READING_ACTIVITY_BEACON === "false");

// Normalization is used only for the in-memory first/repeat/recompute decision.
export function normalizeActivityExpression(value) {
  return String(value ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
}

export function activityLengthBucket(value) {
  const n = [...normalizeActivityExpression(value)].filter(ch => /[\p{L}\p{N}]/u.test(ch)).length;
  if (n < 2) return null;
  return n <= 3 ? "2-3" : n <= 8 ? "4-8" : n <= 20 ? "9-20" : "21+";
}

// Pure decision function: `state.seen` maps normalized expression -> last report time (memory only).
// Returns null when the event must be dropped (rapid duplicate), otherwise the event type.
export function classifyComputeKind(state, key, now) {
  const last = state.seen.get(key);
  if (last !== undefined) return now - last < ACTIVITY_DEDUPE_MS ? null : "recompute";
  return state.firstSent ? "repeat_compute" : "first_compute";
}

function randomUuid() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function defaultStorage() {
  try { return typeof sessionStorage !== "undefined" ? sessionStorage : null; } catch { return null; }
}

export function createReadingActivity(deps = {}) {
  const enabled = deps.enabled ?? (PUBLIC_READING_RELEASE && !KILL_SWITCH_ON);
  const now = deps.now ?? (() => Date.now());
  const uuid = deps.uuid ?? randomUuid;
  const botCheck = deps.isBot ?? isBot;
  const context = deps.appContext ?? (() => { try { return appContext(); } catch { return "other"; } });
  const pathOf = deps.pathname ?? (() => globalThis.location?.pathname ?? globalThis.window?.location?.pathname ?? "");
  const storage = deps.storage === undefined ? defaultStorage() : deps.storage;
  const send = deps.send ?? (body => {
    if (!supabase) return;
    try { supabase.rpc("ingest_event", body).then(() => {}).catch(() => {}); } catch { /* observability never blocks a page */ }
  });

  const state = { id: null, lastAt: 0, firstSent: false, seen: new Map() };

  function loadSession(at) {
    if (state.id && at - state.lastAt <= ACTIVITY_SESSION_IDLE_MS) return;
    let stored = null;
    try { stored = storage ? JSON.parse(storage.getItem(STORAGE_KEY) || "null") : null; } catch { stored = null; }
    if (stored && typeof stored.id === "string" && at - Number(stored.lastAt) <= ACTIVITY_SESSION_IDLE_MS) {
      state.id = stored.id; state.firstSent = stored.firstSent === true;
    } else {
      state.id = uuid(); state.firstSent = false;
    }
    if (at - state.lastAt > ACTIVITY_SESSION_IDLE_MS) state.seen = new Map();
  }
  function saveSession(at) {
    state.lastAt = at;
    try { storage?.setItem(STORAGE_KEY, JSON.stringify({ id: state.id, lastAt: at, firstSent: state.firstSent })); } catch { /* storage may be unavailable */ }
  }

  // { expression, entry: direct|share|handoff, surfaceKind: community|calculator|professional }
  // Call ONLY for a settled, user-initiated compute. Seeded/automatic runs must not call this.
  function reportCompute({ expression, entry = "direct", surfaceKind } = {}) {
    try {
      if (!enabled || botCheck()) return null;
      const bucket = activityLengthBucket(expression);
      if (!bucket) return null;
      const path = readingTelemetryPath(pathOf());
      if (path !== "/gematria" && path !== "/community/calculator") return null;
      const at = now();
      loadSession(at);
      const key = normalizeActivityExpression(expression);
      const eventType = classifyComputeKind(state, key, at);
      if (!eventType) { saveSession(at); return null; }
      const appCtx = context();
      const body = {
        p_sod_id: null, p_session_id: null, p_surface: "gematria", p_event_type: eventType, p_path: path,
        p_app_context: APP_CONTEXTS.includes(appCtx) ? appCtx : "other", p_is_bot: false,
        p_props: { schema: 1, activity_event_id: uuid(), activity_session: state.id, length_bucket: bucket, entry, surface_kind: surfaceKind },
      };
      if (!readingActivityBody(body)) return null;
      state.seen.set(key, at);
      if (eventType === "first_compute") state.firstSent = true;
      saveSession(at);
      send(body);
      return body;
    } catch { return null; }
  }

  return Object.freeze({ reportCompute });
}

const shared = createReadingActivity();
export const reportReadingCompute = shared.reportCompute;
