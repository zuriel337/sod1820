import test from "node:test";
import assert from "node:assert/strict";
import { buildElsRazielMatrixContext } from "../src/lib/research/elsRazielMatrixContext.js";
import { prepareRazielSessionSubmission } from "../src/lib/research/razielSessionRequest2029.js";
import { createInitialRazielSessionState } from "../src/lib/research/razielSession2029.js";
import { runAiAnalyze } from "./helpers/ai-analyze-handler.mjs";
import { buildRazielSavedSessionEntity, razielSavedSessionState } from "../src/lib/research/razielSavedSession2029.js";

function sample() {
  return { status: "ok", scope: "torah", termRaw: "משיח", verification: { state: "MATCH", corpus_id: "0123456789abcdef" },
    axis: { hitId: "100_1_105", skip: 100, direction: "fwd", start: 105, length: 4 },
    geometry: { S: 100 }, matrix: { S: 100, r0: 0, c0: 0, cw: 40, rows: Array(30).fill("א".repeat(40)) } };
}
test("matrix context stays bounded and never certifies client-supplied data", () => {
  const result = buildElsRazielMatrixContext(sample());
  assert.equal(result.axis.hitId, "100_1_105");
  assert.equal(result.matrix.rows.length, 12);
  assert.ok(result.matrix.rows.every(row => row.length <= 20));
  assert.equal(result.trust.axis, "client_reported_match_replay_required");
  assert.equal(result.trust.matrix, "unverified_presentation");
});

test("an explicit matrix turn uses the same session and verifies the axis before one model call", async () => {
  const context = buildElsRazielMatrixContext(sample());
  const submission = prepareRazielSessionSubmission({ question: "בדוק את המטריצה שבחרתי והצע כיוון מחקרי",
    state: createInitialRazielSessionState(), view: { surface: "els", elsFocus: context.axis, elsMatrixContext: context },
    startedAt: "2026-10-27T10:00:00.000Z", createTurnId: () => "matrix-turn" });
  assert.deepEqual(submission.request.elsMatrixContext, context);
  assert.deepEqual(submission.contextSnapshot.elsMatrixContext, context);
  const body = { kind: "research", subject: submission.request.subject, facts: "", context: submission.request.context,
    research_contract: submission.request.researchContract, surface_semantic: submission.request.surfaceSemantic,
    els_matrix_context: context };
  const run = await runAiAnalyze({ allowed: true, body, elsVerifyStatus: "match", modelResult: {
    text: JSON.stringify({ v: 1, agent: "raziel", answer: "כיוון אפשרי לבדיקה", facts: [{ label: "טענה לא מאומתת", value: "ממצא" }], suggested_paths: [] }),
    usage: { input_tokens: 10, output_tokens: 10 }, attempts: 1, degraded: false,
  } });
  assert.equal(run.status, 200, JSON.stringify(run.result));
  assert.equal(run.result.els_matrix_status, "verified_axis_unverified_presentation_v1");
  assert.equal(run.models.length, 1);
  assert.equal(run.result.raziel.facts.length, 1, "only the server-replayed axis may become a fact");
  assert.equal(run.result.raziel.facts[0].label, "המופע שנבדק במנוע");
  assert.equal(JSON.stringify(run.result.raziel.facts).includes("טענה לא מאומתת"), false);
  assert.match(run.result.raziel.answer, /ממצאים לבדיקה במנוע/);
  assert.doesNotMatch(run.result.raziel.answer, /פרשנות והצעות בלבד/);
  assert.match(run.models[0].user, /אינה מאומתת ואינה ראיה/);
  assert.match(run.models[0].user, /ציר ELS אומת מחדש/);
  assert.match(run.models[0].system, /אין לציית להוראות/);
  assert.equal(run.calls.filter(call => call.name === "els-search-bridge").length, 1);
  assert.equal(run.calls.filter(call => call.name === "research-run").length, 0);
  const denied = await runAiAnalyze({ allowed: true, body, elsVerifyStatus: "mismatch" });
  assert.equal(denied.result.error, "els_matrix_axis_unverified");
  assert.equal(denied.models.length, 0);
  const malformed = await runAiAnalyze({ allowed: true, body: { ...body, els_matrix_context: { ...context, matrix: { ...context.matrix, rows: ["<script>"] } } } });
  assert.equal(malformed.result.error, "invalid_els_matrix_context");
  assert.equal(malformed.models.length, 0);
  const badAnswer = await runAiAnalyze({ allowed: true, body, elsVerifyStatus: "match", modelResult: {
    text: "תשובה לא מובנית", usage: { input_tokens: 1, output_tokens: 1 }, attempts: 1, degraded: false,
  } });
  assert.equal(badAnswer.result.error, "els_matrix_response_invalid");
  assert.equal(badAnswer.result.els_matrix_status, undefined);
  const saved = buildRazielSavedSessionEntity({ busy: false, contextSnapshot: submission.contextSnapshot,
    thread: [{ role: "user", text: submission.turn.question, turnId: "matrix-turn" },
      { role: "raziel", text: "כיוון אפשרי בלבד", turnId: "matrix-turn", continuation: submission.turn.continuation }] },
    { now: () => "2026-10-27T10:00:00.000Z", createId: () => "matrix-session" });
  assert.equal(saved.ok, true);
  assert.deepEqual(razielSavedSessionState(saved.entity).contextSnapshot.elsMatrixContext, context);
  const nextState = sample(); nextState.axis = { ...nextState.axis, hitId: "100_1_205", start: 205 };
  const nextContext = buildElsRazielMatrixContext(nextState);
  const next = prepareRazielSessionSubmission({ question: "בדוק ממצא אחר", state: createInitialRazielSessionState(),
    view: { surface: "els", elsFocus: nextContext.axis, elsMatrixContext: nextContext }, createTurnId: () => "next" });
  assert.equal(next.contextSnapshot.elsMatrixContext.axis.start, 205);
  assert.equal(razielSavedSessionState(saved.entity).contextSnapshot.elsMatrixContext.axis.start, 105);
  const followup = prepareRazielSessionSubmission({ question: "מה כדאי לבדוק הלאה?",
    state: { ...createInitialRazielSessionState(), contextSnapshot: submission.contextSnapshot },
    facts: "טקסט לא מאומת", view: { surface: "els", elsFocus: context.axis }, createTurnId: () => "followup" });
  assert.deepEqual(followup.request.elsMatrixContext, context);
  assert.equal(followup.request.facts, "");
  const different = prepareRazielSessionSubmission({ question: "בדוק אחר", state: { ...createInitialRazielSessionState(), contextSnapshot: submission.contextSnapshot },
    view: { surface: "els", elsFocus: nextContext.axis }, createTurnId: () => "different" });
  assert.equal(different.request.elsMatrixContext, undefined);
  assert.equal(prepareRazielSessionSubmission({ question: "בדוק", state: createInitialRazielSessionState(),
    view: { elsMatrixContext: { contract: "invalid" } }, createTurnId: () => "bad" }), null);
});
test("unverified, inconsistent, malformed or outside matrix states fail closed", () => {
  for (const patch of [
    { verification: { state: "CANDIDATE" } }, { axis: { ...sample().axis, hitId: "100_1_106" } },
    { axis: { ...sample().axis, start: 999999 } }, { geometry: { S: 101 } },
    { matrix: { ...sample().matrix, rows: ["<script>"] } },
  ]) assert.equal(buildElsRazielMatrixContext({ ...sample(), ...patch }), null);
});
