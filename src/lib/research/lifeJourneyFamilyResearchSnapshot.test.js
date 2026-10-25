import test from "node:test";
import assert from "node:assert/strict";
import { normalizeResearchContext } from "./researchContext.js";
import {
  LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION,
  lifeJourneyFamilySelectionSignature,
  lifeJourneyFamilySnapshotPatch,
  materializeLifeJourneyFamilySnapshot,
  readLifeJourneyFamilySnapshot,
  serializeLifeJourneyFamilySnapshot,
} from "./lifeJourneyFamilyResearchSnapshot.js";

const PERSON_REF = "person:11111111-1111-4111-8111-111111111111:self";
const CHILD_REF = "person:11111111-1111-4111-8111-111111111111:p:child-1";
const members = [
  { source_ref: PERSON_REF, name: "הורה בדיקה", meta: { first_name: "הורה", surname: "בדיקה", birthdate_iso: "1990-02-15" } },
  { source_ref: CHILD_REF, name: "ילד בדיקה", meta: { first_name: "ילד", surname: "בדיקה", birthdate_iso: "2020-03-04" } },
];

function completedResearch() {
  const finding = { id: "finding-73", value: 73, methodLabel: "רגיל", finding: { private: "must-not-survive" } };
  return {
    state: "ready",
    rows: members.map(member => ({
      memberRef: member.source_ref,
      name: member.name,
      state: "ready",
      data: { fullValue: 73, methodFindings: [finding], hebrewDate: "י״א בתשרי", crossFindings: [finding], crossValues: [73], tracksWithResults: 1, partial: false },
      error: null,
    })),
    sharedValues: [{ value: 73, count: 2 }],
    methodFindings: [finding],
    relationRows: [{ id: "relation-1", left: { memberRef: PERSON_REF, name: "הורה בדיקה", expressionRole: "given_name", expressionLabel: "שם פרטי" }, right: { memberRef: CHILD_REF, name: "ילד בדיקה", expressionRole: "given_name", expressionLabel: "שם פרטי" }, independentGroupCount: 1 }],
    connections: [{ id: "pair-1", left: { memberRef: PERSON_REF, name: "הורה בדיקה", expressionRole: "given_name", expressionLabel: "שם פרטי" }, right: { memberRef: CHILD_REF, name: "ילד בדיקה", expressionRole: "given_name", expressionLabel: "שם פרטי" }, independentGroupCount: 1, expressionConnectionCount: 4, findingIds: ["relation-1"] }],
    message: "מסר משפחתי בדוק",
    coverage: { memberCount: 2, expressionCount: 16, searchedPairCount: 64, relationCount: 1, connectionCount: 1, truncated: false },
    error: null,
  };
}

test("family research snapshot round-trips only through the existing private Context", () => {
  const signature = lifeJourneyFamilySelectionSignature(members, [PERSON_REF, CHILD_REF]);
  const serialized = serializeLifeJourneyFamilySnapshot({
    personRef: PERSON_REF,
    signature,
    research: completedResearch(),
    analysis: { state: "ready", data: { version: "v1", message: "ניתוח שמור", claims: [{ id: "c1", text: "טענה", role: "summary" }], coverage: { connectionCount: 1, searchedPairCount: 64 }, boundaries: { no_els: true } } },
    savedAt: "2026-10-25T00:00:00.000Z",
  });
  assert.ok(serialized);
  assert.equal(serialized.includes("must-not-survive"), false, "raw nested engine payload is not copied into Context");
  assert.equal(serialized.includes("הורה בדיקה"), false, "private names remain in the Ledger, not Context");
  assert.equal(serialized.includes("ילד בדיקה"), false, "family names remain reference-only in Context");
  assert.equal(serialized.includes("1990-02-15"), false, "birth dates remain in the Ledger, not Context");

  const context = normalizeResearchContext({
    subject: { id: PERSON_REF, type: "person" },
    dimensions: { [LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION]: serialized },
  });
  const restored = readLifeJourneyFamilySnapshot(context, { personRef: PERSON_REF, signature });
  assert.equal(restored.research.coverage.expressionCount, 16);
  assert.equal(restored.analysis.data.message, "ניתוח שמור");
  const materialized = materializeLifeJourneyFamilySnapshot(restored, members, { hebrewDateForMember: () => "י״א בתשרי" });
  assert.equal(materialized.research.rows[1].name, "ילד בדיקה");
  assert.equal(materialized.research.rows[1].data.hebrewDate, "י״א בתשרי");
  assert.match(materialized.research.message, /הורה בדיקה/);
  assert.match(materialized.analysis.data.claims[0].text, /ילד בדיקה/);
  assert.deepEqual(lifeJourneyFamilySnapshotPatch(serialized), {
    dimensions: { [LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION]: serialized },
  });
});

test("snapshot refuses a different person or changed family profile", () => {
  const signature = lifeJourneyFamilySelectionSignature(members, [PERSON_REF, CHILD_REF]);
  const serialized = serializeLifeJourneyFamilySnapshot({ personRef: PERSON_REF, signature, research: completedResearch() });
  const context = normalizeResearchContext({ subject: { id: PERSON_REF, type: "person" }, dimensions: { [LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION]: serialized } });
  const changed = members.map(member => member.source_ref === CHILD_REF ? { ...member, name: "שם חדש" } : member);
  assert.equal(readLifeJourneyFamilySnapshot(context, { personRef: "person:other:self", signature }), null);
  assert.equal(readLifeJourneyFamilySnapshot(context, {
    personRef: PERSON_REF,
    signature: lifeJourneyFamilySelectionSignature(changed, [PERSON_REF, CHILD_REF]),
  }), null);
});

