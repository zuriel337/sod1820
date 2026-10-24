// Temporary, in-memory Raziel conversation state for the 2029 shell.
// ResearchProvider remains the only owner of saved items, collections, paths and research Context.

import {
  RAZIEL_DEFAULT_VIEW_MODE,
  normalizeRazielViewMode,
} from "./razielViewMode2029.js";

export const RAZIEL_SESSION_VERSION = 1;
export const RAZIEL_CANONICAL_RESEARCH_CONTRACT = "public-number-research-run-v1";

let sessionSubmissionModulePromise = null;

// The temporary session remains eager so continuity is available on every 2029 surface. The
// stateless submit adapter (resolver, plan, gate, continuation and response projection) is requested
// only after an explicit submit. A failed chunk load is not cached, so the next submit can retry.
export function loadRazielSessionSubmission() {
  if (!sessionSubmissionModulePromise) {
    sessionSubmissionModulePromise = import("./razielSessionSubmission2029.js")
      .catch((error) => {
        sessionSubmissionModulePromise = null;
        throw error;
      });
  }
  return sessionSubmissionModulePromise;
}

const LIMITS = Object.freeze({
  question: 300,
  factPack: 1200,
  context: 600,
  transcript: 500,
  transcriptTurn: 200,
  answer: 12000,
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

function cleanAnswer(value) {
  if (value == null) return "";
  return String(value)
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, LIMITS.answer);
}

function cleanInteger(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
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

export async function createRazielContextSnapshot(context, view, capturedAt) {
  return (await loadRazielSessionSubmission()).createRazielContextSnapshot(context, view, capturedAt);
}

// Async compatibility facades keep the session API on its original owner while leaving the
// submit-only implementation outside the eager graph.
export async function createRazielContinuationSnapshot(options) {
  return (await loadRazielSessionSubmission()).createRazielContinuationSnapshot(options);
}

export async function selectRazielContinuation(thread, options) {
  return (await loadRazielSessionSubmission()).selectRazielContinuation(thread, options);
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

export async function buildRazielTranscript(thread, again) {
  return (await loadRazielSessionSubmission()).buildRazielTranscript(thread, again);
}

export async function buildRazielSessionRequest({
  question,
  state,
  contextSnapshot,
  facts = "",
  intelligenceLevel = "fast",
  again = false,
  viewMode = RAZIEL_DEFAULT_VIEW_MODE,
} = {}) {
  return (await loadRazielSessionSubmission()).buildRazielSessionRequest({
    question,
    state,
    contextSnapshot,
    facts,
    intelligenceLevel,
    again,
    viewMode,
  });
}

export async function extractRazielSourceNames(response) {
  return (await loadRazielSessionSubmission()).extractRazielSourceNames(response);
}

export async function normalizeRazielResponse(response, requestedLevel) {
  return (await loadRazielSessionSubmission()).normalizeRazielResponse(response, requestedLevel);
}

export async function createRazielProvenance(options) {
  return (await loadRazielSessionSubmission()).createRazielProvenance(options);
}

export function createInitialRazielSessionState() {
  return {
    thread: [],
    busy: false,
    status: "idle",
    announcement: "",
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
    case "request_failed":
      return {
        ...state,
        busy: false,
        currentTurn: null,
        status: "error",
        announcement: "רזיאל לא הצליח לענות כרגע. אפשר לנסות שוב.",
      };
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
