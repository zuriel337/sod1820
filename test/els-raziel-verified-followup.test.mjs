import test from "node:test";
import assert from "node:assert/strict";
import { buildElsRazielSurfaceContext } from "../src/lib/research/elsRazielContext.js";
import { normalizeRazielResponse, prepareRazielSessionSubmission } from "../src/lib/research/razielSessionRequest2029.js";
import { createInitialRazielSessionState } from "../src/lib/research/razielSession2029.js";
import { buildRazielSavedSessionEntity, razielSavedSessionState } from "../src/lib/research/razielSavedSession2029.js";
import { runAiAnalyze, UID, OTHER_UID, USER_JWT } from "./helpers/ai-analyze-handler.mjs";
import { askRaziel, supabase } from "../src/lib/supabase.js";

// All data/identities/engine/provider answers below are synthetic. No network or live model.
const corpusId = "a".repeat(32), jobId = "12345678-1234-4234-8234-123456789abc";
const axis = { term: "חנוכה", scope: "torah", corpusId, skip: 31, start: 77, dir: 1 };
const storedAxis = { ...axis, corpus_id: corpusId, verification_state: "MATCH" };
const sourceContext = () => buildElsRazielSurfaceContext({
  includeText: true, researchContext: { lens: "els", selection: { corpus: "torah" } },
  projection: { term: axis.term, corpusId, contract: "els_2029_projection_v1", status: "OK",
    presentation: { policy: "exact_replay_v1" }, selectedOccurrence: { ...axis, occurrenceId: "fixture-axis", end: 201 } },
});
const finding = () => ({ id: "fixture-finding", text: "חכמה", occurrence: { start: 94, skip: 30, dir: 1, length: 4 },
  verification: { state: "ENGINE_VERIFIED", letters_match: true, occurrences_verified: 1,
    engine: { verification_state: "MATCH", contract: "els_occurrence_replay_v1", corpus_id: corpusId, occurrence_id: "fixture-replay" } },
  model_claims: { note: "PRIVATE-REASONING-MUST-NOT-TRAVEL" } });
const reading = () => ({ contract: "els_matrix_reading_v1", state: "COMPLETE", axis: storedAxis,
  provider: { kind: "anthropic_live", live_model_call: true }, is_test_fixture: false, job: { id: jobId },
  findings: [finding()], cap: { reached: true }, coverage: { rows: { from: 0, to: 32, count: 33 }, cols: { from: 0, to: 20, count: 21 } } });
const completedState = () => ({ ...createInitialRazielSessionState(), thread: [
  { role: "user", text: "סריקה", turnId: "reading-turn" },
  { role: "raziel", turnId: "reading-turn", text: "פתיח בלבד. ".repeat(30) + "חכמה", elsMatrixReading: reading() },
] });
const prepare = (state = createInitialRazielSessionState(), focus = sourceContext()) => prepareRazielSessionSubmission({
  question: "הסבר את הממצאים במופע הנבחר", facts: "CLIENT-FACT-MUST-NOT-TRAVEL", state,
  researchContext: { lens: "els" }, view: { surface: "els", elsFocus: focus }, createTurnId: () => "question-turn",
});
const body = submission => ({ kind: "research", persona: "raziel", subject: submission.request.subject,
  facts: submission.request.facts, context: submission.request.context, surface_semantic: submission.request.surfaceSemantic,
  research_contract: submission.request.researchContract });
const job = () => ({ id: jobId, owner_id: UID, state: "COMPLETE", snapshot: { axis: storedAxis }, result: reading() });
async function run(submission, overrides = {}) {
  return runAiAnalyze({ allowed: true, bearer: USER_JWT, verifiedUid: UID, elsVerifyStatus: "match", body: body(submission),
    extraRoute: ({ url, payload }) => {
      if (url.pathname.endsWith("/els_matrix_reading_job_get_v1")) {
        assert.equal(payload.p_owner_id, UID);
        assert.equal(payload.p_job_id, jobId);
        return new Response(JSON.stringify({ job: job() }));
      }
    }, ...overrides });
}

test("ordinary explicit ELS question preserves phrase/scope and replays the axis exactly once, with no scan", async () => {
  const submission = prepare();
  assert.equal(submission.request.surfaceSemantic.els.term, axis.term);
  assert.equal(submission.request.surfaceSemantic.els.grounding, "canonical_replay_v1");
  assert.equal(submission.request.elsMatrixReadingAction, undefined);
  assert.equal(submission.request.elsMatrixContext, undefined, "do not invent a grid for an occurrence-only question");
  assert.equal(submission.request.facts, "");
  const result = await run(submission);
  assert.equal(result.models.length, 1);
  assert.equal(result.calls.filter(call => call.name === "els-search-bridge").length, 1);
  assert.equal(result.calls.some(call => /els_matrix_reading_job_|batches/u.test(call.url)), false);
  assert.match(result.models[0].user, /חנוכה.*torah.*דילוג 31.*התחלה 77/u);
  assert.match(result.models[0].user, /לא צורפה מפת אותיות/u);
  assert.equal(JSON.stringify(result.models).includes("CLIENT-FACT"), false);
  assert.deepEqual(result.result.els_occurrence_context, { status: "verified", axis, readingJobId: null });
  assert.deepEqual(result.result.raziel.sources, ["מנוע ELS הקנוני · אימות אותיות ומיקומים בלבד"]);
  assert.match(result.result.raziel.answer, /האימות מאשר אותיות ומיקומים, לא את משמעות ההסבר/u);
});

test("axis end comes only from canonical replay, not the client; long ordinary axes need no matrix-reading window", async () => {
  const focus = sourceContext(); focus.occurrence.end = 999999;
  const result = await run(prepare(undefined, focus), { extraRoute: ({ url, payload }) => {
    if (!url.pathname.endsWith("/els-search-bridge")) return;
    return new Response(JSON.stringify({ result: { status: "OK", corpus_id: corpusId,
      verified: [{ ...payload.candidates[0], end: 201 }] } }));
  } });
  assert.match(result.models[0].user, /סיום 201/u);
  assert.equal(result.models[0].user.includes("999999"), false);
  assert.equal(prepare(undefined, { ...axis, term: "אב".repeat(20), grounding: "canonical_replay_v1" }).request.surfaceSemantic.els.grounding,
    "canonical_replay_v1");
});

test("follow-up reads bounded verified findings from the owned job, never from truncated text or client payload", async () => {
  const state = completedState();
  state.thread[1].elsMatrixReading.findings = [{ text: "CLIENT-FORGED" }];
  const submission = prepare(state);
  assert.equal(submission.request.surfaceSemantic.els.readingJobId, jobId);
  assert.equal(JSON.stringify(submission.request).includes("CLIENT-FORGED"), false);
  const result = await run(submission);
  assert.equal(result.models.length, 1);
  assert.match(result.models[0].user, /חכמה/u);
  assert.equal(result.result.els_occurrence_context.readingJobId, jobId);
  assert.ok(result.result.raziel.facts.some(fact => fact.value.includes("חכמה")));
  assert.equal(JSON.stringify(result.models).includes("PRIVATE-REASONING"), false);
  assert.equal(result.calls.filter(call => call.name === "els_matrix_reading_job_get_v1").length, 1);
  assert.equal(result.calls.some(call => /batches|job_claim|job_finish|job_cost/u.test(call.url)), false);
});

test("selection B does not inherit reading A, including same coordinates with different phrase/corpus/scope", () => {
  for (const patch of [{ start: 78 }, { term: "חכמה" }, { corpusId: "b".repeat(32) }, { scope: "tanakh" }, { dir: -1 }, { skip: 32 }]) {
    const focus = { ...axis, ...patch, occurrenceRef: "fixture-B", grounding: "canonical_replay_v1" };
    assert.equal(prepare(completedState(), focus).request.surfaceSemantic.els.readingJobId, undefined);
  }
});

test("a stale open companion is refused after a different occurrence is selected", () => {
  const submission = prepareRazielSessionSubmission({ question: "הסבר את המופע", state: completedState(),
    researchContext: { lens: "els", selection: { entityType: "els", term: axis.term, corpus: axis.scope, start: 78, skip: axis.skip, dir: axis.dir } },
    view: { elsFocus: sourceContext() }, createTurnId: () => "stale" });
  assert.equal(submission, null, "no transport/model request for an ambiguous current occurrence");
});

test("bounded history trimming retains the same-axis job reference, not the entire old answer", () => {
  const first = prepare(completedState());
  const state = { ...createInitialRazielSessionState(), contextSnapshot: first.contextSnapshot,
    thread: Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? "raziel" : "user", text: "שיחה קצרה" })) };
  assert.equal(prepare(state).request.surfaceSemantic.els.readingJobId, jobId);
});

test("saved conversation restoration retains exact occurrence and job reference for subsequent questions", () => {
  const state = completedState(), prepared = prepare(state);
  // Existing saved-reading projection requires the original matrix axis in the reading turn.
  const matrixContext = { contract: "els_matrix_presentation_context_v1", axis: { ...axis, hitId: "31_1_77" },
    matrix: { width: 31, rowStart: 0, colStart: 0, rows: ["אבגד"] } };
  state.thread[1].continuation = { contextSnapshot: { ...prepared.contextSnapshot, elsMatrixContext: matrixContext }, facts: "", viewMode: "general" };
  const saved = buildRazielSavedSessionEntity({ ...state, contextSnapshot: prepared.contextSnapshot },
    { now: () => "2026-10-31T08:00:00Z", createId: () => "fixture-session" });
  assert.equal(saved.ok, true);
  const restored = razielSavedSessionState(saved.entity);
  assert.equal(restored.contextSnapshot.focus.els.readingJobId, jobId);
  const next = prepare(restored, restored.contextSnapshot.focus.els);
  assert.equal(next.request.surfaceSemantic.els.readingJobId, jobId);
  assert.equal(next.request.surfaceSemantic.els.start, axis.start);
});

test("unverified occurrence is never promoted by the client, and a forged server claim fails canonical replay", async () => {
  const focus = sourceContext(); focus.result.status = "UNVERIFIED";
  assert.equal(prepare(undefined, focus).request.surfaceSemantic.els.grounding, undefined);
  const result = await run(prepare(), { elsVerifyStatus: "mismatch" });
  assert.equal(result.models.length, 0);
  assert.equal(result.result.error, "els_matrix_axis_unverified");
});

for (const [label, mutate] of [
  ["other owner", j => { j.owner_id = OTHER_UID; }],
  ["other axis", j => { j.result.axis = { ...j.result.axis, start: 78 }; }],
  ["other snapshot", j => { j.snapshot.axis = { ...j.snapshot.axis, corpus_id: "b".repeat(32) }; }],
  ["incomplete", j => { j.result.state = "INCOMPLETE"; }],
  ["fixture", j => { j.result.is_test_fixture = true; }],
  ["not live", j => { j.result.provider.kind = "test_double"; }],
  ["oversized", j => { j.result.findings = Array.from({ length: 61 }, finding); }],
  ["missing", () => null],
]) test(`reading ${label} fails closed before any model call`, async () => {
  const result = await run(prepare(completedState()), { extraRoute: ({ url }) => {
    if (!url.pathname.endsWith("/els_matrix_reading_job_get_v1")) return;
    const value = job(), returned = mutate(value);
    return new Response(JSON.stringify({ job: returned === null ? null : value }));
  } });
  assert.equal(result.models.length, 0);
  assert.equal(result.result.error, "els_reading_context_unavailable");
});

test("plain source text is distinguished, unverified/invalid receipts are omitted", async () => {
  const value = job();
  const plain = { ...finding(), id: "plain", text: "אורה", occurrence: { start: 40, skip: 1, dir: 1, length: 4 },
    verification: { state: "PLAIN_TEXT_ONLY", letters_match: true } };
  const bad = finding(); bad.id = "bad"; bad.text = "סתרי"; bad.verification.engine.corpus_id = "b".repeat(32);
  value.result.findings.push(plain, bad);
  const result = await run(prepare(completedState()), { extraRoute: ({ url }) => url.pathname.endsWith("/els_matrix_reading_job_get_v1")
    ? new Response(JSON.stringify({ job: value })) : undefined });
  assert.equal(result.models.length, 1);
  assert.match(result.models[0].user, /PLAIN_TEXT_ONLY/u);
  assert.equal(result.models[0].user.includes("סתרי"), false);
  assert.equal(result.result.raziel.facts.find(fact => fact.value.includes("אורה")).label, "רצף מקור");
});

test("no private job lookup for anonymous identity; no model or private read before availability", async () => {
  const submission = prepare(completedState());
  for (const options of [{ verifiedUid: null, bearer: "" }, { siteAllowed: false }]) {
    const result = await run(submission, options);
    assert.equal(result.models.length, 0);
    assert.equal(result.calls.some(call => call.name === "els_matrix_reading_job_get_v1"), false);
  }
});

test("actual askRaziel transport requires the matching server receipt, including the reading identity", async () => {
  const submission = prepare(completedState());
  let invoked = 0;
  const real = await run(submission);
  const answer = structuredClone(real.result);
  Object.defineProperty(supabase, "functions", { configurable: true, value: { invoke: async (name, options) => {
    invoked++;
    assert.equal(name, "ai-analyze");
    assert.equal(options.body.surface_semantic.els.readingJobId, jobId);
    assert.equal(options.body.els_matrix_reading_action, undefined);
    return { data: answer, error: null };
  } } });
  const reply = await askRaziel(submission.request);
  assert.ok(reply);
  assert.deepEqual(normalizeRazielResponse(reply).sourceNames, ["מנוע ELS הקנוני · אימות אותיות ומיקומים בלבד"],
    "the existing conversation source label acknowledges canonical replay, not verified interpretation");
  assert.equal(invoked, 1);
  answer.els_occurrence_context.readingJobId = null;
  assert.equal(await askRaziel(submission.request), null, "an axis-only response cannot stand in for reading context");
  answer.els_occurrence_context.readingJobId = jobId;
  answer.els_occurrence_context.axis.start++;
  assert.equal(await askRaziel(submission.request), null, "wrong occurrence receipt");
  delete answer.els_occurrence_context;
  assert.equal(await askRaziel(submission.request), null, "an old deployment that ignores the reference fails closed");
});
