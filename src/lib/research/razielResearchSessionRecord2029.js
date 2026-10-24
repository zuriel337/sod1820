// Canonical, storage-neutral representation of one Raziel conversation inside the existing
// Research Workspace. This module does not persist anything and does not create a second memory,
// history store or Research Context. A future explicit-save adapter may attach this private
// representation to the canonical Research Path substrate.

export const RAZIEL_RESEARCH_SESSION_SCHEMA = "raziel-research-session-v1";

const LIMITS = Object.freeze({
  turns: 20,
  question: 300,
  answer: 12000,
  title: 120,
  id: 120,
  sourceNames: 8,
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

function cleanAnswer(value) {
  if (value == null) return null;
  const text = String(value)
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, LIMITS.answer);
  return text || null;
}

function cleanInteger(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item != null && item !== ""));
}

function cleanInternalHref(value) {
  const href = cleanInline(value, 600);
  return href && href.startsWith("/") && !href.startsWith("//") ? href : null;
}

function uniqueSourceNames(values) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const name = cleanInline(value, 120);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length === LIMITS.sourceNames) break;
  }
  return out;
}

function normalizeSubject(value) {
  if (!isObject(value)) return null;
  const subject = compact({
    type: cleanInline(value.type, 40),
    id: cleanInline(value.id ?? value.ref, LIMITS.id),
    label: cleanInline(value.label ?? value.title, 160),
  });
  return subject.type && subject.id ? subject : null;
}

function normalizeFocus(value) {
  if (!isObject(value)) return null;
  const numberValue = isObject(value.number) ? value.number : null;
  const readingValue = isObject(value.reading) ? value.reading : null;
  const elsValue = isObject(value.els) ? value.els : null;
  const rawResult = numberValue?.result;
  const result = rawResult == null || rawResult === "" ? null : Number(rawResult);
  const number = numberValue ? compact({
    root: cleanInline(numberValue.root, 40),
    expression: cleanInline(numberValue.expression, 80),
    method: cleanInline(numberValue.method, 60),
    result: Number.isFinite(result) ? result : null,
    crossingPartner: cleanInline(numberValue.crossingPartner, 80),
  }) : null;
  const reading = readingValue ? compact({
    label: cleanInline(readingValue.label, 120),
    primary: cleanInline(readingValue.primary, 160),
    sourceLabel: cleanInline(readingValue.sourceLabel, 120),
    reference: cleanInline(readingValue.reference, 120),
  }) : null;
  const direction = cleanInteger(elsValue?.dir);
  const els = elsValue ? compact({
    term: cleanInline(elsValue.term, 80),
    occurrence: cleanInline(elsValue.occurrence, 120),
    corpus: cleanInline(elsValue.corpus, 80),
    start: cleanInteger(elsValue.start),
    end: cleanInteger(elsValue.end),
    skip: cleanInteger(elsValue.skip),
    dir: [-1, 1].includes(direction) ? direction : null,
  }) : null;
  const focus = compact({
    number: number && Object.keys(number).length ? number : null,
    reading: reading && Object.keys(reading).length ? reading : null,
    els: els && Object.keys(els).length ? els : null,
  });
  return Object.keys(focus).length ? focus : null;
}

function normalizeJourney(value) {
  if (!isObject(value)) return null;
  const journey = compact({
    kind: cleanInline(value.kind, 40),
    id: cleanInline(value.id, LIMITS.id),
    position: cleanInteger(value.position),
    revisionNo: cleanInteger(value.revisionNo),
  });
  return Object.keys(journey).length ? journey : null;
}

export function normalizeRazielResearchSessionContext2029(value) {
  if (!isObject(value)) return null;
  const subject = normalizeSubject(value.subject);
  const focus = normalizeFocus(value.focus);
  const journey = normalizeJourney(value.journey);
  const context = compact({
    surface: cleanInline(value.surface, 40) || "frame",
    lens: cleanInline(value.lens, 60),
    subjectHref: cleanInternalHref(value.subjectHref),
    subject,
    focus,
    journey,
    sourceNames: uniqueSourceNames(value.sourceNames),
    capturedAt: cleanInline(value.capturedAt, 40),
  });
  return subject || focus || journey ? context : null;
}

function normalizeUsage(value) {
  if (!isObject(value)) return null;
  const usage = compact({
    inputTokens: cleanInteger(value.inputTokens),
    outputTokens: cleanInteger(value.outputTokens),
  });
  return Object.keys(usage).length ? usage : null;
}

function normalizeProvenance(value) {
  if (!isObject(value)) return null;
  const provenance = compact({
    transport: cleanInline(value.transport, 40),
    requestedAt: cleanInline(value.requestedAt, 40),
    completedAt: cleanInline(value.completedAt, 40),
    responseContract: cleanInteger(value.responseContract),
    intelligenceLevel: cleanInline(value.intelligenceLevel, 30),
    deterministic: value.deterministic === true,
    basis: cleanInline(value.basis, 80),
    traceId: cleanInline(value.traceId, LIMITS.id),
    engine: cleanInline(value.engine, 80),
    model: cleanInline(value.model, LIMITS.id),
    capabilityClass: cleanInline(value.capabilityClass, 80),
    viewMode: cleanInline(value.viewMode, 40),
    usage: normalizeUsage(value.usage),
    sourceNames: uniqueSourceNames(value.sourceNames),
  });
  return Object.keys(provenance).length ? provenance : null;
}

function messageByTurnId(thread, turnId) {
  return thread.find((message) => message?.role === "user" && message?.turnId === turnId) || null;
}

function normalizeTurn(value) {
  if (!isObject(value)) return null;
  const id = cleanInline(value.id ?? value.turnId, LIMITS.id);
  const question = cleanInline(value.question, LIMITS.question);
  const answer = cleanAnswer(value.answer);
  if (!id || !question || !answer) return null;
  return compact({
    id,
    question,
    answer,
    intelligenceLevel: cleanInline(value.intelligenceLevel ?? value.level, 30) || "fast",
    grounding: cleanInline(value.grounding, 30),
    viewMode: cleanInline(value.viewMode, 40),
    viewModeApplied: typeof value.viewModeApplied === "boolean" ? value.viewModeApplied : null,
    startedAt: cleanInline(value.startedAt, 40),
    completedAt: cleanInline(value.completedAt, 40),
    sourceNames: uniqueSourceNames(value.sourceNames),
    context: normalizeRazielResearchSessionContext2029(value.context),
    provenance: normalizeProvenance(value.provenance),
  });
}

function turnsFromState(state) {
  const thread = Array.isArray(state?.thread) ? state.thread : [];
  return thread
    .filter((message) => message?.role === "raziel")
    .slice(-LIMITS.turns)
    .map((message) => {
      const user = messageByTurnId(thread, message.turnId);
      return normalizeTurn({
        id: message.turnId,
        question: message.question ?? user?.text,
        answer: message.text,
        intelligenceLevel: message.level,
        grounding: message.grounding,
        viewMode: message.viewMode,
        viewModeApplied: message.viewModeApplied,
        startedAt: user?.startedAt ?? message.provenance?.requestedAt,
        completedAt: message.completedAt ?? message.provenance?.completedAt,
        sourceNames: message.sourceNames,
        context: message.continuation?.contextSnapshot,
        provenance: message.provenance,
      });
    })
    .filter(Boolean);
}

function sessionTitle(turns) {
  const first = turns[0]?.question;
  return cleanInline(first, LIMITS.title) || "מחקר עם רזיאל";
}

function researchPathReference(context) {
  const journey = context?.journey;
  if (journey?.kind !== "research_path" || !journey.id) return null;
  return compact({
    id: journey.id,
    revisionNo: journey.revisionNo,
    position: journey.position,
  });
}

export function createRazielResearchSessionRecord2029(state, { savedAt = null } = {}) {
  const sessionId = cleanInline(state?.sessionId, LIMITS.id);
  const turns = turnsFromState(state);
  if (!sessionId || !turns.length) return null;
  const createdAt = cleanInline(state?.createdAt ?? turns[0]?.startedAt, 40);
  const updatedAt = cleanInline(state?.updatedAt ?? turns.at(-1)?.completedAt ?? savedAt, 40);
  const context = normalizeRazielResearchSessionContext2029(turns.at(-1)?.context ?? state?.contextSnapshot);
  return Object.freeze({
    schema: RAZIEL_RESEARCH_SESSION_SCHEMA,
    kind: "research_session_representation",
    accessScope: "private",
    authorization: "server_resolved_on_save",
    session: compact({
      id: sessionId,
      title: cleanInline(state?.title, LIMITS.title) || sessionTitle(turns),
      createdAt,
      updatedAt,
      savedAt: cleanInline(savedAt, 40),
      status: state?.busy ? "in_progress" : state?.status === "error" ? "interrupted" : "ready",
      viewMode: cleanInline(state?.viewMode, 40) || "general",
    }),
    context,
    researchPath: researchPathReference(context),
    turns,
    counts: { turns: turns.length },
  });
}

export function normalizeRazielResearchSessionRecord2029(value) {
  if (!isObject(value) || value.schema !== RAZIEL_RESEARCH_SESSION_SCHEMA) return null;
  const session = isObject(value.session) ? value.session : null;
  const id = cleanInline(session?.id, LIMITS.id);
  if (!id || !Array.isArray(value.turns)) return null;
  const turns = value.turns.slice(-LIMITS.turns).map(normalizeTurn).filter(Boolean);
  if (!turns.length) return null;
  const context = normalizeRazielResearchSessionContext2029(value.context ?? turns.at(-1)?.context);
  return Object.freeze({
    schema: RAZIEL_RESEARCH_SESSION_SCHEMA,
    kind: "research_session_representation",
    accessScope: "private",
    authorization: "server_resolved_on_save",
    session: compact({
      id,
      title: cleanInline(session.title, LIMITS.title) || sessionTitle(turns),
      createdAt: cleanInline(session.createdAt, 40),
      updatedAt: cleanInline(session.updatedAt, 40),
      savedAt: cleanInline(session.savedAt, 40),
      status: ["ready", "in_progress", "interrupted"].includes(session.status) ? session.status : "ready",
      viewMode: cleanInline(session.viewMode, 40) || "general",
    }),
    context,
    researchPath: researchPathReference(context),
    turns,
    counts: { turns: turns.length },
  });
}
