import test from "node:test";
import assert from "node:assert/strict";
import { resolvePostReadingRegion, post2029ReadingInternals as I } from "../src/lib/research/post2029ReadingProjection.js";

const projection = { post: { id: 5112, slug: I.FZ1073_SLUG }, regions: I.FZ1073_REGIONS };
const saved = {
  subject: { type: "post", id: "5112", href: `/post/${I.FZ1073_SLUG}` },
  selection: { entityType: "post_region", locator: "#source-region-flight-1073" },
};

test("exact return and reload keep the selected region of the same Post", () => {
  assert.equal(resolvePostReadingRegion(projection, saved), "flight-1073");
  assert.equal(resolvePostReadingRegion(projection, saved, "#source-region-flight-1073"), "flight-1073");
});

test("an explicit valid source hash wins; stale and other-Post contexts cannot restore", () => {
  assert.equal(resolvePostReadingRegion(projection, saved, "#source-region-october-718"), "october-718");
  assert.equal(resolvePostReadingRegion(projection, { ...saved, subject: { ...saved.subject, id: "5107" } }), null);
  assert.equal(resolvePostReadingRegion(projection, { ...saved, subject: { ...saved.subject, href: "/post/other" } }), null);
  assert.equal(resolvePostReadingRegion(projection, { ...saved, selection: { locator: "#source-region-missing" } }), null);
  assert.equal(resolvePostReadingRegion(projection, null, "#source-region-missing"), null);
});

test("native source annotations preserve markup and ignore unrelated headings", () => {
  const source = '<h2 style="color:red"><br>75 → 750 → 7500</h2><h2><em>FZ 1073</em></h2><h2>unrelated</h2>';
  const result = I.markFz1073RegionHeadings(source);
  assert.equal(result.replaceAll(' data-source-heading="true"', ''), source);
  assert.equal((result.match(/data-source-heading="true"/g) || []).length, 2);
  assert.equal(I.markFz1073RegionHeadings(result), result);
});
