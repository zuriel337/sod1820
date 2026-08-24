import assert from "node:assert/strict";
import {
  makeUniversalFinding,
  universalFindingId,
  universalFindingToResearchEntity,
  elsStateToUniversalFindings,
  isUniversalFinding,
} from "../src/lib/research/universalFinding.js";

const axisState = {
  status: "ok",
  scope: "torah",
  termRaw: "תורה קדושה",
  term: "תורהקדושה",
  axis: { hitId: "13_1_100", start: 100, skip: 13, direction: "fwd" },
  findings: [
    { t: "תורה", color: "#f00", shown: ["21_-1_300", "21_1_500"] },
    { t: "אמת", color: "#0f0", shown: ["7_1_700"] },
  ],
  provenance: { source: "canonical-els" },
};

const findings = elsStateToUniversalFindings(axisState, { createdAt: "2026-08-24T00:00:00.000Z" });
assert.equal(findings.length, 4, "axis + every exact shown occurrence must become distinct Universal Findings");
assert.equal(new Set(findings.map((f) => f.id)).size, 4, "exact occurrences must have stable distinct IDs");
assert.ok(findings.every(isUniversalFinding));
assert.equal(findings[1].identity.sourceIdentity, "21_-1_300");
assert.equal(findings[1].identity.occurrence.direction, "back");
assert.deepEqual(findings[1].projection.anchors.map((a) => a.i), [300, 279, 258, 237]);
assert.equal(findings[2].identity.sourceIdentity, "21_1_500");
assert.deepEqual(findings[2].projection.anchors.map((a) => a.i), [500, 521, 542, 563]);

const candidate = makeUniversalFinding({
  kind: "entity",
  stage: "candidate",
  subject: { type: "person", key: "node:123", label: "משה" },
  source: { engine: "ai_suggestion" },
  identity: { entityRef: "node:123" },
  provenance: { createdBy: "AI:raziel" },
});
assert.equal(candidate.stage, "candidate", "AI suggestion stage must remain explicit");
assert.equal(candidate.source.engine, "ai_suggestion");

const rid = universalFindingId({ kind: "els", subjectKey: "תורה", sourceIdentity: "21_-1_300" });
assert.equal(rid, findings[1].id, "Research identity must deterministically preserve source identity");

const entity = universalFindingToResearchEntity(findings[1]);
assert.equal(entity.type, "finding");
assert.equal(entity.id, findings[1].id);
assert.equal(entity.finding.identity.sourceIdentity, "21_-1_300", "ResearchProvider metadata must retain exact source identity");

assert.deepEqual(elsStateToUniversalFindings({ status: "empty" }), [], "non-ok engine state must not invent Findings");

console.log("Universal Finding Contract: 12/12 checks passed");
