import test from "node:test";
import assert from "node:assert/strict";
import {
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

test("unified family research compares every selected person pair through the normalized relation provider", async () => {
  const calls = [];
  const result = await runLifeJourneyFamilyResearch({
    members,
    providers: {
      relationPair: async (left, right) => {
        calls.push([left.memberRef, right.memberRef]);
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
  assert.equal(calls.length, 3);
  assert.deepEqual(result.coverage, { memberCount: 3, searchedPairCount: 3, connectionCount: 3, truncated: false });
  assert.match(result.message, /מפה המשפחתית/);
  assert.match(result.message, /לאחר נרמול התלות/);
});

test("one selected person does not invoke the relation engine", async () => {
  const result = await runLifeJourneyFamilyResearch({
    members: members.slice(0, 1),
    providers: { relationPair: async () => { throw new Error("must not run"); } },
  });
  assert.equal(result.coverage.searchedPairCount, 0);
  assert.match(result.message, /לפחות שני אנשים/);
});
