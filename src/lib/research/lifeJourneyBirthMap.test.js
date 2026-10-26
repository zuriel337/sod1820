import test from "node:test";
import assert from "node:assert/strict";
import { buildLifeJourneyBirthMap } from "./lifeJourneyBirthMap.js";

test("birth map reports input readiness without inventing a sky or Human Design result", () => {
  const out = buildLifeJourneyBirthMap({
    members: [
      { source_ref: "person:self", name: "אדם בדיקה" },
      { source_ref: "person:child", name: "ילד בדיקה" },
      { source_ref: "person:hidden", name: "לא נבחר" },
    ],
    selectedRefs: ["person:self", "person:child"],
    birthTimeline: [{ memberRef: "person:self", dateIso: "1990-02-15", hebrewDate: "כ׳ בשבט", birthTime: "05:30", birthPlace: "ירושלים" }],
    creation: { people: [{ memberRef: "person:self" }, { memberRef: "person:child" }], sources: ["source:1"], letterGroups: [] },
  });
  assert.equal(out.people.length, 2);
  assert.equal(JSON.stringify(out).includes("לא נבחר"), false);
  assert.equal(out.people[0].readiness.inputReady, true);
  assert.equal(out.people[0].humanDesign.state, "adapter_required");
  assert.equal(out.people[0].humanDesign.output, null);
  assert.equal(out.people[0].sky.output, null);
  assert.equal(out.people[1].humanDesign.state, "needs_date");
  assert.equal(out.adapters.seferYetzirah.state, "source_ready");
  assert.deepEqual(out.boundaries, {
    read_only_projection: true,
    no_external_birth_api: true,
    no_fabricated_traits: true,
    no_ephemeris_claim: true,
    no_new_store: true,
    no_telemetry_payload: true,
  });
});
