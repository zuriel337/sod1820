import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyLifeJourneyFamilyValues,
  compileLifeJourneyFamilyExpressionMatrix,
  compileLifeJourneyFamilyRepresentations,
  createSupabaseLifeJourneyFamilyProviders,
  normalizeLifeJourneyExpressionMethods,
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
  assert.deepEqual(result.sharedValues, [{
    value: 73,
    count: 3,
    memberCount: 3,
    expressionCount: 9,
    distinctExpressionCount: 9,
    normalizedEvidenceCount: 9,
    methodGroupCount: 1,
    repeatedExpressionCount: 0,
    sameMethod: true,
    classification: "same_method_distinct_expressions",
  }]);
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

test("Registry equivalence collapses regular and large only when the input has no final letter", () => {
  const methods = [
    { methodKey: "רגיל", methodLabel: "רגיל", value: 337, sortOrder: 1, dependencyRules: [{ type: "conditional_equivalence", to: "גדול", condition: "no_final_letters" }] },
    { methodKey: "גדול", methodLabel: "גדול", value: 337, sortOrder: 6, dependencyRules: [{ type: "conditional_equivalence", to: "רגיל", condition: "no_final_letters" }] },
  ];
  const noFinal = normalizeLifeJourneyExpressionMethods({ id: "zuriel", text: "צוריאל", methods });
  assert.equal(noFinal.groups.length, 1);
  assert.equal(noFinal.groups[0].equivalentMethodCount, 2);

  const withFinal = normalizeLifeJourneyExpressionMethods({
    id: "avraham",
    text: "אברהם",
    methods: methods.map((method, index) => ({ ...method, value: index ? 808 : 248 })),
  });
  assert.equal(withFinal.groups.length, 2);
});

test("family value projection separates a repeated surname from cross-expression convergence", () => {
  const regularDependency = [{ type: "conditional_equivalence", to: "גדול", condition: "no_final_letters" }];
  const rows = [
    { id: "z-given", memberRef: "z", role: "given_name", text: "צוריאל", methods: [
      { methodKey: "רגיל", methodLabel: "רגיל", value: 337, dependencyRules: regularDependency },
      { methodKey: "גדול", methodLabel: "גדול", value: 337, dependencyRules: [{ type: "conditional_equivalence", to: "רגיל", condition: "no_final_letters" }] },
    ] },
    ...["z", "a", "m"].map(memberRef => ({
      id: `${memberRef}-surname`, memberRef, role: "family_name", text: "פולייס",
      methods: [{ methodKey: "מילוי", methodLabel: "מילוי", value: 337, dependencyRules: [] }, { methodKey: "רגיל", methodLabel: "רגיל", value: 196, dependencyRules: [] }],
    })),
  ];
  const projection = classifyLifeJourneyFamilyValues(rows);
  assert.deepEqual(projection.sharedExpressions.map(item => ({ text: item.expressionText, people: item.memberCount })), [
    { text: "פולייס", people: 3 },
  ]);
  assert.equal(projection.convergences.length, 1);
  assert.deepEqual(projection.convergences[0], {
    value: 337,
    count: 3,
    memberCount: 3,
    expressionCount: 4,
    distinctExpressionCount: 2,
    normalizedEvidenceCount: 2,
    methodGroupCount: 2,
    repeatedExpressionCount: 1,
    sameMethod: false,
    classification: "cross_method_distinct_expressions",
  });
  assert.equal(projection.normalization.collapsedMethodResultCount, 1);
  assert.equal(projection.convergences.some(item => item.value === 196), false, "same surname alone is not a cross-expression convergence");
});

test("identical expressions are not sent to the relation engine", async () => {
  const relationCalls = [];
  const result = await runLifeJourneyFamilyResearch({
    members: [
      { memberRef: "p:1", fullName: "אחד פולייס", firstName: "אחד", surname: "פולייס" },
      { memberRef: "p:2", fullName: "שני פולייס", firstName: "שני", surname: "פולייס" },
    ],
    providers: {
      methodPack: async () => [{ methodKey: "רגיל", methodLabel: "רגיל", value: 196 }],
      relationPair: async (left, right) => {
        relationCalls.push([left.text, right.text]);
        return { findings: [{ id: `${left.id}:${right.id}`, projection: { dimensions: { relation_candidate: { engine_signal: 1, effective_independent_group_count: 1 } } } }] };
      },
    },
  });
  assert.equal(relationCalls.some(([left, right]) => left === "פולייס" && right === "פולייס"), false);
  assert.equal(result.sharedExpressions[0].expressionText, "פולייס");
  assert.equal(result.sharedValues.every(item => item.distinctExpressionCount >= 2), true);
});

test("family relation adapter sends the exact expression, not the member display name", async () => {
  const calls = [];
  const providers = createSupabaseLifeJourneyFamilyProviders({
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: null, error: null };
    },
    from: () => { throw new Error("registry read is not needed for relation-only test"); },
  });
  await providers.relationPair(
    { id: "left", role: "given_name", text: "צוריאל", name: "צוריאל פולייס" },
    { id: "right", role: "full_name", text: "חדוה סינה", name: "חדוה סינה" },
  );
  assert.deepEqual(calls, [{ name: "fn_relation_candidate", args: { p_a: "צוריאל", p_b: "חדוה סינה" } }]);
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
