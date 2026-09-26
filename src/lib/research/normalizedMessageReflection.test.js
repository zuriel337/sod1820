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
