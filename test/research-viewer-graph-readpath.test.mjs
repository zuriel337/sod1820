import fs from "node:fs";
import assert from "node:assert/strict";

const src = fs.readFileSync(new URL("../src/lib/research/researchViewerProjection.js", import.meta.url), "utf8");

assert.match(src, /fetchCanonicalGraphEntityFindings/);
assert.match(src, /searchResearchViewerGraphEntities/);
assert.match(src, /fetchResearchViewerGraphEntity/);
assert.match(src, /return fetchCanonicalGraphEntityFindings\(nodeId, \{ relationLimit \}\)/);
assert.match(src, /\.from\("nodes"\)/);
assert.match(src, /\.ilike\("label"/);
assert.match(src, /UUID_RE/);
assert.match(src, /labelTerm/);
assert.doesNotMatch(src, /\.from\("edges"\)/);
assert.doesNotMatch(src, /\.from\("nodes"\)[\s\S]*\.(insert|update|upsert|delete)\(/);
assert.doesNotMatch(src, /verification_state:\s*["']match["']/);

console.log("Research Viewer Graph read-path guard passed");
