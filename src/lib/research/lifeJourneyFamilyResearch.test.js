import test from "node:test";
import assert from "node:assert/strict";
import {
  compileLifeJourneyFamilyExpressionMatrix,
  compileLifeJourneyFamilyRepresentations,
  runLifeJourneyFamilyResearch,
} from "./lifeJourneyFamilyResearch.js";

const members = [
  { memberRef: "person:owner:self", fullName: "הורה משפחה" },
  { memberRef: "person:owner:p:1", fullName: "ילד ראשון" },
  { memberRef: "person:owner:p:2", fullName: "ילדה שנייה" },
];

test("family representations remain bounded and private", () => {
  const rows = compileLifeJourneyFamilyRepresentations([...members, { memberRef: "", fullName: "חסר" }]);
  assert.equal(rows.length, 3);
  assert.equal(rows.every(row => row.accessTier === "personal" && row.role === "family_member_name"), true);
});

test("family expression matrix reuses name and Hebrew date expressions for every selected person", () => {
  const rows = compileLifeJourneyFamilyExpressionMatrix([
    { memberRef: "person:owner:self", fullName: "הורה משפחה", firstName: "הורה", surname: "משפחה", birthdate: "1990-02-15" },
  ]);
  assert.deepEqual(rows.map(row => row.role), [
    "given_name", "family_name", "full_name", "hebrew_day", "hebrew_month", "hebrew_year", "hebrew_day_month", "hebrew_full_date",
  ]);
  assert.equal(rows.every(row => row.memberRef === "person:owner:self" && row.accessTier === "personal"), true);
});

test("unified family research prefilters shared numeric bases and normalizes all cross-person expression candidates", async () => {
  const calls = [];
  const result = await runLifeJourneyFamilyResearch({
    members,
    providers: {
      methodPack: async expression => [{ id: `method:${expression.id}`, methodKey: "ragil", methodLabel: "רגיל", value: 73 }],
      relationPair: async (left, right) => {
        calls.push([left.memberRef, left.role, right.memberRef, right.role]);
        return { findings: [{
          id: `family:${calls.length}`,
          projection: { dimensions: { relation_candidate: {
            engine_signal: calls.length,
            effective_independent_group_count: 2,
            raw_independent_group_count: 3,
          } } },
        }] };
      },
    },
  });
  assert.equal(calls.length, 27);
  assert.deepEqual(result.coverage, {
    memberCount: 3,
    expressionCount: 9,
    methodValueCount: 9,
    possiblePairCount: 27,
    candidatePairCount: 27,
    searchedPairCount: 27,
    relationCount: 27,
    connectionCount: 3,
    truncated: false,
  });
  assert.equal(result.connections.every(connection => connection.expressionConnectionCount === 9), true);
  assert.deepEqual(result.sharedValues, [{ value: 73, count: 3, expressionCount: 9 }]);
  assert.match(result.message, /מפה המשפחתית/);
  assert.match(result.message, /לאחר נרמול התלות/);
});

test("pairs without a shared numeric basis never invoke the normalized relation provider", async () => {
  let calls = 0;
  const result = await runLifeJourneyFamilyResearch({
    members: members.slice(0, 2),
    providers: {
      methodPack: async expression => [{ value: expression.memberRef.endsWith("self") ? 73 : 101 }],
      relationPair: async () => { calls += 1; throw new Error("must not run"); },
    },
  });
  assert.equal(calls, 0);
  assert.equal(result.coverage.possiblePairCount, 9);
  assert.equal(result.coverage.candidatePairCount, 0);
  assert.equal(result.coverage.searchedPairCount, 0);
});

test("one selected person does not invoke the relation engine", async () => {
  const result = await runLifeJourneyFamilyResearch({
    members: members.slice(0, 1),
    providers: {
      methodPack: async () => { throw new Error("must not run"); },
      relationPair: async () => { throw new Error("must not run"); },
    },
  });
  assert.equal(result.coverage.searchedPairCount, 0);
  assert.match(result.message, /לפחות שני אנשים/);
});
