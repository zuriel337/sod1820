import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLifeJourneySeferYetzirahMap,
  SEFER_YETZIRAH_COSMIC_FRAMES,
  SEFER_YETZIRAH_LETTER_GROUPS,
} from "./lifeJourneySeferYetzirahMap.js";

const SELF = "person:owner:self";
const CHILD = "person:owner:p:child";

test("creation map classifies selected Hebrew names through the source-anchored 3/7/12 frame", () => {
  const out = buildLifeJourneySeferYetzirahMap({
    members: [
      { source_ref: SELF, name: "אברהם פולייס" },
      { source_ref: CHILD, name: "מרים פולייס" },
      { source_ref: "person:owner:p:hidden", name: "אדם מוסתר" },
    ],
    selectedRefs: [SELF, CHILD],
    relations: [{ parent_ref: SELF, child_ref: CHILD }],
    birthTimeline: [{
      memberRef: SELF,
      dateIso: "1990-02-15",
      hebrewDate: "כ׳ בשבט תש״ן",
      birthPlace: "ירושלים",
    }],
  });

  assert.deepEqual(SEFER_YETZIRAH_LETTER_GROUPS.map(group => [group.label, group.letters.length]), [
    ["3 אמות", 3],
    ["7 כפולות", 7],
    ["12 פשוטות", 12],
  ]);
  assert.deepEqual(SEFER_YETZIRAH_COSMIC_FRAMES.map(frame => frame.value), [7, 12, 3]);
  assert.equal(out.people.length, 2);
  assert.equal(out.people[0].sequence.some(item => item.letter === "ם"), false, "final letters are normalized to their standard form");
  assert.equal(out.people[0].counts.mothers > 0, true);
  assert.equal(out.sharedLetters.some(item => item.letter === "מ" && item.personCount === 2), true);
  assert.deepEqual(out.triad, {
    olam: { people: 2, relations: 1 },
    shana: { datedPeople: 1 },
    nefesh: { namedPeople: 2 },
  });
  assert.equal(out.birthAnchors[0].hebrewDate, "כ׳ בשבט תש״ן");
  assert.equal(out.birthAnchors[1].state, "missing_date");
  assert.equal(JSON.stringify(out).includes("אדם מוסתר"), false);
  assert.deepEqual(out.boundaries, {
    read_only_projection: true,
    source_anchored: true,
    no_personal_astrology: true,
    no_birth_time_inference: true,
    no_geocoding: true,
    no_new_engine: true,
    no_new_store: true,
  });
});

test("creation map exposes exact source identities without inventing a personal zodiac pairing", () => {
  const out = buildLifeJourneySeferYetzirahMap({
    members: [{ source_ref: SELF, name: "שאול" }],
    selectedRefs: [SELF],
  });
  assert.equal(out.sources.some(ref => ref.includes("#p183:")), true);
  assert.equal(out.sources.some(ref => ref.includes("#p187:")), true);
  assert.equal(out.sources.some(ref => ref.includes("#p190:")), true);
  assert.equal(JSON.stringify(out).includes("מזל אישי"), false);
  assert.equal(JSON.stringify(out).includes("birth_time"), true, "the explicit no-inference boundary remains machine-readable");
});
