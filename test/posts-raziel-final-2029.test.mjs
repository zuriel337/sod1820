import test from "node:test";
import assert from "node:assert/strict";
import { postHierarchyContext2029, postFollowCandidates2029 } from "../src/lib/research/postsCatalog2029Projection.js";
import { createRazielRequestContextSnapshot, buildRazielSessionRequest } from "../src/lib/research/razielSessionRequest2029.js";
import { runAiAnalyze, USER_JWT, UID } from "./helpers/ai-analyze-handler.mjs";

const post = (over = {}) => ({ id: 990005, slug: "future-dimension-five", title: "פוסט ציבורי חדש",
  author: "בדרך לנצח", categories: ["מימד חמש"], tags: [], ...over });
const question = "מה ההבדל בין מימד חמש לאור הגאולה?";
const modelResult = { text: JSON.stringify({ v: 1, agent: "raziel", answer: "תשובת בדיקה בלבד",
  facts: [], suggested_paths: [], follow_up_question: null }),
  usage: { input_tokens: 10, output_tokens: 10 }, attempts: 1, degraded: false };
const forbidden = /^(?:research-run|fn_raziel_answer|fn_raziel_plan|number_map|number_dossier_json|research_state_snapshot_v1|fn_research_path_resume_v1|watch_toggle|dispatch_notifications)$/;
const requestFor = (row, options = {}, input = {}) => {
  const patch = postHierarchyContext2029(row, options);
  assert.ok(patch);
  return buildRazielSessionRequest({ question, state: { thread: [] },
    contextSnapshot: createRazielRequestContextSnapshot(patch), ...input });
};
const answerFor = request => runAiAnalyze({ allowed: true, bearer: USER_JWT, verifiedUid: UID, modelResult,
  body: { subject: request.subject, context: request.context, surface_semantic: request.surfaceSemantic,
    conversation_resolution: request.conversationResolution, research_contract: request.researchContract } });

test("actual Post hierarchy reaches the handler as public source context, not calculation, identity or consent", async () => {
  const row = post({ content: "PRIVATE-BODY", privateAudience: "PRIVATE-PROFILE" });
  const request = requestFor(row, { seriesKey: "dimension-five" });
  assert.equal(request.subject, question);
  assert.equal(request.conversationResolution, null);
  assert.equal(request.facts, "");
  assert.equal(request.surfaceSemantic.subject.type, "post");
  assert.equal(request.surfaceSemantic.context.navigation.sourceRef, "posts:990005");
  assert.equal(request.surfaceSemantic.context.navigation.returnTo.href, "/post/future-dimension-five#post-classification");
  assert.deepEqual(postFollowCandidates2029({ post: row }).map(item => item.topic), ["series:dimension-five"]);
  const result = await answerFor(request);
  assert.equal(result.status, 200);
  assert.equal(result.models.length, 1);
  assert.deepEqual(result.calls.filter(call => forbidden.test(call.name)), []);
  const prompt = result.models[0].user;
  assert.match(prompt, /מימד חמש: סדרת תוכן.*בדרך לנצח: מפרסם/u);
  assert.match(prompt, /אור הגאולה: ערוץ\/בית פרסום/u);
  assert.match(prompt, /ההשוואה אינה ראיית חברות בערוץ/u);
  assert.match(prompt, /PLAN37 DEC-SERIES-003\+006 · posts:990005/u);
  assert.match(prompt, /לא עובדה קנונית/u);
  assert.doesNotMatch(JSON.stringify(request) + JSON.stringify(result.models), /PRIVATE-BODY|PRIVATE-PROFILE/);
});

test("actual unknown membership stays unknown; a same-name category or channel label does not admit a series", async () => {
  const row = post({ author: "מקור אחר", categories: ["מימד חמש", "אור הגאולה"] });
  assert.equal(postHierarchyContext2029(row, { seriesKey: "dimension-five" }), null);
  const result = await answerFor(requestFor(row));
  assert.equal(result.models.length, 1);
  assert.match(result.models[0].user, /לא אומת שיוך לסדרה/u);
  assert.match(result.models[0].user, /בלי להמציא שיוך או חברות כשאין מקור/u);
  assert.deepEqual(result.calls.filter(call => forbidden.test(call.name)), []);
});

test("future multi-series source keeps each explicit selection and its provenance", async () => {
  const row = post({ categories: ["מימד חמש", "סוד החשמל"] });
  const unselected = requestFor(row);
  assert.match(unselected.surfaceSemantic.reading.primary, /בנפרד/u);
  for (const [seriesKey, label] of [["dimension-five", "מימד חמש"], ["sod-hashmal", "סוד החשמל"]]) {
    const request = requestFor(row, { seriesKey });
    assert.match(request.surfaceSemantic.reading.primary, new RegExp(label));
    assert.equal(request.surfaceSemantic.context.navigation.selection.entityId, seriesKey);
    const result = await answerFor(request);
    assert.equal(result.models.length, 1);
    assert.deepEqual(result.calls.filter(call => forbidden.test(call.name)), []);
  }
});

test("unavailable or suppressed source produces no Post hierarchy request", () => {
  for (const row of [null, post({ tags: ["טיוטה"] }), post({ tags: ["פורום"] }), post({ id: null }), post({ slug: "../private" })]) {
    assert.equal(postHierarchyContext2029(row), null);
  }
});

test("a comparison from the actual Post context overrides stale arithmetic; explicit gematria still reaches its owner", async () => {
  const state = { thread: [{ role: "user", text: "חשב את אור הגאולה" }] };
  const request = requestFor(post(), { seriesKey: "dimension-five" }, { state });
  assert.equal(request.conversationResolution, null);
  const plain = await answerFor(request);
  assert.deepEqual(plain.calls.filter(call => forbidden.test(call.name)), []);
  const explicit = requestFor(post(), { seriesKey: "dimension-five" }, {
    state, question: "מה ההבדל בגימטריה בין מימד חמש לאור הגאולה?" });
  assert.deepEqual(explicit.conversationResolution.identities.map(item => item.label), ["מימד חמש", "אור הגאולה"]);
  const calculated = await answerFor(explicit);
  const engine = calculated.calls.filter(call => call.name === "research-run");
  assert.equal(engine.length, 1);
  assert.equal(engine[0].payload.contract, "public-expression-crossing-run-v1");
  assert.equal(engine[0].payload.question, explicit.subject);
});
