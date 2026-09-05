// Universal Research Context Adapter v1
// Logical/personal navigation state over EXISTING Research OS primitives.
// Context is NOT a truth store, Finding store, graph, claim, or canonical entity.

export const RESEARCH_CONTEXT_VERSION = 1;

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const cleanString = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
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
  const out = {
    entityId: cleanString(value.entityId),
    entityType: cleanString(value.entityType),
    findingId: cleanString(value.findingId),
    sourceRef: cleanString(value.sourceRef),
    locator: cleanString(value.locator),
    versionRef: cleanString(value.versionRef),
  };
  return Object.values(out).some(Boolean) ? out : null;
}

function normalizeJourney(value) {
  if (!isObject(value)) return null;
  const out = {
    id: cleanString(value.id),
    kind: cleanString(value.kind),
    position: value.position == null ? null : value.position,
    findingId: cleanString(value.findingId),
  };
  return Object.values(out).some((v) => v != null && v !== "") ? out : null;
}

function normalizeReturnTo(value) {
  if (!isObject(value)) return null;
  const href = cleanString(value.href);
  if (!href) return null;
  return {
    href,
    label: cleanString(value.label),
    subject: normalizeSubject(value.subject),
  };
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

export function mergeResearchContext(current, patch = {}) {
  const base = normalizeResearchContext(current) || {};
  const next = isObject(patch) ? patch : {};
  const dimensions = next.dimensions === null
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
