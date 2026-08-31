import assert from "node:assert/strict";
import { researchObjectToUniversalFinding } from "../src/lib/research/researchObjectFinding.js";

const base = {
  id: "11111111-1111-1111-1111-111111111111",
  created_at: "2026-09-01T00:00:00.000Z",
  kind: "fact",
  statement: "אהרן = 256",
  terms: ["אהרן"],
  value: 256,
  source: "post-extraction",
  source_ref: "posts:136",
  confidence: 91,
  engine_verified: true,
  engine_detail: {
    claimed_expression: "אהרן",
    claimed_method: "ragil",
    claimed_value: 256,
    engine_method_tested: "ragil",
    engine_result: 256,
    verification_state: "match",
  },
  status: "approved",
  privacy_scope: "shared",
  promoted_node_id: "22222222-2222-2222-2222-222222222222",
};

const finding = researchObjectToUniversalFinding(base);
assert.ok(finding);
assert.equal(finding.kind, "research-object");
assert.equal(finding.stage, null, "research_objects.kind must never be globally mapped to UF stage");
assert.equal(finding.status, "approved");
assert.equal(finding.verification.verification_state, "match");
assert.equal(finding.access.tier, "shared");
assert.equal(finding.identity.entityRef, "node:22222222-2222-2222-2222-222222222222");
assert.equal(finding.projection.dimensions.researchObjectKind, "fact");
assert.deepEqual(finding.evidence.refs, ["posts:136"]);

const noDetail = researchObjectToUniversalFinding({ ...base, engine_detail: {}, engine_verified: true });
assert.equal(noDetail.verification.verification_state, null,
  "derived engine_verified=true must not manufacture verification_state=match");

const unknownKind = researchObjectToUniversalFinding({ ...base, kind: "hypothesis" });
assert.equal(unknownKind.stage, null);
assert.equal(unknownKind.projection.dimensions.researchObjectKind, "hypothesis");

const noNode = researchObjectToUniversalFinding({ ...base, promoted_node_id: null });
assert.equal(noNode.identity.entityRef, null);
assert.deepEqual(noNode.projection.anchors, []);

assert.equal(researchObjectToUniversalFinding(null), null);
console.log("research-object-universal-finding: ok");
