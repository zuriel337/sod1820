import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildRazielSavedSessionEntity, razielSavedSessionState } from "../src/lib/research/razielSavedSession2029.js";
import { buildElsMatrixReadingSubmission } from "../src/lib/research/elsMatrixReadingSession.js";
import { selectElsMatrixReading } from "../src/lib/research/elsMatrixReadingPresentation.js";
import { applyResearchOps, emptyResearchState } from "../src/lib/research/researchSyncState.js";
import { captureElsResearchReturn } from "../src/lib/research/elsResearchReturnSnapshot.js";
import { elsMatrixReadingReturnLoad, selectElsMatrixReadingActivity } from "../src/lib/research/elsMatrixReadingActivity.js";

const sample = () => JSON.parse(readFileSync(new URL("./fixtures/els-matrix-reading/card-examples/complete.json", import.meta.url), "utf8")).response;
const axis = { ...sample().axis, corpusId: "0b022e8eef6f9c16", hitId: "4545_1_248765" };
const context = { contract: "els_matrix_presentation_context_v1", axis,
  matrix: { width: 4545, rowStart: 54, colStart: 3300, rows: ["אבגד"] } };
const state = (result = sample()) => ({ busy: false, contextSnapshot: { elsMatrixContext: context }, thread: [
  { role: "user", text: "קרא את המטריצה", turnId: "reading-1" },
  { role: "raziel", text: "תוצאת הסריקה", turnId: "reading-1", level: "deep", elsMatrixReading: result,
    continuation: { contextSnapshot: { elsMatrixContext: context } } },
] });
const save = value => buildRazielSavedSessionEntity(value, { now: () => "2026-10-29T12:00:00Z" });

function withReturnWindow(windowSize = "legacy") {
  const value = state();
  value.thread.at(-1).elsReturnSnapshot = captureElsResearchReturn({
    status: "ok", term: axis.term, termRaw: axis.term, scope: axis.scope,
    verification: { state: "MATCH", corpus_id: axis.corpusId },
    axis: { ...axis, length: axis.term.length, occurrence_id: `els:${axis.corpusId}:${axis.term}:4545:1:248765` },
    geometry: { cw: 80 },
    ui: { ctxR: 3, windowSize, windowRequested: windowSize, zoom: 1.3, fit: false, heat: true, niqqud: true, showN: 2, findingRadius: null },
    findings: [{ t: "חללנהל", color: "#112233", shown: ["1514_1_254827"],
      sourceHits: [{ selected: true, hitId: "1_1_248765" }] }],
  }, { kind: "row-spacing", width: 1515, rowGap: 2, r0: 161, r1: 189, c0: 245, c1: 365 });
  return value;
}

test("saved old and native windows retain exact return, folded geometry and selections after JSON reload", () => {
  for (const windowSize of ["legacy", "small", "medium", "large"]) {
    const original = withReturnWindow(windowSize), snapshot = original.thread.at(-1).elsReturnSnapshot;
    const built = save(original);
    assert.equal(built.ok, true, windowSize);
    const restored = razielSavedSessionState(JSON.parse(JSON.stringify(built.entity)));
    // A newly displayed matrix does not own this saved result or its return target.
    restored.contextSnapshot = { elsMatrixContext: { axis: { ...axis, start: axis.start + 1 } } };
    const load = elsMatrixReadingReturnLoad(restored, "reading-1");
    assert.equal(load.start, axis.start);
    assert.equal(load.skip, 4545);
    assert.equal(load.occurrenceId, snapshot.axis.occurrenceId);
    assert.equal(load.corpusId, axis.corpusId);
    assert.deepEqual(load.matrixProjection, snapshot.matrixProjection);
    assert.deepEqual(load.searchWindow, snapshot.searchWindow);
    assert.deepEqual(load.view, snapshot.view);
    assert.deepEqual(load.words, [{ t: "חללנהל", color: "#112233", sh: ["1514_1_254827"], sourceShown: ["1_1_248765"] }]);
    assert.equal(selectElsMatrixReadingActivity(restored).hasReturnSnapshot, true);
    assert.equal(save(restored).ok, true);
  }
});

test("damaged optional return metadata cannot hide a saved reading; new saves still reject it", () => {
  const original = withReturnWindow("small"), snapshot = original.thread.at(-1).elsReturnSnapshot;
  const built = save(original);
  for (const broken of [
    {}, { ...snapshot, axis: null }, { ...snapshot, axis: undefined },
    { ...snapshot, corpusId: "another-corpus" },
    { ...snapshot, axis: { ...snapshot.axis, start: axis.start + 1 } },
    { ...snapshot, axis: { ...snapshot.axis, hitId: "4545_1_248766" } },
    { ...snapshot, searchWindow: { ...snapshot.searchWindow, windowSize: "unknown" } },
    { ...snapshot, matrixProjection: { ...snapshot.matrixProjection, width: 1516 } },
  ]) {
    const damaged = JSON.parse(JSON.stringify(built.entity));
    damaged.thread.at(-1).elsReturnSnapshot = broken;
    const restored = razielSavedSessionState(damaged);
    assert.ok(restored, "valid conversation and reading must remain readable");
    assert.equal(restored.thread.at(-1).elsReturnSnapshot, undefined);
    assert.deepEqual(restored.thread.at(-1).elsMatrixReading, built.entity.thread.at(-1).elsMatrixReading);
    assert.equal(Boolean(selectElsMatrixReadingActivity(restored).hasReturnSnapshot), false);
    const load = elsMatrixReadingReturnLoad(restored, "reading-1");
    assert.deepEqual([load.corpusId, load.hitId, load.start], [axis.corpusId, axis.hitId, axis.start]);
    assert.deepEqual(load.words, []);
    assert.equal(load.view, undefined, "limited return cannot claim to restore the damaged view");
    assert.equal(load.matrixProjection, undefined);
    assert.equal(restored.busy, false);
    assert.equal(restored.currentTurn, null);
    assert.equal(save(restored).ok, true, "explicitly saving the recovered conversation is supported");
    assert.equal(save({ ...original, thread: damaged.thread }).ok, false, "new invalid navigation is not silently saved");
  }
});

test("return recovery never accepts a reading assigned to a different occurrence or corpus", () => {
  const built = save(withReturnWindow("small"));
  for (const patch of [{ start: axis.start + 1 }, { corpus_id: "another-corpus" }]) {
    const damaged = JSON.parse(JSON.stringify(built.entity));
    Object.assign(damaged.thread.at(-1).elsMatrixReading.axis, patch);
    damaged.thread.at(-1).elsReturnSnapshot = {};
    assert.equal(razielSavedSessionState(damaged), null);
  }
});

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
