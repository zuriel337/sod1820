import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(new URL("../src/lib/research/researchViewerProjection.js", import.meta.url), "utf8");

assert.match(src, /researchObjectsToUniversalFindings/);
assert.match(src, /from\("research_objects"\)/);
assert.doesNotMatch(src, /CALIBRATION_REFS/);
assert.doesNotMatch(src, /is_published\s*=/);
assert.doesNotMatch(src, /status:\s*["']canonical["']/);
assert.doesNotMatch(src, /stage:\s*["']finding["']/);
assert.match(src, /order\("created_at", \{ ascending: false \}\)/);
assert.match(src, /Math\.min\([^,]+, 1000\)/);

console.log("research-viewer-discovery-projection contract ok");
