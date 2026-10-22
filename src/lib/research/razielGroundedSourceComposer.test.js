import test from "node:test";
import assert from "node:assert/strict";

import { buildRazielGroundedSourceComposer } from "./razielGroundedSourceComposer.js";

function projection(findings, cards = null, extra = {}) {
  return Object.freeze({
    model_input: {
      findings,
      output_bounds: { source_truncated: false, consumer_truncated: false },
      ...extra,
    },
    human_view: {
      cards: cards || findings.map((finding) => ({
        source_name: finding.source?.source_name,
        source_ref: finding.source?.source_ref,
        source_lang: finding.source?.lang,
      })),
    },
    guards: { existing_result_bundle_is_authority: true },
  });
}

const verified = {
  id: "uf:verified",
  kind: "gematria",
  stage: "evidence",
  subject: { label: "ביאת המשיח", value: 776 },
  source: { source_name: "מאגר הגימטריה המאומת", source_ref: "gematria_words:one", method: "רגיל", lang: "he" },
  verification: { state: "match", engine_method_tested: "רגיל", engine_result: { value: 776 } },
  evidence: { facts: [{ type: "calculation" }] },
};

const sourceClaim = {
  id: "uf:claim",
  kind: "gematria",
  stage: null,
  subject: { label: "מחשבת יהוה", value: 776 },
  source: { source_name: "ספר יצירה", source_ref: "book:sefer-yetzirah#p1", method: "רגיל", lang: "he" },
  verification: { state: null, claimed_expression: "מחשבת יהוה", engine_result: null },
  evidence: { facts: [{ type: "published-gematria-phrase" }] },
};

test("keeps canonical presentation order and labels verified calculation separately from source claim", () => {
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "number", value: 776 },
    projection: projection([sourceClaim, verified]),
  }]);
  const prompt = JSON.parse(out.prompt);

  assert.equal(prompt.composer_contract, "raziel-grounded-source-composer-v1");
  assert.deepEqual(prompt.bundles[0].result.findings.map((finding) => finding.id), ["uf:claim", "uf:verified"]);
  assert.deepEqual(prompt.bundles[0].evidence_lanes.source_claims, ["uf:claim"]);
  assert.deepEqual(prompt.bundles[0].evidence_lanes.verified_calculations, ["uf:verified"]);
  assert.match(out.fallback, /טענת המאגר: מחשבת יהוה/);
  assert.match(out.fallback, /חישוב מאומת: ביאת המשיח/);
  assert.ok(out.fallback.indexOf("מחשבת יהוה") < out.fallback.indexOf("ביאת המשיח"));
});

test("emits only canonical number navigation and never fabricates a source URL", () => {
  const out = buildRazielGroundedSourceComposer([
    { subject: { type: "number", value: 1820 }, projection: projection([verified]) },
    { subject: { type: "expression", value: "משיח" }, projection: projection([sourceClaim]) },
  ]);

  assert.deepEqual(out.navigation, [{ kind: "number", label: "פתח את דף המספר 1820", href: "/number/1820" }]);
  assert.deepEqual(out.sources, [
    { original_name: "מאגר הגימטריה המאומת", source_ref: "gematria_words:one", lang: "he" },
    { original_name: "ספר יצירה", source_ref: "book:sefer-yetzirah#p1", lang: "he" },
  ]);
  assert.equal(out.guards.no_source_url_inference, true);
  assert.doesNotMatch(JSON.stringify(out.sources), /href|https?:/);
});

test("engine convergence is not promoted to verified or independent evidence", () => {
  const crossing = {
    id: "uf:crossing",
    kind: "gematria-crossing",
    stage: "evidence",
    subject: { label: "משיח ↔ שלום" },
    source: { source_name: "מאגר הביטויים", source_ref: "rpc:strongest_crossings", lang: "he" },
    verification: {
      state: "not_tested",
      engine_result: {
        methods: [{ method: "אתבש", value: 112 }, { method: "סידורי", value: 52 }],
        dependency_independence_claimed: false,
      },
    },
    evidence: { facts: [{ type: "gematria-multi-method-corpus-crossing" }] },
  };
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "expression", value: "משיח" },
    projection: projection([crossing]),
  }]);
  const prompt = JSON.parse(out.prompt);

  assert.deepEqual(prompt.bundles[0].evidence_lanes.engine_findings, ["uf:crossing"]);
  assert.deepEqual(prompt.bundles[0].evidence_lanes.verified_calculations, []);
  assert.match(out.fallback, /ממצא מנוע: משיח ↔ שלום/);
  assert.match(out.fallback, /אתבש=112/);
  assert.match(out.fallback, /עצמאות בין משפחות החישוב לא נטענה/);
});

test("fails closed for a projection that did not come from the canonical consumer", () => {
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "number", value: 776 },
    projection: { model_input: { findings: [verified] }, human_view: { cards: [] }, guards: {} },
  }]);

  assert.equal(out.prompt, "");
  assert.equal(out.fallback, "");
  assert.deepEqual(out.sources, []);
  assert.deepEqual(out.navigation, []);
  assert.equal(Object.isFrozen(out), true);
});
