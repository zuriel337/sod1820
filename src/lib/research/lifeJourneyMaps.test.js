import test from "node:test";
import assert from "node:assert/strict";
import { buildLifeJourneyMaps } from "./lifeJourneyMaps.js";

const SELF = "person:owner:self";
const CHILD = "person:owner:p:child";

function fixture() {
  return buildLifeJourneyMaps({
    members: [
      { source_ref: SELF, name: "הורה בדיקה" },
      { source_ref: CHILD, name: "ילד בדיקה" },
      { source_ref: "person:owner:p:other", name: "לא נבחר" },
    ],
    selectedRefs: [SELF, CHILD],
    relations: [{ source_ref: "rel:1", parent_ref: SELF, child_ref: CHILD }],
    birthTimeline: [{ id: `${SELF}:birth`, memberRef: SELF, name: "הורה בדיקה", dateIso: "1990-02-15", dateDisplay: "15.02.1990" }],
    context: { journey: { id: "path:1", position: 3 } },
    analysis: {
      state: "ready",
      data: {
        message: "מסר מנורמל מתוך הממצאים.",
        claims: [{ text: "337 חיבר שני אנשים דרך ביטויים שונים." }],
        coverage: { connectionCount: 1, searchedPairCount: 4, verseCount: 1 },
      },
    },
    research: {
      state: "ready",
      rows: [
        { memberRef: SELF, name: "הורה בדיקה", state: "ready", data: { fullValue: 73, hebrewDate: "י״א בתשרי", methodFindings: [{ methodLabel: "רגיל", value: 73 }], crossValues: [337] } },
        { memberRef: CHILD, name: "ילד בדיקה", state: "ready", data: { fullValue: 64, hebrewDate: "כ״ז באדר", methodFindings: [{ methodLabel: "רגיל", value: 337 }], crossValues: [337] } },
      ],
      methodFindings: [
        { memberRef: SELF, methodLabel: "מילוי", value: 337 },
        { memberRef: CHILD, methodLabel: "רגיל", value: 337 },
      ],
      sharedValues: [{ value: 337, count: 2, distinctExpressionCount: 2, methodGroupCount: 2, classification: "cross_method_distinct_expressions" }],
      connections: [{
        id: "connection:1",
        left: { memberRef: SELF, expressionLabel: "שם מלא" },
        right: { memberRef: CHILD, expressionLabel: "תאריך עברי" },
        independentGroupCount: 2,
        expressionConnectionCount: 3,
        engineSignal: 2,
      }],
      sourceResearch: {
        memberSources: [{ memberRef: SELF, tracksWithResults: 1, verses: [{ id: "verse:tehilim:1:1", ref: "תהלים 1:1", verseIdentity: "verse:tehilim:1:1" }] }],
        numberSources: [{ value: 337, phrases: [{ phrase: "אור" }, { phrase: "מאור" }] }],
      },
    },
  });
}

test("life maps project the existing private family state without inventing storage", () => {
  const out = fixture();
  assert.deepEqual(out.overview, {
    selectedPeople: 2,
    datedPeople: 1,
    matrixPeople: 2,
    convergenceCount: 1,
    sourceCount: 2,
    connectionCount: 1,
    relationshipPairCount: 1,
    evidenceGapCount: 0,
    researchReady: true,
  });
  assert.equal(out.matrix.length, 2);
  assert.deepEqual(out.generations.links.map(row => [row.parentName, row.childName]), [["הורה בדיקה", "ילד בדיקה"]]);
  assert.deepEqual(out.convergences[0].participantNames, ["הורה בדיקה", "ילד בדיקה"]);
  assert.equal(out.relationships[0].generation.parentName, "הורה בדיקה");
  assert.equal(out.relationships[0].evidenceBand, "two_groups");
  assert.equal(out.evidence.signals.length, 1);
  assert.equal(out.evidence.gaps.length, 0);
  assert.equal(out.coverage[0].researchedRelationshipCount, 1);
  assert.equal(out.coverage[1].hasBirthdate, false);
  assert.equal(out.summary.message, "מסר מנורמל מתוך הממצאים.");
  assert.equal(out.summary.normalized, true);
  assert.equal(out.sources.members[0].verses[0].verseIdentity, "verse:tehilim:1:1");
  assert.deepEqual(out.sources.numbers[0].phrases, ["אור", "מאור"]);
  assert.equal(out.path.saved, true);
  assert.deepEqual(out.boundaries, { read_only_projection: true, no_els: true, no_new_store: true, no_graph_write: true });
});

test("life maps stay useful before research and never include unselected people", () => {
  const out = buildLifeJourneyMaps({
    members: [{ source_ref: SELF, name: "הורה" }, { source_ref: CHILD, name: "ילד" }],
    selectedRefs: [SELF],
    research: { state: "idle" },
  });
  assert.equal(out.overview.selectedPeople, 1);
  assert.equal(out.overview.researchReady, false);
  assert.equal(out.matrix.length, 0);
  assert.equal(out.generations.unlinkedPeople[0].name, "הורה");
  assert.equal(out.relationships.length, 0);
  assert.equal(out.coverage[0].researchReady, false);
  assert.equal(out.summary.state, "waiting");
  assert.equal(JSON.stringify(out).includes("ילד"), false);
  assert.equal(out.path.steps.some(step => step.state === "waiting"), true);
});

test("life maps report an unresearched pair as a gap without inventing personal tension", () => {
  const out = buildLifeJourneyMaps({
    members: [{ source_ref: SELF, name: "הורה" }, { source_ref: CHILD, name: "ילד" }],
    selectedRefs: [SELF, CHILD],
    relations: [{ parent_ref: SELF, child_ref: CHILD }],
    research: { state: "idle", connections: [] },
  });
  assert.equal(out.relationships.length, 1);
  assert.equal(out.relationships[0].hasResearchConnection, false);
  assert.equal(out.relationships[0].evidenceBand, "not_found");
  assert.equal(out.evidence.signals.length, 0);
  assert.equal(out.evidence.gaps.length, 1);
  assert.equal(JSON.stringify(out).includes("מתח"), false);
});
