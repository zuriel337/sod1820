import test from "node:test";
import assert from "node:assert/strict";
import {
  RAZIEL_REFLECTION_INTENT,
  projectNormalizedMessageReflection,
  toRazielMessageReflectionPayload,
} from "./normalizedMessageReflectionProjection.js";

function fixture() {
  return {
    version: "normalized-message-reflection-v1",
    message: "מסר קפוא",
    synthesis: {
      contract_version: 1,
      status: "composed",
      message: "מסר קפוא",
      claims: [{ id: "c1", text: "טענה אחת", role: "interpretation", motif_key: "m1", secret: "drop-me" }],
      motifs: [{ key: "m1", label: "מוטיב", summary: "סיכום", extra: "drop-me" }],
      freeze: {
        frozen: true,
        frozen_at: "2026-09-26T17:00:00Z",
        policy_version: "research-synthesis-seam-v1",
        source_bundle_contract_version: 1,
        source_finding_ids: ["uf:1"],
      },
    },
    reflection: {
      framework: "reflection only",
      cards: [
        { position: "המצב", n: 12, arcana: "התלוי", theme: "מבט", meaning: "ראייה אחרת", letter: "מ", orientation: "ישר", extra: "drop" },
        { position: "האתגר", n: 9, arcana: "הנזיר", theme: "חיפוש", meaning: "התבוננות", letter: "י", orientation: "הפוך" },
        { position: "העצה", n: 2, arcana: "הכוהנת", theme: "סוד", meaning: "הקשבה", letter: "ג", orientation: "ישר" },
      ],
      evidence_weight: 0,
      included_in_research_strength: false,
      included_in_empirical_fit: false,
      can_modify_frozen_message: false,
    },
    unknown_private_blob: { must_not_project: true },
  };
}

test("projection emits only the bounded frozen-message + three-card view model", () => {
  const out = projectNormalizedMessageReflection(fixture());
  assert.equal(out.message, "מסר קפוא");
  assert.equal(out.claims.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(out.claims[0], "secret"), false);
  assert.equal(out.motifs.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(out.motifs[0], "extra"), false);
  assert.deepEqual(out.cards.map((card) => card.position), ["המצב", "האתגר", "העצה"]);
  assert.equal(Object.prototype.hasOwnProperty.call(out.cards[0], "extra"), false);
  assert.deepEqual(out.trace.source_finding_ids, ["uf:1"]);
  assert.equal(out.boundaries.tarot_evidence_weight, 0);
  assert.equal(out.boundaries.no_local_synthesis, true);
  assert.equal(Object.isFrozen(out), true);
  assert.equal(Object.isFrozen(out.cards), true);
});

test("projection fails closed on non-composed synthesis, unfrozen message or evidence-boundary crossing", () => {
  for (const status of ["failed", "insufficient_evidence"]) {
    const nonComposed = fixture();
    nonComposed.synthesis.status = status;
    assert.throws(() => projectNormalizedMessageReflection(nonComposed), /synthesis must be composed/);
  }

  const unfrozen = fixture();
  unfrozen.synthesis.freeze.frozen = false;
  assert.throws(() => projectNormalizedMessageReflection(unfrozen), /already be frozen/);

  const weighted = fixture();
  weighted.reflection.evidence_weight = 1;
  assert.throws(() => projectNormalizedMessageReflection(weighted), /evidence boundary/);
});

test("projection rejects message drift and any card order other than מצב/אתגר/עצה", () => {
  const drift = fixture();
  drift.message = "מסר אחר";
  assert.throws(() => projectNormalizedMessageReflection(drift), /must equal frozen synthesis message/);

  const wrongOrder = fixture();
  wrongOrder.reflection.cards = [
    wrongOrder.reflection.cards[1],
    wrongOrder.reflection.cards[0],
    wrongOrder.reflection.cards[2],
  ];
  assert.throws(() => projectNormalizedMessageReflection(wrongOrder), /card order/);
});

test("Raziel handoff is bounded and carries no second message authority", () => {
  const payload = toRazielMessageReflectionPayload(fixture());
  assert.equal(payload.razielMicroIntent, RAZIEL_REFLECTION_INTENT);
  assert.equal(payload.messageReflection.message, "מסר קפוא");
  assert.equal(payload.messageReflection.boundaries.no_personal_message_engine, true);
  assert.deepEqual(Object.keys(payload).sort(), ["messageReflection", "razielMicroIntent"]);
  assert.equal(Object.isFrozen(payload), true);
});
