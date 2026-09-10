import { hasIdentityKind, identityKinds } from "./researchIdentityResolver.js";

// W2.1 — Identity-first Research Plan builder.
//
// This is policy/planning only. It does NOT execute engines, own capability state, widen access,
// calculate Gematria/ELS, or create canonical identities. Canonical owners remain authoritative.
// The returned capability list is a request/hint for the existing Research OS control plane.

export const RESEARCH_CAPABILITY = Object.freeze({
  GRAPH: "graph",
  NUMERIC: "numeric",
  GEMATRIA: "gematria",
  OPERATORS: "numeric_operators",
  ELS: "els",
  SOURCES: "sources",
  BOOKS: "books",
  PERSON: "person",
  FAMILY: "family",
  NAME: "name",
  TIME: "time",
  RESEARCH_OBJECTS: "research_objects",
});

function clean(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizedIntent(intent) {
  const v = clean(intent).toLowerCase();
  return v || "research";
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function includesAny(text, terms) {
  const q = clean(text).toLowerCase();
  return terms.some(term => q.includes(term));
}

function inferExplicitCapabilityHints({ question, intent, identityResolution, requestedCapabilities = [] }) {
  const hints = [...requestedCapabilities];
  const q = clean(question);
  const i = normalizedIntent(intent);

  if (i === "els" || includesAny(q, ["דילוג", "דילוגים", "els", "צופן אותיות"])) hints.push(RESEARCH_CAPABILITY.ELS);
  if (i === "gematria" || includesAny(q, ["גימטריה", "גימטריא", "חשב את", "כמה שווה"])) hints.push(RESEARCH_CAPABILITY.GEMATRIA);
  if (includesAny(q, ["מקור", "מקורות", "ספר", "עמוד", "כתב יד", "עד נוסח"])) hints.push(RESEARCH_CAPABILITY.SOURCES);
  if (includesAny(q, ["משפחה", "אבא", "אמא", "בן שלי", "בת שלי", "ילד", "הורה"])) hints.push(RESEARCH_CAPABILITY.FAMILY);
  if (includesAny(q, ["שעה", "בשעה", "רגע", "שעון"])) hints.push(RESEARCH_CAPABILITY.TIME, RESEARCH_CAPABILITY.OPERATORS);

  // A known semantic identity drives capability selection before textual representation.
  if (hasIdentityKind(identityResolution, "book")) hints.push(RESEARCH_CAPABILITY.BOOKS, RESEARCH_CAPABILITY.SOURCES, RESEARCH_CAPABILITY.GRAPH);
  if (hasIdentityKind(identityResolution, "number")) hints.push(RESEARCH_CAPABILITY.NUMERIC, RESEARCH_CAPABILITY.OPERATORS, RESEARCH_CAPABILITY.GRAPH);
  if (hasIdentityKind(identityResolution, "person")) hints.push(RESEARCH_CAPABILITY.PERSON, RESEARCH_CAPABILITY.GRAPH);
  if (hasIdentityKind(identityResolution, "name")) hints.push(RESEARCH_CAPABILITY.NAME);
  if (hasIdentityKind(identityResolution, "event")) hints.push(RESEARCH_CAPABILITY.TIME, RESEARCH_CAPABILITY.SOURCES, RESEARCH_CAPABILITY.GRAPH);
  if (hasIdentityKind(identityResolution, "topic")) hints.push(RESEARCH_CAPABILITY.GRAPH, RESEARCH_CAPABILITY.RESEARCH_OBJECTS);

  // Important guard: a known Book/Person/Event label is not a Gematria request merely because it is
  // text. Gematria is added only by explicit user intent/question or when the resolver explicitly
  // allows text calculation.
  if (identityResolution?.explicit_text_computation === true) hints.push(RESEARCH_CAPABILITY.GEMATRIA);

  return uniq(hints);
}

function deriveStrategy({ identityResolution, capabilityHints }) {
  const kinds = identityKinds(identityResolution);
  if (kinds.includes("person")) return capabilityHints.includes(RESEARCH_CAPABILITY.FAMILY) ? "personal_family_research" : "personal_research";
  if (kinds.includes("book")) return kinds.includes("number") ? "cross_identity_research" : "source_research";
  if (capabilityHints.includes(RESEARCH_CAPABILITY.ELS)) return "els_research";
  if (kinds.includes("event") || kinds.includes("topic")) return "reality_research";
  if (kinds.includes("number")) return "number_research";
  if (kinds.includes("name")) return "name_research";
  return "discovery";
}

function deriveCheckOrder(capabilityHints) {
  const preferred = [
    RESEARCH_CAPABILITY.PERSON,
    RESEARCH_CAPABILITY.FAMILY,
    RESEARCH_CAPABILITY.TIME,
    RESEARCH_CAPABILITY.BOOKS,
    RESEARCH_CAPABILITY.SOURCES,
    RESEARCH_CAPABILITY.GRAPH,
    RESEARCH_CAPABILITY.NUMERIC,
    RESEARCH_CAPABILITY.OPERATORS,
    RESEARCH_CAPABILITY.GEMATRIA,
    RESEARCH_CAPABILITY.NAME,
    RESEARCH_CAPABILITY.ELS,
    RESEARCH_CAPABILITY.RESEARCH_OBJECTS,
  ];
  return preferred.filter(x => capabilityHints.includes(x));
}

/**
 * Build an Identity-first Research Plan.
 *
 * `authorizationContext` is carried, never interpreted here. The execution layer must apply the
 * canonical privacy/access/entitlement/domain gates before any evidence is exposed.
 */
export function buildResearchPlanV2({
  question = "",
  intent = "research",
  identityResolution,
  authorizationContext = null,
  contextType = "public_user",
  surfaceContext = null,
  requestedCapabilities = [],
  requestedDepth = null,
} = {}) {
  const resolved = identityResolution || { identities: [], text_calculation_allowed: true };
  const capabilityHints = inferExplicitCapabilityHints({
    question,
    intent,
    identityResolution: resolved,
    requestedCapabilities,
  });

  const strategy = deriveStrategy({ identityResolution: resolved, capabilityHints });
  const checkOrder = deriveCheckOrder(capabilityHints);

  return {
    v: 2,
    strategy,
    question: clean(question),
    intent: normalizedIntent(intent),
    identities: resolved.identities || [],
    primary_identity: resolved.primary || null,
    context_type: contextType,
    authorization_context: authorizationContext,
    surface_context: surfaceContext,
    requested_depth: requestedDepth,
    requested_capabilities: capabilityHints,
    check_order: checkOrder,
    guards: {
      identity_first: true,
      semantic_identity_precedes_text_calculation: true,
      text_calculation_allowed: resolved.text_calculation_allowed !== false,
      access_must_be_resolved_before_evidence: true,
      canonical_owners_decide_execution: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
    },
  };
}

export default buildResearchPlanV2;
