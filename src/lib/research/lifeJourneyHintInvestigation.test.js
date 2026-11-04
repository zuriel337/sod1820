import test from "node:test";
import assert from "node:assert/strict";
import {
  LIFE_JOURNEY_HINT_INVESTIGATION_CONTRACT,
  runLifeJourneyHintInvestigation,
} from "./lifeJourneyHintInvestigation.js";

const SELF = "person:owner:self";
const CHILD = "person:owner:p:child";
const members = [{ source_ref: SELF, name: "הורה בדיקה" }, { source_ref: CHILD, name: "ילד בדיקה" }];
const birthTimeline = [
  { memberRef: SELF, dateIso: "1990-02-15" },
  { memberRef: CHILD, dateIso: "2020-03-04" },
];

test("explicit bounded checks use only confirmed date/number fields and existing selected research", async () => {
  const calls = [];
  const hint = {
    id: "hint-owned",
    occurred_at: "2026-10-26",
    number: 337,
    life_journey_member_ref: CHILD,
    note: "סיפור פרטי שאסור לשלוח",
    research_question: "שאלה פרטית שאסור לשלוח",
  };
  const out = await runLifeJourneyHintInvestigation({
    hint, members, selectedRefs: [SELF, CHILD], birthTimeline,
    research: { state: "ready", methodFindings: [{ id: "finding-337", memberRef: CHILD, methodLabel: "רגיל", expressionLabel: "שם", value: 337 }] },
    readers: { readNumber: async value => {
      calls.push(value);
      return [{ bid_id: "row-1", phrase: "ביטוי מקור", method: "רגיל", value, method_governed: true }];
    } },
  });
  assert.equal(out.ok, true);
  assert.equal(out.result.contract, LIFE_JOURNEY_HINT_INVESTIGATION_CONTRACT);
  assert.deepEqual(calls, [337]);
  assert.equal(out.result.date.comparisons.length, 2);
  assert.equal(out.result.number.existingMatches[0].memberName, "ילד בדיקה");
  assert.equal(out.result.number.source.phrases[0].phrase, "ביטוי מקור");
  assert.equal(out.result.boundaries.no_ai, true);
  assert.equal(out.result.boundaries.no_els, true);
  assert.equal(JSON.stringify(out).includes(hint.note), false);
  assert.equal(JSON.stringify(out).includes(hint.research_question), false);
});

test("a date-only hint performs no number or family-name read", async () => {
  let reads = 0;
  const out = await runLifeJourneyHintInvestigation({
    hint: { id: "hint-date", occurred_at: "2020-03-04", life_journey_member_ref: CHILD },
    members,
    selectedRefs: [CHILD],
    birthTimeline,
    readers: { readNumber: async () => { reads += 1; return []; } },
  });
  assert.equal(out.ok, true);
  assert.equal(reads, 0);
  assert.equal(out.result.date.comparisons.length, 1);
  assert.equal(out.result.date.comparisons[0].sameCivilDay, true);
  assert.equal(out.result.number.state, "not_requested");
});

test("unknown inputs and a foreign association fail before any reader", async () => {
  let reads = 0;
  const readers = { readNumber: async () => { reads += 1; return []; } };
  const empty = await runLifeJourneyHintInvestigation({ hint: { id: "hint-empty", note: "רק טקסט" }, members, selectedRefs: [SELF], readers });
  const foreign = await runLifeJourneyHintInvestigation({ hint: { id: "hint-foreign", number: 73, life_journey_member_ref: "person:other:self" }, members, selectedRefs: [SELF], readers });
  assert.equal(empty.error, "no_confirmed_inputs");
  assert.equal(foreign.error, "unauthorized_member_ref");
  assert.equal(reads, 0);
});

test("reader failure remains a bounded error outcome rather than invented evidence", async () => {
  const out = await runLifeJourneyHintInvestigation({
    hint: { id: "hint-number", number: 73 }, members, selectedRefs: [SELF],
    readers: { readNumber: async () => { throw new Error("offline"); } },
  });
  assert.equal(out.ok, true);
  assert.equal(out.result.status, "error");
  assert.equal(out.result.number.sourceState, "error");
  assert.equal(out.result.coverage.signalCount, 0);
});
