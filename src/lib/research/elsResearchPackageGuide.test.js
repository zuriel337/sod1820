import test from "node:test";
import assert from "node:assert/strict";
import { projectElsResearchPackageGuide } from "./elsResearchPackageGuide.js";

test("package guide explains verified source and geometry without a semantic or statistical score", () => {
  const guide = projectElsResearchPackageGuide({ lens: "matrix-candidates", ok: true, items: [
    { term: "שבת", status: "SOURCE_EXACT", sourceContext: { axisTopic: true }, geometry: { stage: "A" }, neighborhood: { band: "source-context" } },
    { term: "אליהו", status: "VERIFIED", geometry: { stage: "A" }, neighborhood: { band: "intersection" } },
    { term: "תשעו", status: "VERIFIED", geometry: { stage: "B" }, neighborhood: { band: "spaced" } },
    { term: "raw", status: "CANDIDATE", geometry: { stage: "A" }, neighborhood: { band: "parallel" } },
  ], groups: [{ kind: "intersection" }] });
  assert.equal(guide.contract, "els_research_package_guide_v1");
  assert.deepEqual(guide.counts, { sourceContext: 1, sourceExact: 1, verifiedEls: 2, compact: 2, spaced: 1, parallel: 0, intersections: 1, groups: 1 });
  assert.match(guide.inspectFirst, /פסוקי המקור/);
  assert.match(guide.next, /קבוצות המבנה/);
  assert.match(guide.boundary, /אינה קובעת משמעות, מובהקות סטטיסטית או אמת/);
  assert.equal(Object.hasOwn(guide, "score"), false);
});

test("package guide handles an empty completed package and rejects unrelated results", () => {
  assert.equal(projectElsResearchPackageGuide({ lens: "line-context", ok: true }), null);
  const guide = projectElsResearchPackageGuide({ lens: "matrix-candidates", ok: true, items: [], groups: [] });
  assert.match(guide.inspectFirst, /לא נמצאה/);
  assert.match(guide.next, /יעד אחר/);
});
