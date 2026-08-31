import fs from "node:fs";
import assert from "node:assert/strict";

const projection = fs.readFileSync(new URL("../src/lib/research/researchViewerProjection.js", import.meta.url), "utf8");
const viewer = fs.readFileSync(new URL("../src/components/admin/ResearchViewerV0Page.jsx", import.meta.url), "utf8");

assert.match(projection, /admin_research_review/);
assert.match(projection, /finding\?\.kind !== "research-object"/);
assert.match(projection, /p_ack_extraction_incomplete/);
assert.doesNotMatch(projection, /from\("nodes"\).*insert/s);
assert.doesNotMatch(projection, /from\("research_objects"\).*update/s);

assert.match(viewer, /selected\.kind === "research-object"/);
assert.match(viewer, /Approved ≠ Canonical ≠ Published/);
assert.match(viewer, /runJudgment\("approve"\)/);
assert.match(viewer, /runJudgment\("reject"\)/);
assert.match(viewer, /runJudgment\("canonicalize"\)/);
assert.match(viewer, /allowIncompleteExtraction/);
assert.doesNotMatch(viewer, /selected\.kind === "gematria".*runJudgment/s);

console.log("research-viewer-judgment-surface guard passed");
