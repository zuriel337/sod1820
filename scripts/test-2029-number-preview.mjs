import assert from "node:assert/strict";
import fs from "node:fs";
import { deriveLeadingCrossing, deriveZeroScale } from "../src/lib/research/numberCoreProjection.js";

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
const vercel = JSON.parse(read("vercel.json"));

for (const required of [
  "Sod2029Shell",
  "fetchEntityHubProjection",
  "fetchGematriaMethodTrace",
  "useResearch",
  "sod29-number-observatory",
  "למה",
  "MATH PASSPORT",
  "runNumberMathProfile",
  "NumberCore2029",
  "התכנסויות סביב",
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

const zero1237 = deriveZeroScale({
  root: 1237,
  zeroScale: { core_root: 1237, scale_chain: [1237, 12370, 123700], method_id: "zero_scale" },
});
assert.equal(zero1237.next, 12370);
assert.deepEqual(zero1237.chain, [1237, 12370, 123700]);

const rewrite = (vercel.rewrites || []).find((row) => row.source === "/2029/number/(.*)");
assert.ok(rewrite, "missing isolated Number 2029 preview rewrite");
assert.equal(rewrite.destination, "/2029.html");

for (const visual of [
  ".sod29-number-observatory",
  ".sod29-number-observatory-center",
  ".sod29-number-method-grid",
  ".sod29-number-signal-grid",
]) {
  assert.equal(css.includes(visual), true, `Number preview CSS missing: ${visual}`);
}
assert.match(css, /prefers-reduced-motion/);

console.log("2029 Number preview acceptance: PASS");
