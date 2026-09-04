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

// Public preview must degrade protected Research Objects rather than weakening DB access.
assert.match(projection, /isAccessDenied/);
assert.match(projection, /research_objects_not_readable_for_current_session/);
assert.match(projection, /access:\s*research\.access/);
assert.doesNotMatch(page, /useAuth/);
assert.doesNotMatch(page, /!isAdmin/);
assert.match(page, /Public preview/);
assert.match(page, /אינו עוקף את ה־RLS\/GRANT/);

// Research/Discovery Path is not a second truth store and is not fabricated here.
assert.match(projection, /researchPaths:\s*\[\]/);
assert.doesNotMatch(projection, /112\s*→\s*358/);
assert.match(page, /traversal\/snapshot/);

// Existing Number Journey is allowed as a read-only source, but its live map cannot inherit seed approval.
assert.match(projection, /fn_number_journey/);
assert.match(projection, /scope:\s*"seed\/editorial-content-only"/);
assert.match(projection, /scope:\s*"live-computed"/);
assert.match(projection, /never inherit the journey seed approval state/);

// Live fn_number_journey currently returns sources as { count, value, verses[] }.
assert.match(projection, /raw\.sources\?\.verses/);
assert.match(projection, /type:\s*"verse"/);
assert.match(projection, /sourceSummary/);

// Preview route is hidden/unlisted but not app-admin-gated; legacy /number remains untouched.
assert.match(page, /Projection read-only/);
assert.match(app, /EntityHubPreviewPage/);
assert.match(app, /\/entity-hub-preview\/:type\/:key/);
assert.match(app, /\/number\/:phrase/);

console.log("entity-hub-1237-golden-case: public preview contract OK");
