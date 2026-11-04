import test from "node:test";
import assert from "node:assert/strict";
import { projectLifeJourneyHintDate, projectLifeJourneyHintReferences } from "./lifeJourneyHintProjection.js";

test("hint civil dates reuse the canonical calendar representation without inventing an instant", () => {
  const date = projectLifeJourneyHintDate("2024-02-29");
  assert.equal(date.state, "dated");
  assert.equal(date.dateIso, "2024-02-29");
  assert.equal(date.precision, "day");
  assert.equal(date.source, "occurred_at");
  assert.equal(date.transform.engine, "@hebcal/core");
  assert.match(date.hebrewDate, /[א-ת]/);
  assert.equal(projectLifeJourneyHintDate("2023-02-29").state, "invalid");
  for (const value of ["2024-02", "2024", "2024-02-29T20:30:00+02:00", "י״ג בתשרי", "approximate"]) {
    assert.deepEqual(projectLifeJourneyHintDate(value), { state: "needs_review" });
  }
  assert.deepEqual(projectLifeJourneyHintDate(null), { state: "unknown" });
});

test("existing hint references deduplicate without attributing observations to family members", () => {
  const out = projectLifeJourneyHintReferences({ loading: false, rows: [
    { id: "hint-1", occurred_at: "2024-02-29", title: "שם פרטי", note: "תוכן פרטי", person_ref: "person:other:self" },
    { id: "hint-1", occurred_at: "2023-02-29" },
    { id: "hint-2", created_at: "2024-02-29" },
    { id: "hint-3", occurred_at: "2024-02" },
    { id: "hint-4", occurred_at: "2023-02-29" },
    { title: "missing identity" },
  ] });
  assert.equal(out.state, "references");
  assert.deepEqual(out.coverage, { referenceCount: 4, datedCount: 1, unknownDateCount: 1, dateReviewCount: 2, unassignedCount: 4 });
  assert.equal(out.rows[1].date.state, "unknown", "submission date is never the observation date");
  assert.ok(out.rows.every(row => row.personRef === null && row.verification === "user_observation" && row.analysisState === "not_connected"));
  assert.equal(out.evidenceWeight, 0);
  assert.equal(JSON.stringify(out).includes("תוכן פרטי"), false);
  assert.equal(JSON.stringify(out).includes("שם פרטי"), false);
  assert.equal(JSON.stringify(out).includes("person:other:self"), false);
});

test("loading/denied reads never become empty or investigated and references remain bounded", () => {
  assert.equal(projectLifeJourneyHintReferences().state, "loading");
  const denied = projectLifeJourneyHintReferences({ loading: false, error: "denied", rows: [{ id: "foreign-hint" }] });
  assert.equal(denied.state, "error");
  assert.equal(denied.rows.length, 0);
  assert.equal(projectLifeJourneyHintReferences({ loading: false, rows: [] }).state, "no_references");
  assert.equal(projectLifeJourneyHintReferences({ loading: false, rows: Array.from({ length: 700 }, (_, id) => ({ id: `hint-${id}` })) }).rows.length, 500);
});

test("an explicit member association is projected only inside the authorized journey", () => {
  const childRef = "person:owner:p:child";
  const rows = [
    { id: "mine", occurred_at: "2026-10-26", life_journey_member_ref: childRef },
    { id: "foreign", occurred_at: "2026-10-27", life_journey_member_ref: "person:other:p:child" },
  ];
  const out = projectLifeJourneyHintReferences({ loading: false, rows }, { authorizedMemberRefs: [childRef] });
  assert.equal(out.rows[0].personRef, childRef);
  assert.equal(out.rows[1].personRef, null);
  assert.equal(out.coverage.unassignedCount, 1);
});
