import test from "node:test";
import assert from "node:assert/strict";
import { normalizeResearchContext } from "./researchContext.js";
import { stableIdentityDigest } from "./researchRepresentations.js";
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
    sharedValues: [{ value: 73, count: 2, distinctExpressionCount: 2, normalizedEvidenceCount: 2, methodGroupCount: 1, repeatedExpressionCount: 0, sameMethod: true, classification: "same_method_distinct_expressions" }],
    sharedExpressions: [{ id: `life-family-shared-expression:${stableIdentityDigest("בדיקה")}`, expressionText: "בדיקה", memberCount: 2, memberRefs: [PERSON_REF, CHILD_REF], expressionRoles: ["family_name"], valueCount: 1, values: [73], effectiveMethodGroupCount: 1 }],
    methodNormalization: { rawMethodResultCount: 4, effectiveMethodResultCount: 2, collapsedMethodResultCount: 2, appliedEquivalenceFamilies: ["רגיל ↔ גדול"] },
    methodFindings: [finding],
    relationRows: [{ id: "relation-1", left: { memberRef: PERSON_REF, name: "הורה בדיקה", expressionRole: "given_name", expressionLabel: "שם פרטי" }, right: { memberRef: CHILD_REF, name: "ילד בדיקה", expressionRole: "given_name", expressionLabel: "שם פרטי" }, independentGroupCount: 1 }],
    connections: [{ id: "pair-1", left: { memberRef: PERSON_REF, name: "הורה בדיקה", expressionRole: "given_name", expressionLabel: "שם פרטי" }, right: { memberRef: CHILD_REF, name: "ילד בדיקה", expressionRole: "given_name", expressionLabel: "שם פרטי" }, independentGroupCount: 1, expressionConnectionCount: 4, findingIds: ["relation-1"] }],
    sourceResearch: {
      version: "life-journey-family-source-v1",
      memberSources: [{ memberRef: PERSON_REF, verses: [{ id: "verse-1", ref: "תהלים 1:1", text: "הורה בדיקה הולך בדרך", sourceRef: "rpc:fn_name_verse", evidence: "direct" }], tracks: [{ id: "name_verse", label: "הפסוק שלך", count: 1, sourceRef: "rpc:fn_name_verse" }], consensus: [], tracksWithResults: 1, sourceRef: "rpc:fn_name_multi?skip_els=1" }],
      numberSources: [{ value: 73, phrases: [{ id: "phrase-1", phrase: "הורה בדיקה", methods: ["רגיל"], sourceRefs: ["bidim:1"], governed: true, evidence: "value_match" }, { id: "phrase-2", phrase: "אור", methods: ["רגיל"], sourceRefs: ["bidim:2"], governed: true, evidence: "value_match" }], sourceRef: "rpc:fn_number_lookup", truncated: false }],
      coverage: { requestedMemberCount: 2, returnedMemberCount: 1, requestedValueCount: 1, returnedValueCount: 1, verseCount: 1, equalPhraseCount: 2, truncated: false },
      boundaries: { no_els: true, no_new_store: true },
    },
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
  assert.equal(serialized.includes('"expressionText"'), false, "shared private expressions remain in the Ledger, not Context");
  assert.equal(serialized.includes("הורה בדיקה הולך בדרך"), false, "private labels are redacted from public source excerpts before Context persistence");
  assert.equal(serialized.includes("אור"), true, "bounded public source projections remain available after refresh");

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
  assert.equal(materialized.research.sharedValues[0].distinctExpressionCount, 2);
  assert.equal(materialized.research.sharedExpressions[0].expressionText, "בדיקה");
  assert.equal(materialized.research.methodNormalization.collapsedMethodResultCount, 2);
  assert.equal(materialized.research.sourceResearch.numberSources[0].phrases[1].phrase, "אור");
  assert.equal(materialized.research.sourceResearch.memberSources[0].verses[0].text.includes("הורה בדיקה"), false);
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

