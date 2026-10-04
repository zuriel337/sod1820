import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildGuidedDiscoveryLaunch,
  GUIDED_DISCOVERY_REFS,
  GUIDED_DISCOVERY_TARGET_KIND,
  normalizeGuidedDiscoveryRef,
} from "../src/lib/research/guidedDiscovery2029.js";

const golden = normalizeGuidedDiscoveryRef(GUIDED_DISCOVERY_REFS.GOLDEN_878);
assert.equal(golden.targetKind, GUIDED_DISCOVERY_TARGET_KIND.SEMANTIC_JOURNEY);
assert.equal(golden.semanticId, "golden:878:v1");
assert.equal(golden.rootValue, 878);
assert.equal(golden.href, "/world");

const current = {
  subject: { id: "878", type: "number", label: "878", href: "/2029/number/878" },
  selection: { entityId: "878", entityType: "number" },
  lens: "number",
  dimensions: { preserved: true },
};
const returnTo = { href: "/2029/number/878", label: "דף 878" };
const launch = buildGuidedDiscoveryLaunch({
  ref: golden,
  currentContext: current,
  returnTo,
  sourceSurface: "number",
});
assert.ok(launch);
assert.equal(launch.href, "/world");
assert.equal(launch.context.journey.id, "golden:878:v1");
assert.equal(launch.context.journey.kind, "golden");
assert.equal(launch.context.dimensions.journey2029Active, true);
assert.equal(launch.context.dimensions.journey2029Mode, "guided");
assert.equal(launch.context.dimensions.journey2029Kind, "number_expression");
assert.equal(launch.context.dimensions.journey2029SourceSurface, "number");
assert.equal(launch.context.dimensions.journeySemanticId, "golden:878:v1");
assert.equal(launch.context.dimensions.journeyRoot, 878);
assert.equal(launch.context.dimensions.preserved, true);
assert.deepEqual(launch.context.returnTo, returnTo);
assert.deepEqual(launch.historyJourney, {
  root: 878,
  path: [{ type: "number", value: 878 }],
  world: "world",
  msg: "golden:878:v1",
});

const pathId = "11111111-1111-4111-8111-111111111111";
const pathRef = normalizeGuidedDiscoveryRef({
  key: "future_path",
  targetKind: GUIDED_DISCOVERY_TARGET_KIND.PUBLIC_PATH,
  pathId,
  revisionNo: 3,
  journeyKind: "number_expression",
  rootValue: 363,
  href: "/world",
  targetSurface: "world",
  label: "צאו למסע",
});
assert.equal(pathRef.pathId, pathId);
assert.equal(pathRef.revisionNo, 3);

const unresolvedPublicPath = normalizeGuidedDiscoveryRef({
  key: "future_path_no_href",
  targetKind: GUIDED_DISCOVERY_TARGET_KIND.PUBLIC_PATH,
  pathId,
  journeyKind: "number_expression",
  label: "צאו למסע",
});
assert.equal(unresolvedPublicPath.pathId, pathId);
assert.equal(unresolvedPublicPath.href, null);
assert.equal(buildGuidedDiscoveryLaunch({ ref: unresolvedPublicPath, currentContext: current }), null);

const pathLaunch = buildGuidedDiscoveryLaunch({
  ref: pathRef,
  currentContext: current,
  sourceSurface: "post",
});
assert.equal(pathLaunch.context.journey.kind, "research_path");
assert.equal(pathLaunch.context.journey.id, pathId);
assert.equal(pathLaunch.context.journey.revisionNo, 3);
assert.equal(pathLaunch.context.dimensions.journey2029Mode, "guided");
assert.equal(pathLaunch.context.dimensions.guidedPathId, pathId);
assert.equal(pathLaunch.historyJourney, null);

for (const invalid of [
  { ...GUIDED_DISCOVERY_REFS.GOLDEN_878, href: "//evil.example" },
  { ...GUIDED_DISCOVERY_REFS.GOLDEN_878, href: "/\tevil" },
  { ...GUIDED_DISCOVERY_REFS.GOLDEN_878, semanticId: "" },
  { key: "x", targetKind: "public_path", pathId: "not-a-uuid", href: "/world" },
]) {
  assert.equal(normalizeGuidedDiscoveryRef(invalid), null);
}

const frame = fs.readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
const learnMark = fs.readFileSync("src/components/experience2029/LearnMark2029.jsx", "utf8");
const numberPage = fs.readFileSync("src/pages/Number2029Page.jsx", "utf8");
const pathRuntime = fs.readFileSync("src/lib/research/researchPathRuntime.js", "utf8");

assert.match(frame, /openGuidedDiscovery/);
assert.match(frame, /buildGuidedDiscoveryLaunch/);
assert.match(frame, /getPublicResearchPath/);
assert.match(frame, /emitJourney2029\("start"/);
assert.match(frame, /mode:\s*"guided"/);
assert.match(learnMark, /guidedAction/);
assert.match(learnMark, /onGuided/);
assert.match(learnMark, /צאו למסע/);
assert.match(numberPage, /GUIDED_DISCOVERY_REFS\.GOLDEN_878/);
assert.match(numberPage, /shell\.openGuidedDiscovery/);
assert.doesNotMatch(numberPage, /journeySource:\s*"number-2029-preview"/);
assert.match(pathRuntime, /fn_research_path_public_read_v1/);

console.log("Guided Discovery 2029 seam acceptance: PASS");
