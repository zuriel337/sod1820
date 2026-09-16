import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const app2029 = read("src/App2029.jsx");
const heichal2029 = read("src/pages/Heichal2029Page.jsx");
const canonical = read("src/lib/research/canonicalGematria.js");
const registry = read("src/lib/research/gematriaMethodRegistry.js");
const localContract = read("src/lib/research/gematriaCalculationContract.js");
const coreEngine = read("src/lib/research/coreEngine.js");
const legacy = read("src/components/GematriaCalculatorLegacy.jsx");
const community = read("src/pages/CommunityCalculatorPage.jsx");
const mini = read("src/components/GematriaMiniDemo.jsx");
const cube = read("src/components/GematriaCube.jsx");
const calc3d = read("src/components/GematriaCalculator3D.jsx");
const methodAnalyze = read("src/components/MethodAnalyze.jsx");

// Current 2029 calculator entry is a document-boundary handoff to the legacy app. It must never
// import or execute the compatibility calculators inside the isolated 2029 React tree.
assert.match(app2029, /window\.location\.assign\(href\)/, "2029 non-native routes must cross the document boundary");
assert.match(heichal2029, /to=["']\/research\?tool=gematria["']/, "2029 calculate action must remain a legacy-document handoff until a native canonical server consumer exists");
for (const forbidden of [
  "GematriaCalculatorLegacy",
  "CommunityCalculatorPage",
  "GematriaMiniDemo",
  "GematriaCube",
  "GematriaCalculator3D",
  "gematriaCalculationContract",
  "coreEngine",
]) {
  assert.equal(app2029.includes(forbidden), false, `App2029 must not import local Gematria compatibility code: ${forbidden}`);
  assert.equal(heichal2029.includes(forbidden), false, `Heichal2029 must not import local Gematria compatibility code: ${forbidden}`);
}

// Canonical Finding production is server-only. The adapter may normalize text locally, but it may
// not calculate a numeric Gematria value locally and it must not fabricate claim verification.
assert.match(canonical, /supabase\.rpc\(["']gematria_api["']\s*,\s*\{\s*p_text:/, "canonical Gematria adapter must source numbers from gematria_api");
assert.match(canonical, /makeUniversalFinding/, "canonical server response must be the input to Universal Finding projection");
assert.match(canonical, /verification_state:\s*["']not_tested["']/, "server calculation without a submitted claim must remain not_tested");
for (const forbidden of ["method.fn(", "calcGem(", "calculateGematriaEnvelope("]) {
  assert.equal(canonical.includes(forbidden), false, `canonical Finding adapter must not use local numeric execution: ${forbidden}`);
}

// Registry identity/state stays live and dynamic; no fixed method count is owned by the consumer.
assert.match(registry, /\.from\(["']v_method_states["']\)/, "method state consumer must read the canonical live Registry projection");
assert.equal(/METHOD_COUNT|FIXED_METHOD_COUNT|EXPECTED_METHOD_COUNT/.test(registry), false, "Registry consumer must not preserve a fixed method count");

// Certification of the five legacy surfaces at this branch point. These assertions deliberately
// classify, rather than bless, the remaining local execution. If a surface is migrated later this
// test should be updated together with its retirement classification.
assert.ok(legacy.includes("value: m.fn(word)"), "GematriaCalculatorLegacy classification changed; re-certify authority boundary");
assert.ok(community.includes("calculateGematriaEnvelope") || community.includes("resolve(name).value"), "CommunityCalculatorPage classification changed; re-certify authority boundary");
assert.ok(mini.includes("calcGem(clean)"), "GematriaMiniDemo classification changed; re-certify authority boundary");
assert.match(cube, /return null;/, "GematriaCube must remain retired or be re-certified before reactivation");
assert.match(calc3d, /return null;/, "GematriaCalculator3D must remain retired or be re-certified before reactivation");

// Direct local dependencies discovered by G3-D remain compatibility-only and are forbidden from
// 2029 reachability by the built-graph gate. They also must not mint Universal Finding/Claim state.
assert.ok(localContract.includes("value: method.fn(raw)"), "local calculation contract changed; re-certify before treating it as compatibility");
assert.ok(coreEngine.includes("calculateGematriaEnvelope"), "research core calculation dependency changed; re-certify authority boundary");
assert.ok(methodAnalyze.includes("calculateGematriaEnvelope"), "MethodAnalyze calculation dependency changed; re-certify authority boundary");
for (const [name, source] of [
  ["GematriaCalculatorLegacy", legacy],
  ["CommunityCalculatorPage", community],
  ["GematriaMiniDemo", mini],
  ["gematriaCalculationContract", localContract],
  ["coreEngine", coreEngine],
  ["MethodAnalyze", methodAnalyze],
]) {
  assert.equal(source.includes("makeUniversalFinding"), false, `${name} must not mint Universal Findings from client-only numbers`);
  assert.equal(source.includes("verification_state:"), false, `${name} must not mint verification state from client-only numbers`);
}

console.log("G3-D Gematria authority isolation: PASS");
console.log("SERVER/REGISTRY authority path: canonicalGematria -> gematria_api; method states -> v_method_states");
console.log("LOCAL compatibility classified: GematriaCalculatorLegacy, CommunityCalculatorPage, GematriaMiniDemo, gematriaCalculationContract, coreEngine, MethodAnalyze");
console.log("RETIRED: GematriaCube, GematriaCalculator3D");
