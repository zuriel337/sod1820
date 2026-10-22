// Hosted Preview visual fixture only. It performs no network, engine, AI or persistence call and is
// admitted solely so the isolated read-only Preview can review the pair-result presentation before
// a separately approved Edge canary exists. The UI labels it as non-live and saving is disabled.

export const PERSONAL_PAIR_PREVIEW_EXPRESSIONS = Object.freeze(["ירושלים", "שומרים"]);

const FIXTURE_FINDING = Object.freeze({
  v: 1,
  id: "preview-fixture:personal-gematria-pair:jerusalem-shomrim",
  kind: "gematria-relation",
  stage: null,
  status: null,
  subject: Object.freeze({
    type: "relation",
    key: "preview-fixture:jerusalem-shomrim",
    label: "ירושלים ↔ שומרים",
    lang: "he",
    value: null,
  }),
  source: Object.freeze({
    engine: "preview-fixture",
    adapter: "preview-visual-fixture-v1",
    sourceRef: "preview:fixture-only",
    method: null,
    corpus: null,
    lang: "he",
  }),
  identity: Object.freeze({ sourceIdentity: "preview:fixture-only", occurrence: null, entityRef: null, relationRef: null }),
  verification: Object.freeze({
    claimed_expression: null,
    claimed_method: null,
    claimed_value: null,
    engine_method_tested: null,
    engine_result: Object.freeze({
      display_only: true,
      engine_evidence_count: 6,
      independent_evidence_count: 1,
    }),
    statement_lang: null,
    verification_state: "not_tested",
  }),
  evidence: Object.freeze({ refs: [], facts: [], score: null, confidence: null }),
  access: Object.freeze({ tier: "personal", reason: "preview visual fixture; never persisted" }),
  provenance: Object.freeze({
    createdBy: "PREVIEW_FIXTURE",
    createdAt: "2026-10-22T00:00:00.000Z",
    inputRef: null,
    parentFindingIds: [],
    researchSessionId: null,
    journeyNodeId: null,
  }),
  projection: Object.freeze({ anchors: [], relations: [], dimensions: Object.freeze({ display_only: true }) }),
  view: Object.freeze({ color: null, pinned: false, selected: false, hidden: false, rendererHints: Object.freeze({}) }),
});

const FIXTURE_BUNDLE = Object.freeze({
  contract_version: 1,
  findings: Object.freeze([FIXTURE_FINDING]),
  finding_outcomes: Object.freeze([]),
  capability_trace: Object.freeze([Object.freeze({
    key: "gematria_relations",
    status: "executed",
    finding_ids: Object.freeze([FIXTURE_FINDING.id]),
    cost: Object.freeze({ certainty: "not_billable", ai_calls: 0, rpc_calls: 0, retry_count: 0 }),
    trace: Object.freeze({ fixture: true }),
  })]),
  coverage: Object.freeze({ partial: false, failed: 0, negative_result: 0 }),
  invariants: Object.freeze({ universal_finding_only: true }),
});

export async function runPersonalGematriaPairPreviewFixture({ left, right } = {}) {
  const expressions = [String(left || "").trim(), String(right || "").trim()];
  if (expressions[0] !== PERSONAL_PAIR_PREVIEW_EXPRESSIONS[0]
      || expressions[1] !== PERSONAL_PAIR_PREVIEW_EXPRESSIONS[1]) {
    return { ok: false, outcome: "error", error: "preview_fixture_only", networkCalls: 0 };
  }
  return {
    ok: true,
    outcome: "positive",
    bundle: FIXTURE_BUNDLE,
    contract: "preview-personal-gematria-pair-fixture-v1",
    traceId: null,
    interactionId: null,
    cost: FIXTURE_BUNDLE.capability_trace[0].cost,
    networkCalls: 0,
    previewFixture: true,
  };
}

export default runPersonalGematriaPairPreviewFixture;
