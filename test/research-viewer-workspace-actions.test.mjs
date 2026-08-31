import assert from "node:assert/strict";
import fs from "node:fs";

const viewer = fs.readFileSync(new URL("../src/components/admin/ResearchViewerV0Page.jsx", import.meta.url), "utf8");
const workspace = fs.readFileSync(new URL("../src/lib/research/useUniversalWorkspace.js", import.meta.url), "utf8");

assert.match(viewer, /useUniversalWorkspace/);
assert.match(viewer, /workspace\.upsertFinding/);
assert.match(viewer, /workspace\.saveFinding/);
assert.match(viewer, /workspace\.pinFinding/);
assert.match(viewer, /Workspace membership בלבד/);
assert.doesNotMatch(viewer, /research_objects.*(?:insert|update|upsert)/is);
assert.doesNotMatch(viewer, /canonical.*(?:true|approved)/is);

assert.match(workspace, /research\.saveItem/);
assert.match(workspace, /research\.togglePin/);
assert.match(workspace, /research\.addToResearch/);
assert.match(workspace, /does NOT change the Finding envelope/);
assert.doesNotMatch(workspace, /from\(["']research_objects["']\)/);

console.log("research-viewer-workspace-actions: ok");
