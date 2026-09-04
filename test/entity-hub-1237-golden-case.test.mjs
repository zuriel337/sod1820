import assert from "node:assert/strict";
import fs from "node:fs";

const projection = fs.readFileSync(new URL("../src/lib/research/entityHubProjection.js", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../src/pages/EntityHubPreviewPage.jsx", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

// One-system composition: consume existing owners rather than inventing a Number truth layer.
assert.match(projection, /fetchCanonicalGraphEntityFindings/);
assert.match(projection, /researchObjectsToUniversalFindings/);
assert.match(projection, /fetchCanonicalTopicConvergenceFinding/);
assert.match(projection, /researchNumber/);
assert.match(projection, /from\("entity_types"\)/);

// Read-only boundary: the projection must not write truth, status, journeys or graph state.
for (const forbidden of [/\.insert\(/, /\.update\(/, /\.upsert\(/, /\.delete\(/, /admin_research_review/]) {
  assert.doesNotMatch(projection, forbidden);
}

// General Research/Discovery Path identity remains unresolved; never fabricate the candidate path.
assert.match(projection, /researchPaths:\s*\[\]/);
assert.match(projection, /intentionally unresolved/);
assert.doesNotMatch(projection, /112\s*→\s*358/);

// Existing Number Journey is allowed as a read-only source, but its live map cannot inherit seed approval.
assert.match(projection, /fn_number_journey/);
assert.match(projection, /scope:\s*"seed\/editorial-content-only"/);
assert.match(projection, /scope:\s*"live-computed"/);
assert.match(projection, /never inherit the journey seed approval state/);

// Live fn_number_journey currently returns sources as { count, value, verses[] }.
// Preserve those verse witnesses rather than assuming sources is already a flat array.
assert.match(projection, /raw\.sources\?\.verses/);
assert.match(projection, /type:\s*"verse"/);
assert.match(projection, /sourceSummary/);

// Golden Case stays hidden/admin-only and additive; legacy /number remains untouched.
assert.match(page, /useAuth/);
assert.match(page, /!isAdmin/);
assert.match(page, /Projection read-only/);
assert.match(page, /Research\/Discovery Path אוניברסלי נשאר במפורש לא פתור/);
assert.match(app, /EntityHubPreviewPage/);
assert.match(app, /\/entity-hub-preview\/:type\/:key/);
assert.match(app, /\/number\/:phrase/);

console.log("entity-hub-1237-golden-case: contract OK");
