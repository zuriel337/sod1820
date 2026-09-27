import test from "node:test";
import assert from "node:assert/strict";
import { createCrossSignatureW2Executor } from "./crossSignatureW2Executor.js";
import {
  runCrossSignatureReflectionRuntime,
  CROSS_SIGNATURE_REFLECTION_FAILURE_REASON,
} from "./crossSignatureReflectionRuntime.js";

const DRAW = {
  framework: "reflection only",
  cards: [
    { position: "המצב", n: 12, arcana: "התלוי", meaning: "ראייה אחרת" },
    { position: "האתגר", n: 9, arcana: "הנזיר", meaning: "חיפוש" },
    { position: "העצה", n: 2, arcana: "הכוהנת", meaning: "ידע נסתר" },
  ],
};

const strength = {
  value: 313,
  phrase_count: 72,
  independent_phrase_count: 60,
  dependent_expression_phrase_count: 12,
  p1_hits: 9,
  independent_p1_method_count: 6,
  methods: ["רגיל", "מילוי", "מסתתר", "קדמי", "אתבש", "אלבם"],
  in_ragil: true,
  in_misratar: true,
  in_kadmi: true,
  signal: "CORE_AXIS_CANDIDATE",
  dependent_methods: ["גדול", "רגיל+משולש"],
  dependent_phrase_count: 8,
  unregistered_methods: [],
};

function fakeSupabase({ hasStrength = true } = {}) {
  return {
    from(name) {
      assert.equal(name, "cross_method_strength");
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: hasStrength ? strength : null, error: null };
                },
              };
            },
          };
        },
      };
    },
    async rpc(name, args) {
      assert.equal(name, "fn_number_lookup");
      return {
        data: [
          { phrase: "בושה", method: "רגיל", value: args.p_value, bid_id: "b1", word_id: "w1", method_version: 1, total_count: 138 },
          { phrase: "המוריה", method: "אתבש", value: args.p_value, bid_id: "b2", word_id: "w2", method_version: 1, total_count: 138 },
        ],
        error: null,
      };
    },
  };
}

test("Cross Signature runtime completes Bundle -> normalization -> frozen synthesis -> exactly 3-card reflection", async () => {
  const events = [];
  const baseExecutor = createCrossSignatureW2Executor({ supabase: fakeSupabase() });
  const out = await runCrossSignatureReflectionRuntime({
    number: 313,
    crossSignatureExecutor: async (ctx) => {
      events.push("cross");
      return baseExecutor(ctx);
    },
    aiAnalysisProvider: async ({ kind, subject, facts, operation }) => {
      events.push("ai");
      assert.equal(kind, "research");
      assert.equal(subject, "313");
      assert.equal(operation, "cross_signature_message");
      assert.match(facts, /independent_p1_methods=6/);
      assert.match(facts, /p1_hits=9/);
      assert.match(facts, /dependent_methods_preserved_not_counted_independent/);
      assert.match(facts, /משולש/);
      return "313 מציג מבנה Cross רחב, כאשר ספירת העצמאות נשענת על נרמול התלות הקנוני.";
    },
    tarotProvider: async () => {
      events.push("tarot");
      return DRAW;
    },
    now: () => "2026-09-27T18:30:00Z",
  });

  assert.deepEqual(events, ["cross", "ai", "tarot"]);
  assert.equal(out.status, "ok");
  assert.equal(out.cross_signature.value, 313);
  assert.equal(out.cross_signature.independent_p1_method_count, 6);
  assert.equal(out.cross_signature.p1_hits, 9);
  assert.deepEqual(out.cross_signature.dependent_methods, ["גדול", "רגיל+משולש"]);
  const reflection = out.payload.messageReflection;
  assert.match(reflection.message, /313 מציג מבנה Cross רחב/);
  assert.equal(reflection.cards.length, 3);
  assert.deepEqual(reflection.cards.map((card) => card.position), ["המצב", "האתגר", "העצה"]);
  assert.equal(reflection.boundaries.tarot_evidence_weight, 0);
  assert.equal(reflection.boundaries.can_modify_frozen_message, false);
  assert.ok(reflection.claims.some((claim) => claim.id === "cross-313-method-independence"));
  assert.ok(reflection.claims.some((claim) => claim.id === "cross-313-expression-independence"));
  assert.ok(reflection.claims.some((claim) => claim.id === "cross-313-dependency-controls"));
  assert.deepEqual(reflection.trace.source_finding_ids.length, 1);
});

test("runtime fails closed before AI/Tarot when canonical Cross has no Finding", async () => {
  let aiCalls = 0;
  let tarotCalls = 0;
  const executor = createCrossSignatureW2Executor({ supabase: fakeSupabase({ hasStrength: false }) });
  const out = await runCrossSignatureReflectionRuntime({
    number: 999999,
    crossSignatureExecutor: executor,
    aiAnalysisProvider: async () => { aiCalls += 1; return "should not happen"; },
    tarotProvider: async () => { tarotCalls += 1; return DRAW; },
  });

  assert.equal(out.status, "failed_closed");
  assert.equal(out.reason, CROSS_SIGNATURE_REFLECTION_FAILURE_REASON.ZERO_FINDINGS);
  assert.equal(aiCalls, 0);
  assert.equal(tarotCalls, 0);
});

test("AI unavailable fails closed with zero Tarot draws", async () => {
  let tarotCalls = 0;
  const executor = createCrossSignatureW2Executor({ supabase: fakeSupabase() });
  const out = await runCrossSignatureReflectionRuntime({
    number: 313,
    crossSignatureExecutor: executor,
    aiAnalysisProvider: async () => null,
    tarotProvider: async () => { tarotCalls += 1; return DRAW; },
  });

  assert.equal(out.status, "failed_closed");
  assert.equal(out.reason, CROSS_SIGNATURE_REFLECTION_FAILURE_REASON.AI_UNAVAILABLE);
  assert.equal(tarotCalls, 0);
});

test("invalid number never invokes Cross, AI or Tarot", async () => {
  let calls = 0;
  const out = await runCrossSignatureReflectionRuntime({
    number: "not-a-number",
    crossSignatureExecutor: async () => { calls += 1; return null; },
    aiAnalysisProvider: async () => { calls += 1; return null; },
    tarotProvider: async () => { calls += 1; return DRAW; },
  });
  assert.equal(out.status, "failed_closed");
  assert.equal(out.reason, CROSS_SIGNATURE_REFLECTION_FAILURE_REASON.INVALID_NUMBER);
  assert.equal(calls, 0);
});
