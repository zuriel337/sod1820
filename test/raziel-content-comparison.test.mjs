import test from "node:test";
import assert from "node:assert/strict";
import { resolveRazielCanonicalRequest, RAZIEL_SEMANTIC_INTENT_VERSION } from "../src/lib/research/razielSemanticIntentGate.js";
import { resolveRazielConversationTurn, projectRazielConversationResolution } from "../src/lib/research/razielConversationResolver.js";
import { buildRazielSessionRequest, createRazielRequestContextSnapshot } from "../src/lib/research/razielSessionRequest2029.js";
import { runAiAnalyze, USER_JWT, UID } from "./helpers/ai-analyze-handler.mjs";

const questions = [
  "מה ההבדל בין מימד חמש לאור הגאולה?",
  "מה ההבדל בין מימד חמש לבין אור הגאולה?",
  "מה ההבדל בין סדרה חדשה לערוץ הקהילה?",
  "מה ההבדל בין מימד 5 לערוץ הקהילה?",
  "מה ההבדל בין סדרה 5 לסדרה 7?",
  "מה ההבדל בין שמירה למעקב?",
  "מה ההבדל בין חכמה לבינה?",
  "הסבר לי את ההבדל בין סדרה לערוץ",
  "מה ההבדל בין מימד 5 לערוץ הקהילה לא בגימטריה?",
  "מה ההבדל בין סדרה לערוץ בלי גימטריה?",
];

test("content comparisons are conversation, not consent to compute the names", () => {
  for (const question of questions) {
    const canonical = resolveRazielCanonicalRequest(question);
    assert.equal(canonical.kind, "conversation", question);
    assert.equal(canonical.reason, "non_computational_comparison");
    assert.deepEqual(canonical.subjects, []);
    const resolved = resolveRazielConversationTurn({ question });
    assert.deepEqual(resolved.identity_resolution.identities, []);
    assert.equal(resolved.identity_resolution.explicit_text_computation, false);
    assert.equal(projectRazielConversationResolution(resolved), null);
    assert.equal(buildRazielSessionRequest({ question, state: { thread: [] } }).conversationResolution, null);
  }
});

test("content comparison cannot inherit a previous calculation or classifier's guessed computation", () => {
  const question = questions[0];
  const result = resolveRazielConversationTurn({ question,
    thread: [{ role: "user", text: "חשב את אור הגאולה" }],
    semanticIntent: { version: RAZIEL_SEMANTIC_INTENT_VERSION, status: "resolved", action: "connect",
      confidence: "high", ambiguous: false, text_computation_requested: true,
      candidates: [{ type: "phrase", label: "מימד חמש", evidence_text: "מימד חמש", role: "subject" },
        { type: "phrase", label: "אור הגאולה", evidence_text: "אור הגאולה", role: "subject" }] },
    surfaceSemantic: { subject: { type: "number", id: "337", label: "337" } },
  });
  assert.equal(result.semantic_intent, null);
  assert.equal(projectRazielConversationResolution(result), null);
  assert.deepEqual(result.carried_identity_keys, []);
});

test("explicit gematria comparisons preserve only the two expression slots", () => {
  for (const question of [
    "מה ההבדל בגימטריה בין מימד חמש לאור הגאולה?",
    "מה ההבדל בין מימד חמש לבין אור הגאולה בגימטריה?",
    "מה ההבדל הגימטרי בין מימד חמש לאור הגאולה?",
    "מה הקשר בין מימד חמש לאור הגאולה בגימטריה?",
  ]) {
    const canonical = resolveRazielCanonicalRequest(question);
    assert.equal(canonical.kind, "expression_pair", question);
    assert.deepEqual(canonical.subjects.map(item => item.label), ["מימד חמש", "אור הגאולה"]);
    assert.equal(projectRazielConversationResolution(resolveRazielConversationTurn({ question })).identities.length, 2);
  }
  assert.equal(resolveRazielCanonicalRequest("מה הקשר בין חכמה לבינה?").kind, "expression_pair");
  assert.equal(resolveRazielCanonicalRequest("מה ההבדל בין 337 ל 533?").kind, "number_pair");
  assert.equal(resolveRazielCanonicalRequest("חשב את מימד חמש בגימטריה").kind, "expression");
});

test("deepening a content answer cannot resurrect stale saved numerical identities", () => {
  const thread = [{ role: "user", text: "חשב את חכמה" }, { role: "user", text: questions[3],
    identity_resolution: { identities: [{ type: "number", value: 5, identity_key: "number:5" }], explicit_text_computation: true } }];
  for (const question of ["תעמיק", "אפשר לבדוק", "תסביר את זה"]) {
    const resolved = resolveRazielConversationTurn({ question, thread,
      surfaceSemantic: { subject: { type: "number", id: "337", label: "337" } } });
    assert.equal(projectRazielConversationResolution(resolved), null, question);
    assert.deepEqual(resolved.identity_resolution.identities, []);
  }
  assert.equal(resolveRazielConversationTurn({ question: "חשב את בינה", thread }).canonical_request.kind, "expression");
});

const modelResult = { text: JSON.stringify({ v: 1, agent: "raziel", answer: "אפשר להסביר את ההבדל מתוך המקורות הזמינים.",
  facts: [], suggested_paths: [], follow_up_question: null }), usage: { input_tokens: 10, output_tokens: 10 }, attempts: 1, degraded: false };
const forbidden = /^(?:research-run|number_map|number_dossier_json|fn_raziel_answer|fn_raziel_plan|research_state_snapshot_v1|fn_research_path_resume_v1)$/;

test("the real session and handler use one ordinary answer, without calculation, classifier or private reader", async () => {
  for (const question of questions) {
    const request = buildRazielSessionRequest({ question, state: { thread: [] } });
    const result = await runAiAnalyze({ allowed: true, modelResult, bearer: USER_JWT, verifiedUid: UID, body: {
      subject: request.subject, conversation_resolution: request.conversationResolution,
      research_contract: request.researchContract, surface_semantic: request.surfaceSemantic,
    } });
    assert.equal(result.status, 200, question);
    assert.equal(result.models.length, 1, question);
    assert.deepEqual(result.calls.filter(call => forbidden.test(call.name)), [], question);
    assert.equal(result.result.raziel.plan_meta.conversation_intent.kind, "non_computational_comparison");
    assert.match(result.models[0].user, /סדרה.*ערוץ/u);
  }
});

test("a stale/forged expression envelope cannot turn a content comparison back into gematria", async () => {
  const request = buildRazielSessionRequest({ question: "מה הקשר בין מימד חמש לאור הגאולה?", state: { thread: [] } });
  const result = await runAiAnalyze({ allowed: true, modelResult, body: {
    subject: questions[0], conversation_resolution: request.conversationResolution, research_contract: request.researchContract,
  } });
  assert.equal(result.models.length, 0, "the existing rejected-envelope guard remains fail-closed");
  assert.equal(result.result.engine, "conversation_resolution_guard");
  assert.deepEqual(result.calls.filter(call => forbidden.test(call.name)), []);
});

test("existing public reading focus reaches the same answer without accepting a private audience profile", async () => {
  // Source-shaped synthetic metadata, not copied memberships, aggregate audiences or a new catalog.
  const contextSnapshot = createRazielRequestContextSnapshot({ lens: "posts",
    subject: { type: "post", id: "synthetic-source", label: "כותרת המקור" },
    dimensions: { readingFocus: { label: "הפוסט, הסדרה והערוץ", primary: "סדרה לדוגמה · ערוץ לדוגמה",
      sourceLabel: "posts:fixture", locator: "#post-classification", privateProfile: "DO-NOT-FORWARD" },
      audience: { inferredPreferences: "DO-NOT-FORWARD" } },
  });
  const request = buildRazielSessionRequest({ question: questions[2], state: { thread: [] }, contextSnapshot });
  assert.equal(JSON.stringify(request).includes("DO-NOT-FORWARD"), false);
  const result = await runAiAnalyze({ allowed: true, modelResult, bearer: USER_JWT, verifiedUid: UID, body: {
    subject: request.subject, context: request.context, surface_semantic: request.surfaceSemantic,
    conversation_resolution: request.conversationResolution, research_contract: request.researchContract,
  } });
  assert.equal(result.models.length, 1);
  assert.match(result.models[0].user, /סדרה לדוגמה/u);
  assert.match(result.models[0].user, /ערוץ לדוגמה/u);
  assert.equal(JSON.stringify(result.models).includes("DO-NOT-FORWARD"), false);
  assert.deepEqual(result.calls.filter(call => forbidden.test(call.name)), []);
});

test("explicit gematria still reaches the existing canonical engine, not local arithmetic", async () => {
  const request = buildRazielSessionRequest({ question: "מה ההבדל בגימטריה בין חכמה לבינה?", state: { thread: [] } });
  const result = await runAiAnalyze({ allowed: true, modelResult, bearer: USER_JWT, verifiedUid: UID, body: {
    subject: request.subject, conversation_resolution: request.conversationResolution, research_contract: request.researchContract,
  } });
  const reads = result.calls.filter(call => call.name === "research-run");
  assert.equal(reads.length, 1);
  assert.equal(reads[0].payload.contract, "public-expression-crossing-run-v1");
  assert.equal(reads[0].payload.expression, "חכמה");
  assert.deepEqual(request.conversationResolution.identities.map(item => item.label), ["חכמה", "בינה"]);
  assert.equal(reads[0].payload.question, request.subject, "the existing engine contract receives the exact pair question");
});

test("the new conversation boundary does not change Legacy callers without the 2029 opt-in", async () => {
  const result = await runAiAnalyze({ allowed: true, modelResult, answer: { enabled: false }, body: { subject: questions[0] } });
  assert.equal(result.calls.filter(call => call.name === "fn_raziel_answer").length, 1);
  assert.equal(result.models.length, 1);
  assert.equal(result.result.raziel.plan_meta?.conversation_intent, undefined);
});
