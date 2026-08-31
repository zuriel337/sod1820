import { makeUniversalFinding, VALID_VERIFICATION_STATES } from "./universalFinding.js";

const VALID_VERIFICATION = new Set(VALID_VERIFICATION_STATES);

function clean(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function verificationFrom(row) {
  const detail = row?.engine_detail && typeof row.engine_detail === "object" ? row.engine_detail : {};
  const explicit = clean(detail.verification_state);
  const verification_state = explicit && VALID_VERIFICATION.has(explicit) ? explicit : null;

  return {
    claimed_expression: detail.claimed_expression ?? null,
    claimed_method: detail.claimed_method ?? null,
    claimed_value: detail.claimed_value ?? null,
    engine_method_tested: detail.engine_method_tested ?? detail.engine ?? null,
    engine_result: detail.engine_result ?? detail.result ?? null,
    statement_lang: detail.statement_lang ?? null,
    verification_state,
  };
}

/**
 * Read-only projection of one durable research_objects row into the shared
 * Universal Finding envelope.
 *
 * Important truth-axis rules:
 * - research_objects.kind is NOT mapped to Universal Finding stage. These are
 *   domain-owned epistemic vocabularies and no global translation exists.
 * - research_objects.status IS governance and may be carried as status.
 * - engine_detail is the verification authority; engine_verified is not used to
 *   manufacture match/mismatch when engine_detail has no explicit state.
 * - privacy_scope is carried as the source-owned access tier.
 * - promoted_node_id is an existing graph identity pointer, never a promotion.
 */
export function researchObjectToUniversalFinding(row) {
  if (!row?.id) return null;

  const sourceRef = clean(row.source_ref);
  const statement = clean(row.statement) || `Research object ${row.id}`;
  const promotedNodeId = clean(row.promoted_node_id);
  const terms = Array.isArray(row.terms) ? row.terms.filter(Boolean) : [];

  return makeUniversalFinding({
    kind: "research-object",
    stage: null,
    status: row.status ?? null,
    subject: {
      type: "research-object",
      key: String(row.id),
      label: statement,
      value: row.value ?? null,
      lang: null,
    },
    source: {
      engine: null,
      adapter: "research-object-v1",
      sourceRef,
      method: null,
      corpus: clean(row.source),
      lang: null,
    },
    identity: {
      sourceIdentity: { researchObjectId: String(row.id) },
      entityRef: promotedNodeId ? `node:${promotedNodeId}` : null,
      relationRef: null,
    },
    verification: verificationFrom(row),
    evidence: {
      refs: sourceRef ? [sourceRef] : [],
      facts: terms.map((term) => ({ type: "term", value: term })),
      score: row.confidence ?? null,
      confidence: row.confidence ?? null,
    },
    access: {
      tier: row.privacy_scope ?? null,
      reason: null,
    },
    provenance: {
      createdBy: null,
      createdAt: row.created_at || undefined,
      inputRef: sourceRef,
    },
    projection: {
      anchors: promotedNodeId ? [{ space: "reality-graph", id: promotedNodeId }] : [],
      relations: [],
      dimensions: { researchObjectKind: row.kind ?? null },
    },
  });
}

export function researchObjectsToUniversalFindings(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(researchObjectToUniversalFinding)
    .filter(Boolean);
}

export default researchObjectToUniversalFinding;
