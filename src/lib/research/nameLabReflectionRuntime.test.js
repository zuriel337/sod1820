import test from "node:test";
import assert from "node:assert/strict";
import {
  extractNameLabTrackLists,
  buildNameLabBoundedFacts,
  composeNameLabEvidenceBackedSynthesisDraft,
  runNameLabReflectionRuntime,
  NAME_LAB_REFLECTION_FAILURE_REASON,
} from "./nameLabReflectionRuntime.js";
import { composeNameLabNormalizedEvidenceBundle } from "./nameLabFinding.js";

// Same golden shape as nameLabFinding.test.js — one track-array, several source-native hits.
function goldenTracks() {
  return [
    {
      id: "milui", status: "ok",
      data: [{ part: "דוד", milui: 490, ragil: 14, matches: [{ phrase: "אור גדול", source: "words" }] }],
    },
    { id: "combo_gem", status: "ok", value: 14, words: ["יד", "דוד"] },
  ];
}

function goldenThreeCards() {
  return {
    tarot: {
      framework: "שלושה קלפים להשראה",
      cards: [
        { position: "המצב", n: 1, arcana: "הקוסם" },
        { position: "האתגר", n: 2, arcana: "הכוהנת" },
        { position: "העצה", n: 3, arcana: "הקיסרית" },
      ],
    },
  };
}

test("extractNameLabTrackLists: ungraded getNameMulti result wraps tracks[] in one track-array", () => {
  const lists = extractNameLabTrackLists({ graded: false, tracks: goldenTracks() });
  assert.deepEqual(lists, [goldenTracks()]);
});

test("extractNameLabTrackLists: graded result splits per-source docs and combo_gem/variants only", () => {
  const graded = {
    graded: true,
    sources: [{ doc: { tracks: goldenTracks() } }],
    combo: { tracks: [...goldenTracks(), { id: "anagrams", status: "ok", data: [] }] },
  };
  const lists = extractNameLabTrackLists(graded);
  assert.equal(lists.length, 2);
  assert.deepEqual(lists[0], goldenTracks());
  // combo contribution is filtered to combo_gem/variants only — anagrams from combo excluded.
  assert.ok(lists[1].every((t) => t.id === "combo_gem" || t.id === "variants"));
});

test("extractNameLabTrackLists: null/malformed input never throws", () => {
  assert.deepEqual(extractNameLabTrackLists(null), []);
  assert.deepEqual(extractNameLabTrackLists({}), [[]]);
  assert.deepEqual(extractNameLabTrackLists({ graded: true }), [[]]);
});

test("buildNameLabBoundedFacts: bounded to Finding-derived fields only, no personal keys", () => {
  const bundle = composeNameLabNormalizedEvidenceBundle({ name: "דוד", trackLists: [goldenTracks()] });
  const facts = buildNameLabBoundedFacts("דוד", bundle.findings);
  assert.match(facts, /דוד/);
  assert.match(facts, /family=milui/);
  assert.match(facts, /verification=not_tested/);
  assert.doesNotMatch(facts, /surname|birthdate|תאריך|משפחה:/);
});

test("buildNameLabBoundedFacts: truncates and reports the remainder instead of growing unbounded", () => {
  const bundle = composeNameLabNormalizedEvidenceBundle({ name: "דוד", trackLists: [goldenTracks()] });
  const facts = buildNameLabBoundedFacts("דוד", bundle.findings, { maxLines: 1 });
  assert.match(facts, /additional engine Findings not shown/);
});

test("composeNameLabEvidenceBackedSynthesisDraft: claims are backed only by real Finding ids, freeze is explicit", () => {
  const bundle = composeNameLabNormalizedEvidenceBundle({ name: "דוד", trackLists: [goldenTracks()] });
  const draft = composeNameLabEvidenceBackedSynthesisDraft({ findings: bundle.findings, aiMessage: "פרשנות" });
  assert.equal(draft.freeze.frozen, true);
  assert.equal(draft.message, "פרשנות");
  const allowed = new Set(bundle.findings.map((f) => f.id));
  for (const claim of draft.claims) {
    for (const id of claim.support.finding_ids) assert.ok(allowed.has(id));
  }
});

test("runNameLabReflectionRuntime: zero Findings fails closed before AI/Tarot are ever called", async () => {
  let aiCalled = false;
  let tarotCalled = false;
  const result = await runNameLabReflectionRuntime({
    name: "דוד",
    nameMultiProvider: async () => ({ graded: false, tracks: [] }),
    aiAnalysisProvider: async () => { aiCalled = true; return "should never run"; },
    tarotProvider: async () => { tarotCalled = true; return goldenThreeCards(); },
  });
  assert.equal(result.status, "failed_closed");
  assert.equal(result.reason, NAME_LAB_REFLECTION_FAILURE_REASON.ZERO_FINDINGS);
  assert.equal(aiCalled, false);
  assert.equal(tarotCalled, false);
  assert.equal(result.payload, null);
});

test("runNameLabReflectionRuntime: AI null/quota/error fails closed with zero Tarot draws", async () => {
  let tarotCalled = false;
  const result = await runNameLabReflectionRuntime({
    name: "דוד",
    nameMultiProvider: async () => ({ graded: false, tracks: goldenTracks() }),
    aiAnalysisProvider: async () => null,
    tarotProvider: async () => { tarotCalled = true; return goldenThreeCards(); },
  });
  assert.equal(result.status, "failed_closed");
  assert.equal(result.reason, NAME_LAB_REFLECTION_FAILURE_REASON.AI_UNAVAILABLE);
  assert.equal(tarotCalled, false);
  assert.equal(result.payload, null);
});

test("runNameLabReflectionRuntime: invalid name fails closed without calling any provider", async () => {
  let called = false;
  const result = await runNameLabReflectionRuntime({
    name: "   ",
    nameMultiProvider: async () => { called = true; return null; },
    aiAnalysisProvider: async () => { called = true; return "x"; },
    tarotProvider: async () => { called = true; return goldenThreeCards(); },
  });
  assert.equal(result.status, "failed_closed");
  assert.equal(result.reason, NAME_LAB_REFLECTION_FAILURE_REASON.INVALID_NAME);
  assert.equal(called, false);
});

test("runNameLabReflectionRuntime: full success path — bounded payload, exactly 3 cards, no personal fields", async () => {
  const result = await runNameLabReflectionRuntime({
    name: "דוד",
    nameMultiProvider: async () => ({ graded: false, tracks: goldenTracks() }),
    aiAnalysisProvider: async ({ kind, subject, facts }) => {
      assert.equal(kind, "name_lab");
      assert.equal(subject, "דוד");
      assert.match(facts, /family=/);
      return "המילה נושאת כמה מקבילות מעניינות.";
    },
    tarotProvider: async () => goldenThreeCards(),
    now: () => "2026-09-26T00:00:00.000Z",
  });

  assert.equal(result.status, "ok");
  const { payload } = result;
  assert.equal(payload.razielMicroIntent, "reflect_on_frozen_message");
  const mr = payload.messageReflection;
  assert.equal(mr.status, "composed");
  assert.equal(mr.message, "המילה נושאת כמה מקבילות מעניינות.");
  assert.equal(mr.cards.length, 3);
  assert.deepEqual(mr.cards.map((c) => c.position), ["המצב", "האתגר", "העצה"]);
  assert.equal(mr.boundaries.tarot_evidence_weight, 0);
  assert.equal(mr.boundaries.can_modify_frozen_message, false);
  assert.ok(mr.claims.length > 0);
  assert.ok(mr.trace.source_finding_ids.length > 0);

  // No personal fields anywhere in the bounded projection.
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /surname|birthdate/i);
});

test("runNameLabReflectionRuntime: synthesizer only runs after Findings exist and AI succeeded (call order)", async () => {
  const calls = [];
  await runNameLabReflectionRuntime({
    name: "דוד",
    nameMultiProvider: async () => { calls.push("nameMulti"); return { graded: false, tracks: goldenTracks() }; },
    aiAnalysisProvider: async () => { calls.push("ai"); return "פרשנות"; },
    tarotProvider: async () => { calls.push("tarot"); return goldenThreeCards(); },
  });
  assert.deepEqual(calls, ["nameMulti", "ai", "tarot"]);
});
