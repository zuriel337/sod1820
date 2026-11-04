// Durable Raziel conversations are explicit, private ResearchProvider library items.
// This module owns only the bounded serialization projection. It creates no memory,
// truth, conversation or database owner of its own.

import { razielNavigationButton } from "../../components/experience2029/razielSessionSeam2029.js";
import { projectSavedElsMatrixReading } from "./elsMatrixReadingSavedResult.js";

export const RAZIEL_SAVED_SESSION_TYPE = "raziel_session";
export const RAZIEL_SAVED_SESSION_SCHEMA = "raziel-saved-session-v1";

const LIMITS = Object.freeze({
  messages: 40,
  answer: 12000,
  question: 300,
  title: 96,
  sourceNames: 8,
  objectChars: 24000,
  // ResearchProvider's existing save action writes the entity to both the
  // library and bounded history in one <=512KiB RPC batch. Keep two UTF-8
  // copies plus operation overhead comfortably below that existing limit.
  snapshotBytes: 180000,
});

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function cleanInline(value, limit = 160) {
  if (value == null) return null;
  const text = String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
  return text || null;
}

export function normalizeRazielSavedSessionTitle(value) {
  return cleanInline(value, LIMITS.title);
}

function cleanMessageText(value, limit) {
  if (value == null) return null;
  const text = String(value).replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim();
  return text && text.length <= limit ? text : null;
}

function boundedObject(value, max = LIMITS.objectChars) {
  if (!isObject(value)) return null;
  try {
    const raw = JSON.stringify(value);
    return raw.length <= max ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cleanIso(value) {
  const text = cleanInline(value, 40);
  if (!text || !Number.isFinite(Date.parse(text))) return null;
  return new Date(text).toISOString();
}

function utf8Length(value) {
  const text = String(value || "");
  if (typeof TextEncoder === "function") return new TextEncoder().encode(text).length;
  return unescape(encodeURIComponent(text)).length;
}

function normalizeSources(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const source = cleanInline(item, 120);
    if (!source || seen.has(source)) continue;
    seen.add(source);
    result.push(source);
    if (result.length === LIMITS.sourceNames) break;
  }
  return result;
}

// Only project the already accepted navigation envelope. The tiny frame seam
// rechecks the existing href shapes without loading the lazy navigation grammar.
// Saved data is untrusted; neither a URL nor a focus number is recovered from prose.
const NAVIGATION_VERSION = "raziel-canonical-navigation-actions-v1";
const NAVIGATION_INTENTS = new Set(["number_page", "number_expressions", "research_map", "world"]);
const NAVIGATION_REASONS = new Set(["missing_number", "invalid_number", "ambiguous_number"]);

function normalizeSavedNavigationAction(value) {
  if (!isObject(value) || value.version !== NAVIGATION_VERSION || !NAVIGATION_INTENTS.has(value.intent)
    || typeof value.label !== "string") return null;
  const button = razielNavigationButton({ role: "raziel", navigationAction: value });
  if (!button) return null;
  const number = button.href === "/world" ? null : Number(button.href.split("/").at(-1));
  // Older saved v1 research_map → /world links remain readable. New world
  // actions must keep the exact null-number /world pair, never a number URL.
  if (value.number !== number
    || (number === null && !["research_map", "world"].includes(value.intent))
    || (value.intent === "world" && number !== null)) return null;
  const label = cleanInline(value.label, 80);
  return label ? { version: NAVIGATION_VERSION, intent: value.intent, href: button.href, label, number } : null;
}

function normalizeSavedNavigationClarify(value) {
  return isObject(value) && NAVIGATION_INTENTS.has(value.intent) && NAVIGATION_REASONS.has(value.reason)
    ? { intent: value.intent, reason: value.reason }
    : null;
}

function normalizeMessage(message) {
  if (!isObject(message) || !["user", "raziel"].includes(message.role)) return null;
  const text = cleanMessageText(message.text, message.role === "user" ? LIMITS.question : LIMITS.answer);
  if (!text) return null;
  if (message.role === "user") {
    const identityResolution = boundedObject(message.identity_resolution, 16000);
    return {
      role: "user",
      text,
      turnId: cleanInline(message.turnId, 120),
      ...(identityResolution ? { identity_resolution: identityResolution } : {}),
    };
  }
  const continuation = boundedObject(message.continuation, 30000);
  const evidenceSummary = boundedObject(message.evidenceSummary, 70000);
  const elsSearchPlan = boundedObject(message.elsSearchPlan, 12000);
  const elsMatrixReading = message.elsMatrixReading == null ? null
    : projectSavedElsMatrixReading(message.elsMatrixReading, continuation?.contextSnapshot?.elsMatrixContext?.axis);
  // Do not report a successful save that silently discarded the scan or attached it to another occurrence.
  if (message.elsMatrixReading != null && !elsMatrixReading) return null;
  // An answer cannot simultaneously carry a link and await a number clarification.
  const navigationAction = !message.navigationClarify ? normalizeSavedNavigationAction(message.navigationAction) : null;
  const navigationClarify = !message.navigationAction ? normalizeSavedNavigationClarify(message.navigationClarify) : null;
  return {
    role: "raziel",
    text,
    level: ["deterministic", "fast", "deep"].includes(message.level) ? message.level : "fast",
    question: cleanInline(message.question, LIMITS.question),
    turnId: cleanInline(message.turnId, 120),
    ...(continuation ? { continuation } : {}),
    sourceNames: normalizeSources(message.sourceNames),
    grounding: ["deterministic", "sourced", "interpretation"].includes(message.grounding) ? message.grounding : null,
    ...(evidenceSummary ? { evidenceSummary } : {}),
    ...(elsSearchPlan ? { elsSearchPlan } : {}),
    ...(elsMatrixReading ? { elsMatrixReading } : {}),
    ...(navigationAction ? { navigationAction } : {}),
    ...(navigationClarify ? { navigationClarify } : {}),
    viewMode: ["general", "landscape", "exploratory"].includes(message.viewMode) ? message.viewMode : null,
    viewModeApplied: message.viewModeApplied === true,
  };
}

function normalizeThread(thread) {
  if (!Array.isArray(thread) || thread.length < 2 || thread.length > LIMITS.messages) return null;
  const messages = thread.map(normalizeMessage);
  if (messages.some((message) => !message)) return null;
  if (!messages.some((message) => message.role === "user") || !messages.some((message) => message.role === "raziel")) return null;
  return messages;
}

function savedSessionRef(state, createId) {
  const current = cleanInline(state?.sessionRef, 160);
  if (current) return current;
  const firstTurn = cleanInline(state?.thread?.find((message) => message?.role === "user")?.turnId, 160);
  if (firstTurn) return firstTurn;
  return cleanInline(createId?.(), 160);
}

export function buildRazielSavedSessionEntity(state, {
  now = () => new Date().toISOString(),
  createId = () => globalThis.crypto?.randomUUID?.() || `raziel-${Date.now()}`,
} = {}) {
  if (!isObject(state) || state.busy === true) return { ok: false, error: "session_pending" };
  const thread = normalizeThread(state.thread);
  if (!thread) return { ok: false, error: "session_empty" };
  const ref = savedSessionRef(state, createId);
  if (!ref) return { ok: false, error: "session_identity_unavailable" };
  const savedAt = cleanIso(now());
  if (!savedAt) return { ok: false, error: "session_time_unavailable" };
  const firstQuestion = thread.find((message) => message.role === "user")?.text || "שיחה עם רזיאל";
  const contextSnapshot = boundedObject(state.contextSnapshot, 24000);
  const entity = {
    id: `raziel-session:${ref}`,
    ref,
    type: RAZIEL_SAVED_SESSION_TYPE,
    title: cleanInline(firstQuestion, LIMITS.title) || "שיחה עם רזיאל",
    schema: RAZIEL_SAVED_SESSION_SCHEMA,
    saved_at: savedAt,
    message_count: thread.length,
    turn_count: thread.filter((message) => message.role === "user").length,
    view_mode: ["general", "exploratory"].includes(state.viewMode) ? state.viewMode : "general",
    thread,
    ...(contextSnapshot ? { context_snapshot: contextSnapshot } : {}),
  };
  if (utf8Length(JSON.stringify(entity)) > LIMITS.snapshotBytes) return { ok: false, error: "session_too_large" };
  return { ok: true, entity };
}

export function normalizeRazielSavedSessionEntity(value) {
  if (!isObject(value) || value.type !== RAZIEL_SAVED_SESSION_TYPE || value.schema !== RAZIEL_SAVED_SESSION_SCHEMA) return null;
  const ref = cleanInline(value.ref, 160);
  const thread = normalizeThread(value.thread);
  if (!ref || !thread) return null;
  return {
    id: cleanInline(value.id, 220) || `raziel-session:${ref}`,
    ref,
    type: RAZIEL_SAVED_SESSION_TYPE,
    title: cleanInline(value.title, LIMITS.title) || "שיחה עם רזיאל",
    schema: RAZIEL_SAVED_SESSION_SCHEMA,
    saved_at: cleanIso(value.saved_at),
    message_count: thread.length,
    turn_count: thread.filter((message) => message.role === "user").length,
    view_mode: value.view_mode === "exploratory" ? "exploratory" : "general",
    thread,
    context_snapshot: boundedObject(value.context_snapshot, 24000),
  };
}

export function razielSavedSessionState(value) {
  const saved = normalizeRazielSavedSessionEntity(value);
  if (!saved) return null;
  const latest = saved.thread.at(-1);
  return {
    thread: saved.thread,
    busy: false,
    currentTurn: null,
    response: null,
    contextSnapshot: saved.context_snapshot || null,
    provenance: null,
    status: latest?.role === "raziel" ? "ready" : "idle",
    announcement: "השיחה השמורה נטענה.",
    viewMode: saved.view_mode,
    sessionRef: saved.ref,
    savedAt: saved.saved_at,
  };
}

export function selectRazielSavedSessions(saved, limit = 20) {
  const max = Math.max(0, Math.min(50, Number.isInteger(limit) ? limit : 20));
  return (Array.isArray(saved) ? saved : [])
    .map(normalizeRazielSavedSessionEntity)
    .filter(Boolean)
    .sort((a, b) => String(b.saved_at || "").localeCompare(String(a.saved_at || "")))
    .slice(0, max);
}
