// Universal Research Context Adapter v1
// Logical/personal navigation state over EXISTING Research OS primitives.
// Context is NOT a truth store, Finding store, graph, claim, or canonical entity.

export const RESEARCH_CONTEXT_VERSION = 1;

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const cleanString = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
};
const cleanInteger = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

function normalizeSubject(value) {
  if (!isObject(value)) return null;
  const id = cleanString(value.id ?? value.ref);
  const type = cleanString(value.type);
  if (!id || !type) return null;
  return {
    id,
    type,
    label: cleanString(value.label ?? value.title),
    href: cleanString(value.href ?? value.link),
  };
}

function normalizeSelection(value) {
  if (!isObject(value)) return null;
  const resultValueRaw = value.resultValue;
  const resultValueNumber = resultValueRaw == null || resultValueRaw === "" ? null : Number(resultValueRaw);
  const out = {
    entityId: cleanString(value.entityId),
    entityType: cleanString(value.entityType),
    findingId: cleanString(value.findingId),
    sourceRef: cleanString(value.sourceRef),
    locator: cleanString(value.locator),
    versionRef: cleanString(value.versionRef),

    // Research Workspace v4 additive Number-focus projection.
    // These fields are navigation/selection state only — never Truth, canonical identity or a
    // second calculation store. Number owns computation; surfaces preserve the exact focus.
    expression: cleanString(value.expression),
    method: cleanString(value.method),
    resultValue: Number.isFinite(resultValueNumber) ? resultValueNumber : null,
    focusKind: cleanString(value.focusKind),
    crossingPartner: cleanString(value.crossingPartner),

    // ELS exact-locus selection is bounded navigation/replay intent only.
    // It never means the occurrence is verified; the canonical ELS verify boundary must replay it.
    term: cleanString(value.term),
    corpus: cleanString(value.corpus),
    corpusVersion: cleanString(value.corpusVersion),
    occurrenceId: cleanString(value.occurrenceId),
    start: cleanInteger(value.start),
    end: cleanInteger(value.end),
    skip: cleanInteger(value.skip),
    dir: [-1, 1].includes(cleanInteger(value.dir)) ? cleanInteger(value.dir) : null,
  };
  return Object.values(out).some((item) => item != null && item !== "") ? out : null;
}

function normalizeJourney(value) {
  if (!isObject(value)) return null;
  const revisionNoRaw = value.revisionNo;
  const revisionNo = revisionNoRaw == null || revisionNoRaw === "" ? null : Number(revisionNoRaw);
  const out = {
    id: cleanString(value.id),
    kind: cleanString(value.kind),
    position: value.position == null ? null : value.position,
    findingId: cleanString(value.findingId),
    revisionId: cleanString(value.revisionId),
    revisionNo: Number.isInteger(revisionNo) && revisionNo > 0 ? revisionNo : null,
  };
  return Object.values(out).some((v) => v != null && v !== "") ? out : null;
}

function normalizeAccess(value) {
  if (!isObject(value)) return null;
  const out = {
    tier: cleanString(value.tier),
    scope: cleanString(value.scope),
  };
  return Object.values(out).some(Boolean) ? out : null;
}

function normalizeDimensions(value) {
  if (!isObject(value)) return {};
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (item == null || typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      out[key] = item;
    } else if (Array.isArray(item)) {
      out[key] = item.filter((v) => v == null || ["string", "number", "boolean"].includes(typeof v));
    }
  }
  return out;
}

// Exact-return stays inside the same Research Context owner. It is a bounded
// snapshot of navigation/research state, never a second history/store. Older
// returnTo objects containing only href/label/subject remain valid.
function normalizeReturnTo(value) {
  if (!isObject(value)) return null;
  const href = cleanString(value.href);
  if (!href) return null;
  return {
    href,
    label: cleanString(value.label),
    subject: normalizeSubject(value.subject),
    selection: normalizeSelection(value.selection),
    lens: cleanString(value.lens),
    dimensions: normalizeDimensions(value.dimensions),
    journey: normalizeJourney(value.journey),
  };
}

export function normalizeResearchContext(value) {
  if (!isObject(value)) return null;
  const context = {
    version: RESEARCH_CONTEXT_VERSION,
    subject: normalizeSubject(value.subject),
    selection: normalizeSelection(value.selection),
    lens: cleanString(value.lens),
    dimensions: normalizeDimensions(value.dimensions),
    journey: normalizeJourney(value.journey),
    locale: cleanString(value.locale),
    access: normalizeAccess(value.access),
    returnTo: normalizeReturnTo(value.returnTo),
    updatedAt: cleanString(value.updatedAt),
  };

  const meaningful = Boolean(
    context.subject || context.selection || context.lens || Object.keys(context.dimensions).length ||
    context.journey || context.locale || context.access || context.returnTo
  );
  return meaningful ? context : null;
}

export function createResearchContext(input = {}) {
  const normalized = normalizeResearchContext({ ...input, updatedAt: new Date().toISOString() });
  return normalized;
}

function isExactReturnRestorePatch(next) {
  return next?.returnTo === null && ["subject", "selection", "lens", "dimensions", "journey"]
    .every((key) => hasOwn(next, key));
}

export function mergeResearchContext(current, patch = {}) {
  const base = normalizeResearchContext(current) || {};
  const next = isObject(patch) ? patch : {};
  const exactReturnRestore = isExactReturnRestorePatch(next);
  const dimensions = exactReturnRestore
    ? normalizeDimensions(next.dimensions)
    : next.dimensions === null
      ? {}
      : { ...(base.dimensions || {}), ...(isObject(next.dimensions) ? next.dimensions : {}) };

  return normalizeResearchContext({
    ...base,
    ...next,
    dimensions,
    updatedAt: new Date().toISOString(),
  });
}

export function researchContextSubjectKey(context) {
  const subject = normalizeResearchContext(context)?.subject;
  return subject ? `${subject.type}:${subject.id}` : null;
}
