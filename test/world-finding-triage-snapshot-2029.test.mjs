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
  assert.deepEqual(WORLD_FINDING_TRIAGE_META.strengthBreakdown["בינוני"], {
    cards: 4164,
    recommendations: {
      "דורש בדיקה": 4122,
      "דורש מקור": 35,
      "שיוך זהות לא פתור": 1,
      "דורש OCR או תמלול": 6,
    },
    verificationCohorts: {
      explicitMatch: 37,
      legacySignal: 4076,
      notApplicable: 9,
      partialOrExceptional: 42,
    },
    occurrences: 4429,
    exactDuplicateClusters: 211,
    duplicateOccurrencesCombined: 265,
    proposedTreeTargets: 4133,
  });
  assert.deepEqual(WORLD_FINDING_TRIAGE_META.strengthBreakdown["חלש"].verificationCohorts, {
    notTested: 6347,
    methodUnknown: 9,
    mismatch: 6,
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

test("strong continuation reconciles the full 183-card batch without mutating the historical totals", () => {
  assert.deepEqual(WORLD_FINDING_TRIAGE_META.strongContinuation, {
    reviewedAt: "2026-10-26",
    baseCommit: "662a4d9fa73750ac14a93a0c96cd7cd4c5285b85",
    strongFindings: 183,
    alreadyConnected: 106,
    readyForImplementation: 55,
    duplicateDecisions: 17,
    clusteredDuplicates: 15,
    correctedDuplicateClassifications: 2,
    blockedMissingTarget: 2,
    needsReview: 2,
    setAside: 3,
    mutatesLiveData: false,
  });
  assert.equal(WORLD_FINDING_TRIAGE_META.strengthCounts["חזק"], 183);
  assert.equal(WORLD_FINDING_TRIAGE_META.recommendationCounts["מתאים לעץ"], 157);
});

test("multi-target findings preserve every verified target and keep interpretation separate", () => {
  const spatial = getWorldFindingTriageSnapshot("38ac8d16-9bee-4292-97c6-b02b0eee8cf6");
  assert.equal(spatial.recommendation, "מתאים לעץ");
  assert.equal(spatial.historicalRecommendation, "דורש בדיקה");
  assert.deepEqual(spatial.proposedTreeTargets.map((target) => target.match(/\((\d+)\)$/u)?.[1]), ["86", "18", "68"]);

  const series = getWorldFindingTriageSnapshot("e02176b0-2377-4780-b30d-4f608eff1625");
  assert.deepEqual(series.proposedTreeTargets.map((target) => target.match(/\((\d+)\)$/u)?.[1]), ["996", "997", "998", "1000"]);
  assert.match(series.continuationReason, /999.*פרשנות/u);
});

test("misclassified duplicates keep their sources but receive their own exact targets", () => {
  const target586 = getWorldFindingTriageSnapshot("34227b70-955a-4b81-93a4-1e6f9eeba344");
  assert.equal(target586.recommendation, "מתאים לעץ");
  assert.equal(target586.historicalRecommendation, "כפילות");
  assert.match(target586.proposedTreeTarget, /\(586\)$/u);
  assert.equal(target586.recommendedKeepId, null);
  assert.deepEqual(target586.duplicateIds, []);
  assert.equal(target586.relatedFindingIds.length, 2);

  const target238 = getWorldFindingTriageSnapshot("c5f9c01b-106e-4a26-9926-79d0da7a8a3f");
  assert.match(target238.proposedTreeTarget, /\(238\)$/u);
  assert.equal(target238.continuationState, "ready");
});

test("duplicate clusters distinguish the fullest display text from the snapshot keep pointer", () => {
  const duplicate = getWorldFindingTriageSnapshot("1204cb70-958f-496e-bdcc-0d3c56df825b");
  assert.equal(duplicate.continuationState, "clustered");
  assert.equal(duplicate.displayRepresentativeId, "1204cb70-958f-496e-bdcc-0d3c56df825b");
  assert.equal(duplicate.recommendedKeepId, "8593fe3e-9606-4b2b-bd52-0c4a0285c4e3");
});

test("blocked and set-aside findings remain review annotations only", () => {
  const blocked = getWorldFindingTriageSnapshot("06c22b3f-9988-460b-9888-516015e20e68");
  assert.equal(blocked.continuationState, "blocked_missing_target");
  assert.equal(blocked.recommendation, "דורש בדיקה");

  const setAside = getWorldFindingTriageSnapshot("05164ee8-1fdf-4609-90ac-81c5907ccdec");
  assert.equal(setAside.continuationState, "set_aside");
  assert.equal(setAside.recommendation, "דורש בדיקה");
});

test("all 37 medium explicit matches stay blocked by their independent review gate", () => {
  assert.deepEqual(WORLD_FINDING_TRIAGE_META.mediumMatchContinuation, {
    reviewedAt: "2026-10-26",
    baseCommit: "662a4d9fa73750ac14a93a0c96cd7cd4c5285b85",
    explicitMatchFindings: 37,
    readyForImplementation: 0,
    sourceRequired: 35,
    identityUnresolved: 1,
    ocrRequired: 1,
    mutatesLiveData: false,
  });

  const sourceBlocked = getWorldFindingTriageSnapshot("091694ce-d74d-456d-83d7-73f3016d5a0d");
  assert.equal(sourceBlocked.strength, "בינוני");
  assert.equal(sourceBlocked.continuationState, "needs_review");
  assert.match(sourceBlocked.continuationReason, /work_log.*לא locator/u);

  const identityBlocked = getWorldFindingTriageSnapshot("196288f6-8edd-40e5-8f6d-3235638a88da");
  assert.match(identityBlocked.continuationLabel, /זהות לא פתור/u);

  const ocrBlocked = getWorldFindingTriageSnapshot("69dddd29-3383-4891-8676-38936004e783");
  assert.match(ocrBlocked.continuationReason, /Image 956/u);
  assert.equal(ocrBlocked.recommendation, "דורש OCR או תמלול");
});
