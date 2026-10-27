import {
  projectRazielConversationResolution,
  resolveRazielConversationTurn,
} from "./razielConversationResolver.js";
import {
  RAZIEL_DEFAULT_VIEW_MODE,
  normalizeRazielViewMode,
} from "./razielViewMode2029.js";
import { buildRazielSurfaceContext } from "./razielSurfaceContext.js";
import { isRegularMethodIdentity } from "./methodIdentity.js";
import {
  isValidRazielNavigationNumber,
  normalizeRazielNavigationAction,
  parseRazielNavigationRequest,
  razielNavigationNeedsFocus,
  resolveRazielNavigationAction,
  resolveRazielNavigationFollowUp,
} from "../../../supabase/functions/_shared/razielNavigationActions.js";
import {
  ELS_RAZIEL_PLANNING_SUBJECT,
  normalizeElsRazielPlanningAction,
  normalizeElsRazielSearchPlan,
} from "./elsRazielPlanning.js";

const RAZIEL_CANONICAL_RESEARCH_CONTRACT = "public-number-research-run-v1";
export const RAZIEL_PERSONAL_AREA_COMPANION_ACTION = "personal_area_companion_v1";
export const RAZIEL_PERSONAL_AREA_COMPANION_SUBJECT = "לווה אותי בצעד הבא באזור האישי";
const RAZIEL_PERSONAL_AREA_EVIDENCE_CONTRACT = "personal_area_checked_evidence_v1";

const PERSONAL_AREA_CAPABILITIES = new Set([
  "personal_overview",
  "life_journey",
  "saved_conversations",
  "hint_review",
]);
const PERSONAL_AREA_FOCUSES = new Set([
  "overview",
  "current_step",
  "conversation_center",
  "checked_hint",
]);
const PERSONAL_AREA_OPAQUE_REF_RE = /^(?:journey|session|finding|source|check):[A-Za-z0-9_-]{8,96}$/;

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

function normalizePersonalAreaOpaqueRefs(value, limit = 6) {
  const refs = [];
  const seen = new Set();
  for (const raw of Array.isArray(value) ? value : []) {
    const ref = typeof raw === "string" ? raw.trim() : "";
    if (!PERSONAL_AREA_OPAQUE_REF_RE.test(ref) || seen.has(ref)) continue;
    seen.add(ref);
    refs.push(ref);
    if (refs.length === limit) break;
  }
  return refs;
}

// The personal area may ask the existing Raziel session for companionship only after an explicit
// click. This adapter deliberately accepts machine tokens and opaque references, never labels,
// hint text, family data, dates, media URLs, ELS terms or calculator state.
export function normalizeRazielPersonalAreaCompanionAction(value = null) {
  if (!isObject(value) || value.id !== RAZIEL_PERSONAL_AREA_COMPANION_ACTION) return null;
  const capability = typeof value.capability === "string" ? value.capability.trim() : "";
  const focus = typeof value.focus === "string" ? value.focus.trim() : "";
  if (!PERSONAL_AREA_CAPABILITIES.has(capability) || !PERSONAL_AREA_FOCUSES.has(focus)) return null;
  const rawOpaqueRefs = value.opaqueRefs ?? value.opaque_refs ?? [];
  if (!Array.isArray(rawOpaqueRefs)) return null;
  const opaqueRefs = normalizePersonalAreaOpaqueRefs(rawOpaqueRefs);
  if (opaqueRefs.length !== rawOpaqueRefs.length) return null;
  const rawEvidence = value.evidencePack ?? value.evidence_pack ?? null;
  if (rawEvidence != null && !isObject(rawEvidence)) return null;
  const evidence = rawEvidence;
  let evidencePack = null;
  if (evidence) {
    const checkRef = typeof evidence.checkRef === "string"
      ? evidence.checkRef.trim()
      : typeof evidence.check_ref === "string" ? evidence.check_ref.trim() : "";
    const rawEvidenceRefs = evidence.refs;
    if (!Array.isArray(rawEvidenceRefs)) return null;
    const evidenceRefs = normalizePersonalAreaOpaqueRefs(rawEvidenceRefs, 4)
      .filter((ref) => /^(?:finding|source):/.test(ref));
    if (
      evidence.contract === RAZIEL_PERSONAL_AREA_EVIDENCE_CONTRACT
      && evidence.checked === true
      && /^check:[A-Za-z0-9_-]{8,96}$/.test(checkRef)
      && evidenceRefs.length
      && evidenceRefs.length === rawEvidenceRefs.length
    ) {
      evidencePack = Object.freeze({
        contract: RAZIEL_PERSONAL_AREA_EVIDENCE_CONTRACT,
        checked: true,
        check_ref: checkRef,
        refs: Object.freeze(evidenceRefs),
      });
    } else return null;
  }
  return Object.freeze({
    id: RAZIEL_PERSONAL_AREA_COMPANION_ACTION,
    surface: "personal_area",
    capability,
    focus,
    opaque_refs: Object.freeze(opaqueRefs),
    ...(evidencePack ? { evidence_pack: evidencePack } : {}),
  });
}

function createPersonalAreaCompanionSnapshot(action, capturedAt) {
  return Object.freeze({
    v: 1,
    surface: "personal_area",
    capturedAt: cleanInline(capturedAt, 40),
    companionAction: action,
    description: "ליווי מפורש באזור האישי",
  });
}

function createElsPlanningSnapshot(action, capturedAt) {
  return Object.freeze({
    v: 1,
    surface: "els",
    capturedAt: cleanInline(capturedAt, 40),
    description: `תוכנית חיפוש ELS מוצעת · ${action.scope === "tanakh" ? "כל התנ״ך" : "תורה"}`,
  });
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
  const resultValue = rawResult == null || rawResult === "" ? null : Number(rawResult);
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

export function createRazielRequestContextSnapshot(context = null, view = {}, capturedAt = null) {
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
    v: 1,
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
    v: 1,
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

export function buildRazielTranscript(thread = []) {
  const messages = Array.isArray(thread) ? thread : [];
  return messages.slice(-2)
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

// Loaded only after an explicit submit. Request composition, conversation resolution and response
// projection are stateless adapters; the single session and its reducer remain eagerly mounted.
export function buildRazielSessionRequest({
  question,
  state,
  contextSnapshot,
  facts = "",
  intelligenceLevel = "fast",
  again = false,
  viewMode = RAZIEL_DEFAULT_VIEW_MODE,
  companionAction = null,
  elsPlanningAction = null,
} = {}) {
  const subject = cleanInline(question, LIMITS.question);
  if (!subject) return null;
  const normalizedCompanionAction = normalizeRazielPersonalAreaCompanionAction(companionAction);
  const normalizedElsPlanningAction = normalizeElsRazielPlanningAction(elsPlanningAction);
  if (companionAction != null && elsPlanningAction != null) return null;
  if (companionAction != null) {
    if (!normalizedCompanionAction || subject !== RAZIEL_PERSONAL_AREA_COMPANION_SUBJECT) return null;
    return {
      subject: RAZIEL_PERSONAL_AREA_COMPANION_SUBJECT,
      facts: "",
      context: null,
      again: false,
      intelligenceLevel: "fast",
      surfaceSemantic: { surface: "personal_area" },
      conversationResolution: null,
      researchContract: RAZIEL_CANONICAL_RESEARCH_CONTRACT,
      companionAction: normalizedCompanionAction,
    };
  }
  if (elsPlanningAction != null) {
    if (!normalizedElsPlanningAction || subject !== ELS_RAZIEL_PLANNING_SUBJECT) return null;
    return {
      subject: ELS_RAZIEL_PLANNING_SUBJECT,
      facts: "",
      context: null,
      again: false,
      intelligenceLevel: normalizedElsPlanningAction.locked_phrases.length
        && normalizedElsPlanningAction.story.length <= 240 ? "fast" : "deep",
      surfaceSemantic: { surface: "els" },
      conversationResolution: null,
      researchContract: RAZIEL_CANONICAL_RESEARCH_CONTRACT,
      elsPlanningAction: normalizedElsPlanningAction,
    };
  }
  const surfaceSemantic = snapshotSurfaceSemantic(contextSnapshot);
  const resolvedTurn = resolveRazielConversationTurn({
    question: subject,
    thread: state?.thread,
    surfaceSemantic,
  });
  const transcript = buildRazielTranscript(state?.thread);
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
    conversationResolution: projectRazielConversationResolution(resolvedTurn),
    researchContract: RAZIEL_CANONICAL_RESEARCH_CONTRACT,
    ...(normalizeRazielViewMode(viewMode) !== RAZIEL_DEFAULT_VIEW_MODE
      ? { viewMode: normalizeRazielViewMode(viewMode) }
      : {}),
  };
}

// ── Canonical navigation actions (RAZIEL_CANONICAL_NAVIGATION_ACTIONS_V1) ──────────────────────────
// Explicit navigation requests are answered here, deterministically, before any request is built:
// no model, no transport, no URL from model output. Grammar, routes and copy live in the shared
// module that wa-raziel also imports. This adapter only supplies the VERIFIED conversation focus:
// a number the person typed, a server-calculated value in the answer's evidence summary, a page we
// opened ourselves, or the current surface's number subject. Anything else asks instead of guessing.

function distinctNumbers(values) {
  return [...new Set(values.filter((value) => isValidRazielNavigationNumber(value)).map(Number))];
}

function focusFromRazielMessage(message) {
  const navigated = cleanInteger(message.navigationAction?.number);
  if (isValidRazielNavigationNumber(navigated)) return { number: navigated, source: "conversation" };
  const calculations = normalizeRazielEvidenceSummary(message.evidenceSummary)?.calculations || [];
  const regular = calculations.filter((item) => isRegularMethodIdentity(item.method));
  const values = distinctNumbers((regular.length ? regular : calculations).map((item) => item.value));
  if (values.length === 1) return { number: values[0], source: "conversation" };
  return values.length > 1 ? { ambiguous: true } : null;
}

function focusFromUserMessage(message) {
  const identities = Array.isArray(message.identity_resolution?.identities) ? message.identity_resolution.identities : [];
  if (!identities.length) {
    // A navigation request keeps the same topic; any other message without a resolved subject ends the stretch,
    // so an older number is never reached across an unrelated conversation.
    return parseRazielNavigationRequest(message.text) ? null : { unresolved: true };
  }
  const numbers = distinctNumbers(identities.filter((item) => item?.type === "number").map((item) => cleanInteger(item.value ?? item.id)));
  if (numbers.length === 1) return { number: numbers[0], source: "conversation" };
  if (numbers.length > 1) return { ambiguous: true };
  // The latest subject is an expression/word whose value was not verified in its answer: do not reach
  // past it to an older number.
  return { unresolved: true };
}

// Most recent verified focus wins; the current surface subject is only a fallback for a thread
// that has no subject of its own.
export function selectRazielVerifiedNumberFocus({ thread = [], surfaceSemantic = null } = {}) {
  const messages = Array.isArray(thread) ? thread : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!isObject(message)) continue;
    // A personal-area companion answer is private context: it never supplies a navigation focus and ends the stretch.
    if (message.role === "raziel" && messages[index - 1]?.role === "user"
      && messages[index - 1].text === RAZIEL_PERSONAL_AREA_COMPANION_SUBJECT) return null;
    const found = message.role === "raziel" ? focusFromRazielMessage(message)
      : message.role === "user" ? focusFromUserMessage(message) : null;
    if (!found) continue;
    return found.unresolved ? null : found;
  }
  const subject = surfaceSemantic?.subject;
  if (subject?.type === "number") {
    const number = cleanInteger(subject.id ?? subject.label);
    if (isValidRazielNavigationNumber(number)) return { number, source: "surface" };
  }
  return null;
}

export function resolveRazielNavigationTurn({ question, state, contextSnapshot } = {}) {
  const thread = Array.isArray(state?.thread) ? state.thread : [];
  const latest = thread[thread.length - 1];
  if (isObject(latest?.navigationClarify)) {
    const followUp = resolveRazielNavigationFollowUp({ text: question, pendingIntent: latest.navigationClarify.intent });
    if (followUp) return followUp;
  }
  const request = parseRazielNavigationRequest(question);
  if (!request) return null;
  const focus = razielNavigationNeedsFocus(request)
    ? selectRazielVerifiedNumberFocus({ thread, surfaceSemantic: snapshotSurfaceSemantic(contextSnapshot) })
    : null;
  return resolveRazielNavigationAction({ request, focus });
}

export function createRazielNavigationTurnSucceededAction({ state, navigation, completedAt }) {
  const action = navigation?.type === "navigate" ? normalizeRazielNavigationAction(navigation) : null;
  const answer = cleanAnswer(navigation?.message);
  const turn = state?.currentTurn || {};
  const message = {
    role: "raziel",
    text: answer,
    level: "deterministic",
    question: turn.question || null,
    turnId: turn.id || null,
    continuation: null,
    sourceNames: [],
    grounding: "deterministic",
    ...(action ? { navigationAction: action } : {}),
    ...(navigation?.type === "clarify" ? { navigationClarify: { intent: navigation.intent, reason: navigation.reason } } : {}),
  };
  return {
    type: "turn_succeeded",
    patch: {
      thread: [...(Array.isArray(state?.thread) ? state.thread : []), message].slice(-LIMITS.threadMessages),
      busy: false,
      currentTurn: { ...turn, status: "complete", completedAt },
      response: { v: 1, answer, deterministic: true, intelligenceLevel: "deterministic", sourceNames: [] },
      provenance: compactObject({
        turnId: cleanInline(turn.id, 120),
        transport: "deterministic_navigation",
        requestedAt: cleanInline(turn.startedAt, 40),
        completedAt: cleanInline(completedAt, 40),
        intelligenceLevel: "deterministic",
        deterministic: true,
        basis: "raziel_canonical_navigation_actions_v1",
        modelCalls: 0,
        sourceNames: [],
      }),
      status: "ready",
      announcement: "רזיאל מוכן.",
    },
  };
}

export function prepareRazielSessionSubmission({
  question,
  state,
  researchContext,
  facts = "",
  intelligenceLevel = "fast",
  again = false,
  view = {},
  projection = null,
  viewMode = null,
  viewModeOverride = null,
  continuationTurnId = null,
  companionAction = null,
  elsPlanningAction = null,
  startedAt,
  createTurnId,
} = {}) {
  const normalizedCompanionAction = normalizeRazielPersonalAreaCompanionAction(companionAction);
  const normalizedElsPlanningAction = normalizeElsRazielPlanningAction(elsPlanningAction);
  const subject = cleanInline(
    normalizedCompanionAction
      ? RAZIEL_PERSONAL_AREA_COMPANION_SUBJECT
      : normalizedElsPlanningAction ? ELS_RAZIEL_PLANNING_SUBJECT : question,
    LIMITS.question,
  );
  if (!subject) return null;
  if (companionAction != null && !normalizedCompanionAction) return null;
  if (elsPlanningAction != null && !normalizedElsPlanningAction) return null;
  if (companionAction != null && elsPlanningAction != null) return null;
  // Navigation is checked ONLY for an ordinary explicit request. The personal-area companion action, continuations
  // (deepen / one-shot / again) and per-request view-mode overrides are decided above and never routed as navigation.
  const ordinaryExplicitRequest = !normalizedCompanionAction
    && !normalizedElsPlanningAction
    && companionAction == null
    && elsPlanningAction == null
    && !again
    && continuationTurnId == null
    && viewModeOverride == null;
  if (ordinaryExplicitRequest) {
    const navContextSnapshot = createRazielRequestContextSnapshot(researchContext, view, startedAt);
    const navigation = resolveRazielNavigationTurn({ question: subject, state, contextSnapshot: navContextSnapshot });
    if (navigation) {
      return {
        navigation,
        request: null,
        contextSnapshot: navContextSnapshot,
        turn: {
          id: createTurnId(),
          question: subject,
          identityResolution: null,
          intelligenceLevel: "fast",
          again: false,
          projection: projection === "mobile" ? "mobile" : projection === "desktop" ? "desktop" : null,
          startedAt,
          continuation: null,
        },
      };
    }
  }
  const continuation = again ? selectRazielContinuation(state?.thread, {
    turnId: continuationTurnId,
    question: subject,
  }) : null;
  const contextSnapshot = continuation?.contextSnapshot
    || createRazielRequestContextSnapshot(researchContext, view, startedAt);
  const selectedFacts = continuation ? continuation.facts : facts;
  const selectedContextSnapshot = normalizedCompanionAction
    ? createPersonalAreaCompanionSnapshot(normalizedCompanionAction, startedAt)
    : normalizedElsPlanningAction
      ? createElsPlanningSnapshot(normalizedElsPlanningAction, startedAt)
    : contextSnapshot;
  // A plain continuation (deepen) keeps the mode of the answer it extends. A one-shot per-request mode (the surprise)
  // replaces it for this request only; the stored answer and the session's own mode are not modified.
  const oneShotViewMode = viewModeOverride == null ? null : normalizeRazielViewMode(viewModeOverride);
  const selectedViewMode = continuation?.viewMode && !oneShotViewMode ? continuation.viewMode : oneShotViewMode ?? viewMode ?? state?.viewMode;
  // "מתפרע" is an explicit request for interpretive depth: the user's choice of that mode (or of the one-shot) sends
  // intelligence_level "deep". The server never derives a provider or model from view_mode; its router still owns that choice.
  const request = buildRazielSessionRequest({
    question: subject,
    state,
    contextSnapshot: selectedContextSnapshot,
    facts: normalizedCompanionAction || normalizedElsPlanningAction ? "" : selectedFacts,
    intelligenceLevel: normalizeRazielViewMode(selectedViewMode) === "exploratory" ? "deep" : intelligenceLevel,
    again,
    viewMode: selectedViewMode,
    companionAction: normalizedCompanionAction,
    elsPlanningAction: normalizedElsPlanningAction,
  });
  if (!request) return null;
  const turn = {
    id: createTurnId(),
    question: normalizedElsPlanningAction
      ? cleanInline(normalizedElsPlanningAction.story, LIMITS.question)
      : request.subject,
    identityResolution: request.conversationResolution ? {
      identities: request.conversationResolution.identities,
      explicit_text_computation: false,
    } : null,
    intelligenceLevel: request.intelligenceLevel,
    again: request.again,
    projection: projection === "mobile" ? "mobile" : projection === "desktop" ? "desktop" : null,
    startedAt,
    continuation: createRazielContinuationSnapshot({
      contextSnapshot: selectedContextSnapshot,
      facts: request.facts,
      viewMode: selectedViewMode,
    }),
  };
  return { request, turn, contextSnapshot: selectedContextSnapshot };
}

// What a server answer reports about the mode it actually applied (plan_meta.view_mode / view_mode).
// "applied:false" (no Bundle / quota / degraded) must never be presented as a landscape/exploratory answer.
export function normalizeRazielViewModeReport(response) {
  const raw = response?.view_mode ?? response?.plan_meta?.view_mode;
  if (!raw || typeof raw !== "object") return null;
  const requested = normalizeRazielViewMode(raw.requested);
  if (requested === RAZIEL_DEFAULT_VIEW_MODE) return null;
  return Object.freeze({
    requested,
    applied: raw.applied === true,
    reason: typeof raw.reason === "string" ? raw.reason.slice(0, 40) : null,
  });
}


export function extractRazielSourceNames(response = null) {
  if (!isObject(response)) return [];
  const provenanceSources = isObject(response.provenance) ? response.provenance.sources : [];
  return uniqueSourceNames([response.sources || [], response.evidence || [], provenanceSources || []]);
}

export function normalizeRazielEvidenceSummary(value = null) {
  if (!isObject(value)) return null;
  const numberLink = (input) => {
    const value = cleanInteger(input);
    return value && value >= 1 && value <= 999999 ? { value, href: `/2029/number/${value}` } : null;
  };
  const calculations = (Array.isArray(value.calculations) ? value.calculations : []).slice(0, 6).flatMap((item) => {
    if (!isObject(item)) return [];
    const expression = cleanInline(item.expression, 120);
    const method = cleanInline(item.method, 60);
    const link = numberLink(item.value);
    return expression && method && link ? [{ expression, method, ...link }] : [];
  });
  const findings = (Array.isArray(value.findings) ? value.findings : []).slice(0, 8).flatMap((item) => {
    if (!isObject(item)) return [];
    const label = cleanInline(item.label, 140);
    if (!label) return [];
    const link = numberLink(item.value);
    const methods = (Array.isArray(item.methods) ? item.methods : []).slice(0, 4).flatMap((methodItem) => {
      if (!isObject(methodItem)) return [];
      const method = cleanInline(methodItem.method, 60);
      const methodLink = numberLink(methodItem.value);
      return method && methodLink ? [{ method, value: methodLink.value }] : [];
    });
    return [{
      label,
      lane: cleanInline(item.lane, 40),
      method: cleanInline(item.method, 60),
      sourceName: cleanInline(item.source_name ?? item.sourceName, 120),
      ...(link || {}),
      ...(methods.length ? { methods } : {}),
    }];
  });
  if (!calculations.length && !findings.length) return null;
  return {
    title: cleanInline(value.title, 100) || "מה רזיאל מצא",
    calculations,
    findings,
    mapAvailable: value.map_available === true || value.mapAvailable === true,
  };
}

export function formatRazielEvidenceSummary(value = null, { expanded = false } = {}) {
  const summary = normalizeRazielEvidenceSummary(value);
  if (!summary) return "";
  const count = summary.calculations.length + summary.findings.length;
  if (!expanded) {
    return summary.mapAvailable
      ? `🔎 רזיאל מצא ${count} חיבורים מאחורי התשובה · אפשר לפתוח את התמונה המלאה.`
      : `🔎 רזיאל מצא ${count} חיבורים מאחורי התשובה.`;
  }
  const lines = [];
  const seen = new Set();
  const add = (text) => {
    if (!text || seen.has(text)) return;
    seen.add(text);
    lines.push(`• ${text}`);
  };
  for (const item of summary.calculations) add(`${item.expression} · ${item.method} = ${item.value} · חישוב מאומת`);
  for (const item of summary.findings) {
    const methodText = item.methods?.length
      ? item.methods.map((method) => `${method.method}=${method.value}`).join(" · ")
      : [item.method, item.value].filter((part) => part !== null && part !== undefined && part !== "").join(" = ");
    const lane = item.lane === "source_claim" ? "טענת מקור" : item.lane === "engine_finding" ? "ממצא מחושב" : "חישוב שנבדק";
    add(`${item.label}${methodText ? ` · ${methodText}` : ""} · ${lane}${item.sourceName ? ` · ${item.sourceName}` : ""}`);
  }
  return [`🔎 ${summary.title}`, ...lines, "כך הגענו לתשובה; הטקסט שמעל הוא ההסבר של רזיאל.", ...(summary.mapAvailable ? ["כדי לראות את כל הקשרים, אפשר לבחור „🗺️ פתח מפת מחקר” שמתחת."] : [])].join("\n");
}

const RAZIEL_SUGGESTED_ACTION_LABELS = Object.freeze({
  all_methods: "בדוק בכל השיטות",
  save_conversation: "שמור את השיחה",
  deepen: "להעמיק בתשובה",
  save_as_life_journey_hint: "שמור כרמז במסע שלי",
});

// suggested_paths is an executable surface, not prose. Accept only the closed server registry,
// derive labels locally, and cap it at two actions even if an older or malformed response sends more.
export function normalizeRazielSuggestedActions(value = null) {
  if (!Array.isArray(value)) return [];
  const actions = [];
  const seen = new Set();
  for (const item of value) {
    if (!isObject(item) || seen.has(item.id)) continue;
    if (item.id === "all_methods") {
      const subject = cleanInline(item.subject, 120);
      if (!subject) continue;
      actions.push({ id: item.id, label: RAZIEL_SUGGESTED_ACTION_LABELS[item.id], subject });
    } else if (item.id === "open_number") {
      const href = typeof item.href === "string" ? item.href.trim() : "";
      const match = href.match(/^\/2029\/number\/([1-9]\d{0,5})$/);
      const number = match ? Number(match[1]) : 0;
      if (!Number.isSafeInteger(number) || number < 1 || number > 999999) continue;
      actions.push({ id: item.id, label: `פתח את המספר ${number}`, href: `/2029/number/${number}` });
    } else if (item.id === "save_as_life_journey_hint") {
      if (item.href !== "/2029/journey?focus=hints") continue;
      actions.push({
        id: item.id,
        label: RAZIEL_SUGGESTED_ACTION_LABELS[item.id],
        href: "/2029/journey?focus=hints",
      });
    } else if (item.id === "save_conversation" || item.id === "deepen") {
      actions.push({ id: item.id, label: RAZIEL_SUGGESTED_ACTION_LABELS[item.id] });
    } else {
      continue;
    }
    seen.add(item.id);
    if (actions.length === 2) break;
  }
  return actions;
}

export function normalizeRazielResponse(response, requestedLevel = "fast", request = null) {
  if (!isObject(response)) return null;
  const answer = cleanAnswer(response.answer);
  if (!answer) return null;
  const intelligenceLevel = response.deterministic
    ? "deterministic"
    : cleanInline(response.intelligence_level, 30) || (requestedLevel === "deep" ? "deep" : "fast");
  const viewModeReport = normalizeRazielViewModeReport(response);
  const evidenceSummary = normalizeRazielEvidenceSummary(response.evidence_summary);
  const suggestedActions = normalizeRazielSuggestedActions(response.suggested_paths);
  const elsSearchPlan = request?.elsPlanningAction
    ? normalizeElsRazielSearchPlan(response.els_search_plan, request.elsPlanningAction)
    : null;
  // The conversation stays readable.  The full calculation/source appendix belongs to the
  // explicit Research Map action; ordinary and exploratory answers retain only a compact,
  // auditable pointer while keeping the structured evidence on the message object.
  const evidenceText = formatRazielEvidenceSummary(response.evidence_summary, {
    expanded: viewModeReport?.requested === "landscape" && viewModeReport.applied === true,
  });
  return {
    v: cleanInteger(response.v) || 1,
    answer: evidenceText ? `${answer.slice(0, Math.max(1, LIMITS.answer - evidenceText.length - 2)).trim()}\n\n${evidenceText}` : answer,
    deterministic: response.deterministic === true,
    intelligenceLevel,
    sourceNames: extractRazielSourceNames(response),
    ...(evidenceSummary ? { evidenceSummary } : {}),
    ...(suggestedActions.length ? { suggestedActions } : {}),
    ...(viewModeReport ? { viewMode: viewModeReport } : {}),
    ...(elsSearchPlan ? { elsSearchPlan } : {}),
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
    // 'ready' only when the server built a valid canonical Result Bundle for this answer (gates the one-shot surprise action).
    bundleStatus: cleanInline(isObject(plan.canonical_result_bundle) ? plan.canonical_result_bundle.status : null, 20),
    viewMode: normalized.viewMode
      ? (normalized.viewMode.applied ? normalized.viewMode.requested : `${normalized.viewMode.requested}:not_applied`)
      : null,
    usage: normalizeUsage(response.usage),
    sourceNames: normalized.sourceNames,
  });
}

export function createRazielTurnSucceededAction({ state, response, provenance, completedAt }) {
  const sourceNames = Array.isArray(response?.sourceNames) ? response.sourceNames : [];
  const grounding = response?.deterministic === true || response?.intelligenceLevel === "deterministic"
    ? "deterministic"
    : sourceNames.length ? "sourced" : "interpretation";
  const previousEvidence = [...(Array.isArray(state?.thread) ? state.thread : [])]
    .reverse()
    .find((item) => item?.role === "raziel" && item?.evidenceSummary)?.evidenceSummary || null;
  const repeatsEvidence = state?.currentTurn?.again === true
    && previousEvidence != null
    && response?.evidenceSummary != null
    && JSON.stringify(previousEvidence) === JSON.stringify(response.evidenceSummary);
  const evidenceText = repeatsEvidence ? formatRazielEvidenceSummary(response.evidenceSummary) : "";
  const repeatedSuffix = evidenceText && response.answer.endsWith(`\n\n${evidenceText}`)
    ? response.answer.slice(0, -(evidenceText.length + 2)).trim()
    : response.answer;
  const presentedAnswer = repeatsEvidence
    ? `${repeatedSuffix}\n\n🔎 מה שרזיאל מצא זהה לתשובה הקודמת; התמונה המלאה עדיין זמינה לפתיחה.`
    : response.answer;
  const presentedResponse = repeatsEvidence ? { ...response, answer: presentedAnswer } : response;
  const message = {
    role: "raziel",
    text: presentedAnswer,
    level: response.intelligenceLevel,
    question: state?.currentTurn?.question || null,
    turnId: state?.currentTurn?.id || null,
    continuation: state?.currentTurn?.continuation || null,
    sourceNames,
    grounding,
    ...(response.evidenceSummary ? { evidenceSummary: response.evidenceSummary } : {}),
    ...(response.suggestedActions?.length ? { suggestedActions: response.suggestedActions } : {}),
    ...(response.viewMode ? { viewMode: response.viewMode.requested, viewModeApplied: response.viewMode.applied } : {}),
    ...(response.elsSearchPlan ? { elsSearchPlan: response.elsSearchPlan } : {}),
  };
  return {
    type: "turn_succeeded",
    patch: {
      thread: [...(Array.isArray(state?.thread) ? state.thread : []), message].slice(-LIMITS.threadMessages),
      busy: false,
      currentTurn: { ...state?.currentTurn, status: "complete", completedAt },
      response: presentedResponse,
      provenance,
      status: "ready",
      announcement: "התשובה של רזיאל מוכנה.",
    },
  };
}
