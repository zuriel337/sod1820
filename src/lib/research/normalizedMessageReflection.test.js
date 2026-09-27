import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNormalizedMessageContext,
  composeNormalizedMessageReflection,
  createSupabaseThreeCardProvider,
  normalizeThreeCardReflection,
} from "./normalizedMessageReflection.js";

const DRAW = {
  framework: "reflection only",
  cards: [
    { position: "המצב", n: 12, arcana: "התלוי", theme: "היפוך-מבט", meaning: "ראייה אחרת", orientation: "ישר" },
    { position: "האתגר", n: 9, arcana: "הנזיר", theme: "חוכמה פנימית", meaning: "חיפוש", orientation: "הפוך" },
    { position: "העצה", n: 2, arcana: "הכוהנת", theme: "אינטואיציה", meaning: "ידע נסתר", orientation: "ישר" },
  ],
};

test("normalizer collapses equivalent spellings and exposes shared numeric basis without calling it independent evidence", () => {
  const out = buildNormalizedMessageContext([
    [{ id: "combo_gem", status: "ok", value: 337, words: ["פסק זמן"] }],
    [{ id: "milui", status: "ok", data: [{ milui: 337, matches: [{ phrase: "פסק-זמן" }] }] }],
  ]);
  assert.equal(out.findings.length, 1);
  assert.equal(out.findings[0].normalized_key, "פסק זמן");
  assert.equal(out.findings[0].source_engines.length, 2);
  assert.equal(Object.isFrozen(out.findings[0]), true);
  assert.equal(Object.isFrozen(out.findings[0].source_engines), true);
  assert.throws(() => { out.findings[0].display_value = "mutated"; }, TypeError);
  assert.equal(out.numeric_basis_groups.length, 1);
  assert.equal(out.numeric_basis_groups[0].value, 337);
  assert.equal(out.numeric_basis_groups[0].independence, "unresolved_until_dependency_normalization");
  assert.match(out.ranking_boundary, /not independent evidence/);
});

test("Cross Signature normalization preserves unknowns and canonical dependency counts without inventing zero", () => {
  const bundle = {
    contract_version: 1,
    findings: [{
      id: "uf:cross:313",
      kind: "cross-signature",
      projection: { dimensions: { cross_signature: {
        value: 313,
        phrase_count: null,
        independent_phrase_count: 60,
        dependent_expression_phrase_count: 12,
        p1_hits: 9,
        independent_p1_method_count: 6,
        methods: ["רגיל", "קדמי"],
        dependent_methods: ["גדול"],
        dependent_phrase_count: null,
        unregistered_methods: [],
        sample_rows: [{ phrase: "בושה", method: "רגיל", value: 313, method_version: null }],
        sample_window: { returned_count: 1, total_count: null, truncated: null },
      } } },
    }],
  };
  const out = buildNormalizedMessageContext([], { bundle });
  assert.equal(out.cross_signatures.length, 1);
  const sig = out.cross_signatures[0];
  assert.equal(sig.value, 313);
  assert.equal(sig.phrase_count, null);
  assert.equal(sig.independent_phrase_count, 60);
  assert.equal(sig.independent_p1_method_count, 6);
  assert.equal(sig.dependent_phrase_count, null);
  assert.equal(sig.sample_window.total_count, null);
  assert.equal(sig.sample_rows[0].method_version, null);
  assert.deepEqual(sig.dependent_methods, ["גדול"]);
  assert.match(out.cross_signature_boundary, /cross_method_strength owns dependency normalization/);
  assert.equal(Object.isFrozen(sig), true);
  assert.equal(Object.isFrozen(sig.methods), true);
});

test("message freezes before the 3-card draw and Tarot cannot rewrite the message", async () => {
  const events = [];
  const bundle = { contract_version: 1, findings: [{ id: "uf:337" }] };
  const out = await composeNormalizedMessageReflection({
    bundle,
    trackLists: [[{ id: "combo_gem", status: "ok", value: 337, words: ["שאול"] }]],
    frozenAt: "2026-09-26T16:00:00Z",
    synthesizer: async ({ normalized }) => {
      events.push("synthesis");
      assert.equal(normalized.findings.length, 1);
      return {
        message: "זהו המסר הקפוא לפני הקלפים",
        claims: [{ id: "c1", text: "337 הוא בסיס מספרי בממצא", support: { finding_ids: ["uf:337"] } }],
        freeze: { frozen: true },
      };
    },
    tarotProvider: async () => {
      events.push("tarot");
      return { ...DRAW, cards: DRAW.cards.map((card) => ({ ...card, meaning: "אל תשנה את המסר" })) };
    },
  });

  assert.deepEqual(events, ["synthesis", "tarot"]);
  assert.equal(out.message, "זהו המסר הקפוא לפני הקלפים");
  assert.equal(out.synthesis.freeze.frozen, true);
  assert.equal(out.synthesis.claims[0].text, "337 הוא בסיס מספרי בממצא");
  assert.equal(out.reflection.cards.length, 3);
  assert.deepEqual(out.reflection.cards.map((card) => card.position), ["המצב", "האתגר", "העצה"]);
  assert.equal(out.reflection.evidence_weight, 0);
  assert.equal(out.reflection.can_modify_frozen_message, false);
  assert.equal(out.invariants.no_personal_message_engine, true);
  assert.equal(out.invariants.synthesis_freeze_must_be_explicit, true);
});

test("synthesizer omitting explicit freeze fails closed before any Tarot draw, despite researchSynthesis defaulting frozen to true", async () => {
  let draws = 0;
  await assert.rejects(
    composeNormalizedMessageReflection({
      bundle: { contract_version: 1, findings: [{ id: "uf:337" }] },
      trackLists: [[{ id: "combo_gem", status: "ok", value: 337, words: ["שאול"] }]],
      synthesizer: async () => ({
        message: "מסר שמעולם לא ביקש הקפאה מפורשת",
        claims: [{ id: "c1", text: "טענה", support: { finding_ids: ["uf:337"] } }],
        // freeze intentionally omitted — must NOT be treated as an implicit affirmative freeze.
      }),
      tarotProvider: async () => { draws += 1; return DRAW; },
    }),
    /synthesizer must explicitly set freeze\.frozen === true/
  );
  assert.equal(draws, 0);
});

test("synthesizer explicitly setting freeze.frozen = false fails closed before any Tarot draw", async () => {
  let draws = 0;
  await assert.rejects(
    composeNormalizedMessageReflection({
      bundle: { contract_version: 1, findings: [] },
      synthesizer: async () => ({
        message: "מסר",
        claims: [{ id: "c1", text: "טענה" }],
        freeze: { frozen: false },
      }),
      tarotProvider: async () => { draws += 1; return DRAW; },
    }),
    /synthesizer must explicitly set freeze\.frozen === true/
  );
  assert.equal(draws, 0);
});

test("non-composed synthesis fails closed before any Tarot draw", async () => {
  for (const status of ["failed", "insufficient_evidence"]) {
    let draws = 0;
    await assert.rejects(
      composeNormalizedMessageReflection({
        bundle: { contract_version: 1, findings: [] },
        synthesizer: async () => ({ status, message: null, claims: [], freeze: { frozen: true } }),
        tarotProvider: async () => { draws += 1; return DRAW; },
      }),
      /requires composed synthesis/
    );
    assert.equal(draws, 0);
  }
});

test("three-card reflection rejects missing, duplicate or extra positions", () => {
  assert.throws(() => normalizeThreeCardReflection({ cards: DRAW.cards.slice(0, 2) }), /exactly 3 cards/);
  assert.throws(() => normalizeThreeCardReflection({
    cards: [DRAW.cards[0], { ...DRAW.cards[1], position: "המצב" }, DRAW.cards[2]],
  }), /unique מצב\/אתגר\/עצה/);
});

test("Supabase provider reuses fn_tarot_sos and always requests exactly 3 cards", async () => {
  const calls = [];
  const provider = createSupabaseThreeCardProvider({
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: DRAW, error: null };
    },
  });
  const out = await provider();
  assert.deepEqual(calls, [["fn_tarot_sos", { p_cards: 3 }]]);
  assert.equal(out.cards.length, 3);
});
