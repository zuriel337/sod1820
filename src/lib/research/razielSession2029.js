// Temporary, in-memory Raziel conversation state for the 2029 shell.
// ResearchProvider remains the only owner of saved items, collections, paths and research Context.

import {
  projectRazielConversationResolution,
  resolveRazielConversationTurn,
} from "./razielConversationResolver.js";
import { buildRazielSurfaceContext } from "./razielSurfaceContext.js";
import {
  RAZIEL_DEFAULT_VIEW_MODE,
  normalizeRazielViewMode,
  normalizeRazielViewModeReport,
} from "./razielViewMode2029.js";

export const RAZIEL_SESSION_VERSION = 1;
// Explicit 2029-only opt-in. Legacy callers do not send this field, so their server path remains
// byte-for-byte on the existing adapters until they are deliberately migrated.
export const RAZIEL_CANONICAL_RESEARCH_CONTRACT = "public-number-research-run-v1";

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

function normalizeNumberFocus(value) {
  if (!isObject(value)) return null;
  const rawResult = value.resultValue ?? value.result;
  const resultValue = rawResult == null || rawResult === ""
    ? null
    : Number(rawResult);
  const out = compactObject({
    root: cleanInline(value.root, 40),
    expression: cleanInline(value.expression ?? value.root, 80),
    method: cleanInline(value.method, 60),
    result: resultValue != null && Number.isFinite(resultValue) ? resultValue : null,
    crossingPartner: cleanInline(value.crossingPartner ?? value.partner, 80),
  });
  return Object.keys(out).length ? out : null;
}

function normalizeReadingFocus(value) {
  if (!isObject(value)) return null;
  const out = compactObject({
    label: cleanInline(value.label, 120),
    primary: cleanInline(value.primary, 160),
    sourceLabel: cleanInline(value.sourceLabel, 120),
    reference: cleanInline(value.reference ?? value.locator, 120),
  });
  return Object.keys(out).length ? out : null;
}

function normalizeElsFocus(value) {
  if (!isObject(value)) return null;
  const occurrence = isObject(value.occurrence) ? value.occurrence : value;
  const direction = cleanInteger(occurrence.dir);
  const out = compactObject({
    term: cleanInline(occurrence.term ?? value.term, 80),
    occurrence: cleanInline(occurrence.occurrenceRef ?? occurrence.occurrence_id ?? occurrence.occurrence, 120),
    corpus: cleanInline(occurrence.corpusId ?? occurrence.corpus, 80),
    start: cleanInteger(occurrence.start),
    end: cleanInteger(occurrence.end),
    skip: cleanInteger(occurrence.skip),
    dir: [-1, 1].includes(direction) ? direction : null,
  });
  return Object.keys(out).length ? out : null;
}

function describeSnapshot({ subject, number, reading, els, sourceNames }) {
  const parts = [];
  if (subject?.label || subject?.id) parts.push(`מוקד המחקר: ${subject.label || subject.id}`);
  if (reading?.primary || reading?.label) parts.push(`קוראים עכשיו: ${reading.primary || reading.label}`);
  if (number?.expression) {
    parts.push(`מוקד מספרי: ${number.expression}${number.method ? ` בשיטת ${number.method}` : ""}${number.result != null ? ` = ${number.result}` : ""}`);
  }
  if (els?.term || els?.occurrence) parts.push(`מופע ELS: ${els.term || els.occurrence}`);
  if (sourceNames.length) parts.push(`מקורות: ${sourceNames.join(" · ")}`);
  return parts.join(". ") || "אין כרגע מוקד מחקר פעיל.";
}

// Re-project an already bounded Phase-I descriptor through its canonical projector. Only public
// projection fields are accepted here; the raw Research Context is never retained in the session.
function normalizeRazielSurfaceContext(value) {
  if (!isObject(value)) return null;
  const navigation = isObject(value.navigation) ? value.navigation : {};
  const returnToValue = isObject(navigation.returnTo) ? navigation.returnTo : null;
  const returnSubject = returnToValue ? compactObject({
    type: returnToValue.subjectType,
    id: returnToValue.subjectId,
    label: returnToValue.subjectLabel,
  }) : null;
  return buildRazielSurfaceContext({
    lens: value.lens,
    journey: value.journey,
    subject: value.subjectHref ? { href: value.subjectHref } : null,
    dimensions: {
      surfaceFocus: value.focus,
      readingFocus: value.reading,
      entrySource: navigation.entrySource,
      sourceRef: navigation.sourceRef,
      journeySemanticId: navigation.journeySemanticId,
      journeyRoot: navigation.journeyRoot,
      journeyVisitedValues: navigation.journeyVisitedValues,
      surfaceSections: Array.isArray(value.sections) ? value.sections.map((label) => ({ label })) : [],
      surfaceFindings: Array.isArray(value.findings) ? value.findings.map((label) => ({ label })) : [],
    },
    selection: navigation.selection,
    returnTo: returnToValue ? {
      label: returnToValue.label,
      href: returnToValue.href,
      subject: returnSubject && Object.keys(returnSubject).length ? returnSubject : null,
    } : null,
  });
}

export function createRazielContextSnapshot(context = null, view = {}, capturedAt = null) {
  const current = isObject(context) ? context : {};
  const dimensions = isObject(current.dimensions) ? current.dimensions : {};
  const subjectValue = isObject(view.subject) ? view.subject : current.subject;
  const subject = isObject(subjectValue)
    ? compactObject({
      type: cleanInline(subjectValue.type, 40),
      id: cleanInline(subjectValue.id ?? subjectValue.ref, 120),
      label: cleanInline(subjectValue.label ?? subjectValue.title, 160),
    })
    : null;
  const number = normalizeNumberFocus(view.numberFocus ?? dimensions.numberCoreFocus ?? dimensions.surfaceFocus);
  const reading = normalizeReadingFocus(view.readingFocus ?? dimensions.readingFocus);
  const els = normalizeElsFocus(view.elsFocus);
  const findingSources = Array.isArray(dimensions.surfaceFindings)
    ? dimensions.surfaceFindings.map((item) => item?.sourceLabel)
    : [];
  const sourceNames = uniqueSourceNames([
    view.sources || [],
    reading?.sourceLabel,
    dimensions.surfaceFocus?.sourceLabel,
    findingSources,
  ]);
  const journeyValue = isObject(current.journey) ? current.journey : null;
  const journey = journeyValue ? compactObject({
    kind: cleanInline(journeyValue.kind, 40),
    id: cleanInline(journeyValue.id, 120),
    position: typeof journeyValue.position === "number" || typeof journeyValue.position === "string"
      ? cleanInline(journeyValue.position, 40)
      : null,
    revisionNo: cleanInteger(journeyValue.revisionNo),
  }) : null;
  const surfaceContext = buildRazielSurfaceContext(current);
  const snapshot = {
    v: RAZIEL_SESSION_VERSION,
    surface: cleanInline(view.surface ?? current.surface ?? current.lens ?? subject?.type ?? "frame", 40),
    lens: cleanInline(current.lens, 60),
    subjectHref: cleanInline(isObject(current.subject) ? current.subject.href : null, 300),
    subject: subject && Object.keys(subject).length ? subject : null,
    focus: compactObject({ number, reading, els }),
    journey: journey && Object.keys(journey).length ? journey : null,
    sourceNames,
    capturedAt: cleanInline(capturedAt, 40),
    ...(surfaceContext ? { surfaceContext } : {}),
  };
  return { ...snapshot, description: describeSnapshot({ subject, number, reading, els, sourceNames }) };
}

function normalizeContinuationContextSnapshot(value) {
  if (!isObject(value)) return null;
  const subjectValue = isObject(value.subject) ? value.subject : null;
  const subject = subjectValue ? compactObject({
    type: cleanInline(subjectValue.type, 40),
    id: cleanInline(subjectValue.id ?? subjectValue.ref, 120),
    label: cleanInline(subjectValue.label ?? subjectValue.title, 160),
  }) : null;
  const focusValue = isObject(value.focus) ? value.focus : {};
  const number = normalizeNumberFocus(focusValue.number);
  const reading = normalizeReadingFocus(focusValue.reading);
  const els = normalizeElsFocus(focusValue.els);
  const journeyValue = isObject(value.journey) ? value.journey : null;
  const journey = journeyValue ? compactObject({
    kind: cleanInline(journeyValue.kind, 40),
    id: cleanInline(journeyValue.id, 120),
    position: typeof journeyValue.position === "number" || typeof journeyValue.position === "string"
      ? cleanInline(journeyValue.position, 40)
      : null,
    revisionNo: cleanInteger(journeyValue.revisionNo),
  }) : null;
  const sourceNames = uniqueSourceNames([Array.isArray(value.sourceNames) ? value.sourceNames : []]);
  const surfaceContext = normalizeRazielSurfaceContext(value.surfaceContext);
  const normalized = {
    v: RAZIEL_SESSION_VERSION,
    surface: cleanInline(value.surface, 40) || "frame",
    lens: cleanInline(value.lens, 60),
    subjectHref: cleanInline(value.subjectHref, 300),
    subject: subject && Object.keys(subject).length ? subject : null,
    focus: compactObject({ number, reading, els }),
    journey: journey && Object.keys(journey).length ? journey : null,
    sourceNames,
    capturedAt: cleanInline(value.capturedAt, 40),
    ...(surfaceContext ? { surfaceContext } : {}),
  };
  const description = cleanInline(value.description, LIMITS.context)
    || describeSnapshot({ subject, number, reading, els, sourceNames });
  return { ...normalized, description };
}

// Memory-only continuation envelope. It contains only the already bounded context/facts and the selected
// presentation mode from the original answer; navigation or a later selector change cannot rewrite it.
export function createRazielContinuationSnapshot({ contextSnapshot, facts = "", viewMode = RAZIEL_DEFAULT_VIEW_MODE } = {}) {
  const boundedContextSnapshot = normalizeContinuationContextSnapshot(contextSnapshot);
  if (!boundedContextSnapshot) return null;
  return Object.freeze({
    contextSnapshot: boundedContextSnapshot,
    facts: cleanInline(facts, LIMITS.factPack) || "",
    viewMode: normalizeRazielViewMode(viewMode),
  });
}

export function selectRazielContinuation(thread = [], { turnId = null, question = null } = {}) {
  const messages = Array.isArray(thread) ? thread : [];
  const targetTurnId = cleanInline(turnId, 120);
  const targetQuestion = cleanInline(question, LIMITS.question);
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "raziel" || !isObject(message.continuation)) continue;
    if (targetTurnId && cleanInline(message.turnId, 120) !== targetTurnId) continue;
    if (!targetTurnId && targetQuestion && cleanInline(message.question, LIMITS.question) !== targetQuestion) continue;
    return createRazielContinuationSnapshot(message.continuation);
  }
  return null;
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

export function buildRazielTranscript(thread = [], again = false) {
  const messages = Array.isArray(thread) ? thread : [];
  // A deep/again request is submitted after the fast answer is already in the thread. Keep that
  // answer so the deep pass can extend it; the reducer prevents a duplicate user message.
  const prior = messages;
  return prior.slice(-2)
    .map((message) => {
      const role = message?.role === "raziel" ? "רזיאל" : "משתמש";
      const text = cleanInline(message?.text, LIMITS.transcriptTurn);
      return text ? `${role}: ${text}` : null;
    })
    .filter(Boolean)
    .join("\n")
    .slice(0, LIMITS.transcript);
}

function snapshotSurfaceSemantic(snapshot) {
  if (!snapshot) return null;
  const semantic = compactObject({
    surface: snapshot.surface,
    subject: snapshot.subject,
    number: snapshot.focus?.number,
    reading: snapshot.focus?.reading,
    els: snapshot.focus?.els,
    context: snapshot.surfaceContext
      || compactObject({ lens: snapshot.lens, journey: snapshot.journey, subjectHref: snapshot.subjectHref }),
  });
  return Object.keys(semantic).length ? semantic : null;
}

export function buildRazielSessionRequest({
  question,
  state,
  contextSnapshot,
  facts = "",
  intelligenceLevel = "fast",
  again = false,
  viewMode = RAZIEL_DEFAULT_VIEW_MODE,
} = {}) {
  const subject = cleanInline(question, LIMITS.question);
  if (!subject) return null;
  const surfaceSemantic = snapshotSurfaceSemantic(contextSnapshot);
  const resolvedTurn = resolveRazielConversationTurn({
    question: subject,
    thread: state?.thread,
    surfaceSemantic,
  });
  const conversationResolution = projectRazielConversationResolution(resolvedTurn);
  const transcript = buildRazielTranscript(state?.thread, again);
  const block = transcript ? `שיחה אחרונה:\n${transcript}` : "";
  const heading = cleanInline(contextSnapshot?.description, LIMITS.context) || "";
  const headingRoom = Math.max(0, LIMITS.context - block.length - (block && heading ? 1 : 0));
  const boundedContext = [heading.slice(0, headingRoom), block]
    .filter(Boolean)
    .join("\n")
    .slice(0, LIMITS.context) || null;
  return {
    subject,
    facts: cleanInline(facts, LIMITS.factPack) || "",
    context: boundedContext,
    again: Boolean(again),
    intelligenceLevel: intelligenceLevel === "deep" ? "deep" : "fast",
    surfaceSemantic,
    conversationResolution,
    researchContract: RAZIEL_CANONICAL_RESEARCH_CONTRACT,
    // Separate axis from intelligenceLevel. Sent only when a non-general mode was chosen, so a general
    // request is identical to what it was before view modes existed.
    ...(normalizeRazielViewMode(viewMode) !== RAZIEL_DEFAULT_VIEW_MODE ? { viewMode: normalizeRazielViewMode(viewMode) } : {}),
  };
}

export function extractRazielSourceNames(response = null) {
  if (!isObject(response)) return [];
  const provenanceSources = isObject(response.provenance) ? response.provenance.sources : [];
  return uniqueSourceNames([
    response.sources || [],
    response.evidence || [],
    provenanceSources || [],
  ]);
}

export function normalizeRazielResponse(response, requestedLevel = "fast") {
  if (!isObject(response)) return null;
  const answer = cleanAnswer(response.answer);
  if (!answer) return null;
  const intelligenceLevel = response.deterministic
    ? "deterministic"
    : cleanInline(response.intelligence_level, 30) || (requestedLevel === "deep" ? "deep" : "fast");
  const viewModeReport = normalizeRazielViewModeReport(response);
  return {
    v: cleanInteger(response.v) || 1,
    answer,
    deterministic: response.deterministic === true,
    intelligenceLevel,
    sourceNames: extractRazielSourceNames(response),
    ...(viewModeReport ? { viewMode: viewModeReport } : {}),
  };
}

function normalizeUsage(value) {
  if (!isObject(value)) return null;
  const inputTokens = cleanInteger(value.input_tokens ?? value.inputTokens);
  const outputTokens = cleanInteger(value.output_tokens ?? value.outputTokens);
  const usage = compactObject({ inputTokens, outputTokens });
  return Object.keys(usage).length ? usage : null;
}

export function createRazielProvenance({ response, turn, completedAt }) {
  const normalized = normalizeRazielResponse(response, turn?.intelligenceLevel);
  if (!normalized) return null;
  const plan = isObject(response.plan_meta) ? response.plan_meta : {};
  return compactObject({
    turnId: cleanInline(turn?.id, 120),
    transport: "askRaziel",
    requestedAt: cleanInline(turn?.startedAt, 40),
    completedAt: cleanInline(completedAt, 40),
    responseContract: normalized.v,
    intelligenceLevel: normalized.intelligenceLevel,
    deterministic: normalized.deterministic,
    basis: cleanInline(response.basis, 80),
    traceId: cleanInline(response.trace_id ?? response.traceId, 120),
    engine: cleanInline(response.engine, 80),
    model: cleanInline(response.model, 120),
    capabilityClass: cleanInline(plan.capability_class, 80),
    viewMode: normalized.viewMode ? (normalized.viewMode.applied ? normalized.viewMode.requested : `${normalized.viewMode.requested}:not_applied`) : null,
    usage: normalizeUsage(response.usage),
    sourceNames: normalized.sourceNames,
  });
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
    case "turn_succeeded": {
      const response = action.response;
      const sourceNames = uniqueSourceNames([response.sourceNames || []]);
      const grounding = response.deterministic === true || response.intelligenceLevel === "deterministic"
        ? "deterministic"
        : sourceNames.length ? "sourced" : "interpretation";
      return {
        ...state,
        thread: appendMessage(state.thread, {
          role: "raziel",
          text: response.answer,
          level: response.intelligenceLevel,
          question: state.currentTurn?.question || null,
          turnId: state.currentTurn?.id || null,
          continuation: state.currentTurn?.continuation || null,
          sourceNames,
          grounding,
          // Only an answer the server really produced in that mode is labelled with it.
          ...(response.viewMode ? { viewMode: response.viewMode.requested, viewModeApplied: response.viewMode.applied } : {}),
        }),
        busy: false,
        currentTurn: { ...state.currentTurn, status: "complete", completedAt: action.completedAt },
        response,
        provenance: action.provenance,
        status: "ready",
        announcement: "התשובה של רזיאל מוכנה.",
      };
    }
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
