import fs from "node:fs";
import assert from "node:assert/strict";

const projection = fs.readFileSync(new URL("../src/lib/research/researchViewerProjection.js", import.meta.url), "utf8");
const viewer = fs.readFileSync(new URL("../src/components/admin/ResearchViewerV0Page.jsx", import.meta.url), "utf8");

assert.match(projection, /fetchCanonicalGraphEntityFindings/);
assert.match(projection, /searchResearchViewerGraphEntities/);
assert.match(projection, /fetchResearchViewerGraphEntity/);
assert.match(projection, /return fetchCanonicalGraphEntityFindings\(nodeId, \{ relationLimit \}\)/);
assert.match(projection, /\.from\("nodes"\)/);
assert.doesNotMatch(projection, /\.from\("edges"\)/);
assert.doesNotMatch(projection, /\.from\("nodes"\)[\s\S]*\.(insert|update|upsert|delete)\(/);

assert.match(viewer, /searchResearchViewerGraphEntities/);
assert.match(viewer, /fetchResearchViewerGraphEntity/);
assert.match(viewer, /Entity\/Graph Lens · relations/);
assert.match(viewer, /selectedGraphRelations/);
assert.match(viewer, /קיום בגרף ≠ Verification ≠ Canonical ≠ Published/);
assert.match(viewer, /kindCounts\["graph-entity"\]/);
assert.match(viewer, /kindCounts\["graph-relation"\]/);

console.log("Research Viewer Entity/Graph Lens guard passed");
