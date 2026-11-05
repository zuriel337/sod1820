import fs from "node:fs";
import assert from "node:assert/strict";

const projection = fs.readFileSync(new URL("../src/lib/research/researchViewerProjection.js", import.meta.url), "utf8");

assert.match(projection, /fetchCanonicalGraphEntityFindings/);
assert.match(projection, /searchResearchViewerGraphEntities/);
assert.match(projection, /fetchResearchViewerGraphEntity/);
assert.match(projection, /return fetchCanonicalGraphEntityFindings\(nodeId, \{ relationLimit \}\)/);
assert.match(projection, /\.from\("nodes"\)/);
assert.doesNotMatch(projection, /\.from\("edges"\)/);
assert.doesNotMatch(projection, /\.from\("nodes"\)[\s\S]*\.(insert|update|upsert|delete)\(/);

// The guards on the Legacy admin viewer page (src/components/admin/ResearchViewerLegacyV0Page.jsx) were removed with that page (Legacy removal, 5.11);
// the projection above is the preserved infrastructure for the new admin console and keeps its guards.

console.log("Research Viewer Entity/Graph Lens guard passed");
