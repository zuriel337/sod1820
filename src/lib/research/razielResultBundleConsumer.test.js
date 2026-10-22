import test from "node:test";
import assert from "node:assert/strict";

import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  EVIDENCE_RELATION,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";
import { buildRazielResultBundleConsumer } from "./razielResultBundleConsumer.js";

function finding({
  id,
  label,
  value = null,
  kind = "gematria",
  method = "ragil",
  accessTier = "public",
  extraFact = {},
  sourceName = "ספר יצירה",
} = {}) {
  return makeUniversalFinding({
    id,
    kind,
    stage: "evidence",
    subject: { type: typeof value === "number" ? "number" : "expression", key: label, label, lang: "he", value },
    source: { engine: "canonical-gematria", adapter: "golden-v1", name: sourceName, sourceRef: `source:${id}`, method, lang: "he" },
    identity: { sourceIdentity: `native:${id}`, entityRef: `entity:${id}` },
    verification: {
      claimed_expression: label,
      claimed_method: method,
      claimed_value: value,
      engine_method_tested: method,
      engine_result: { value, method, method_version: "v1", raw_private: "MUST_NOT_LEAK" },
      verification_state: "match",
    },
    evidence: {
      refs: [`evidence:${id}`],
      facts: [{ type: "calculation", expression: label, value, method, method_version: "v1", ...extraFact }],
    },
    access: { tier: accessTier },
    provenance: { createdBy: "ENGINE:canonical-gematria", createdAt: "2026-10-22T00:00:00.000Z" },
  });
}

function publicBundle({ findings = [], capabilities = null, outcomes = [], query = null } = {}) {
  return composeResearchResultBundle({
    query: query || { question: "מה זה 776?", intent: "number_definition", identities: [{ type: "number", value: 776, label: "776" }] },
    capabilities: capabilities || [capabilityResult({
      key: "gematria",
      owner: "project_codex.gematria_engine",
      findings,
      findingOutcomes: outcomes,
      sourceRefs: ["gematria_api"],
      versionRefs: ["canonical_methods_registry_law:v6"],
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: "evidence",
      cost: { certainty: "not_billable", ai_calls: 0, rpc_calls: 1, retry_count: 0, secret: "DROP" },
      trace: { trace_ref: "trace:776", private_prompt: "DROP" },
    })],
  });
}

test("776 Golden projects one canonical Bundle without calculation, AI or raw payload", () => {
  const f = finding({ id: "uf:776", label: "776", value: 776 });
  const out = buildRazielResultBundleConsumer(publicBundle({ findings: [f] }));

  assert.equal(out.contract_version, 1);
  assert.equal(out.model_input.findings.length, 1);
  assert.equal(out.model_input.findings[0].verification.engine_result.value, 776);
  assert.equal(out.human_view.cards[0].label, "776");
  assert.equal(out.human_view.cards[0].source_name, "ספר יצירה");
  assert.equal(out.human_view.cards[0].source_lang, "he");
  assert.equal(out.guards.no_calculation, true);
  assert.equal(out.guards.no_model_call, true);
  assert.equal(out.guards.no_network_or_database, true);
  const serialized = JSON.stringify(out);
  assert.doesNotMatch(serialized, /MUST_NOT_LEAK|raw_private|private_prompt|"secret"/);
});

test("phrase pair preserves derivation, convergence and independent evidence without collapsing them", () => {
  const a = finding({ id: "uf:pair:derived", label: "משיח ↔ מלך ישראל", value: 358 });
  const b = finding({ id: "uf:pair:independent", label: "משיח ↔ מלך ישראל", value: 358, method: "misratar" });
  const outcomes = [
    { findingId: a.id, evidenceRelation: EVIDENCE_RELATION.DERIVATION, dependsOn: ["uf:source"], reason: "same governed result" },
    { findingId: a.id, evidenceRelation: EVIDENCE_RELATION.CONVERGENCE, convergenceKey: "value:358", reason: "two routes meet" },
    { findingId: b.id, evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE, reason: "independent method family", expectedness: "measured", expectednessModel: "fixture-v1", baseRate: 0.2 },
  ];
  const out = buildRazielResultBundleConsumer(publicBundle({ findings: [a, b], outcomes }));

  assert.deepEqual(out.model_input.finding_outcomes.map((x) => x.evidence_relation), [
    "derivation", "convergence", "independent_evidence",
  ]);
  assert.equal(out.model_input.constraints.derivation_is_not_independent_evidence, true);
  assert.equal(out.model_input.findings[1].evidence_relations[0].expectedness_model, "fixture-v1");
});

test("negative, failed and missing capabilities remain distinct and visible", () => {
  const bundle = publicBundle({
    capabilities: [
      capabilityResult({ key: "corpus", status: CAPABILITY_STATUS.NEGATIVE_RESULT, reason: "no exact match", negativeScope: { operation: "exact", max_search_depth: 500 } }),
      capabilityResult({ key: "els", status: CAPABILITY_STATUS.FAILED, reason: "engine unavailable" }),
      capabilityResult({ key: "crossings", status: CAPABILITY_STATUS.MISSING_ADAPTER, reason: "adapter not connected" }),
    ],
  });
  const out = buildRazielResultBundleConsumer(bundle);

  assert.equal(out.model_input.coverage.negative_result, 1);
  assert.equal(out.model_input.coverage.failed, 1);
  assert.equal(out.model_input.coverage.missing_adapter, 1);
  assert.equal(out.model_input.capabilities[0].negative_result.searched, true);
  assert.deepEqual(out.human_view.gaps.capabilities.map((x) => x.status), ["failed", "missing_adapter"]);
});

test("withheld personal Finding never reaches either Raziel view and is not negative evidence", () => {
  const personal = finding({ id: "uf:personal", label: "שם פרטי", value: 777, accessTier: "personal" });
  const bundle = publicBundle({
    findings: [],
    capabilities: [capabilityResult({
      key: "personal_gematria",
      findings: [personal],
      accessClass: ACCESS_CLASS.PERSONAL,
      semanticClass: "evidence",
    })],
    query: {
      question: "חקור את השם הפרטי",
      identities: [{ type: "name", label: "שם פרטי", source: "personal_context", access: { tier: "personal" } }],
    },
  });
  const out = buildRazielResultBundleConsumer(bundle);
  const serialized = JSON.stringify(out);

  assert.equal(out.model_input.findings.length, 0);
  assert.equal(out.model_input.coverage.access_filtered, 1);
  assert.equal(out.model_input.constraints.access_filtered_is_not_negative_evidence, true);
  assert.equal(out.model_input.query.question, null);
  assert.equal(out.model_input.query.free_text_withheld, true);
  assert.doesNotMatch(serialized, /שם פרטי|777/);
});

test("bounded source remains visibly truncated and continuation payload is not copied", () => {
  const f = finding({ id: "uf:1820", label: "1820", value: 1820 });
  const bundle = publicBundle({
    capabilities: [capabilityResult({
      key: "number_context",
      findings: [f],
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: "evidence",
      bounded: { total_count: 50, returned_count: 6, truncated: true, ordering: "canonical", continuation: { raw_private: "cursor-secret" } },
    })],
  });
  const out = buildRazielResultBundleConsumer(bundle);

  assert.equal(out.model_input.output_bounds.source_truncated, true);
  assert.equal(out.model_input.capabilities[0].bounded.total_count, 50);
  assert.equal(out.model_input.capabilities[0].bounded.returned_count, 6);
  assert.equal(out.model_input.capabilities[0].bounded.continuation_available, true);
  assert.doesNotMatch(JSON.stringify(out), /cursor-secret|raw_private/);
});

test("projection is deterministic, deeply frozen and never echoes an existing synthesis", () => {
  const f = finding({ id: "uf:stable", label: "יציב", value: 1820 });
  const bundle = { ...publicBundle({ findings: [f] }), synthesis: { message: "DO NOT FEED BACK", private_prompt: "DROP" } };
  const first = buildRazielResultBundleConsumer(bundle);
  const second = buildRazielResultBundleConsumer(bundle);

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.model_input.findings[0]), true);
  assert.doesNotMatch(JSON.stringify(first), /DO NOT FEED BACK|private_prompt/);
});

test("missing numeric fields remain null and never become an invented zero", () => {
  const f = finding({ id: "uf:no-number", label: "ללא ערך", value: null });
  const out = buildRazielResultBundleConsumer(publicBundle({ findings: [f] }));
  const projected = out.model_input.findings[0];

  assert.equal(projected.subject.value, null);
  assert.equal(projected.verification.claimed_value, null);
  assert.equal(projected.evidence.score, null);
  assert.equal(projected.evidence.confidence, null);
  assert.equal(projected.ranking, null);
});

test("consumer rejects arbitrary objects that bypass the canonical Bundle invariant", () => {
  assert.throws(
    () => buildRazielResultBundleConsumer({ findings: [{ id: "raw" }] }),
    /universal_finding_only/,
  );
});
