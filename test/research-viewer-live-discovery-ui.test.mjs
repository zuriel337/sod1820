import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(new URL("../src/components/admin/ResearchViewerLegacyV0Page.jsx", import.meta.url), "utf8");

assert.match(src, /fetchResearchViewerDiscovery/);
assert.doesNotMatch(src, /CALIBRATION_REFS/);
assert.doesNotMatch(src, /engine_verified\s*===\s*true/);
assert.doesNotMatch(src, /engine_verified\s*===\s*false/);
assert.match(src, /verification_state/);
assert.match(src, /governance:/);
assert.match(src, /access:/);
assert.match(src, /DISCOVERY\s*→\s*INVESTIGATION\s*→\s*JUDGMENT/);
assert.match(src, /טוען Discovery חי/);

console.log("research-viewer-live-discovery-ui: 8 checks passed");
