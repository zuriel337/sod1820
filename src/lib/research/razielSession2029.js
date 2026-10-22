// Temporary, in-memory Raziel conversation state for the 2029 shell.
// ResearchProvider remains the only owner of saved items, collections, paths and research Context.

export const RAZIEL_SESSION_VERSION = 1;

const LIMITS = Object.freeze({
  question: 300,
  factPack: 1200,
  context: 600,
  transcript: 500,
  transcriptTurn: 200,
  answer: 12000,
  threadMessages: 40,
  sourceNames: 8,
  personalExpression: 160,
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
  const resultValue = value.resultValue == null || value.resultValue === ""
    ? null
    : Number(value.resultValue);
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
    occurrence: cleanInline(occurrence.occurrenceRef ?? occurrence.occurrence_id, 120),
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
  const snapshot = {
    v: RAZIEL_SESSION_VERSION,
    surface: cleanInline(view.surface ?? current.surface ?? current.lens ?? subject?.type ?? "frame", 40),
    lens: cleanInline(current.lens, 60),
    subject: subject && Object.keys(subject).length ? subject : null,
    focus: compactObject({ number, reading, els }),
    journey: journey && Object.keys(journey).length ? journey : null,
    sourceNames,
    capturedAt: cleanInline(capturedAt, 40),
  };
  return { ...snapshot, description: describeSnapshot({ subject, number, reading, els, sourceNames }) };
}

export function buildRazielTranscript(thread = [], again = false) {
  const messages = Array.isArray(thread) ? thread : [];
  const prior = again ? messages.slice(0, -1) : messages;
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
    context: compactObject({ lens: snapshot.lens, journey: snapshot.journey }),
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
} = {}) {
  const subject = cleanInline(question, LIMITS.question);
  if (!subject) return null;
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
    surfaceSemantic: snapshotSurfaceSemantic(contextSnapshot),
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
  return {
    v: cleanInteger(response.v) || 1,
    answer,
    deterministic: response.deterministic === true,
    intelligenceLevel,
    sourceNames: extractRazielSourceNames(response),
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
    personalPair: {
      draft: { left: "", right: "" },
      status: "idle",
      outcome: null,
      expressions: [],
      bundle: null,
      traceId: null,
      contract: null,
      cost: null,
      error: null,
      completedAt: null,
      previewFixture: false,
    },
  };
}

function appendMessage(thread, message) {
  return [...thread, message].slice(-LIMITS.threadMessages);
}

export function razielSessionReducer(state, action) {
  switch (action?.type) {
    case "personal_pair_draft": {
      if (!new Set(["left", "right"]).has(action.field) || state.busy) return state;
      const value = String(action.value || "").slice(0, LIMITS.personalExpression);
      if (state.personalPair?.draft?.[action.field] === value) return state;
      return {
        ...state,
        personalPair: {
          ...createInitialRazielSessionState().personalPair,
          draft: { ...state.personalPair.draft, [action.field]: value },
        },
      };
    }
    case "personal_pair_started":
      return {
        ...state,
        busy: true,
        currentTurn: { ...action.turn, kind: "personal_gematria_pair", status: "running" },
        status: "busy",
        announcement: "רזיאל בודק קשר חישובי — ללא AI.",
        personalPair: {
          ...createInitialRazielSessionState().personalPair,
          draft: state.personalPair.draft,
          status: "busy",
          expressions: action.expressions,
        },
      };
    case "personal_pair_succeeded":
      return {
        ...state,
        busy: false,
        currentTurn: { ...state.currentTurn, status: "complete", completedAt: action.completedAt },
        status: "ready",
        announcement: action.result.outcome === "negative"
          ? "הבדיקה הסתיימה ללא ראיה מהותית."
          : "הבדיקה החישובית מוכנה.",
        personalPair: {
          ...state.personalPair,
          status: action.result.outcome,
          outcome: action.result.outcome,
          bundle: action.result.bundle,
          traceId: action.result.traceId || null,
          contract: action.result.contract || null,
          cost: action.result.cost || null,
          error: null,
          completedAt: action.completedAt,
          previewFixture: action.result.previewFixture === true,
        },
      };
    case "personal_pair_failed":
      return {
        ...state,
        busy: false,
        currentTurn: { ...state.currentTurn, status: "error", completedAt: action.completedAt, error: action.error },
        status: "error",
        announcement: "הבדיקה לא הושלמה. לא הוצגה מסקנת חוסר־קשר.",
        personalPair: {
          ...state.personalPair,
          status: "error",
          outcome: "error",
          bundle: null,
          traceId: action.traceId || null,
          contract: null,
          cost: null,
          error: cleanInline(action.error, 80) || "research_unavailable",
          completedAt: action.completedAt,
          previewFixture: false,
        },
      };
    case "turn_started": {
      const { turn, contextSnapshot } = action;
      const thread = turn.again
        ? state.thread
        : appendMessage(state.thread, { role: "user", text: turn.question, turnId: turn.id });
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
      return {
        ...state,
        thread: appendMessage(state.thread, {
          role: "raziel",
          text: response.answer,
          level: response.intelligenceLevel,
          question: state.currentTurn?.question || null,
          turnId: state.currentTurn?.id || null,
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
