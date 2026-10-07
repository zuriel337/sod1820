import { makeUniversalFinding } from "./universalFinding.js";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import {
  CAPABILITY_STATUS,
  ACCESS_CLASS,
  SEMANTIC_CLASS,
  EVIDENCE_RELATION,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";
import { normalizeAccessDescriptor } from "./researchPlanV2.js";

// FZ1073_OBSERVATION_PROPAGATION_GOLDEN_V1 — bounded event observation compiler.
//
// EXTENDS the existing Context Compiler socket (composeResearchResultBundle) and the existing
// Universal Finding projection of research_objects. It owns NO store, engine, registry, resolver
// identity or graph node:
//   - research_objects rows come IN (already read by the caller); they are projected, never copied.
//   - Gematria values come IN as canonical engine receipts (gematria_method_trace shape) through an
//     injected resolver. This module never computes a value; no receipt -> no verified member.
//   - FZ1073 is an explicit event_candidate. No graph Event is minted, promoted or canonicalized.
//
// Surfaces do not receive their own arrays. Every surface is a pure selector over the ONE bundle
// (projectEventContextForSurface), so one new source-native observation propagates to all of them.

export const EVENT_MEMBER_TYPE = Object.freeze({
  FLIGHT_NUMBER: "flight_number",
  NUMBER: "number",
  DATE_EXPRESSION: "date_expression",
  EXPRESSION_MATCH: "expression_match",
  CLOCK_TIME: "clock_time",
  SYMBOLIC_TRANSFORMATION: "symbolic_transformation",
  CALENDAR_RELATION: "calendar_relation",
  CROSS_TIME_RELATION: "cross_time_relation",
});

export const EVENT_SURFACE = Object.freeze({
  NUMBER: "number",
  POST: "post",
  DATE_EVENT: "date_event",
  TIMELINE: "timeline",
  CONTEXT_RAIL: "context_rail",
  WORLD: "world",
  RAZIEL: "raziel",
  FOLLOW: "follow",
});

// Declaration only — occurred_at is sourced from the post/event evidence, published_at is NOT part
// of the declaration (it comes from posts.date at compile time).
export const FZ1073_EVENT_CANDIDATE_DECLARATION = Object.freeze({
  key: "FZ1073",
  label: "FZ1073",
  occurred_at: "2026-09-30",
  occurred_at_source_ref: "post:5112",
});

export const EVENT_SURFACE_LIMITS = Object.freeze({
  default: 12,
  [EVENT_SURFACE.WORLD]: 40,
  [EVENT_SURFACE.TIMELINE]: 12,
});

export const PLACEMENT = Object.freeze({
  desktop: "contextual_sidecar",
  mobile: "bottom_context_sheet",
});

const TYPE_SET = new Set(Object.values(EVENT_MEMBER_TYPE));
// Source-observed numbers (flight number, visual NUMBER) are source facts: number + source_ref, no
// Gematria receipt. Only Expression-valued members (date expression / expression match) need one.
const SOURCE_NUMBER_TYPES = new Set([EVENT_MEMBER_TYPE.FLIGHT_NUMBER, EVENT_MEMBER_TYPE.NUMBER]);
const RECEIPT_TYPES = new Set([
  EVENT_MEMBER_TYPE.DATE_EXPRESSION,
  EVENT_MEMBER_TYPE.EXPRESSION_MATCH,
]);
const VALUE_TYPES = new Set([EVENT_MEMBER_TYPE.DATE_EXPRESSION, EVENT_MEMBER_TYPE.EXPRESSION_MATCH]);
// This module owns NO method catalog. Method identity is whatever the canonical Trace adapter
// (gematriaTrace.js::gematriaTraceToFinding over gematria_method_trace) attested; the Registry stays
// open to every current/future canonical method. API aliases (regular / misratar ...) fail upstream:
// fetchGematriaMethodTrace(alias, ...) returns null/error, so no receipt exists for them.
// Envelope identity of the canonical Trace adapter (literals only; importing the adapter would pull
// the supabase client into this pure compiler).
const TRACE_KIND = "gematria-trace";
const TRACE_ENGINE = "gematria";
const TRACE_ADAPTER = "gematria-trace-v1";
// Golden semantic guard for the 1202 rule only — not a Registry.
const GOLDEN_1202_METHOD = "מסתתר";
const RESERVED_CROSS_TIME_VALUE = 1202;
const RESERVED_CROSS_TIME_SUBJECT = "oct7";

const clean = (v) => (v == null ? null : String(v).trim() || null);
const isInt = (v) => Number.isInteger(Number(v)) && v !== null && v !== "" && v !== true && v !== false;

export function eventCandidateRef(key) {
  return `event_candidate:${key}`;
}

function resolveCandidate(declaration, post) {
  const key = clean(declaration?.key);
  if (!key) throw new TypeError("eventObservationCompiler: event candidate key is required");
  const occurredAt = clean(declaration?.occurred_at);
  const occurredRef = clean(declaration?.occurred_at_source_ref);
  return {
    kind: "event_candidate",
    key,
    ref: eventCandidateRef(key),
    label: clean(declaration?.label) || key,
    // Explicit non-identity flags: a candidate is a context subject, never a graph Event.
    canonical: false,
    graph_node_id: null,
    minted: false,
    // Occurred At requires its own source; absent source stays absent, it is never borrowed from
    // the post date.
    occurred_at: occurredAt && occurredRef ? occurredAt : null,
    occurred_at_source_ref: occurredAt && occurredRef ? occurredRef : null,
    occurred_at_unsourced: Boolean(occurredAt && !occurredRef),
    // Published At is the post's own axis. Event != Post.
    published_at: clean(post?.date),
    post: post?.id != null ? { kind: "post", id: String(post.id), slug: clean(post.slug), role: "source_presentation" } : null,
  };
}

function anchorsFor(candidate, extra = []) {
  const out = [{ space: "event_candidate", id: candidate.key }];
  if (candidate.post) out.push({ space: "post", id: candidate.post.id });
  return [...out, ...extra];
}

// A receipt is the canonical gematria-trace Universal Finding (gematriaTraceToFinding). The envelope
// is validated, not re-derived: kind/engine/adapter, then method / expression / result must agree
// between source, subject, verification and identity. Only then is it exact-matched to the member.
function readTraceReceipt(finding) {
  if (!finding || typeof finding !== "object" || finding.status === "error") return { ok: false, reason: "engine_receipt_missing" };
  if (finding.kind !== TRACE_KIND || finding.source?.engine !== TRACE_ENGINE || finding.source?.adapter !== TRACE_ADAPTER) {
    return { ok: false, reason: "engine_receipt_not_canonical_trace" };
  }
  const method = clean(finding.source?.method);
  if (!method) return { ok: false, reason: "engine_receipt_without_method" };
  const result = finding.verification?.engine_result;
  if (result == null || result === "" || !Number.isFinite(Number(result))) return { ok: false, reason: "engine_receipt_without_result" };
  const expression = clean(finding.subject?.key);
  const sid = finding.identity?.sourceIdentity;
  if (
    !expression
    || clean(finding.verification?.engine_method_tested) !== method
    || clean(sid?.methodKey) !== method
    || clean(sid?.expression) !== expression
    || Number(sid?.value) !== Number(result)
    || Number(finding.subject?.value) !== Number(result)
  ) {
    return { ok: false, reason: "engine_receipt_identity_mismatch" };
  }
  return {
    ok: true,
    receipt: { method_key: method, input: expression, result: Number(result), receipt_id: finding.id ?? null, method_version: clean(sid?.methodVersion) },
  };
}

function receiptGate(member, finding) {
  const read = readTraceReceipt(finding);
  if (!read.ok) return read;
  const { receipt } = read;
  if (clean(member.method_key) && receipt.method_key !== clean(member.method_key)) return { ok: false, reason: "engine_receipt_method_mismatch" };
  if (clean(member.expression) && receipt.input !== clean(member.expression)) return { ok: false, reason: "engine_receipt_input_mismatch" };
  if (member.claimed_value != null && receipt.result !== Number(member.claimed_value)) {
    return { ok: false, reason: `engine_receipt_value_mismatch:${receipt.result}` };
  }
  return { ok: true, reason: null, receipt };
}

// 1202 belongs to the stable Oct7 cross-time subject only, with its own source and a canonical
// מסתתר receipt. A 2026-date member can never carry it (the live receipt for that date under מסתתר
// is 1182, which the receipt gate above already enforces; this is the explicit second lock).
// An arbitrary cross_time subject does not admit 1202.
function reservedValueGuard(member, value, receipt) {
  if (Number(value) !== RESERVED_CROSS_TIME_VALUE) return null;
  const ok = member.scope === "cross_time"
    && clean(member.cross_time_subject) === RESERVED_CROSS_TIME_SUBJECT
    && clean(member.source_ref)
    && clean(receipt?.method_key) === GOLDEN_1202_METHOD;
  return ok ? null : "1202_reserved_for_sourced_oct7_cross_time_member";
}

// Projection-time re-verification of a LEGACY research_objects row against a canonical receipt.
// engine_verified=true alone never admits a row. The row is not mutated or copied; the receipt is
// only overlaid on the projection verification, so the finding keeps the same source identity/id.
function reverifyLegacyRow(row, receiptFinding) {
  let receipt = receiptFinding;
  const detail = row?.engine_detail && typeof row.engine_detail === "object" ? row.engine_detail : {};
  const claimedValue = detail.claimed_value ?? row.value ?? null;
  const gate = receiptGate({
    expression: detail.claimed_expression,
    method_key: detail.claimed_method,
    claimed_value: claimedValue,
  }, receipt);
  if (!gate.ok) return { ok: false, reason: gate.reason };
  if (claimedValue == null) return { ok: false, reason: "legacy_row_without_claimed_value" };
  receipt = gate.receipt;
  return {
    ok: true,
    verification: {
      claimed_value: claimedValue,
      engine_method_tested: clean(receipt.method_key),
      engine_result: Number(receipt.result),
      verification_state: "match",
    },
  };
}

function memberFinding(member, candidate, receipt, index) {
  const type = member.type;
  const isNumberType = type === EVENT_MEMBER_TYPE.FLIGHT_NUMBER || type === EVENT_MEMBER_TYPE.NUMBER;
  const value = receipt ? Number(receipt.result) : (isInt(member.number) ? Number(member.number) : null);
  const crossTime = member.scope === "cross_time";
  const numberAnchors = [];
  if (isNumberType && value != null) numberAnchors.push({ space: "number", id: String(value) });
  if (VALUE_TYPES.has(type) && value != null) numberAnchors.push({ space: "number", id: String(value) });
  const label = clean(member.label) || clean(member.expression) || (value != null ? String(value) : type);
  const subjectType = type === EVENT_MEMBER_TYPE.FLIGHT_NUMBER ? "flight_number"
    : type === EVENT_MEMBER_TYPE.NUMBER ? "number"
    : type === EVENT_MEMBER_TYPE.CLOCK_TIME ? "clock_time"
    : type === EVENT_MEMBER_TYPE.DATE_EXPRESSION ? "date_expression"
    : type === EVENT_MEMBER_TYPE.EXPRESSION_MATCH ? "expression"
    : type;
  return makeUniversalFinding({
    kind: `event-${type.replace(/_/g, "-")}`,
    stage: type === EVENT_MEMBER_TYPE.SYMBOLIC_TRANSFORMATION ? "interpretation" : null,
    subject: {
      type: subjectType,
      key: clean(member.key) || `${candidate.key}:${type}:${clean(member.expression) || value || index}`,
      label,
      // Expression results live in verification.engine_result, not in a Number-typed subject value.
      value: isNumberType ? value : null,
      lang: clean(member.lang),
    },
    source: {
      engine: receipt ? "gematria" : null,
      adapter: "event-observation-compiler-v1",
      sourceRef: clean(member.source_ref),
      method: receipt ? clean(receipt.method_key) : null,
      corpus: null,
      lang: clean(member.lang),
    },
    identity: {
      sourceIdentity: receipt
        ? { eventCandidate: candidate.key, type, methodKey: receipt.method_key, expression: clean(member.expression) ?? receipt.input ?? null, value }
        : { eventCandidate: candidate.key, type, key: clean(member.key) || clean(member.expression) || label },
      entityRef: null,
      relationRef: crossTime ? `cross_time:${clean(member.cross_time_subject)}` : null,
    },
    verification: receipt && !isNumberType ? {
      claimed_expression: clean(member.expression),
      claimed_method: clean(member.method_key),
      claimed_value: member.claimed_value ?? null,
      engine_method_tested: clean(receipt.method_key),
      engine_result: Number(receipt.result),
      verification_state: member.claimed_value != null ? "match" : "not_tested",
    } : type === EVENT_MEMBER_TYPE.SYMBOLIC_TRANSFORMATION ? {
      claimed_expression: clean(member.expression),
      verification_state: "method_unknown",
    } : {},
    evidence: {
      refs: clean(member.source_ref) ? [clean(member.source_ref)] : [],
      facts: [],
    },
    access: { tier: "public" },
    provenance: {
      createdBy: null,
      inputRef: clean(member.source_ref),
      parentFindingIds: [],
    },
    projection: {
      anchors: anchorsFor(candidate, numberAnchors),
      relations: [],
      dimensions: {
        eventMemberType: type,
        eventCandidate: candidate.ref,
        crossTime: crossTime ? { subject: clean(member.cross_time_subject), historical_child_event: false } : null,
        calendar: type === EVENT_MEMBER_TYPE.CALENDAR_RELATION
          ? { relation: clean(member.relation), holiday: clean(member.holiday), span_days: isInt(member.span_days) ? Number(member.span_days) : null }
          : null,
        symbolic: type === EVENT_MEMBER_TYPE.SYMBOLIC_TRANSFORMATION ? {
          from: member.from ?? null, to: member.to ?? null, registered_gematria_method: false,
        } : null,
        receiptRef: receipt ? clean(receipt.receipt_id) || clean(receipt.method_version) || null : null,
      },
    },
  });
}

function reject(member, reason) {
  return { type: member?.type ?? null, key: clean(member?.key) || clean(member?.expression) || null, reason };
}

/**
 * Compile one event candidate into ONE typed Result Bundle / Context Pack.
 *
 * @param {object} p
 * @param {object} p.candidate        declaration ({key, occurred_at, occurred_at_source_ref})
 * @param {object} p.post             existing post row ({id, slug, date})
 * @param {Array}  p.members          typed members (see EVENT_MEMBER_TYPE)
 * @param {Array}  p.researchObjects  existing research_objects rows (the FZ1073 input set)
 * @param {Function} p.receiptResolver (member) -> canonical gematria-trace Universal Finding
 *        (gematriaTraceToFinding / fetchGematriaMethodTrace) | null
 * @param {Function} p.researchObjectReceiptResolver optional (row) -> canonical trace finding | null, for
 *        projection-time re-verification of legacy rows (read adapter; never mutates/copies the row)
 */
export function compileEventObservation({
  candidate: declaration,
  post = null,
  members = [],
  researchObjects = [],
  receiptResolver = null,
  researchObjectReceiptResolver = null,
  accessDescriptor = null,
  locale = "he",
  // Additive seam: already-built capabilityResult records from OTHER owners (e.g. governed System
  // Method rule applications, admitted supporting sources) join the SAME bundle. Nothing is computed
  // or copied here; the composition socket still applies its own access/outcome gates.
  extraCapabilities = [],
} = {}) {
  const candidate = resolveCandidate(declaration, post);
  const rejected = [];
  const memberFindings = [];
  const roFindings = [];
  const roGated = [];
  // Effective access resolved ONCE through the existing owner. Unattested/malformed descriptors
  // normalize to public-only (fail closed); composeResearchResultBundle remains the final filter.
  const allowedTiers = new Set(normalizeAccessDescriptor(accessDescriptor).allowed_access_tiers);

  // 1. research_objects — projected by identity; the same row id is one finding no matter how often
  //    it is supplied or referenced by a member.
  const roById = new Map();
  for (const row of Array.isArray(researchObjects) ? researchObjects : []) {
    if (!row?.id || roById.has(String(row.id))) continue;
    roById.set(String(row.id), row);
  }
  for (const row of roById.values()) {
    const base = researchObjectToUniversalFinding(row, { locale });
    if (!base) continue;
    let finding0 = base;
    if (base.verification?.verification_state !== "match") {
      // Legacy rows (engine_verified=true, no explicit engine_detail.verification_state) are never
      // inferred to match. Only a row whose tier the normalized access descriptor allows, with a valid
      // canonical re-verification receipt, is admitted through a projection-time overlay on the SAME
      // identity. Rows outside the allowed tiers never reach the resolver.
      const tier = clean(row.privacy_scope);
      const tierAllowed = Boolean(tier) && allowedTiers.has(tier);
      let reverified = null;
      if (typeof researchObjectReceiptResolver === "function" && tierAllowed) {
        reverified = reverifyLegacyRow(row, researchObjectReceiptResolver(row));
      }
      if (!reverified?.ok) {
        roGated.push({ research_object_id: String(row.id), reason: reverified?.reason ? `legacy_reverification_failed:${reverified.reason}` : (!tierAllowed && typeof researchObjectReceiptResolver === "function" ? `access_tier_not_permitted:${tier ?? "none"}` : "engine_verification_not_match") });
        continue;
      }
      finding0 = { ...base, verification: { ...base.verification, ...reverified.verification } };
    }
    const base2 = finding0;
    const value = isInt(row.value) ? Number(row.value) : null;
    roFindings.push({
      ...base2,
      projection: {
        ...base2.projection,
        anchors: [...base2.projection.anchors, ...anchorsFor(candidate, value != null ? [{ space: "number", id: String(value) }] : [])],
        dimensions: { ...base2.projection.dimensions, eventMemberType: "source_observation", eventCandidate: candidate.ref, legacyReverified: finding0 !== base },
      },
    });
  }

  // 2. typed members
  (Array.isArray(members) ? members : []).forEach((member, index) => {
    if (!member || !TYPE_SET.has(member.type)) { rejected.push(reject(member, "unknown_member_type")); return; }
    if (member.research_object_id != null) {
      if (!roById.has(String(member.research_object_id))) rejected.push(reject(member, "research_object_not_in_input_set"));
      return; // reused by identity above, never duplicated
    }
    if (member.type === EVENT_MEMBER_TYPE.CLOCK_TIME && member.number != null) {
      rejected.push(reject(member, "clock_time_is_not_number")); return;
    }
    if (member.type === EVENT_MEMBER_TYPE.SYMBOLIC_TRANSFORMATION && (clean(member.method_key) || member.registered === true)) {
      rejected.push(reject(member, "symbolic_transformation_is_not_registered_gematria_method")); return;
    }
    let receipt = null;
    if (SOURCE_NUMBER_TYPES.has(member.type)) {
      // A source-observed Number / Flight Number is a source fact (number + source_ref), never an
      // engine calculation. Expression != Number result: an expression belongs to EXPRESSION_MATCH.
      if (clean(member.expression) || clean(member.method_key) || member.claimed_value != null) {
        rejected.push(reject(member, "source_number_is_not_expression_result")); return;
      }
      if (!isInt(member.number)) { rejected.push(reject(member, `${member.type}_without_number`)); return; }
      if (!clean(member.source_ref)) { rejected.push(reject(member, `${member.type}_without_source_ref`)); return; }
    } else if (RECEIPT_TYPES.has(member.type)) {
      const gate = receiptGate(member, typeof receiptResolver === "function" ? receiptResolver(member) : null);
      if (!gate.ok) { rejected.push(reject(member, gate.reason)); return; }
      receipt = gate.receipt;
    }
    const value = receipt ? Number(receipt.result) : null;
    const guard = reservedValueGuard(member, value ?? member.claimed_value, receipt);
    if (guard) { rejected.push(reject(member, guard)); return; }
    if (receipt && member.scope === "cross_time" && !clean(member.source_ref)) {
      rejected.push(reject(member, "cross_time_member_requires_source")); return;
    }
    memberFindings.push(memberFinding(member, candidate, receipt, index));
  });

  // 3. dependency semantics: symbolic = derivation; same-value matches = convergence (never assumed independent)
  const byValueKey = new Map();
  for (const f of memberFindings) {
    const r = f.verification?.engine_result;
    if (r != null && VALUE_TYPES.has(f.projection.dimensions.eventMemberType)) {
      const k = `value:${r}`;
      byValueKey.set(k, [...(byValueKey.get(k) || []), f.id]);
    }
  }
  const outcomes = [];
  for (const f of memberFindings) {
    const t = f.projection.dimensions.eventMemberType;
    if (t === EVENT_MEMBER_TYPE.SYMBOLIC_TRANSFORMATION) {
      const from = String(f.projection.dimensions.symbolic?.from ?? "");
      const parents = memberFindings.filter(x => from && String(x.verification?.engine_result) === from).map(x => x.id);
      outcomes.push({ findingId: f.id, evidenceRelation: EVIDENCE_RELATION.DERIVATION, dependsOn: parents, reason: "symbolic interpretation over an engine-verified result; not a registered method" });
    } else if (f.projection.dimensions.crossTime) {
      outcomes.push({ findingId: f.id, evidenceRelation: EVIDENCE_RELATION.CONVERGENCE, convergenceKey: `cross_time:${f.projection.dimensions.crossTime.subject}`, reason: "cross-time convergence; not a historical child Event" });
    } else if (VALUE_TYPES.has(t) && f.verification?.engine_result != null) {
      outcomes.push({ findingId: f.id, evidenceRelation: EVIDENCE_RELATION.CONVERGENCE, convergenceKey: `value:${f.verification.engine_result}`, reason: "independence not assumed" });
    }
  }

  const capabilities = [
    capabilityResult({
      key: "event_members",
      owner: "eventObservationCompiler",
      findings: memberFindings,
      findingOutcomes: outcomes,
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.EVIDENCE,
      sourceRefs: [candidate.post ? `post:${candidate.post.id}` : null].filter(Boolean),
      reason: rejected.length ? `${rejected.length} member(s) rejected by receipt/typing gate` : null,
    }),
    capabilityResult({
      key: "research_objects",
      owner: "research_objects",
      findings: roFindings,
      accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
      semanticClass: SEMANTIC_CLASS.EVIDENCE,
      reason: roGated.length ? `${roGated.length} row(s) not engine-verified, withheld from findings` : null,
    }),
    ...(Array.isArray(extraCapabilities) ? extraCapabilities : []),
  ];

  const bundle = composeResearchResultBundle({
    query: { subject: candidate.ref, kind: "event_candidate" },
    capabilities,
    accessDescriptor,
  });

  return {
    contract: "event_observation_context_pack_v1",
    event: candidate,
    bundle,
    rejected_members: rejected,
    gated_research_objects: roGated,
    placement: PLACEMENT,
    invariants: {
      event_is_candidate_not_graph_node: true,
      no_graph_mutation: true,
      no_store_write: true,
      post_is_source_not_event_identity: true,
      published_at_is_not_occurred_at: true,
      values_only_from_engine_receipts: true,
      date_is_not_number: true,
      clock_time_is_not_number: true,
      cross_time_is_not_child_event: true,
      symbolic_transformation_is_interpretation: true,
    },
  };
}

function limitFor(surface, limit) {
  const n = Number(limit);
  if (Number.isInteger(n) && n > 0) return n;
  return EVENT_SURFACE_LIMITS[surface] ?? EVENT_SURFACE_LIMITS.default;
}

function hasAnchor(finding, space, id) {
  return (finding.projection?.anchors || []).some(a => a.space === space && String(a.id) === String(id));
}

function ref(f) {
  return {
    finding_id: f.id,
    type: f.projection?.dimensions?.eventMemberType ?? null,
    subject_type: f.subject.type,
    label: f.subject.label,
    source_identity: f.identity.sourceIdentity,
    verification_state: f.verification?.verification_state ?? null,
  };
}

/**
 * ONE selector over the shared bundle. Surfaces never get their own arrays: each one reads the same
 * findings (by id) through its own anchor/axis. Bounded, with truncation reported.
 */
export function projectEventContextForSurface(pack, surface, { number = null, limit = null } = {}) {
  if (!pack?.bundle || !Object.values(EVENT_SURFACE).includes(surface)) return null;
  const { bundle, event } = pack;
  const all = bundle.findings;
  const selected = surface === EVENT_SURFACE.NUMBER
    ? all.filter(f => number != null && hasAnchor(f, "number", number))
    : surface === EVENT_SURFACE.POST
      ? (event.post ? all.filter(f => hasAnchor(f, "post", event.post.id)) : [])
      : all.filter(f => hasAnchor(f, "event_candidate", event.key));
  const max = limitFor(surface, limit);
  const shown = selected.slice(0, max);
  const base = {
    surface,
    event_ref: event.ref,
    event_canonical: false,
    finding_ids: shown.map(f => f.id),
    findings: shown.map(ref),
    total_count: selected.length,
    returned_count: shown.length,
    truncated: shown.length < selected.length,
    placement: surface === EVENT_SURFACE.CONTEXT_RAIL ? PLACEMENT : undefined,
  };
  if (surface === EVENT_SURFACE.TIMELINE) {
    base.entries = [
      { axis: "occurred_at", at: event.occurred_at, source_ref: event.occurred_at_source_ref },
      { axis: "published_at", at: event.published_at, source_ref: event.post ? `post:${event.post.id}` : null },
    ].filter(e => e.at);
    base.cross_time = shown.filter(f => f.projection.dimensions.crossTime).map(f => ({
      finding_id: f.id, subject: f.projection.dimensions.crossTime.subject, historical_child_event: false,
    }));
  }
  if (surface === EVENT_SURFACE.WORLD) {
    const groups = {};
    for (const f of shown) {
      const t = f.projection?.dimensions?.eventMemberType ?? "other";
      (groups[t] ||= []).push(f.id);
    }
    base.depth_groups = groups;
  }
  if (surface === EVENT_SURFACE.RAZIEL) {
    base.raziel = { consumes: "research_result_bundle", read_only: true, can_invent: false, can_canonicalize: false };
  }
  if (surface === EVENT_SURFACE.FOLLOW) {
    base.recommendation = {
      subject_ref: event.ref,
      subscription_funnel: "existing_semantics",
      auto_follow: false,
      requires_explicit_user_action: true,
      new_resolver_identity: false,
    };
  }
  return base;
}

export default compileEventObservation;
