import { buildJourney2029ContextPatch } from "./journey2029Telemetry.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_RE = /[^a-zA-Z0-9_.:-]/g;

export const GUIDED_DISCOVERY_TARGET_KIND = Object.freeze({
  SEMANTIC_JOURNEY: "semantic_journey",
  PUBLIC_PATH: "public_path",
});

function token(value, max = 120) {
  const text = String(value ?? "").trim().replace(TOKEN_RE, "").slice(0, max);
  return text || null;
}

function safeHref(value) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 500 || !text.startsWith("/") || text.startsWith("//")) return null;
  if (text.includes("\\") || /[\u0000-\u001F\u007F\s]/.test(text)) return null;
  return text;
}

function safeRoot(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function safeRevision(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export const GUIDED_DISCOVERY_REFS = Object.freeze({
  GOLDEN_878: Object.freeze({
    key: "golden_878",
    targetKind: GUIDED_DISCOVERY_TARGET_KIND.SEMANTIC_JOURNEY,
    semanticId: "golden:878:v1",
    journeyKind: "number_expression",
    rootValue: 878,
    href: "/world",
    targetSurface: "world",
    label: "צאו למסע 878",
  }),
});

export function normalizeGuidedDiscoveryRef(input) {
  if (!input || typeof input !== "object") return null;
  const targetKind = String(input.targetKind || "").trim();
  const key = token(input.key);
  const href = safeHref(input.href);
  const label = String(input.label || "").trim().slice(0, 120) || "צאו למסע";
  const journeyKind = token(input.journeyKind) || "general_research";
  const targetSurface = token(input.targetSurface) || null;
  if (!key || !href) return null;

  if (targetKind === GUIDED_DISCOVERY_TARGET_KIND.SEMANTIC_JOURNEY) {
    const semanticId = token(input.semanticId);
    const rootValue = safeRoot(input.rootValue);
    if (!semanticId || rootValue == null) return null;
    return Object.freeze({
      key,
      targetKind,
      semanticId,
      journeyKind,
      rootValue,
      href,
      targetSurface,
      label,
      pathId: null,
      revisionNo: null,
    });
  }

  if (targetKind === GUIDED_DISCOVERY_TARGET_KIND.PUBLIC_PATH) {
    const pathId = String(input.pathId || "").trim();
    if (!UUID_RE.test(pathId)) return null;
    return Object.freeze({
      key,
      targetKind,
      semanticId: null,
      journeyKind,
      rootValue: safeRoot(input.rootValue),
      href,
      targetSurface,
      label,
      pathId,
      revisionNo: safeRevision(input.revisionNo),
    });
  }

  return null;
}

function defaultNumberSubject(rootValue, href) {
  if (rootValue == null) return null;
  return {
    id: String(rootValue),
    type: "number",
    label: String(rootValue),
    href: `/2029/number/${rootValue}`,
  };
}

export function buildGuidedDiscoveryLaunch({
  ref,
  currentContext = null,
  subject = null,
  selection = null,
  returnTo = null,
  sourceSurface = null,
} = {}) {
  const guided = normalizeGuidedDiscoveryRef(ref);
  if (!guided) return null;

  const current = currentContext && typeof currentContext === "object" ? currentContext : {};
  const journeyPatch = buildJourney2029ContextPatch({
    kind: guided.journeyKind,
    mode: "guided",
    sourceSurface,
  });
  const baseDimensions = current.dimensions && typeof current.dimensions === "object"
    ? current.dimensions
    : {};

  const dimensions = {
    ...baseDimensions,
    ...journeyPatch.dimensions,
    guidedDiscoveryId: guided.key,
    guidedDiscoveryTargetKind: guided.targetKind,
  };

  let journey;
  let historyJourney = null;

  if (guided.targetKind === GUIDED_DISCOVERY_TARGET_KIND.SEMANTIC_JOURNEY) {
    journey = { id: guided.semanticId, kind: "golden", position: 0 };
    dimensions.journeySemanticId = guided.semanticId;
    dimensions.journeyRoot = guided.rootValue;
    dimensions.journeyVisitedValues = [guided.rootValue];
    dimensions.journeyMeetingSlugs = [];
    historyJourney = {
      root: guided.rootValue,
      path: [{ type: "number", value: guided.rootValue }],
      world: guided.targetSurface || "world",
      msg: guided.semanticId,
    };
  } else {
    journey = {
      id: guided.pathId,
      kind: "research_path",
      position: 0,
      revisionNo: guided.revisionNo,
    };
    dimensions.guidedPathId = guided.pathId;
    if (guided.revisionNo != null) dimensions.guidedPathRevisionNo = guided.revisionNo;
    if (guided.rootValue != null) dimensions.journeyRoot = guided.rootValue;
  }

  const nextSubject = subject
    || current.subject
    || defaultNumberSubject(guided.rootValue, guided.href);

  return Object.freeze({
    ref: guided,
    href: guided.href,
    historyJourney,
    context: {
      ...current,
      subject: nextSubject,
      selection: selection || current.selection || null,
      lens: guided.targetSurface === "world" ? "world" : (current.lens || "research"),
      journey,
      dimensions,
      returnTo: returnTo || current.returnTo || null,
    },
  });
}
