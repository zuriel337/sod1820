import assert from "node:assert/strict";
import fs from "node:fs";
import { deriveLeadingCrossing, deriveZeroScale } from "../src/lib/research/numberCoreProjection.js";
import { buildNumberDeepViewProjection } from "../src/lib/research/numberDeepViewProjection.js";
import { humanSystemMethodCard } from "../src/lib/research/numberSystemMethods.js";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("src/pages/Number2029Page.jsx");
const css = read("src/pages/number2029.css");
const app = read("src/App2029.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const core = read("src/components/number2029/NumberCore2029.jsx");
const coreCss = read("src/components/number2029/numberCore2029.css");
const drawer = read("src/components/number2029/NumberDrawer2029.jsx");
const coreProjection = read("src/lib/research/numberCoreProjection.js");
const provider = read("src/lib/research/ResearchProvider.jsx");
const deepView = read("src/components/number2029/NumberDeepView2029.jsx");
const deepViewCss = read("src/components/number2029/numberDeepView2029.css");
const deepProjection = read("src/lib/research/numberDeepViewProjection.js");
const livingWorld = read("src/components/number2029/NumberLivingWorld2029.jsx");
const livingWorldCss = read("src/components/number2029/numberLivingWorld2029.css");
const lightRoutes = read("src/lib/lightRoutes.js");
const vercel = JSON.parse(read("vercel.json"));
const browserAcceptance = read("tests/world2029-release.spec.cjs");

for (const required of [
  "Sod2029Shell",
  "fetchEntityHubProjection",
  "fetchGematriaMethodTrace",
  "useResearch",
  "NumberLivingWorld2029",
  "runNumberMathProfile",
  "NumberCore2029",
  "NumberDeepView2029",
  "fetchWorldProminenceInputs",
  "buildNumberDeepViewProjection",
  "CONVERGENCES_LABEL",
  "צא למסע 878",
]) {
  assert.equal(page.includes(required), true, `Number 2029 preview must preserve native capability: ${required}`);
}

for (const forbidden of [
  "entity-hub-preview",
  "/research?",
  "/topic/",
  "AskRaziel",
  "QuickActions",
  "WatchButton",
  "conditionalFamily",
  "noFinalMap",
  "gematria_methods",
  "v_method_states",
]) {
  assert.equal(page.includes(forbidden), false, `Number 2029 preview must not inherit legacy/local authority: ${forbidden}`);
}

assert.equal(page.includes("מפגש"), false, "public 2029 Number convergence vocabulary must use התכנסות");
assert.match(page, /fetchNumberMethodProfile/);
assert.match(coreProjection, /fn_method_profile/);
assert.match(coreProjection, /dependency_rules/);
assert.match(coreProjection, /שיטה משולבת/);
assert.equal(coreProjection.includes("הצלבה · ${item.methods"), false, "general connection list must not label composite methods as hidden crossings");
assert.equal(fs.existsSync("src/lib/research/numberExpressionVerses.js"), false, "Number 2029 must not keep a parallel verse reader");
assert.match(livingWorld, /formatTanakhRef/);
assert.match(livingWorld, /formatVerseGematriaSuffix/);
assert.match(page, /verseGematriaRows/);
assert.match(core, /RAZIEL MICRO/);
assert.match(core, /סולם האפס/);
assert.match(core, /הצלבה נסתרת/);
assert.match(core, /METHOD INSPECTOR/);
assert.match(core, /חישוב/);
assert.match(core, /למד/);
assert.match(core, /עולמות/);
assert.match(core, /SPATIAL EXPLAIN · S2 LAYERED DEPTH/);
assert.match(core, /data-miluy-spatial-explain/);
assert.match(core, /traceDetail/);
assert.match(core, /onOpenHeichal/);
assert.match(coreProjection, /sub,soul/);
assert.match(coreProjection, /worlds:/);
assert.match(drawer, /NumberCore2029/);
assert.match(drawer, /fetchNumberMethodProfile/);
assert.match(drawer, /traceDetail=\{trace\}/);
assert.match(drawer, /openHeichal/);
assert.match(page, /traceDetail=\{trace\}/);
assert.match(page, /openHeichal/);
assert.match(page, /navigate\("\/heichal"\)/);
assert.match(coreCss, /\.sod29-miluy-spatial/);
assert.match(coreCss, /prefers-reduced-motion/);
assert.match(frame, /TRANSIENT\.CAPABILITY/);
assert.match(frame, /openCapability/);
assert.match(frame, /openNumber/);
assert.match(frame, /capability === "number"/);
assert.match(frame, /NumberDrawer2029/);
assert.match(provider, /\(2029\\\/\)\?number/);
assert.match(page, /GOLDEN_878_JOURNEY_ID\s*=\s*"golden:878:v1"/);
assert.match(page, /navigate\("\/world"\)/);
assert.match(app, /path="\/2029\/number\/:value"/);
assert.match(app, /Number2029Page/);


const deep404 = buildNumberDeepViewProjection({
  root: 404,
  crossMethodStrength: {
    value: 404,
    phrase_count: 153,
    independent_phrase_count: 147,
    dependent_expression_phrase_count: 6,
    independent_p1_method_count: 5,
    signal: "CROSS_METHOD",
  },
  researchRows: [{
    id: "research-axis",
    meta: { numeric_family: { deep_view_contract_v1: { status: "candidate_private_contract_frozen_against_live_foundation" } } },
    engine_detail: {
      deep_view_contract_v1: {
        deep: { show: ["raw matches"] },
        frozen_relation_counts: {
          "דת↔קדש": { effective_method_families: 2, role: "PRIMARY" },
        },
        heichal_actions: [{ action: "inspect_dependency", label: "למה זה נספר פעם אחת?", boundary: "Reliability" }],
      },
      deep_view_ranking_v1: {
        primary_clusters: [
          { key: "hub", title: "1404 hub: 1000+404", facts: ["1404=1000+404"], truth_class: "deterministic arithmetic" },
          { key: "axis", title: "1382→1404→1426", facts: ["1382→1404→1426"], truth_class: "deterministic arithmetic" },
        ],
        secondary_clusters: [
          { key: "factor", title: "[404,1404]=4×[101,351]", facts: ["404=4×101"] },
        ],
        control_clusters: ["same-letter permutations are dependency-normalized"],
        context_clusters: [],
      },
      calibration_404_474_1404_v2: {
        confirmed_dependent_expression_families: {
          "404": [{ family_key: "he:דקש", phrases: ["קדש", "שקד"], collapsed_delta: 1 }],
        },
      },
    },
  }],
});
assert.equal(deep404.evidence.raw, 153);
assert.equal(deep404.evidence.independent, 147);
assert.equal(deep404.evidence.dependent, 6);
assert.deepEqual(deep404.primary.map((row) => row.key), ["hub"], "Number Deep View must show PRIMARY clusters relevant to the current root");
assert.deepEqual(deep404.secondary.map((row) => row.key), ["factor"]);
assert.equal(deep404.dependentFamilies[0].phrases.join("|"), "קדש|שקד");
assert.equal("score" in deep404.evidence, false, "Number Deep View must never invent a universal truth score");

assert.match(deepView, /מפת המחקר/);
assert.match(deepView, /לא ציון אמת/);
assert.match(deepView, /למה זה נספר פעם אחת/);
assert.match(deepView, /פתח בהיכל/);
assert.match(deepViewCss, /min-height:44px/);
assert.match(deepViewCss, /prefers-reduced-motion/);
assert.match(deepProjection, /privateContractMayBeAccessFiltered/);

for (const required of [
  'data-experience-capability="number-living-world"',
  'data-experience-capability="number-essential"',
  'data-experience-capability="number-living-worlds"',
  'data-experience-capability="number-connections"',
  'data-experience-capability="number-math-universe"',
  'data-experience-capability="number-expression-family"',
  'data-experience-capability="number-sources-content"',
  'data-source="fn_verses_by_gematria"',
  'data-experience-capability="number-journey-gate"',
  'data-experience-capability="number-deep-research-gate"',
  'העולמות החיים',
  'היקום המתמטי',
  'מד ניווט חי',
  'מסע אישי',
  'המספר ומשפחתו',
  'toggleTheme',
]) {
  assert.equal(livingWorld.includes(required), true, `Living Number renderer missing semantic capability: ${required}`);
}
assert.match(livingWorldCss, /prefers-reduced-motion/);
assert.match(livingWorldCss, /var\(--s29-/);
assert.equal(/#[0-9a-f]{3,8}/i.test(livingWorldCss), false, "Living Number page-local renderer must consume canonical theme tokens, not own a hex palette");
assert.match(lightRoutes, /\/2029\\\/number/);
assert.match(core, /style=\{compact \? NUMBER_CORE_PALETTE : undefined\}/);
assert.match(core, /data-experience-action="number-life-seal"/);
assert.match(core, /data-experience-capability="number-system-methods"/);
assert.equal(livingWorld.includes("sod29-lw-search"), false, "Living Number must not duplicate the NumberCore search");
assert.equal(core.includes("Premium runtime"), false, "public NumberCore must not expose implementation entitlement copy");
assert.match(core, /data-experience-action="crossing-focus"/);
assert.match(core, /data-experience-action="crossing-focus-reset"/);
assert.match(core, /Root \{stageRoot\} נשאר העוגן/);
assert.match(core, /זהו כיסוי חומר, לא ציון אמת/);

const independentCross = deriveLeadingCrossing({
  root: 1237,
  expression: "התגלות",
  methodProfile: [
    { methodKey: "מסתתר", dependencyRules: [{ type: "conditional_equivalence", to: "מסתתר גדול", condition: "no_final_letters" }] },
    { methodKey: "מסתתר גדול", dependencyRules: [{ type: "conditional_equivalence", to: "מסתתר", condition: "no_final_letters" }] },
    { methodKey: "אתבש", dependencyRules: [] },
  ],
  families: [
    { method: "מסתתר", phrases: ["התגלות", "מסרים של המשיח"] },
    { method: "מסתתר גדול", phrases: ["התגלות", "עלות השחר"] },
    { method: "אתבש", phrases: ["הישועה היא בעתה"] },
  ],
});
assert.equal(independentCross?.kind, "cross_method_intersection");
assert.equal(independentCross?.methods?.[0]?.methodKey, "מסתתר");
assert.equal(independentCross?.methods?.[1]?.methodKey, "אתבש", "conditional-equivalent מסתתר גדול must not inflate the upper crossing");

const systemOne = humanSystemMethodCard({
  subject: { value: 1358 },
  source: { method: "shitat_haechad_alef_law" },
  evidence: { facts: [{ rule_id: "shitat_haechad_alef_law", rule_version: 1, input: 1358, output: { leading_unit: 1000, remainder: 358 } }] },
});
assert.equal(systemOne?.title, "שיטת האחד", "system method shitat haechad presentation");
assert.equal(systemOne?.display, "1358 → 1000 + 358");
assert.equal(systemOne?.target, 358);

const systemZero = humanSystemMethodCard({
  subject: { value: 3580 },
  source: { method: "zero_navigation" },
  evidence: { facts: [{ rule_id: "zero_navigation", rule_version: 1, input: 3580, output: { core: 358 } }] },
});
assert.equal(systemZero?.title, "האפס הנע");
assert.equal(systemZero?.target, 358);

const zero1237 = deriveZeroScale({
  root: 1237,
  zeroScale: { core_root: 1237, scale_chain: [1237, 12370, 123700], method_id: "zero_scale" },
});
assert.equal(zero1237.next, 12370);
assert.deepEqual(zero1237.chain, [1237, 12370, 123700]);



const numberBrowserSelectors = [...browserAcceptance.matchAll(/\.sod29-number-[a-z0-9-]+/g)].map((match) => match[0]);
const stableNumberAcceptanceSelectors = new Set([
  ".sod29-number-core2029",
  ".sod29-number-core2029-root",
  ".sod29-number-v10-expression",
  ".sod29-number-v10-method-switcher",
  ".sod29-number-v10-method-card",
  ".sod29-number-v10-stage",
  ".sod29-number-v10-vitality",
  ".sod29-number-v10-calculation-card",
  ".sod29-number-v10-languages",
  ".sod29-number-method-inspector",
  ".sod29-number-drawer2029",
  ".sod29-number-value",
]);
for (const selector of new Set(numberBrowserSelectors)) {
  assert.equal(
    stableNumberAcceptanceSelectors.has(selector),
    true,
    `Replaceable Number presentation must use semantic acceptance hooks, not CSS selector: ${selector}`,
  );
}

const rewrite = (vercel.rewrites || []).find((row) => row.source === "/2029/number/(.*)");
assert.ok(rewrite, "missing isolated Number 2029 preview rewrite");
assert.equal(rewrite.destination, "/2029.html");

assert.match(css, /prefers-reduced-motion/);
for (const visual of [
  ".sod29-lw-essential",
  ".sod29-lw-world-grid",
  ".sod29-lw-scrubber",
  ".sod29-lw-journey-grid",
]) {
  assert.equal(livingWorldCss.includes(visual), true, `Living Number CSS missing: ${visual}`);
}

console.log("2029 Number preview acceptance: PASS");
