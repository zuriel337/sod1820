import test from "node:test";
import assert from "node:assert/strict";
import { buildLifeJourneyMaps } from "./lifeJourneyMaps.js";

const SELF = "person:owner:self";
const CHILD = "person:owner:p:child";

function fixture() {
  return buildLifeJourneyMaps({
    includeProgramBranches: true,
    members: [
      { source_ref: SELF, name: "הורה בדיקה" },
      { source_ref: CHILD, name: "ילד בדיקה" },
      { source_ref: "person:owner:p:other", name: "לא נבחר" },
    ],
    selectedRefs: [SELF, CHILD],
    birthReflections: new Map([[SELF, {
      humanDesign: {
        type: "Generator",
        authority: "Sacral Authority",
        profile: "3/5",
        definedCenters: [{ key: "sacral" }],
        definedChannels: [],
        activatedGates: [5],
      },
      sky: {
        angles: { ascendant: { sign: "Aries" }, midheaven: { sign: "Capricorn" } },
        bodies: [{ key: "sun" }],
        aspects: [],
      },
      trace: { engine: "natalengine", engineVersion: "1.6.0" },
    }]]),
    relations: [{ source_ref: "rel:1", parent_ref: SELF, child_ref: CHILD }],
    birthTimeline: [{ id: `${SELF}:birth`, memberRef: SELF, name: "הורה בדיקה", dateIso: "1990-02-15", dateDisplay: "15.02.1990", hebrewDate: "כ׳ בשבט תש״ן", birthTime: "05:30", birthPlace: "עיר בדיקה" }],
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
  assert.equal(out.summary.synthesisPack, out.synthesisPack);
  assert.equal(out.picture.people.length, 2);
  assert.equal(out.picture.people[0].nameValue, 73);
  assert.equal(out.picture.people[0].dateDisplay, "15.02.1990");
  assert.equal(out.picture.people[0].human.profile, "3/5");
  assert.equal(out.picture.people[1].human, null);
  assert.equal(out.picture.people[0].sky.bodyCount, 1);
  assert.equal(out.picture.people[1].sky, null);
  assert.equal(out.synthesisPack.auxiliary.humanDesignCount, 1);
  assert.equal(out.synthesisPack.auxiliary.skyCount, 1);
  assert.equal(out.synthesisPack.coverage.layers.find(layer => layer.id === "human_design").state, "auxiliary");
  assert.equal(JSON.stringify(out.synthesisPack).includes(SELF), false);
  assert.equal(out.sources.members[0].verses[0].verseIdentity, "verse:tehilim:1:1");
  assert.deepEqual(out.sources.numbers[0].phrases, ["אור", "מאור"]);
  assert.equal(out.creation.people.length, 2);
  assert.equal(out.creation.birthAnchors[0].birthPlace, "עיר בדיקה");
  assert.equal(out.timeMap.people[0].expressions.find(item => item.role === "hebrew_day").text, "כ׳");
  assert.equal(out.timeMap.state, "ready");
  assert.equal(out.birthMap.people[0].birthTime, "05:30");
  assert.equal(out.birthMap.people[0].humanDesign.state, "ready_for_explicit_calculation");
  assert.equal(out.birthMap.people[0].humanDesign.output, null);
  assert.equal(out.creation.cosmicFrames[0].items.includes("שבתאי"), true);
  assert.equal(out.creation.boundaries.no_personal_astrology, true);
  assert.equal(out.path.saved, true);
  assert.equal(out.path.steps.length, 10);
  assert.equal(out.path.completedCount, 8);
  assert.equal(out.path.progressPercent, 80);
  assert.equal(out.path.complete, false);
  assert.ok(out.path.steps.filter(step => ["els", "hints"].includes(step.id)).every(step => step.state === "not_connected" && step.tab === null));
  assert.equal(out.path.nextStep, null);
  assert.deepEqual(out.boundaries, { read_only_projection: true, no_els_execution: true, no_new_store: true, no_graph_write: true });
});

test("Legacy projection keeps its existing eight-step flow without the 2029 branches", () => {
  const out = buildLifeJourneyMaps({ members: [{ source_ref: SELF, name: "הורה בדיקה" }], selectedRefs: [SELF] });
  assert.equal(out.path.steps.length, 8);
  assert.equal(out.synthesisPack.coverage.layers.some(layer => layer.id === "els" || layer.id === "hints"), false);
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
  assert.equal(out.path.nextStep.id, "time");
  assert.equal(out.path.nextStep.tab, "time");
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

test("personal picture excludes unselected birth results and keeps unknown values distinct from zero", () => {
  const input = {
    members: [{ source_ref: SELF, name: "הורה" }, { source_ref: CHILD, name: "לא נבחר" }],
    selectedRefs: [SELF],
    birthReflections: new Map([[CHILD, { humanDesign: { typeLabel: "תוצאה פרטית זרה" } }]]),
    research: { state: "ready", rows: [{ memberRef: SELF, state: "ready", data: { fullValue: 0 } }] },
  };
  const out = buildLifeJourneyMaps(input);
  assert.equal(out.picture.people[0].nameValue, 0);
  assert.equal(out.picture.people[0].human, null);
  assert.equal(JSON.stringify(out.picture).includes("תוצאה פרטית זרה"), false);
  assert.equal(JSON.stringify(out.picture).includes(CHILD), false);
  const waiting = buildLifeJourneyMaps({ ...input, research: { state: "idle" } });
  assert.equal(waiting.picture.people[0].nameValue, null);
  assert.equal(waiting.picture.people[0].researchState, "waiting");
  assert.equal(waiting.summary.message, "");
});
