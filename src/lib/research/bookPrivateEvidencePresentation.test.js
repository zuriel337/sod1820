import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookPrivateEvidenceCollectionPresentation,
  buildBookPrivateEvidencePresentation,
  presentBookEvidenceLane,
  presentBookEvidenceRequirement,
  presentBookEvidenceState,
} from "./bookPrivateEvidencePresentation.js";

const HEBREW_RE = /[\u0590-\u05ff]/;

function packet(overrides = {}) {
  return {
    id: "synthetic-private-packet",
    packetVersion: "book_private_evidence_packet_v1",
    exposure: "authorized_private",
    publicationEffect: "none",
    claim: { statement: "חומר פרטי שאסור להעביר לשכבת הסטטוס" },
    source: { ref: "private:source", locator: { page: 7 } },
    truthAxes: { verification: "candidate", governance: "candidate" },
    reviewLane: "complex",
    requirements: [
      { key: "witness_window", state: "ready", evidence: { secret: "witness" } },
      { key: "claim_scope", state: "partial", evidence: { secret: "scope" } },
      { key: "structured_trace", state: "missing", evidence: null },
    ],
    readiness: {
      completeCount: 1,
      requiredCount: 3,
      readyForFidelityVerdict: false,
      fidelityDecision: null,
      humanGateRequired: true,
    },
    ...overrides,
  };
}

test("known requirement, state and lane codes receive distinct Hebrew presentations", () => {
  assert.equal(presentBookEvidenceRequirement("witness_window").labelHe, "חלון עד המקור");
  assert.equal(presentBookEvidenceRequirement("structured_trace").labelHe, "עקבה מבנית");
  assert.equal(presentBookEvidenceState("ready").labelHe, "מוכן");
  assert.equal(presentBookEvidenceState("missing").semanticRole, "unresolved");
  assert.equal(presentBookEvidenceLane("complex").labelHe, "בדיקת נאמנות מורכבת");
  assert.equal(presentBookEvidenceLane("applicability").labelHe, "הכרעת תחולת השער");
});

test("unknown codes fail closed without exposing backend codes in Hebrew copy", () => {
  const presentations = [
    presentBookEvidenceRequirement("future_private_requirement"),
    presentBookEvidenceState("future_private_state"),
    presentBookEvidenceLane("future_private_lane"),
  ];

  for (const item of presentations) {
    assert.equal(item.isKnown, false);
    assert.match(item.labelHe, HEBREW_RE);
    assert.doesNotMatch(item.labelHe, /future|private|_/i);
    assert.ok(item.detailHe);
  }
});

test("packet presentation preserves status order and strips private evidence payloads", () => {
  const result = buildBookPrivateEvidencePresentation(packet());

  assert.equal(result.id, "synthetic-private-packet");
  assert.equal(result.exposure, "authorized_private");
  assert.equal(result.publicationEffect, "none");
  assert.deepEqual(result.requirements.map(item => item.key), [
    "witness_window",
    "claim_scope",
    "structured_trace",
  ]);
  assert.equal(result.requirements[0].evidenceAvailable, true);
  assert.equal(result.requirements[2].evidenceAvailable, false);
  assert.equal(result.requirements[0].nextActionHe.includes("ממתינה להכרעה"), true);
  assert.equal(result.requirements[1].nextActionHe.includes("במה המקור תומך"), true);
  assert.equal("claim" in result, false);
  assert.equal("source" in result, false);
  assert.equal("truthAxes" in result, false);
  assert.equal("evidence" in result.requirements[0], false);
  assert.equal(JSON.stringify(result).includes("חומר פרטי"), false);
  assert.equal(JSON.stringify(result).includes("private:source"), false);
  assert.equal(JSON.stringify(result).includes("witness\""), false);
});

test("readiness copy distinguishes evidence completion from publication", () => {
  const blocked = buildBookPrivateEvidencePresentation(packet());
  const ready = buildBookPrivateEvidencePresentation(packet({
    readiness: {
      completeCount: 5,
      requiredCount: 5,
      readyForFidelityVerdict: true,
      fidelityDecision: null,
      humanGateRequired: true,
    },
  }));

  assert.equal(blocked.readiness.labelHe, "חסרות ראיות להכרעה");
  assert.equal(ready.readiness.labelHe, "מוכן להכרעת נאמנות");
  assert.equal(ready.readiness.humanGateRequired, true);
  assert.equal(ready.publicationEffect, "none");
  assert.doesNotMatch(JSON.stringify(ready), /פורסם|ציבורי/);
});

test("untrusted or malformed input remains restricted and not ready", () => {
  const missing = buildBookPrivateEvidencePresentation(null);
  const wrongExposure = buildBookPrivateEvidencePresentation(packet({
    exposure: "public",
    readiness: { completeCount: 5, requiredCount: 5, readyForFidelityVerdict: true },
  }));

  assert.equal(missing.exposure, "restricted");
  assert.deepEqual(missing.requirements, []);
  assert.equal(missing.readiness.readyForFidelityVerdict, false);
  assert.equal(wrongExposure.exposure, "restricted");
  assert.equal(wrongExposure.readiness.readyForFidelityVerdict, false);
  assert.equal(wrongExposure.publicationEffect, "none");
});

test("collection presentation carries only bounded status summaries", () => {
  const privatePacket = packet();
  const result = buildBookPrivateEvidenceCollectionPresentation({
    accessMode: "authorized_private_review",
    publicationEffect: "none",
    packets: [privatePacket],
    focusedPacket: privatePacket,
    summary: {
      totalPackets: 1,
      readyForFidelityVerdict: 0,
      needsEvidence: 1,
      complex: 1,
      applicability: 0,
      secret: "must-not-pass",
    },
    page: { secret: "raw paging not needed here" },
    rows: [{ secret: "raw rows must not pass" }],
  });

  assert.equal(result.accessMode, "authorized_private_review");
  assert.equal(result.publicationEffect, "none");
  assert.equal(result.packets.length, 1);
  assert.equal(result.focusedPacket.id, privatePacket.id);
  assert.deepEqual(result.summary, {
    totalPackets: 1,
    readyForFidelityVerdict: 0,
    needsEvidence: 1,
    complex: 1,
    applicability: 0,
  });
  assert.equal("page" in result, false);
  assert.equal("rows" in result, false);
  assert.equal(JSON.stringify(result).includes("must-not-pass"), false);
});

test("presentation results are immutable at the status boundary", () => {
  const result = buildBookPrivateEvidencePresentation(packet());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.requirements), true);
  assert.equal(Object.isFrozen(result.requirements[0]), true);
  assert.equal(Object.isFrozen(result.readiness), true);
});
