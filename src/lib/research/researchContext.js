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
    methodVersion: cleanString(value.methodVersion),
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

// A pending step is a bounded navigation snapshot in the existing Context.
// It carries neither authorization nor recursively nested Journey history.
export function normalizeResearchPathStep(value) {
  if (!isObject(value)) return null;
  const subject = normalizeSubject(value.context?.subject || {
    id: value.entity_ref, type: value.entity_type, label: value.label_key, href: value.href,
  });
  if (!subject) return null;
  const context = value.context || value;
  return {
    step_index: Math.max(0, cleanInteger(value.step_index) || 0),
    entity_type: subject.type,
    entity_ref: subject.id,
    label_key: cleanString(value.label_key) || subject.label || subject.id,
    href: cleanString(value.href || subject.href),
    surface: cleanString(value.surface),
    lens: cleanString(value.lens || context.lens),
    locator: cleanString(value.locator || context.selection?.locator),
    selection: normalizeSelection(value.selection || context.selection),
    reason: cleanString(value.reason),
    context: {
      subject,
      selection: normalizeSelection(context.selection),
      lens: cleanString(context.lens),
      dimensions: normalizeDimensions(context.dimensions),
      locale: cleanString(context.locale),
    },
  };
}

function normalizeJourney(value, includeSteps = true) {
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
  if (value.root) out.root = normalizeSubject(value.root);
  if (includeSteps && Array.isArray(value.pendingSteps)) {
    out.pendingSteps = value.pendingSteps.slice(0, 100).map(normalizeResearchPathStep).filter(Boolean);
  }
  if (includeSteps && value.lastSavedStep) out.lastSavedStep = normalizeResearchPathStep(value.lastSavedStep);
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

function normalizeBottomTrail(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-8)
    .map((item, index) => {
      if (!isObject(item)) return null;
      const label = cleanString(item.label);
      if (!label) return null;
      return {
        id: cleanString(item.id) || `trail-${index + 1}`,
        label,
        kind: cleanString(item.kind) || "context",
        active: item.active === true,
        href: cleanString(item.href),
      };
    })
    .filter(Boolean);
}

function normalizeSurfaceSections(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 12)
    .map((item, index) => {
      if (!isObject(item)) return null;
      const label = cleanString(item.label);
      if (!label) return null;
      return {
        id: cleanString(item.id) || `section-${index + 1}`,
        label,
        targetId: cleanString(item.targetId) || cleanString(item.id),
      };
    })
    .filter(Boolean);
}

function normalizeSurfaceFocus(value) {
  if (!isObject(value)) return null;
  const strings = ["id", "entityId", "type", "entityType", "sectionLabel", "label", "primary", "expression", "method", "sourceLabel", "locator", "reference", "href", "postId", "postSlug", "reason"];
  const out = {};
  for (const key of strings) {
    const cleaned = cleanString(value[key]);
    if (cleaned) out[key] = cleaned;
  }
  for (const key of ["number", "resultValue"]) {
    const numeric = Number(value[key]);
    if (Number.isFinite(numeric)) out[key] = numeric;
  }
  if (Array.isArray(value.signals)) {
    out.signals = value.signals.map(cleanString).filter(Boolean).slice(0, 4);
  }
  return Object.keys(out).length ? out : null;
}

// Secondary findings listed in the Contextual Sidecar REST state. Bounded, strings only.
function normalizeSurfaceFindings(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item, index) => {
    if (!isObject(item)) return null;
    const label = cleanString(item.label);
    if (!label) return null;
    const row = { id: cleanString(item.id) || `finding-${index + 1}`, label };
    for (const key of ["value", "kind", "reason", "href", "sourceLabel"]) {
      const cleaned = cleanString(item[key]);
      if (cleaned) row[key] = cleaned;
    }
    return row;
  }).filter(Boolean);
}

function normalizeDimensions(value) {
  if (!isObject(value)) return {};
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "bottomTrail") {
      out[key] = normalizeBottomTrail(item);
    } else if (key === "surfaceSections") {
      out[key] = normalizeSurfaceSections(item);
    } else if (key === "surfaceFindings") {
      out[key] = normalizeSurfaceFindings(item);
    } else if (key === "surfaceFocus" || key === "readingFocus") {
      const focus = normalizeSurfaceFocus(item);
      if (focus) out[key] = focus;
    } else if (item == null || typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
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
    journey: normalizeJourney(value.journey, false),
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
