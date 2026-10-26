// Temporary, in-memory Raziel conversation state for the 2029 shell.
// ResearchProvider remains the only owner of saved items, collections, paths and research Context.

import {
  RAZIEL_DEFAULT_VIEW_MODE,
  normalizeRazielViewMode,
} from "./razielViewMode2029.js";

export const RAZIEL_SESSION_VERSION = 1;
// Explicit 2029-only opt-in. Legacy callers do not send this field, so their server path remains
// byte-for-byte on the existing adapters until they are deliberately migrated.
export const RAZIEL_CANONICAL_RESEARCH_CONTRACT = "public-number-research-run-v1";

const LIMITS = Object.freeze({
  question: 300,
  threadMessages: 40,
  sourceNames: 8,
});

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function cleanInline(value, limit = 160) {
  if (value == null) return null;
  const cleaned = String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
  return cleaned || null;
}

export function normalizeRazielQuestion(value) {
  return cleanInline(value, LIMITS.question);
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item != null && item !== ""));
}

function sourceName(value) {
  if (typeof value === "string") return cleanInline(value, 120);
  if (!isObject(value)) return null;
  return cleanInline(
    value.original_name
      ?? value.originalName
      ?? value.source_name
      ?? value.sourceName
      ?? value.sourceLabel
      ?? value.name
      ?? value.label
      ?? value.title,
    120,
  );
}

function uniqueSourceNames(values) {
  const seen = new Set();
  const names = [];
  for (const value of values.flat(Infinity)) {
    const name = sourceName(value);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length === LIMITS.sourceNames) break;
  }
  return names;
}

export function createRazielContextSnapshot(context = null, view = {}) {
  const current = isObject(context) ? context : {};
  const dimensions = isObject(current.dimensions) ? current.dimensions : {};
  const subject = isObject(view.subject) ? view.subject : (isObject(current.subject) ? current.subject : null);
  const numberValue = view.numberFocus ?? dimensions.numberCoreFocus ?? dimensions.surfaceFocus;
  const rawResult = numberValue?.resultValue ?? numberValue?.result;
  const result = rawResult == null || rawResult === "" ? null : Number(rawResult);
  const number = isObject(numberValue) ? {
    expression: numberValue.expression ?? numberValue.root,
    method: numberValue.method,
    result: Number.isFinite(result) ? result : null,
  } : null;
  const reading = isObject(view.readingFocus) ? view.readingFocus : dimensions.readingFocus;
  const elsValue = isObject(view.elsFocus?.occurrence) ? view.elsFocus.occurrence : view.elsFocus;
  const els = isObject(elsValue) ? { term: elsValue.term ?? view.elsFocus?.term } : null;
  const findingSources = Array.isArray(dimensions.surfaceFindings)
    ? dimensions.surfaceFindings.map((item) => item?.sourceLabel)
    : [];
  const sourceNames = uniqueSourceNames([
    view.sources || [],
    reading?.sourceLabel,
    dimensions.surfaceFocus?.sourceLabel,
    findingSources,
  ]);
  // Display-only projection for the always-mounted frame. The complete canonical request snapshot,
  // including navigation and continuation semantics, is built in the submit-time adapter.
  return {
    subject,
    focus: compactObject({ number, reading, els }),
    sourceNames,
  };
}

// Compatibility facades keep the canonical session module API while the stateless continuation
// projection stays in the submit-time chunk.
export async function createRazielContinuationSnapshot(options) {
  return (await import("./razielSessionRequest2029.js")).createRazielContinuationSnapshot(options);
}

export async function selectRazielContinuation(thread, options) {
  return (await import("./razielSessionRequest2029.js")).selectRazielContinuation(thread, options);
}

// Deepening is available only for the latest completed fast answer. If a newer user turn is
// pending or failed, that older answer must not be offered as though it were still the active turn.
export function selectRazielDeepeningCandidate(state = null) {
  if (!isObject(state) || state.busy === true || state.status !== "ready") return null;
  const thread = Array.isArray(state.thread) ? state.thread : [];
  const latest = thread[thread.length - 1];
  if (latest?.role !== "raziel" || latest?.level !== "fast" || !cleanInline(latest.question, LIMITS.question)) return null;
  return latest;
}

// Compatibility facades preserve the session module's public API without pulling the stateless
// submit/response adapter into the eager 2029 graph.
export async function buildRazielTranscript(thread, again) {
  return (await import("./razielSessionRequest2029.js")).buildRazielTranscript(thread, again);
}

export async function normalizeRazielResponse(response, requestedLevel) {
  return (await import("./razielSessionRequest2029.js")).normalizeRazielResponse(response, requestedLevel);
}

export async function createRazielProvenance(options) {
  return (await import("./razielSessionRequest2029.js")).createRazielProvenance(options);
}

export function createInitialRazielSessionState() {
  return {
    thread: [],
    busy: false,
    currentTurn: null,
    response: null,
    contextSnapshot: null,
    provenance: null,
    status: "idle",
    announcement: "",
    // Set only after an explicit save or restore. The active chat itself stays temporary.
    sessionRef: null,
    savedAt: null,
    // Belongs to the one temporary Raziel session (not to any page), so it survives navigation between surfaces.
    viewMode: RAZIEL_DEFAULT_VIEW_MODE,
  };
}

function appendMessage(thread, message) {
  return [...thread, message].slice(-LIMITS.threadMessages);
}

export function razielSessionReducer(state, action) {
  switch (action?.type) {
    case "view_mode_set": {
      const viewMode = normalizeRazielViewMode(action.viewMode);
      return state.viewMode === viewMode ? state : { ...state, viewMode };
    }
    case "turn_preparing": {
      const { turn, contextSnapshot } = action;
      return {
        ...state,
        busy: true,
        currentTurn: { ...turn, status: "preparing" },
        response: null,
        contextSnapshot,
        provenance: null,
        status: "busy",
        announcement: "רזיאל בודק את השאלה…",
      };
    }
    case "turn_started": {
      const { turn, contextSnapshot } = action;
      const thread = turn.again
        ? state.thread
        : appendMessage(state.thread, {
          role: "user",
          text: turn.question,
          turnId: turn.id,
          ...(turn.identityResolution ? { identity_resolution: turn.identityResolution } : {}),
        });
      return {
        ...state,
        thread,
        busy: true,
        currentTurn: { ...turn, status: "running" },
        response: null,
        contextSnapshot,
        provenance: null,
        status: "busy",
        announcement: "רזיאל חושב…",
      };
    }
    case "turn_succeeded":
      return { ...state, ...action.patch };
    case "session_saved":
      return {
        ...state,
        sessionRef: cleanInline(action.sessionRef, 160),
        savedAt: cleanInline(action.savedAt, 40),
        announcement: "השיחה נשמרה באזור שלך.",
      };
    case "session_restored":
      return isObject(action.state) ? { ...state, ...action.state } : state;
    case "turn_failed":
      return {
        ...state,
        busy: false,
        currentTurn: {
          ...state.currentTurn,
          status: "error",
          completedAt: action.completedAt,
          error: cleanInline(action.error, 80) || "unavailable",
        },
        response: null,
        provenance: null,
        status: "error",
        announcement: "רזיאל לא הצליח לענות כרגע. אפשר לנסות שוב.",
      };
    case "session_reset":
      return createInitialRazielSessionState();
    default:
      return state;
  }
}

function researchItemPreview(item) {
  if (!isObject(item)) return null;
  const id = cleanInline(item.id ?? item.ref, 120);
  const type = cleanInline(item.type, 40);
  if (!id || !type) return null;
  return compactObject({
    id,
    type,
    label: cleanInline(item.title ?? item.label ?? id, 160),
    sourceName: sourceName(item.sourceLabel ?? item.source_name ?? item.metadata?.sourceLabel ?? item.creator),
  });
}

export function selectRazielResearchPreview(research = {}, limit = 3) {
  const safeLimit = Math.max(0, Math.min(5, Number.isInteger(limit) ? limit : 3));
  const saved = Array.isArray(research.saved) ? research.saved : [];
  const cart = Array.isArray(research.cart) ? research.cart : [];
  const collections = Array.isArray(research.collections) ? research.collections : [];
  return {
    source: "ResearchProvider",
    savedCount: saved.length,
    cartCount: cart.length,
    collectionsCount: collections.length,
    syncStatus: cleanInline(research.syncStatus, 40) || "local_only",
    saved: saved.slice(0, safeLimit).map(researchItemPreview).filter(Boolean),
  };
}
