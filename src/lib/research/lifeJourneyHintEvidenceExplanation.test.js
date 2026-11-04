import test from "node:test";
import assert from "node:assert/strict";
import { runLifeJourneyHintInvestigation } from "./lifeJourneyHintInvestigation.js";
import {
  buildLifeJourneyHintEvidenceExplanation,
  LIFE_JOURNEY_HINT_EXPLANATION_CONTRACT,
  LIFE_JOURNEY_HINT_EXPLANATION_FACT_LIMIT,
  requestLifeJourneyHintEvidenceExplanation,
} from "./lifeJourneyHintEvidenceExplanation.js";

async function checkedResult() {
  const privateValues = {
    name: "ילד פרטי מאוד",
    memberRef: "person:owner:p:secret-child",
    date: "2026-10-26",
    narrative: "סיפור פרטי שאסור לשלוח",
    question: "שאלה פרטית שאסור לשלוח",
  };
  const outcome = await runLifeJourneyHintInvestigation({
    hint: { id: "hint-secret", occurred_at: privateValues.date, number: 337, life_journey_member_ref: privateValues.memberRef, note: privateValues.narrative, research_question: privateValues.question },
    members: [{ source_ref: privateValues.memberRef, name: privateValues.name }],
    selectedRefs: [privateValues.memberRef],
    birthTimeline: [{ memberRef: privateValues.memberRef, dateIso: "2020-03-04" }],
    research: { state: "ready", methodFindings: [{ memberRef: privateValues.memberRef, expressionLabel: "שם", methodLabel: "רגיל", value: 337 }] },
    readers: { readNumber: async () => [{ bid_id: "source-1", phrase: "אור", method: "רגיל", value: 337, method_governed: true }] },
  });
  return { result: outcome.result, privateValues };
}

test("evidence explanation pack is bounded and strips private hint, identity and exact dates", async () => {
  const { result, privateValues } = await checkedResult();
  const built = buildLifeJourneyHintEvidenceExplanation(result);
  assert.equal(built.ok, true);
  assert.equal(built.submission.contract, LIFE_JOURNEY_HINT_EXPLANATION_CONTRACT);
  assert.ok(built.submission.facts.length <= LIFE_JOURNEY_HINT_EXPLANATION_FACT_LIMIT);
  assert.match(built.submission.facts, /confirmed_number=337/);
  assert.match(built.submission.facts, /canonical_source_match_1=.*אור/);
  assert.match(built.submission.facts, /evidence:value_match/);
  for (const value of Object.values(privateValues)) assert.equal(JSON.stringify(built).includes(value), false, `${value} stays outside the model submission`);
  assert.equal(JSON.stringify(built).includes(result.hintRef), false);
  assert.equal(JSON.stringify(built).includes(result.date.representation.hebrewDate), false);
});

test("only an approved bounded-check contract can become an explanation request", () => {
  assert.equal(buildLifeJourneyHintEvidenceExplanation(null).error, "checked_evidence_required");
  assert.equal(buildLifeJourneyHintEvidenceExplanation({ contract: "other" }).error, "checked_evidence_required");
  assert.equal(buildLifeJourneyHintEvidenceExplanation({ contract: "life_journey_hint_bounded_checks_v1", boundaries: { no_raw_hint_text_sent: false, no_ai: true } }).error, "unsafe_evidence_boundary");
});

test("explicit request opens the existing Raziel surface and uses its one submit", async () => {
  const { result } = await checkedResult();
  const built = buildLifeJourneyHintEvidenceExplanation(result);
  const calls = [];
  const response = await requestLifeJourneyHintEvidenceExplanation({
    submission: built.submission,
    openRaziel: payload => calls.push(["open", payload]),
    submit: async payload => { calls.push(["submit", payload]); return { ok: true, response: { answer: "פענוח" } }; },
  });
  assert.equal(response.ok, true);
  assert.deepEqual(calls.map(call => call[0]), ["open", "submit"]);
  assert.equal(calls[1][1], built.submission);
});

test("locked or unavailable Raziel fails before opening or submitting", async () => {
  let calls = 0;
  const submission = { contract: LIFE_JOURNEY_HINT_EXPLANATION_CONTRACT, view: {} };
  const locked = await requestLifeJourneyHintEvidenceExplanation({ submission, locked: true, openRaziel: () => { calls += 1; }, submit: () => { calls += 1; } });
  const unavailable = await requestLifeJourneyHintEvidenceExplanation({ submission });
  assert.equal(locked.error, "raziel_locked");
  assert.equal(unavailable.error, "raziel_unavailable");
  assert.equal(calls, 0);
});
