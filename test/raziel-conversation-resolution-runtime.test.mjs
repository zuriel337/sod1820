import test from "node:test";
import assert from "node:assert/strict";
import { runAiAnalyze, toolAnswer } from "./helpers/ai-analyze-handler.mjs";
import { buildRazielSessionRequest } from "../src/lib/research/razielSessionRequest2029.js";

const projection = (values, overrides = {}) => ({
  version: "raziel-conversation-resolver-v1",
  requested_action: values.length === 2 ? "connect" : "research",
  referential_follow_up: true,
  referent_source: "prior_user_turn",
  identities: values.map((value) => ({ type: "number", value, identity_key: `number:${value}` })),
  guards: { semantic_hint_only: true, server_must_reauthorize: true },
  ...overrides,
});

const explicitProjection = (values, requestedAction = "research", overrides = {}) => projection(values, {
  requested_action: requestedAction,
  referential_follow_up: false,
  referent_source: "explicit_current_turn",
  ...overrides,
});

const numberFixture = (n) => ({
  map: { counts: { post: 1 }, neighbors: { post: [{ label: `Post ${n}`, ref: `post:${n}` }] } },
  dossier: { posts: [`Dossier ${n}`], topics: [], methods: [], definitions: [] },
});

test("a bounded numeric follow-up re-reads canonical projections and adds no model call", async () => {
  const out = await runAiAnalyze({
    answer: { enabled: false },
    allowed: true,
    numberContextByNumber: { 776: numberFixture(776) },
    body: {
      subject: "אתה יכול לבדוק?",
      conversation_resolution: projection([776]),
    },
  });
  const reads = out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name));
  assert.deepEqual(reads.map((call) => [call.name, call.payload.n]), [
    ["number_map", 776],
    ["number_dossier_json", 776],
  ]);
  assert.equal(out.models.length, 1, "resolution reuses the existing synthesis call");
  assert.match(out.models[0].user, /Post 776|Dossier 776/);
});

test("a two-number follow-up reads each public owner projection once and synthesizes once", async () => {
  const out = await runAiAnalyze({
    answer: { enabled: false },
    allowed: true,
    numberContextByNumber: { 776: numberFixture(776), 1820: numberFixture(1820) },
    body: {
      subject: "תבדוק את זה מול 1820",
      conversation_resolution: projection([776, 1820]),
    },
  });
  const reads = out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name));
  assert.deepEqual(reads.map((call) => call.payload.n), [776, 776, 1820, 1820]);
  assert.equal(out.models.length, 1);
});

test("a mixed numeric follow-up binds its textual number to the second projected identity", async () => {
  for (const [values, expectedReads] of [
    [[776, 787], []],
    [[776], []],
    [[1820, 776], []],
    [[776, 1820], [776, 776, 1820, 1820]],
  ]) {
    const out = await runAiAnalyze({
      answer: { enabled: false },
      allowed: true,
      numberContextByNumber: { 776: numberFixture(776), 787: numberFixture(787), 1820: numberFixture(1820) },
      body: {
        subject: "תבדוק את זה מול 1820",
        conversation_resolution: projection(values),
      },
    });
    assert.deepEqual(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).map((call) => call.payload.n),
      expectedReads, JSON.stringify(values));
  }
});

test("an explicit 2029 number-research pair re-reads both canonical projections", async () => {
  for (const [subject, requestedAction] of [
    ["חקור את 776 מול 1820", "research"],
    ["תבדקי 776 מול 1820", "research"],
    ["מצא קשר בין 776 ל-1820", "connect"],
    ["השווה בין המספרים 776 ל-1820", "connect"],
    ["השווי בין המספרים 776 ל-1820", "connect"],
  ]) {
    const out = await runAiAnalyze({
      answer: { enabled: false },
      allowed: true,
      numberContextByNumber: { 776: numberFixture(776), 1820: numberFixture(1820) },
      body: {
        subject,
        conversation_resolution: explicitProjection([776, 1820], requestedAction),
      },
    });
    const reads = out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name));
    assert.deepEqual(reads.map((call) => `${call.name}:${call.payload.n}`), [
      "number_map:776", "number_dossier_json:776", "number_map:1820", "number_dossier_json:1820",
    ], subject);
    assert.equal(out.models.length, 1, `${subject}: the existing synthesis call is reused`);
    assert.match(out.models[0].user, /צד א \(776\)/, subject);
    assert.match(out.models[0].user, /צד ב \(1820\)/, subject);
  }
});

test("the real 2029 session request and server admission agree on the explicit research pair", async () => {
  const request = buildRazielSessionRequest({
    question: "חקור את 776 מול 1820",
    state: { thread: [] },
    contextSnapshot: null,
  });
  assert.deepEqual(request.conversationResolution.identities.map((identity) => identity.value), [776, 1820]);
  assert.equal(request.conversationResolution.requested_action, "research");
  assert.equal(request.conversationResolution.referential_follow_up, false);

  const out = await runAiAnalyze({
    answer: { enabled: false },
    allowed: true,
    numberContextByNumber: { 776: numberFixture(776), 1820: numberFixture(1820) },
    body: {
      subject: request.subject,
      conversation_resolution: request.conversationResolution,
      intelligence_level: request.intelligenceLevel,
    },
  });
  assert.deepEqual(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).map((call) => call.payload.n),
    [776, 776, 1820, 1820]);
  assert.equal(out.models.length, 1);
});

test("the real session and server agree on a natural single-number subject", async () => {
  const request = buildRazielSessionRequest({
    question: "תן לי על המספר 776",
    state: { thread: [] },
    contextSnapshot: null,
  });
  assert.equal(request.conversationResolution.requested_action, "understand");
  assert.deepEqual(request.conversationResolution.identities.map((identity) => identity.value), [776]);

  const out = await runAiAnalyze({
    answer: { enabled: false },
    allowed: true,
    numberContextByNumber: { 776: numberFixture(776) },
    body: {
      subject: request.subject,
      conversation_resolution: request.conversationResolution,
      intelligence_level: request.intelligenceLevel,
    },
  });
  assert.deepEqual(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).map((call) => call.payload.n),
    [776, 776]);
  assert.equal(out.models.length, 1);
});

test("method-only follow-up reuses the temporary numeric subject through the server gate", async () => {
  const request = buildRazielSessionRequest({
    question: "גימטריה",
    state: {
      thread: [{
        role: "user",
        text: "תן לי על המספר 776",
        identity_resolution: {
          identities: [{ type: "number", value: 776, identity_key: "number:776" }],
        },
      }],
    },
    contextSnapshot: null,
  });
  assert.equal(request.conversationResolution.requested_action, "research");
  assert.equal(request.conversationResolution.referential_follow_up, true);

  const out = await runAiAnalyze({
    answer: { enabled: false },
    allowed: true,
    numberContextByNumber: { 776: numberFixture(776) },
    body: {
      subject: request.subject,
      conversation_resolution: request.conversationResolution,
      intelligence_level: request.intelligenceLevel,
    },
  });
  assert.deepEqual(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).map((call) => call.payload.n),
    [776, 776]);
  assert.equal(out.models.length, 1);
  assert.match(out.models[0].user, /Post 776|Dossier 776/);
});

test("the same explicit pair is grounded before an explicitly requested deep synthesis", async () => {
  const out = await runAiAnalyze({
    answer: { enabled: false },
    allowed: true,
    numberContextByNumber: { 776: numberFixture(776), 1820: numberFixture(1820) },
    body: {
      subject: "חקור את 776 מול 1820",
      intelligence_level: "deep",
      again: true,
      conversation_resolution: explicitProjection([776, 1820]),
    },
  });
  assert.deepEqual(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).map((call) => call.payload.n),
    [776, 776, 1820, 1820]);
  assert.equal(out.models.length, 1, "deep remains one synthesis call with no new retry");
  assert.match(out.models[0].user, /צד א \(776\)[\s\S]*צד ב \(1820\)/);
});

test("explicit-pair admission fails closed on mismatch, extra numerals or contextual numbers", async () => {
  for (const [subject, conversation_resolution] of [
    ["חקור את 776 מול 1820", explicitProjection([776, 787])],
    ["חקור את 776 מול 1820 דרך 3 מקורות", explicitProjection([776, 1820])],
    ["חקור את שנת 2024 מול 1820", explicitProjection([2024, 1820])],
    ["בדוק עמוד 33 מול 1820", explicitProjection([33, 1820])],
    ["חקור את 776 מול 1820", explicitProjection([776, 1820], "connect")],
  ]) {
    const out = await runAiAnalyze({
      answer: { enabled: false },
      allowed: true,
      body: { subject, conversation_resolution },
    });
    assert.equal(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0, subject);
    assert.equal(out.models.length, 1, subject);
  }
});

test("legacy-shaped requests without the 2029 resolution envelope remain unchanged", async () => {
  const out = await runAiAnalyze({
    answer: { enabled: false },
    allowed: true,
    numberContextByNumber: { 776: numberFixture(776), 1820: numberFixture(1820) },
    body: { subject: "חקור את 776 מול 1820" },
  });
  assert.equal(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.equal(out.models.length, 1);
});

test("untrusted fields and non-number identities never enter tools or prompt", async () => {
  const poisoned = projection([776], {
    identities: [{
      type: "person",
      value: 776,
      identity_key: "person:private",
      label: "PRIVATE-LABEL",
      access: { tier: "admin", token: "PRIVATE-TOKEN" },
      provenance: { owner: "PRIVATE-OWNER" },
    }],
  });
  const out = await runAiAnalyze({
    answer: { enabled: false },
    allowed: true,
    body: {
      subject: "אתה יכול לבדוק?",
      conversation_resolution: poisoned,
    },
  });
  assert.equal(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.equal(out.models.length, 1);
  assert.doesNotMatch(out.models[0].user, /PRIVATE-LABEL|PRIVATE-TOKEN|PRIVATE-OWNER|person:private/);
});

test("malformed, oversized or non-referential hints fail closed", async () => {
  for (const [subject, conversation_resolution] of [
    ["מה זה 776?", projection([776])],
    ["אתה יכול לבדוק?", projection([0])],
    ["אתה יכול לבדוק?", projection([1, 2, 3])],
    ["אתה יכול לבדוק?", projection([776], { version: "future-version" })],
    ["אתה יכול לבדוק?", projection([776], { referential_follow_up: false })],
  ]) {
    const out = await runAiAnalyze({
      answer: { enabled: false },
      allowed: true,
      body: { subject, conversation_resolution },
    });
    assert.equal(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0, subject);
  }
});

test("an explicit planner descriptor wins over a conflicting conversation hint", async () => {
  const answer = {
    enabled: true,
    mode: "synthesis",
    needs_synthesis: true,
    availability: "number_context",
    capability_class: "number_context",
    minimum_intelligence: "L2_FAST",
    number_context: { contract: "number_context_v1", anchor: "explicit", number: 1820, mode: "synthesis", focus: "overview" },
  };
  const out = await runAiAnalyze({
    answer,
    allowed: true,
    numberContextByNumber: { 1820: numberFixture(1820), 776: numberFixture(776) },
    body: {
      subject: "אתה יכול לבדוק?",
      conversation_resolution: projection([776]),
    },
  });
  const reads = out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name));
  assert.deepEqual(reads.map((call) => call.payload.n), [1820, 1820]);
});

test("tool research plan wins over an otherwise valid numeric conversation hint", async () => {
  const out = await runAiAnalyze({
    answer: toolAnswer(),
    allowed: true,
    numberContextByNumber: { 776: numberFixture(776) },
    body: {
      subject: "אתה יכול לבדוק?",
      conversation_resolution: projection([776]),
    },
  });
  assert.equal(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.equal(out.models.length, 1);
  assert.doesNotMatch(out.models[0].user, /Post 776|Dossier 776/);
});

test("tool research plan also wins over an explicit W3 pair", async () => {
  const out = await runAiAnalyze({
    answer: toolAnswer(),
    allowed: true,
    numberContextByNumber: { 776: numberFixture(776), 1820: numberFixture(1820) },
    body: {
      subject: "חקור את 776 מול 1820",
      conversation_resolution: explicitProjection([776, 1820]),
    },
  });
  assert.equal(out.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.equal(out.models.length, 1);
  assert.doesNotMatch(out.models[0].user, /Post 776|Dossier 1820/);
});
