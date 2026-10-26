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
  assert.match(received.facts, /חיבור מספרי 73/);
  assert.match(received.facts, /2 ביטויים שונים/);
  assert.equal(out.message, "המסר המנורמל הוקפא מתוך ממצאי המנוע.");
  assert.equal(out.claims.length, 2);
  assert.deepEqual(out.sharedValues, [{ value: 73, count: 2 }]);
  assert.equal(out.boundaries.internal_reflection_not_exposed, true);
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
