import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildRazielSavedSessionEntity, razielSavedSessionState } from "../src/lib/research/razielSavedSession2029.js";
import { buildElsMatrixReadingSubmission } from "../src/lib/research/elsMatrixReadingSession.js";
import { selectElsMatrixReading } from "../src/lib/research/elsMatrixReadingPresentation.js";
import { applyResearchOps, emptyResearchState } from "../src/lib/research/researchSyncState.js";

const sample = () => JSON.parse(readFileSync(new URL("./fixtures/els-matrix-reading/card-examples/complete.json", import.meta.url), "utf8")).response;
const axis = { ...sample().axis, corpusId: "0b022e8eef6f9c16", hitId: "4545_1_248765" };
const context = { axis };
const state = (result = sample()) => ({ busy: false, contextSnapshot: { elsMatrixContext: context }, thread: [
  { role: "user", text: "קרא את המטריצה", turnId: "reading-1" },
  { role: "raziel", text: "תוצאת הסריקה", turnId: "reading-1", level: "deep", elsMatrixReading: result,
    continuation: { contextSnapshot: { elsMatrixContext: context } } },
] });
const save = value => buildRazielSavedSessionEntity(value, { now: () => "2026-10-29T12:00:00Z" });

test("explicit conversation save preserves structured findings and exact occurrence across JSON reload", () => {
  const original = sample();
  const built = save(state(original));
  assert.equal(built.ok, true);
  const restored = razielSavedSessionState(JSON.parse(JSON.stringify(built.entity)));
  const selected = selectElsMatrixReading(restored, axis);
  assert.ok(selected.result, "the current serializer loses the result on save");
  assert.equal(selected.active, false);
  assert.equal(selected.result.saved_snapshot, true);
  assert.deepEqual(selected.result.axis, original.axis);
  assert.deepEqual(selected.result.findings.map(f => [f.text, f.occurrence.start, f.occurrence.skip, f.verification.state]),
    original.findings.map(f => [f.text, f.occurrence.start, f.occurrence.skip, f.verification.state]));
  assert.deepEqual(selected.result.cost.ils, original.cost.ils);
  assert.equal(selected.result.is_test_fixture, true, "a saved fixture never becomes a live reading");
  assert.equal(selectElsMatrixReading(restored, { ...axis, start: axis.start + 1 }).result, null);
  assert.equal(save(restored).ok, true, "restored result can be explicitly saved again");
});

test("resume or cancel without a valid token never turns into a paid start", () => {
  for (const op of ["status", "cancel"]) for (const jobToken of [undefined, null, "", "short", "!".repeat(80)]) {
    const result = buildElsMatrixReadingSubmission({ context, op, jobToken });
    assert.equal(result.ok, false, `${op} must fail closed without a valid job token`);
    assert.equal(result.submission, undefined);
  }
  assert.equal(buildElsMatrixReadingSubmission({ context, op: "unknown" }).ok, false);
  const token = "T".repeat(886);
  assert.equal(buildElsMatrixReadingSubmission({ context, jobToken: token }).submission.elsMatrixReadingAction.op, "status");
  assert.equal(buildElsMatrixReadingSubmission({ context, op: "status", jobToken: token }).submission.elsMatrixReadingAction.job_token, token);
});

test("the existing library holds a bounded projection, never tokens, raw grids or provider payloads", () => {
  const reading = sample();
  const secret = "secret-that-must-not-be-saved";
  reading.job.token = secret;
  reading.coverage.raw_grid = secret;
  reading.provider.authorization = secret;
  reading.output = { raw: secret };
  reading.request.body = secret;
  reading.findings[0].verification.engine.token = secret;
  reading.findings[0].model_claims.raw_thinking = secret;
  const built = save(state(reading));
  assert.equal(built.ok, true);
  const library = applyResearchOps(emptyResearchState(), [{ kind: "item_upsert", bucket: "library", entity: built.entity }]);
  assert.equal(library.saved.length, 1);
  assert.doesNotMatch(JSON.stringify(library.saved[0]), /secret-that-must-not-be-saved|raw_grid|raw_thinking/);
  const restored = razielSavedSessionState(library.saved[0]);
  assert.equal(restored.thread.at(-1).elsMatrixReading.findings.length, reading.findings.length);
});

test("missing/mismatched receipts never become verified, ordinary text stays ordinary, incomplete findings are hidden", () => {
  const reading = sample();
  delete reading.findings[0].verification.engine;
  reading.findings[1].verification.engine.corpus_id = "another-corpus";
  reading.findings[2].verification.state = "NOT_VERIFIED";
  reading.findings[3].verification.state = "PLAIN_TEXT_ONLY";
  reading.findings[3].occurrence.skip = 1;
  reading.findings[4].verification.occurrences_verified = "1";
  reading.findings[5].verification.engine.occurrence_id = true;
  const saved = save(state(reading)).entity.thread.at(-1).elsMatrixReading;
  assert.deepEqual(saved.findings.slice(0, 4).map(f => f.verification.state), ["NOT_VERIFIED", "NOT_VERIFIED", "NOT_VERIFIED", "PLAIN_TEXT_ONLY"]);
  assert.deepEqual(saved.findings.slice(4, 6).map(f => f.verification.state), ["NOT_VERIFIED", "NOT_VERIFIED"]);
  const incomplete = save(state({ ...sample(), state: "INCOMPLETE", reason: "max_tokens", continuation_required: true }));
  assert.equal(incomplete.ok, true);
  assert.deepEqual(incomplete.entity.thread.at(-1).elsMatrixReading.findings, []);
  assert.equal(incomplete.entity.thread.at(-1).elsMatrixReading.state, "INCOMPLETE");
});

test("wrong occurrence, oversized list and unknown result state fail instead of losing or misattributing results", () => {
  const reading = sample();
  assert.equal(save(state({ ...reading, axis: { ...reading.axis, start: reading.axis.start + 1 } })).ok, false);
  assert.equal(save(state({ ...reading, findings: Array(61).fill(reading.findings[0]) })).ok, false);
  assert.equal(save(state({ ...reading, state: "made-up" })).ok, false);
  assert.equal(save(state({ ...reading, findings: [null] })).ok, false);
  const huge = state(reading);
  huge.thread = Array.from({ length: 20 }, (_, i) => huge.thread.map(m => ({ ...m, turnId: `t${i}` }))).flat();
  assert.equal(save(huge).error, "session_too_large", "same 180KB/UTF-8 library budget, not silently truncated");
});

test("saved unfinished tracking is historical, token-free and cannot be treated as a resumable job", () => {
  const built = save(state({ ...sample(), state: "RUNNING", job: { token: "T".repeat(886) }, poll_interrupted: { can_resume: true } }));
  assert.equal(built.ok, true);
  const restored = razielSavedSessionState(JSON.parse(JSON.stringify(built.entity)));
  const result = selectElsMatrixReading(restored, axis).result;
  assert.equal(result.tracking_unavailable, true);
  assert.equal(result.job.token, undefined);
  assert.equal(result.poll_interrupted, undefined);
  assert.deepEqual(result.findings, []);
  assert.equal(save(restored).entity.thread.at(-1).elsMatrixReading.tracking_unavailable, true);
  assert.equal(save({ ...state(), busy: true }).error, "session_pending", "saving an active job is still forbidden");
});
