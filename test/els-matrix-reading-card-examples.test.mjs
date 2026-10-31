import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { buildCardExamples } from "./helpers/els-matrix-reading-card-examples.mjs";
import { elsMatrixReadingPhase, isLiveFableReading } from "../supabase/functions/_shared/elsMatrixReadingAction.js";

const dir = new URL("./fixtures/els-matrix-reading/card-examples/", import.meta.url);
const committed = (name) => JSON.parse(readFileSync(new URL(name, dir), "utf8"));

test("the committed card examples are exactly what the code produces today (the examples cannot drift from the contract)", async () => {
  const fresh = await buildCardExamples();
  const names = Object.keys(fresh).sort();
  assert.deepEqual(readdirSync(dir).sort(), names, "no stale or missing example file");
  for (const name of names) assert.deepEqual(committed(name), JSON.parse(JSON.stringify(fresh[name])), name);
});

test("every example is test data: flagged as such, from a test double, and none passes for a live Fable reading", () => {
  for (const name of readdirSync(dir)) {
    const example = committed(name);
    assert.equal(example._fixture.is_test_fixture, true, name);
    if (name === "session-progress.json") continue;
    assert.equal(example.response.contract, "els_matrix_reading_v1", name);
    assert.equal(example.response.is_test_fixture, true, name);
    assert.equal(example.response.provider.kind, "test_double", name);
    assert.equal(example.response.provider.live_model_call, false, name);
    assert.equal(isLiveFableReading(example.response), false, name);
  }
});

test("the examples cover every state a card must draw, with the facts a card must show", () => {
  const phase = (name) => elsMatrixReadingPhase(committed(name).response);
  assert.deepEqual(["preview", "running-start", "running-poll", "complete", "incomplete-max-tokens", "failed-batch-errored", "cancel-requested", "refused-admin-only", "refused-not-enabled"].map((n) => phase(`${n}.json`).phase),
    ["preview", "running", "running", "complete", "incomplete", "failed", "cancelling", "refused", "refused"]);
  const preview = committed("preview.json").response;
  assert.ok(preview.estimate.upper_bound_usd > 0 && preview.estimate.upper_bound_ils.status === "ESTIMATED" && preview.coverage.cells > 0 && preview.model.verified_available === true);
  assert.ok(preview.estimate.truncation_evidence.length > 0);
  const start = committed("running-start.json").response;
  assert.ok(start.job.id.length === 36 && start.job.poll_after_seconds === 20 && start.progress.expected_minutes.max === 13);
  assert.equal(start.job.token, undefined, "new jobs never expose bearer material to the client");
  assert.equal(committed("running-poll.json").response.job.token, undefined, "status answers do not echo the token: the transport keeps it");
  const complete = committed("complete.json");
  assert.ok(complete.response.cost.usd > 0 && complete.response.cost.ils.status === "ESTIMATED" && complete.response.timing.elapsed_ms > 0);
  assert.match(complete.response.cap.meaning, /not proof/);
  assert.equal(complete.thread_message_reading_state, "COMPLETE");
  assert.match(complete.raziel_answer, /לא חויבו קרדיטים; החזר אוטומטי לא נבדק ואינו מובטח/);
  assert.doesNotMatch(complete.raziel_answer, /יוחזר|הוחזר|זוכה/);
});

test("a cut-off answer shows no findings but keeps the incurred cost; a refusal shows no spend", () => {
  const cut = committed("incomplete-max-tokens.json").response;
  assert.deepEqual([cut.state, cut.reason, cut.continuation_required, cut.findings.length], ["INCOMPLETE", "max_tokens", true, 0]);
  assert.ok(cut.cost.usd > 1.6);
  assert.match(committed("incomplete-max-tokens.json").raziel_answer, /הקריאה לא הושלמה/);
  const refused = committed("refused-admin-only.json").response;
  assert.deepEqual([refused.ok, refused.state, refused.error, refused.cost], [false, "REFUSED", "admin_only", undefined]);
  const failed = committed("failed-batch-errored.json").response;
  assert.deepEqual([failed.state, failed.reason, failed.cost.usd], ["FAILED_WITH_REASON", "batch_errored", null]);
});

test("the session keeps progress as display state: phase, time, provider status and the references to resume with", () => {
  const { progress_examples: examples, current_turn_after_turn_progress: turn, announcement } = committed("session-progress.json");
  assert.deepEqual(examples.map((p) => p.phase), ["starting", "running", "cancelling"]);
  assert.ok(examples[1].jobId && !examples[1].jobToken && examples[1].batchId && examples[1].providerStatus === "in_progress");
  assert.equal(turn.progress.phase, "running");
  assert.match(announcement, /קריאת המטריצה רצה אצל הספק/);
});
