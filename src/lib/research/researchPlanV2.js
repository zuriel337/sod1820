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

function containsClockMoment(text) {
  // Recognition only — never transforms the clock. moment_clock_law's canonical owner performs the
  // actual contextual derivation (e.g. 4:24 -> 424) and preserves timezone/original input.
  return /(^|\D)(?:[01]?\d|2[0-3]):[0-5]\d(?:\D|$)/.test(clean(text));
}

function inferExplicitCapabilityHints({ question, intent, identityResolution, requestedCapabilities = [] }) {
  const hints = [...requestedCapabilities];
  const q = clean(question);
  const i = normalizedIntent(intent);

  if (i === "els" || includesAny(q, ["דילוג", "דילוגים", "els", "צופן אותיות"])) hints.push(RESEARCH_CAPABILITY.ELS);
  if (i === "gematria" || includesAny(q, ["גימטריה", "גימטריא", "חשב את", "כמה שווה"])) hints.push(RESEARCH_CAPABILITY.GEMATRIA);
  if (includesAny(q, ["מקור", "מקורות", "ספר", "עמוד", "כתב יד", "עד נוסח"])) hints.push(RESEARCH_CAPABILITY.SOURCES);
  if (includesAny(q, ["משפחה", "אבא", "אמא", "בן שלי", "בת שלי", "ילד", "הורה"])) hints.push(RESEARCH_CAPABILITY.FAMILY);
  if (containsClockMoment(q) || includesAny(q, ["שעה", "בשעה", "רגע", "שעון"])) hints.push(RESEARCH_CAPABILITY.TIME, RESEARCH_CAPABILITY.OPERATORS);

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

// ── W2.2b · ACCESS DESCRIPTOR ─────────────────────────────────────────────────────────────
// The raw authorization context is PRIVATE EXECUTION INPUT. It is whatever the calling surface
// resolved in order to decide access, and it routinely carries user ids, phone refs, session or
// entitlement records. Before W2.2b it was placed verbatim on `plan.authorization_context` and
// again on `resolved_run_snapshot.authorization_context`, and the Bundle returns the plan and the
// snapshot to the caller — so every private field travelled all the way out to whatever surface
// renders the Bundle (GPT preflight de9969d1 finding 1, challenge ed7e578e).
//
// The fix is a separation, not a redaction pass bolted onto the output: the plan now carries ONLY
// a non-secret, BY-VALUE access DESCRIPTOR, and the raw context is handed to executors through a
// private channel that never enters the Bundle. A descriptor states WHAT ACCESS WAS RESOLVED
// (tier, allowed access tiers, whether a personal scope exists) and never WHO the person is.
//
// PR3 discipline applies here exactly as it does to the Universal Finding axes: an absent input is
// honestly unknown, never an assertion. Specifically `authenticated:false` / `admin:false` /
// `personal_scope_available:false` are fail-closed DEFAULTS, and `allowed_access_tiers` starts as
// the public set — an unknown context can only ever narrow to public, never widen.

export const ACCESS_TIER = Object.freeze({
  PUBLIC: "public",
  PUBLIC_CANDIDATE: "public_candidate",
  PRIVATE: "private",
  PERSONAL: "personal",
});

const PUBLIC_ONLY_TIERS = Object.freeze([ACCESS_TIER.PUBLIC]);
const VALID_ACCESS_TIERS = new Set(Object.values(ACCESS_TIER));

// Authority sources a TRUSTED BOUNDARY may attest. This is not a new auth system and it grants
// nothing by itself — it is the list of boundaries whose word the descriptor will accept.
export const VERIFIED_AUTHORITY_SOURCE = Object.freeze({
  SUPABASE_AUTH: "supabase_auth",   // resolved from a verified JWT / auth.uid()
  SERVICE_ROLE: "service_role",     // a server path that already authenticated the subject
  ADMIN_RPC: "admin_rpc",           // an admin-gated RPC that performed its own auth.uid() check
});
const VALID_AUTHORITY_SOURCES = new Set(Object.values(VERIFIED_AUTHORITY_SOURCE));

function truthy(value) {
  return value === true || value === "true" || value === 1;
}

// ── ROOT OF TRUST FOR THE DESCRIPTOR (GPT challenge 8621de8d finding 2, accepted) ──────────
// An earlier revision read admin / is_admin / role / user_ref straight off the raw authorization
// context and widened the allowed tiers on that basis. That is structurally the SAME defect that
// was just closed in fn_raziel_research_intel_scoped — a caller's assertion treated as authority —
// and since this descriptor drives a security-relevant composition filter, the same discipline has
// to apply here. Bare claims on the context are now IGNORED, and the fact that they were ignored is
// recorded on the descriptor so the refusal is visible rather than silent.
//
// Widening requires an explicit attestation from a trusted boundary:
//     authorizationContext.verified_authority = {
//       source: "supabase_auth" | "service_role" | "admin_rpc",   // required, must be known
//       admin?: boolean,              // the boundary states the caller IS an admin
//       subject_verified?: boolean,   // the boundary verified WHO the caller is
//     }
// Anything else — including `{ admin: true }` at the top level — resolves public-only.
function readVerifiedAuthority(ctx) {
  const raw = ctx?.verified_authority ?? ctx?.verifiedAuthority;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = clean(raw.source).toLowerCase();
  if (!VALID_AUTHORITY_SOURCES.has(source)) return null;
  return {
    source,
    admin: truthy(raw.admin),
    subjectVerified: truthy(raw.subject_verified ?? raw.subjectVerified),
  };
}

// True when the context carries claims that LOOK like authority but carry no attestation. Used only
// to report the refusal; it never grants anything.
function hasUnattestedAuthorityClaims(ctx) {
  if (!ctx) return false;
  return truthy(ctx.admin) || truthy(ctx.is_admin)
    || clean(ctx.role).toLowerCase() === "admin"
    || truthy(ctx.authenticated) || truthy(ctx.is_authenticated);
}

/**
 * Project a raw authorization context into the non-secret, BY-VALUE access descriptor that is safe
 * to return inside a Plan / Bundle / resolved run snapshot.
 *
 * Nothing identifying is copied out: no user id, ref, phone, email, token, session or claim object.
 * Only the resolved ACCESS SHAPE crosses this boundary, and it widens only on an attested authority.
 */
export function buildAccessDescriptor(authorizationContext = null, contextType = "public_user") {
  const ctx = authorizationContext && typeof authorizationContext === "object" ? authorizationContext : null;
  const context = clean(contextType).toLowerCase() || "public_user";
  const authority = readVerifiedAuthority(ctx);

  // Only an attested boundary can say the caller is authenticated or an admin.
  const authenticated = Boolean(authority?.subjectVerified || authority?.admin);
  const admin = Boolean(authority?.admin);
  const personalScopeAvailable = Boolean(authority?.subjectVerified);

  // Fail-closed: start public-only and widen strictly by ATTESTED authority.
  const tiers = new Set(PUBLIC_ONLY_TIERS);
  if (admin) {
    tiers.add(ACCESS_TIER.PUBLIC_CANDIDATE);
    tiers.add(ACCESS_TIER.PRIVATE);
    tiers.add(ACCESS_TIER.PERSONAL);
  } else if (personalScopeAvailable) {
    // A verified person reaches their OWN personal scope — never anyone else's private rows.
    tiers.add(ACCESS_TIER.PERSONAL);
  }

  const descriptor = {
    v: 1,
    context_type: context,
    authenticated,
    admin,
    personal_scope_available: personalScopeAvailable,
    allowed_access_tiers: [...tiers],
    entitlement_level: clean(ctx?.entitlement_level ?? ctx?.entitlementLevel ?? ctx?.tier) || null,
    // Provenance of the authority itself, so a reader can see WHY these tiers were granted.
    authority_source: authority?.source || null,
    // Visible refusal: the context asserted authority but produced no attestation to back it.
    unverified_authority_claims_ignored: Boolean(!authority && hasUnattestedAuthorityClaims(ctx)),
    // Explicit statement that this object is the OUTPUT-SAFE projection, so a later reader can never
    // mistake it for the private execution context.
    contains_identifying_fields: false,
    derived_from: ctx ? "authorization_context" : "no_authorization_context",
  };

  // BY VALUE: deep-frozen so a consumer mutating the returned Plan/snapshot cannot widen the access
  // that any later stage reads back out of it.
  Object.freeze(descriptor.allowed_access_tiers);
  return Object.freeze(descriptor);
}

/**
 * Validate an access descriptor arriving from ANYWHERE other than buildAccessDescriptor.
 *
 * The composition boundary must never filter on an arbitrary caller-supplied object: that would let
 * a caller hand in {allowed_access_tiers:["private"]} and read everything. Unknown tiers are
 * dropped, "public" is always present, and the result is re-frozen. A non-object resolves
 * public-only rather than throwing, so a malformed descriptor fails CLOSED.
 */
export function normalizeAccessDescriptor(descriptor) {
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) {
    return buildAccessDescriptor(null, "public_user");
  }
  // Dropping unknown tiers is NOT sufficient on its own: a caller could still hand in a
  // well-formed {allowed_access_tiers:["private"]} and read everything. A descriptor may therefore
  // only carry tiers beyond public when it names a valid authority_source — the same attestation
  // rule buildAccessDescriptor enforces. Unattested descriptors normalize to public-only.
  const authoritySource = VALID_AUTHORITY_SOURCES.has(clean(descriptor.authority_source))
    ? clean(descriptor.authority_source)
    : null;
  const tiers = new Set(PUBLIC_ONLY_TIERS);
  if (authoritySource) {
    for (const tier of Array.isArray(descriptor.allowed_access_tiers) ? descriptor.allowed_access_tiers : []) {
      const value = clean(tier);
      if (value && VALID_ACCESS_TIERS.has(value)) tiers.add(value);
    }
  }
  const out = {
    v: 1,
    context_type: clean(descriptor.context_type) || "public_user",
    authenticated: Boolean(authoritySource) && descriptor.authenticated === true,
    admin: Boolean(authoritySource) && descriptor.admin === true,
    personal_scope_available: Boolean(authoritySource) && descriptor.personal_scope_available === true,
    allowed_access_tiers: [...tiers],
    entitlement_level: clean(descriptor.entitlement_level),
    authority_source: authoritySource,
    unverified_authority_claims_ignored: descriptor.unverified_authority_claims_ignored === true
      || (!authoritySource && Array.isArray(descriptor.allowed_access_tiers)
          && descriptor.allowed_access_tiers.some(t => clean(t) && clean(t) !== ACCESS_TIER.PUBLIC)),
    contains_identifying_fields: false,
    derived_from: clean(descriptor.derived_from) || "normalized_descriptor",
  };
  Object.freeze(out.allowed_access_tiers);
  return Object.freeze(out);
}

/**
 * Build an Identity-first Research Plan.
 *
 * The raw `authorizationContext` is accepted but deliberately NOT placed on the returned plan — see
 * the ACCESS DESCRIPTOR note above. The execution layer still receives it privately and must apply
 * the canonical privacy/access/entitlement/domain gates before any evidence is exposed.
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
    // W2.2b: output-safe access descriptor ONLY. The raw authorization context never lands here.
    access: buildAccessDescriptor(authorizationContext, contextType),
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
      raw_authorization_context_never_in_output: true,
    },
  };
}

export default buildResearchPlanV2;
