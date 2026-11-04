import test from "node:test";
import assert from "node:assert/strict";
import {
  compileLifeJourneyDateExpressionMatrix,
  composeLifeJourneyDateMatrixMessage,
  projectLifeJourneyMethodPack,
  runLifeJourneyDateMatrixResearch,
} from "./lifeJourneyDateMatrix.js";

test("date matrix compiles a bounded name/date expression set without permutations", () => {
  const matrix = compileLifeJourneyDateExpressionMatrix({
    firstName: "דוד",
    surname: "כהן",
    birthdateIso: "1990-02-15",
  });

  assert.ok(matrix);
  assert.deepEqual(matrix.expressions.map(item => item.role), [
    "given_name",
    "family_name",
    "full_name",
    "hebrew_day",
    "hebrew_month",
    "hebrew_year",
    "hebrew_day_month",
    "hebrew_full_date",
  ]);
  assert.equal(matrix.expressions.length, 8);
  assert.ok(matrix.expressions.every(item => item.accessTier === "personal"));
  assert.ok(matrix.expressions.every(item => !item.id.includes(item.text)));
});

test("method pack accepts numeric canonical values and excludes RPC metadata", () => {
  const [item] = compileLifeJourneyDateExpressionMatrix({
    firstName: "דוד",
    birthdateIso: "1990-02-15",
  }).expressions;
  const rows = projectLifeJourneyMethodPack(item, {
    "רגיל": 14,
    "מילוי": "424",
    "מהמאגר": false,
    "כל_הערכים": { ragil: 14 },
  });

  assert.deepEqual(rows.map(row => [row.methodKey, row.value]), [["רגיל", 14], ["מילוי", 424]]);
  assert.ok(rows.every(row => row.sourceRef === "rpc:fn_all_methods"));
});

test("matrix researches every bounded pair through the injected canonical relation adapter", async () => {
  const calls = [];
  const result = await runLifeJourneyDateMatrixResearch({
    firstName: "דוד",
    surname: "כהן",
    birthdateIso: "1990-02-15",
    providers: {
      methodPack: async item => [{
        id: `method:${item.role}`,
        methodKey: "רגיל",
        methodLabel: "רגיל",
        value: item.text.length,
      }],
      relationPair: async (left, right) => {
        calls.push([left.role, right.role]);
        if (left.role !== "given_name" || right.role !== "hebrew_day") return { findings: [] };
        return {
          findings: [{
            id: "relation:1",
            projection: {
              dimensions: {
                relation_candidate: {
                  engine_signal: 3,
                  effective_independent_group_count: 2,
                  raw_independent_group_count: 5,
                  noise_flags: [],
                },
              },
            },
          }],
        };
      },
    },
  });

  assert.equal(result.expressions.length, 8);
  assert.equal(calls.length, 28);
  assert.equal(result.coverage.searchedPairCount, 28);
  assert.equal(result.coverage.truncated, false);
  assert.equal(result.relationRows.length, 1);
  assert.match(result.message, /שם פרטי/);
  assert.match(result.message, /יום עברי/);
  assert.match(result.message, /2 קבוצות שיטה עצמאיות/);
});

test("message fails honestly when no method values exist", () => {
  assert.match(composeLifeJourneyDateMatrixMessage({ expressions: [{}], methodRows: [] }), /בלי להמציא/);
});
