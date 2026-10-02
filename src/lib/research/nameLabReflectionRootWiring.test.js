import test from "node:test";
import assert from "node:assert/strict";
import {
  composeNameLabEvidenceBackedSynthesisDraft,
  createNameLabReflectionRuntimeProviders,
  runNameLabReflectionRuntime,
} from "./nameLabReflectionRuntime.js";
import { compareReflectionToFrozenSynthesis } from "./normalizedMessageReflection.js";
import { normalizeResearchSynthesis } from "./researchSynthesis.js";
import { composeNameLabNormalizedEvidenceBundle } from "./nameLabFinding.js";

function tracks() {
  return [
    { id: "combo_gem", status: "ok", value: 238, words: ["ויהי אור", "חסד עליון"] },
    {
      id: "milui", status: "ok",
      data: [{ part: "אוראל", milui: 828, ragil: 238, matches: [{ phrase: "רזי תורה", source: "words" }] }],
    },
  ];
}

function cards() {
  return {
    cards: [
      { position: "המצב", n: 1, arcana: "הקוסם", theme: "אור ובהירות", meaning: "הפיכת רעיון למעשה", letter: "א", orientation: "ישר" },
      { position: "האתגר", n: 9, arcana: "הנזיר", theme: "חיפוש", meaning: "התבוננות", letter: "י", orientation: "ישר" },
      { position: "העצה", n: 4, arcana: "הקיסר", theme: "סדר", meaning: "מבנה ויציבות", letter: "ה", orientation: "ישר" },
    ],
  };
}

test("structured AI motifs are allowlisted to real Finding IDs and keep interpretation frame non-evidentiary", () => {
  const bundle = composeNameLabNormalizedEvidenceBundle({ name: "אוראל", trackLists: [tracks()] });
  const ids = bundle.findings.map((f) => f.id);
  const draft = composeNameLabEvidenceBackedSynthesisDraft({
    findings: bundle.findings,
    aiMessage: "מסר",
    aiMotifs: [{
      key: "light",
      label: "אור",
      summary: "גילוי ובהירות",
      finding_ids: [ids[0], "uf:not-real"],
      frame: { essence: "גילוי", power: "בהירות", shadow: "פיזור", balance: "מיקוד", action: "בחר קו" },
    }],
    frozenAt: "2026-10-02T00:00:00Z",
  });

  assert.equal(draft.motifs.length, 1);
  assert.deepEqual(draft.claims[0].support.finding_ids, [ids[0]]);
  const normalized = normalizeResearchSynthesis(draft, { allowedFindingIds: ids });
  assert.equal(normalized.motifs[0].frame.power, "בהירות");
  assert.equal(normalized.invariants.interpretive_frame_is_not_evidence, true);
});

test("post-Tarot comparator can echo letters/motifs but never confirm truth or modify message", () => {
  const reflection = {
    cards: cards().cards,
  };
  const synthesis = {
    motifs: [{
      key: "light",
      label: "אור",
      summary: "אור ובהירות",
      frame: { essence: "גילוי", power: "בהירות", shadow: "פיזור", balance: "מיקוד", action: "בחר קו" },
    }],
  };
  const check = compareReflectionToFrozenSynthesis({ reflection, synthesis, subject: "אוראל כהן" });
  assert.equal(check.cards[0].letter_in_subject, true);
  assert.equal(check.cards[0].relation, "echo");
  assert.ok(check.cards[0].motif_matches.some((m) => m.motif_key === "light"));
  assert.equal(check.evidence_weight, 0);
  assert.equal(check.can_modify_frozen_message, false);
  assert.match(check.truth_boundary, /not confirmation/);
});

test("runtime accepts surname/birthdate for canonical NameLab call but never sends birthdate to AI facts", async () => {
  let receivedOpts = null;
  let aiFacts = "";
  const result = await runNameLabReflectionRuntime({
    name: "אוראל",
    surname: "כהן",
    birthdate: "28.8.2008",
    nameMultiProvider: async (_name, opts) => {
      receivedOpts = opts;
      return { graded: false, tracks: tracks() };
    },
    aiAnalysisProvider: async ({ subject, facts }) => {
      assert.equal(subject, "אוראל כהן");
      aiFacts = facts;
      const bundle = composeNameLabNormalizedEvidenceBundle({ name: "אוראל כהן", trackLists: [tracks()] });
      return {
        message: "האור מקבל כיוון.",
        motifs: [{
          key: "light",
          label: "אור",
          summary: "בהירות וגילוי",
          finding_ids: [bundle.findings[0].id],
          frame: { power: "בהירות", shadow: "פיזור", balance: "מיקוד", action: "בחר כיוון" },
        }],
      };
    },
    tarotProvider: async () => cards(),
    now: () => "2026-10-02T00:00:00Z",
  });

  assert.equal(receivedOpts.surname, "כהן");
  assert.equal(receivedOpts.birthdate, "28.8.2008");
  assert.doesNotMatch(aiFacts, /28\.8\.2008|birthdate/);
  assert.equal(result.status, "ok");
  assert.equal(result.payload.messageReflection.motifs[0].frame.power, "בהירות");
  assert.equal(result.payload.messageReflection.reflection_check.evidence_weight, 0);
  assert.equal(result.payload.messageReflection.message, "האור מקבל כיוון.");
});

test("non-UI binder reuses getNameMulti/getAiAnalysis/fn_tarot_sos without a new endpoint", async () => {
  const calls = [];
  const providers = createNameLabReflectionRuntimeProviders({
    getNameMulti: async (name, opts) => {
      calls.push(["name", name, opts?.surname]);
      return { graded: false, tracks: tracks() };
    },
    getAiAnalysis: async (args) => {
      calls.push(["ai", args.operation, args.surface]);
      return "מסר";
    },
    supabase: {
      rpc: async (name, args) => {
        calls.push(["rpc", name, args.p_cards]);
        return { data: cards(), error: null };
      },
    },
  });

  const out = await runNameLabReflectionRuntime({
    name: "אוראל",
    surname: "כהן",
    ...providers,
  });
  assert.equal(out.status, "ok");
  assert.deepEqual(calls.map((x) => x[0]), ["name", "ai", "rpc"]);
  assert.deepEqual(calls[2], ["rpc", "fn_tarot_sos", 3]);
});
