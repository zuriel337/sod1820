import test from "node:test";
import assert from "node:assert/strict";
import {
  compileLifeJourneyNameExpressions,
  composeLifeJourneyNameMessage,
  runLifeJourneyNameResearch,
} from "./lifeJourneyNameResearch.js";

function methodRows(text) {
  const base = text === "שאול" ? 337 : text === "פולייס" ? 186 : 523;
  return [
    { methodKey: "ragil", displayLabel: "רגיל", computedValue: base, sortOrder: 1 },
    { methodKey: "siduri", displayLabel: "סידורי", computedValue: 40, sortOrder: 2 },
    { methodKey: "miluy", displayLabel: "מילוי", computedValue: base + 230, sortOrder: 3 },
  ];
}

function relationFinding(left, right, groups = 2) {
  return {
    findings: [{
      id: `relation:${left.role}:${right.role}`,
      projection: { dimensions: { relation_candidate: {
        engine_signal: 7,
        effective_independent_group_count: groups,
        raw_independent_group_count: groups + 1,
      } } },
    }],
  };
}

test("name expressions keep first, family and full name as private authorized representations", () => {
  const expressions = compileLifeJourneyNameExpressions({ firstName: "שָׁאוּל", surname: "פולייס", fullName: "שָׁאוּל פולייס" });
  assert.deepEqual(expressions.map(row => [row.role, row.text]), [
    ["given_name", "שָׁאוּל"],
    ["family_name", "פולייס"],
    ["full_name", "שָׁאוּל פולייס"],
  ]);
  assert.equal(expressions.every(row => row.accessTier === "personal"), true);
});

test("runtime uses canonical method profiles and normalized direct-pair relations", async () => {
  const calls = [];
  const result = await runLifeJourneyNameResearch({ firstName: "שאול", surname: "פולייס" }, {
    methodProfile: async item => { calls.push(["methods", item.role]); return methodRows(item.text); },
    relationPair: async (left, right) => { calls.push(["relation", left.role, right.role]); return relationFinding(left, right); },
  });

  assert.equal(result.rawName, "שאול פולייס");
  assert.equal(result.regularValue, 523);
  assert.deepEqual(result.coverage, {
    expressionCount: 3,
    methodCount: 3,
    methodValueCount: 9,
    searchedPairCount: 3,
    relationCount: 3,
    truncated: false,
  });
  assert.equal(calls.filter(row => row[0] === "methods").length, 3);
  assert.equal(calls.filter(row => row[0] === "relation").length, 3);
  assert.match(result.message, /לאחר נרמול התלות/);
  assert.equal(result.methodFindings.every(row => row.sourceRef === "rpc:fn_method_profile"), true);
});

test("one-part name remains useful without inventing a relation", async () => {
  const result = await runLifeJourneyNameResearch("שאול", {
    methodProfile: async item => methodRows(item.text),
    relationPair: async () => { throw new Error("no pair should run"); },
  });
  assert.equal(result.coverage.expressionCount, 1);
  assert.equal(result.coverage.searchedPairCount, 0);
  assert.match(result.message, /נבדק ב־3 שיטות קנוניות/);
});

test("message fails closed when the method engine returns no values", () => {
  assert.match(composeLifeJourneyNameMessage({ expressions: [{}] }), /בלי להמציא/);
});
