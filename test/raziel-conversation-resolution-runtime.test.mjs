import test from "node:test";
import assert from "node:assert/strict";
import { runAiAnalyze, toolAnswer } from "./helpers/ai-analyze-handler.mjs";

const projection = (values, overrides = {}) => ({
  version: "raziel-conversation-resolver-v1",
  requested_action: values.length === 2 ? "connect" : "research",
  referential_follow_up: true,
  referent_source: "prior_user_turn",
  identities: values.map((value) => ({ type: "number", value, identity_key: `number:${value}` })),
  guards: { semantic_hint_only: true, server_must_reauthorize: true },
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
