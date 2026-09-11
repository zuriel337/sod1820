// W2.1 — Identity-first Research Context resolver.
//
// This module is intentionally PURE and owns no truth, storage, routing registry or AI logic.
// It converts already-known candidate identities into an ordered, explicit identity set so the
// Research Plan can reason about Book/Person/Event/Number/etc. BEFORE treating labels as text to
// calculate. Source-native owners remain authoritative; callers supply the candidates they are
// authorized to resolve.
//
// Core invariant:
//   semantic identity > textual representation
// Therefore a label such as "אהבת תורה" that is already known to be a Book must not silently be
// reinterpreted as a gematria expression unless the user explicitly requests a text/gematria lens.

export const RESEARCH_IDENTITY_CONFIDENCE = Object.freeze({
  EXACT: "exact",
  STRONG: "strong",
  CANDIDATE: "candidate",
});

export const RESEARCH_IDENTITY_SOURCE = Object.freeze({
  EXPLICIT_REF: "explicit_ref",
  GRAPH_IDENTITY: "graph_identity",
  SURFACE_CONTEXT: "surface_context",
  PERSONAL_CONTEXT: "personal_context",
  TEXT_MATCH: "text_match",
  NUMERIC_LITERAL: "numeric_literal",
});

const TYPE_PRIORITY = Object.freeze({
  person: 100,
  book: 95,
  event: 90,
  place: 85,
  number: 80,
  name: 75,
  verse: 70,
  topic: 65,
  phrase: 40,
  word: 35,
  entity: 20,
});

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function canonicalIdentityKey(identity) {
  return clean(identity?.identity_key)
    || clean(identity?.identityKey)
    || clean(identity?.ref)
    || clean(identity?.id)
    || [clean(identity?.type), clean(identity?.value ?? identity?.label)].filter(Boolean).join(":")
    || null;
}

function sourceWeight(source) {
  switch (source) {
    case RESEARCH_IDENTITY_SOURCE.EXPLICIT_REF: return 60;
    case RESEARCH_IDENTITY_SOURCE.GRAPH_IDENTITY: return 50;
    case RESEARCH_IDENTITY_SOURCE.SURFACE_CONTEXT: return 45;
    case RESEARCH_IDENTITY_SOURCE.PERSONAL_CONTEXT: return 40;
    case RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL: return 35;
    case RESEARCH_IDENTITY_SOURCE.TEXT_MATCH: return 20;
    default: return 0;
  }
}

function confidenceWeight(confidence) {
  switch (confidence) {
    case RESEARCH_IDENTITY_CONFIDENCE.EXACT: return 30;
    case RESEARCH_IDENTITY_CONFIDENCE.STRONG: return 20;
    case RESEARCH_IDENTITY_CONFIDENCE.CANDIDATE: return 5;
    default: return 0;
  }
}

function normalizeIdentity(identity = {}) {
  const type = clean(identity.type) || "entity";
  const value = identity.value ?? null;
  const label = clean(identity.label ?? value) || "";
  const source = clean(identity.source) || RESEARCH_IDENTITY_SOURCE.TEXT_MATCH;
  const confidence = clean(identity.confidence) || RESEARCH_IDENTITY_CONFIDENCE.CANDIDATE;
  const key = canonicalIdentityKey(identity);
  if (!key) return null;

  return {
    key,
    type,
    id: clean(identity.id),
    ref: clean(identity.ref),
    identity_key: clean(identity.identity_key ?? identity.identityKey),
    label,
    value,
    source,
    confidence,
    provenance: identity.provenance ?? null,
    access: identity.access ?? null,
    metadata: identity.metadata ?? null,
  };
}

function identityRank(identity) {
  return (TYPE_PRIORITY[identity.type] || 0)
    + sourceWeight(identity.source)
    + confidenceWeight(identity.confidence);
}

export function dedupeResearchIdentities(candidates = []) {
  const byKey = new Map();
  for (const raw of Array.isArray(candidates) ? candidates : []) {
    const next = normalizeIdentity(raw);
    if (!next) continue;
    const existing = byKey.get(next.key);
    if (!existing || identityRank(next) > identityRank(existing)) byKey.set(next.key, next);
  }
  return [...byKey.values()].sort((a, b) => identityRank(b) - identityRank(a));
}

/**
 * Resolve an ordered identity set from caller-supplied candidates.
 *
 * `explicitTextComputation` is the only switch that permits a semantic label to also be treated as
 * a free text expression by downstream Gematria/Name capabilities. This resolver itself never
 * calculates anything; it merely records the user's intent boundary.
 */
export function resolveResearchIdentities({
  candidates = [],
  rawInput = null,
  explicitTextComputation = false,
} = {}) {
  const identities = dedupeResearchIdentities(candidates);
  const semantic = identities.filter(x => x.type !== "phrase" && x.type !== "word");
  const textRepresentations = identities.filter(x => x.type === "phrase" || x.type === "word");

  return {
    v: 1,
    raw_input: rawInput == null ? null : String(rawInput),
    identities,
    primary: identities[0] || null,
    semantic,
    text_representations: textRepresentations,
    explicit_text_computation: Boolean(explicitTextComputation),
    // When a semantic identity is known, free-text calculation must be opt-in. This is the direct
    // guard against Book title -> gematria drift discovered during the 1820 + Ahavat Torah audit.
    text_calculation_allowed: Boolean(explicitTextComputation) || semantic.length === 0,
  };
}

export function identityKinds(resolved) {
  return [...new Set((resolved?.identities || []).map(x => x.type).filter(Boolean))];
}

export function hasIdentityKind(resolved, kind) {
  return (resolved?.identities || []).some(x => x.type === kind);
}

export default resolveResearchIdentities;
