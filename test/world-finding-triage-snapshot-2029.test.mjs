import test from "node:test";
import assert from "node:assert/strict";
import {
  WORLD_FINDING_TRIAGE_META,
  getWorldFindingTriageSnapshot,
  hasWorldFindingTriageSnapshot,
} from "../api/world-finding-triage-snapshot.js";

test("the complete 2026-10-22 World triage report is present as a server-only snapshot", () => {
  assert.equal(WORLD_FINDING_TRIAGE_META.totalCards, 10709);
  assert.equal(WORLD_FINDING_TRIAGE_META.totalOccurrences, 11196);
  assert.equal(WORLD_FINDING_TRIAGE_META.exactDuplicateClusters, 330);
  assert.equal(WORLD_FINDING_TRIAGE_META.duplicateOccurrencesCombined, 487);
  assert.deepEqual(WORLD_FINDING_TRIAGE_META.strengthCounts, {
    "חזק": 183,
    "בינוני": 4164,
    "חלש": 6362,
  });
  assert.deepEqual(WORLD_FINDING_TRIAGE_META.recommendationCounts, {
    "מתאים לעץ": 157,
    "דורש בדיקה": 9122,
    "כפילות": 17,
    "דורש מקור": 50,
    "שיוך זהות לא פתור": 1,
    "דורש OCR או תמלול": 1356,
    "לא מתאים": 6,
  });
});

test("snapshot preserves exact rank, recommendation, target and semantic duplicate keep decision", () => {
  const first = getWorldFindingTriageSnapshot("01ab7adc-92f0-4c76-92fb-3ee43411d32e");
  assert.equal(first.rank, 1);
  assert.equal(first.strength, "חזק");
  assert.equal(first.recommendation, "מתאים לעץ");
  assert.match(first.proposedTreeTarget, /^number:.*\(204\)$/u);

  const duplicate = getWorldFindingTriageSnapshot("22cd0f08-cbc8-46fc-ab4a-26d7b716af38");
  assert.equal(duplicate.recommendation, "כפילות");
  assert.equal(duplicate.recommendedKeepId, "050ca908-d01f-413a-b32d-3db37e72c7e2");
  assert.deepEqual(duplicate.duplicateIds, ["050ca908-d01f-413a-b32d-3db37e72c7e2"]);

  assert.equal(getWorldFindingTriageSnapshot("fdb8596b-8866-4ccf-afbd-8352df511b59").rank, 10709);
  assert.equal(hasWorldFindingTriageSnapshot("missing"), false);
});
