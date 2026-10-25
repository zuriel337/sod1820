import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareElsRelationshipResearchPlan } from "../src/lib/research/elsAutomaticResearchPlan.js";

const NATIVE = new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url);
const CSS = new URL("../src/components/experience2029/elsNativeClassic2029.css", import.meta.url);

test("relationship research stays bounded, local and explicit before canonical execution", () => {
  const plan = prepareElsRelationshipResearchPlan({
    primaryTerm: "משיח",
    secondTerm: "דוד",
    additionalTerms: "אליהו\nיבואו",
    scope: "torah",
  });
  assert.equal(plan.contract, "els_relationship_research_plan_v1");
  assert.deepEqual(plan.pairs.map(pair => `${pair.axis}×${pair.term}`), ["משיח×דוד", "משיח×אליהו", "משיח×יבואו"]);
  assert.ok(plan.pairs.length <= plan.pairLimit);
  assert.equal(plan.allPairsGenerated, false);
  assert.equal(plan.explicitExecutionRequired, true);
  assert.equal(plan.persisted, false);
  assert.equal(plan.aiUsed, false);
  assert.equal(plan.truthPromotion, false);
});

test("the structures rail sends one chosen relationship pair through the existing cross request", async () => {
  const [native, css] = await Promise.all([readFile(NATIVE, "utf8"), readFile(CSS, "utf8")]);
  assert.match(native, /data-els-relationship-research="v1"/);
  assert.match(native, /prepareElsRelationshipResearchPlan\(\{ primaryTerm, secondTerm, additionalTerms, scope \}\)/);
  assert.match(native, /onSearchPair\(\{ \.\.\.selectedPair, scope: plan\.scope, radius: plan\.radius \}\)/);
  assert.match(native, /const startRelationshipCross = \(pair\) =>/);
  assert.match(native, /requestSearch\("cross", \{ axis, term, scope, radius \}\)/);
  assert.equal((native.match(/<TzofenEmbed/g) || []).length, 1, "the relationship UI must not mount another ELS engine");
  assert.doesNotMatch(native.slice(native.indexOf("function RelationshipResearchPlanner"), native.indexOf("function StructuralPriorityRail")), /localStorage|sessionStorage|supabase|fetch\(/);
  assert.match(css, /\.els29-native-relationship-plan\{/);
});
