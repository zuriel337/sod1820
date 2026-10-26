import test from "node:test";
import assert from "node:assert/strict";
import { buildLifeJourneyBirthMap } from "./lifeJourneyBirthMap.js";

test("birth map reports input readiness without calculating until an explicit action", () => {
  const out = buildLifeJourneyBirthMap({
    members: [
      { source_ref: "person:self", name: "אדם בדיקה" },
      { source_ref: "person:child", name: "ילד בדיקה" },
      { source_ref: "person:hidden", name: "לא נבחר" },
    ],
    selectedRefs: ["person:self", "person:child"],
    birthTimeline: [{ memberRef: "person:self", dateIso: "1990-02-15", hebrewDate: "כ׳ בשבט", birthTime: "05:30", birthPlace: "ירושלים" }],
    creation: { people: [{ memberRef: "person:self" }, { memberRef: "person:child" }], sources: ["source:1"], letterGroups: [] },
    familyLinks: [{ parentRef: "person:self", childRef: "person:child" }],
    researchLinks: [{ leftRef: "person:self", rightRef: "person:child", hasResearchConnection: true, independentGroupCount: 2 }],
    convergenceRows: [{ value: 337, participantRefs: ["person:self", "person:child"], methodGroupCount: 2 }],
  });
  assert.equal(out.people.length, 2);
  assert.equal(JSON.stringify(out).includes("לא נבחר"), false);
  assert.equal(out.people[0].readiness.inputReady, true);
  assert.equal(out.people[0].humanDesign.state, "ready_for_explicit_calculation");
  assert.equal(out.people[0].humanDesign.output, null);
  assert.equal(out.people[0].sky.output, null);
  assert.equal(out.people[1].humanDesign.state, "needs_date");
  assert.equal(out.adapters.seferYetzirah.state, "source_ready");
  assert.deepEqual(out.spatialModel.familyEdges, [{ from: 0, to: 1, kind: "family", strength: 1 }]);
  assert.deepEqual(out.spatialModel.researchEdges, [{ from: 0, to: 1, kind: "research", strength: 2 }]);
  assert.deepEqual(out.spatialModel.convergencePoints, [{ value: 337, participantIndices: [0, 1], methodGroupCount: 2 }]);
  assert.equal(JSON.stringify(out.spatialModel).includes("אדם בדיקה"), false);
  assert.deepEqual(out.boundaries, {
    read_only_projection: true,
    no_external_birth_api: true,
    no_fabricated_traits: true,
    no_unverified_ephemeris_claim: true,
    no_new_store: true,
    no_telemetry_payload: true,
    webgl_identity_free: true,
  });
});
