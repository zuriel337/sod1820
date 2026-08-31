import assert from "node:assert/strict";
import fs from "node:fs";

const projection = fs.readFileSync(new URL("../src/lib/research/researchViewerProjection.js", import.meta.url), "utf8");
const viewer = fs.readFileSync(new URL("../src/components/admin/ResearchViewerV0Page.jsx", import.meta.url), "utf8");

assert.match(projection, /fetchCanonicalGematriaFindings/);
assert.match(projection, /fetchCanonicalTopicConvergenceFinding/);
assert.match(projection, /fetchResearchViewerDiscovery/);
assert.match(projection, /fetchResearchViewerGematria/);
assert.doesNotMatch(projection, /research_objects.*insert|from\(["']research_objects["']\).*insert/s);

assert.match(viewer, /fetchResearchViewerDiscovery/);
assert.match(viewer, /fetchResearchViewerGematria/);
assert.match(viewer, /Calculation|CALCULATION/);
assert.match(viewer, /לא הופכת ל־match\/claim\/canonical/);
assert.doesNotMatch(viewer, /CALIBRATION_REFS/);
assert.doesNotMatch(viewer, /engine_verified/);
assert.doesNotMatch(viewer, /gematriaApiResultToFindings/);

console.log("research viewer heterogeneous source guards: ok");
