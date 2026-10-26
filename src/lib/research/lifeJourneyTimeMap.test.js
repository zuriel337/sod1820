import test from "node:test";
import assert from "node:assert/strict";
import { buildLifeJourneyTimeMap } from "./lifeJourneyTimeMap.js";

test("time map projects Hebrew date words, exact intervals and date-only convergences", () => {
  const out = buildLifeJourneyTimeMap({
    birthTimeline: [
      { memberRef: "person:a", name: "אדם א", dateIso: "1990-02-15", dateDisplay: "15.02.1990", hebrewDate: "כ׳ בשבט תש״ן" },
      { memberRef: "person:b", name: "אדם ב", dateIso: "2020-03-04", dateDisplay: "04.03.2020", hebrewDate: "ח׳ באדר תש״ף" },
    ],
    methodFindings: [
      { id: "a-day", memberRef: "person:a", expressionRole: "hebrew_day", methodKey: "ragil", methodLabel: "רגיל", value: 337 },
      { id: "b-month", memberRef: "person:b", expressionRole: "hebrew_month", methodKey: "miluy", methodLabel: "מילוי", value: 337 },
      { id: "ignored-name", memberRef: "person:b", expressionRole: "given_name", methodLabel: "רגיל", value: 337 },
      { id: "ignored-person", memberRef: "person:hidden", expressionRole: "hebrew_day", methodLabel: "רגיל", value: 337 },
    ],
    researchReady: true,
  });
  assert.equal(out.people[0].expressions.find(item => item.role === "hebrew_day_month").text, "כ׳ בשבט");
  assert.equal(out.people[1].expressions.find(item => item.role === "hebrew_year").text, "תש״ף");
  assert.equal(out.intervals[0].daysBetween, 10975);
  assert.equal(out.intervals[0].approximateYears, 30);
  assert.equal(out.convergences.length, 1);
  assert.equal(out.convergences[0].value, 337);
  assert.deepEqual(out.convergences[0].participants.map(item => item.name), ["אדם א", "אדם ב"]);
  assert.equal(JSON.stringify(out).includes("person:hidden"), false);
  assert.deepEqual(out.boundaries, {
    read_only_projection: true,
    existing_date_matrix_only: true,
    no_astrology: true,
    no_predicted_cycles: true,
    no_new_engine: true,
    no_new_store: true,
  });
});

test("time map exposes words before explicit research without inventing values", () => {
  const out = buildLifeJourneyTimeMap({
    birthTimeline: [{ memberRef: "person:a", name: "אדם", dateIso: "1990-02-15", dateDisplay: "15.02.1990", hebrewDate: "כ׳ בשבט תש״ן" }],
  });
  assert.equal(out.state, "waiting");
  assert.equal(out.people[0].expressions.length, 5);
  assert.equal(out.people[0].expressions.every(item => item.methods.length === 0), true);
  assert.equal(out.convergences.length, 0);
});
