import fs from "node:fs";
import assert from "node:assert/strict";

const projection = fs.readFileSync(new URL("../src/lib/research/researchViewerProjection.js", import.meta.url), "utf8");

assert.match(projection, /fetchCanonicalGraphEntityFindings/);
assert.match(projection, /searchResearchViewerGraphEntities/);
assert.match(projection, /fetchResearchViewerGraphEntity/);
// #1043 (f15c72884, 12.10): the canonical adapter no longer projects retired (is_active=false)
// counterparts as live relations; this admin inspection path opts back in explicitly and must
// keep doing so (the previous exact call, without includeInactive, now silently hides them).
assert.match(projection, /return fetchCanonicalGraphEntityFindings\(nodeId, \{ relationLimit, includeInactive: true \}\)/);
assert.match(projection, /\.from\("nodes"\)/);
// The opt-in above is only meaningful while the shared adapter hides retired counterparts by
// default, and the public readers of that adapter never ask for them.
const adapter = fs.readFileSync(new URL("../src/lib/research/entityGraphFinding.js", import.meta.url), "utf8");
assert.match(adapter, /export async function fetchCanonicalGraphEntityFindings\(nodeId, \{[^}]*\bincludeInactive = false\b/);
for (const publicReader of ["../src/lib/research/entityHubProjection.js", "../src/components/research/WorldPeopleSources2029.jsx"]) {
  assert.doesNotMatch(fs.readFileSync(new URL(publicReader, import.meta.url), "utf8"), /includeInactive/, `${publicReader} must not project retired relations`);
}
assert.doesNotMatch(projection, /\.from\("edges"\)/);
assert.doesNotMatch(projection, /\.from\("nodes"\)[\s\S]*\.(insert|update|upsert|delete)\(/);

// The guards on the Legacy admin viewer page (src/components/admin/ResearchViewerLegacyV0Page.jsx) were removed with that page (Legacy removal, 5.11);
// the projection above is the preserved infrastructure for the new admin console and keeps its guards.

console.log("Research Viewer Entity/Graph Lens guard passed");
