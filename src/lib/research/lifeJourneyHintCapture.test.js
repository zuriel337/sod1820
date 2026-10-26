import test from "node:test";
import assert from "node:assert/strict";
import {
  LIFE_JOURNEY_HINT_CAPTURE_CONTRACT,
  prepareLifeJourneyHintCapture,
  saveLifeJourneyHintCapture,
} from "./lifeJourneyHintCapture.js";

const SELF = "person:owner:self";
const CHILD = "person:owner:p:child";
const CAPTURE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("private hint capture keeps purpose, exact event date and only an authorized member ref", () => {
  const prepared = prepareLifeJourneyHintCapture({
    captureRef: CAPTURE,
    observation: "ראיתי את המספר שוב",
    question: "מה כדאי לבדוק?",
    occurredAt: "2026-10-26",
    memberRef: CHILD,
    number: "337",
    sourceUrl: "https://example.test/source",
    hintType: "sync",
  }, { personRef: SELF, authorizedMemberRefs: [SELF, CHILD] });
  assert.equal(prepared.ok, true);
  assert.equal(prepared.value.capture_contract, LIFE_JOURNEY_HINT_CAPTURE_CONTRACT);
  assert.equal(prepared.value.life_journey_member_ref, CHILD);
  assert.equal(prepared.value.occurred_at, "2026-10-26");
  assert.equal(prepared.value.date_precision, "day");
  assert.equal(prepared.value.number, 337);
});

test("capture rejects foreign people, ambiguous dates, unsafe links and missing purpose", () => {
  const base = { captureRef: CAPTURE, observation: "תצפית", question: "מה לבדוק?" };
  const options = { personRef: SELF, authorizedMemberRefs: [SELF] };
  assert.equal(prepareLifeJourneyHintCapture({ ...base, memberRef: "person:other:self" }, options).error, "unauthorized_member");
  assert.equal(prepareLifeJourneyHintCapture({ ...base, occurredAt: "2026-10" }, options).error, "invalid_event_date");
  assert.equal(prepareLifeJourneyHintCapture({ ...base, sourceUrl: "javascript:alert(1)" }, options).error, "invalid_source_url");
  assert.equal(prepareLifeJourneyHintCapture({ ...base, question: "" }, options).error, "missing_question");
});

test("save uses the existing private writer without local fallback and requires an exact receipt", async () => {
  const calls = [];
  const input = { captureRef: CAPTURE, observation: "תצפית", question: "מה לבדוק?", memberRef: SELF };
  const result = await saveLifeJourneyHintCapture({
    user: { id: "owner" }, input, personRef: SELF, authorizedMemberRefs: [SELF],
    writeHint: async (user, value, options) => {
      calls.push({ user, value, options });
      return { id: CAPTURE, ...value };
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls[0].options, { fallbackLocal: false });
  assert.equal(calls[0].value.note, "תצפית");

  const denied = await saveLifeJourneyHintCapture({
    user: { id: "owner" }, input, personRef: SELF, authorizedMemberRefs: [SELF],
    writeHint: async () => ({ id: CAPTURE, capture_ref: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
  });
  assert.deepEqual(denied, { ok: false, error: "invalid_write_receipt" });
});

test("validation fails before the writer is called", async () => {
  let calls = 0;
  const result = await saveLifeJourneyHintCapture({
    user: { id: "owner" },
    input: { captureRef: CAPTURE, observation: "", question: "שאלה" },
    personRef: SELF,
    authorizedMemberRefs: [SELF],
    writeHint: async () => { calls += 1; },
  });
  assert.equal(result.error, "missing_observation");
  assert.equal(calls, 0);
});

