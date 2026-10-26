import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLifeJourneyFamilyAnalysisFacts,
  runLifeJourneyFamilyAnalysis,
} from "./lifeJourneyFamilyAnalysis.js";

const research = {
  state: "ready",
  rows: [
    { memberRef: "person:private:1", name: "שם פרטי א", state: "ready", data: { methodFindings: [{ id: "m1", value: 73 }], crossFindings: [] } },
    { memberRef: "person:private:2", name: "שם פרטי ב", state: "ready", data: { methodFindings: [{ id: "m2", value: 73 }], crossFindings: [] } },
  ],
  connections: [{
    id: "family-connection-1",
    left: { memberRef: "person:private:1", name: "שם פרטי א" },
    right: { memberRef: "person:private:2", name: "שם פרטי ב" },
    independentGroupCount: 2,
    engineSignal: 4,
  }],
  sharedValues: [{ value: 73, count: 2, distinctExpressionCount: 2, sameMethod: true }],
  sourceResearch: {
    memberSources: [{ memberRef: "person:private:1", verses: [{ ref: "תהלים 1:1", text: "שם פרטי א הולך בדרך", sourceRef: "rpc:fn_name_verse" }], consensus: [] }],
    numberSources: [{ value: 73, phrases: [
      { phrase: "שם פרטי א", sourceRefs: ["bidim:private-name"] },
      { phrase: "אור", sourceRefs: ["bidim:public-light"] },
    ] }],
    coverage: { verseCount: 1, equalPhraseCount: 2 },
  },
  coverage: { memberCount: 2, searchedPairCount: 1, connectionCount: 1 },
  message: "מסר מקומי חלופי",
};

const draw = {
  framework: "reflection only",
  cards: [
    { position: "המצב", n: 1, arcana: "א", meaning: "א" },
    { position: "האתגר", n: 2, arcana: "ב", meaning: "ב" },
    { position: "העצה", n: 3, arcana: "ג", meaning: "ג" },
  ],
};

test("family analysis sends only anonymized normalized facts and never exposes internal cards", async () => {
  const events = [];
  let received;
  const out = await runLifeJourneyFamilyAnalysis({
    research,
    birthReflections: new Map([["person:private:1", {
      humanDesign: {
        type: "Generator",
        authority: "Sacral Authority",
        profile: "3/5",
        definedCenters: [{ key: "sacral" }],
        definedChannels: [],
        activatedGates: [5, 15],
      },
      sky: {
        angles: { ascendant: { sign: "Aries" }, midheaven: { sign: "Capricorn" } },
        bodies: [{ key: "sun" }],
        aspects: [],
      },
      trace: { engine: "natalengine", engineVersion: "1.6.0" },
    }]]),
    now: () => "2026-10-26T00:00:00Z",
    aiAnalysisProvider: async input => {
      events.push("analysis");
      received = input;
      return "המסר המנורמל הוקפא מתוך ממצאי המנוע.";
    },
    tarotProvider: async ({ cards }) => {
      events.push("internal-reflection");
      assert.equal(cards, 3);
      return draw;
    },
  });

  assert.deepEqual(events, ["analysis", "internal-reflection"]);
  assert.equal(received.subject, "מפת מחקר משפחתית");
  assert.doesNotMatch(received.facts, /שם פרטי|person:private/);
  assert.doesNotMatch(received.facts, /Generator|Sacral Authority|Aries|Capricorn/);
  assert.match(received.facts, /חיבור מספרי 73/);
  assert.match(received.facts, /2 ביטויים שונים/);
  assert.match(received.facts, /אור/);
  assert.match(received.facts, /תהלים 1:1/);
  assert.doesNotMatch(received.facts, /שם פרטי א/);
  assert.equal(out.message, "המסר המנורמל הוקפא מתוך ממצאי המנוע.");
  assert.equal(out.claims.length, 4);
  assert.deepEqual(out.sharedValues, [{ value: 73, count: 2 }]);
  assert.equal(out.boundaries.internal_reflection_not_exposed, true);
  assert.equal(out.boundaries.public_source_text_sanitized_before_interpreter, true);
  assert.equal(out.coverage.verseCount, 1);
  assert.equal(out.coverage.equalPhraseCount, 2);
  assert.equal(out.synthesisPack.auxiliary.humanDesignCount, 1);
  assert.equal(out.synthesisPack.auxiliary.skyCount, 1);
  assert.equal(out.synthesisPack.interpreter.birthLensDetailsIncluded, false);
  assert.equal(out.boundaries.one_private_synthesis_pack, true);
  assert.equal(out.boundaries.birth_lenses_evidence_weight, 0);
  assert.equal("cards" in out, false);
  assert.equal("reflection" in out, false);
  assert.equal("reflection_check" in out, false);
  assert.doesNotMatch(JSON.stringify(out), /reflection only|\"arcana\"/);
});

test("family facts contain no private identity fields", () => {
  const facts = buildLifeJourneyFamilyAnalysisFacts(research);
  assert.match(facts, /אנשים שנבדקו: 2/);
  assert.match(facts, /זוגות שנבדקו: 1/);
  assert.doesNotMatch(facts, /שם פרטי|person:private/);
});
