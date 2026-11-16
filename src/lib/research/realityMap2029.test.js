import test from "node:test";
import assert from "node:assert/strict";
import { realityMapExperienceFor } from "./realityMap2029.js";

const tagged = (id, extra = {}) => ({ id, source: "ai", author: null, tags: ["מפת המציאות"], categories: [], ...extra });

test("membership is the exact tag only; the five current members are the tagged posts", () => {
  for (const id of [5018, 5003, 5004, 5084, 92]) assert.deepEqual(realityMapExperienceFor(tagged(id), { previewEnabled: false }), { active: true, basis: "series_tag" });
});

test("no category, author, number or hints category admits a post", () => {
  const strong = { id: 4000, tags: [], categories: ["רמזים חזקים", "מפת המציאות"], author: "SOD1820", authors: ["SOD1820"] };
  assert.equal(realityMapExperienceFor(strong, { previewEnabled: true }).active, false);
  assert.equal(realityMapExperienceFor({ id: 4001, tags: ["1437", "מפת המציאות "] }, { previewEnabled: false }).active, false);
  assert.equal(realityMapExperienceFor(null).active, false);
});

test("5107 and 5112 are an acceptance exception ONLY while the preview flag is on, and nothing else is widened", () => {
  const post = (id) => ({ id, tags: ["הבחירות"], categories: ["רמזי הגאולה"] });
  assert.deepEqual(realityMapExperienceFor(post(5107), { previewEnabled: true }), { active: true, basis: "preview_acceptance_exception" });
  assert.deepEqual(realityMapExperienceFor(post(5112), { previewEnabled: true }), { active: true, basis: "preview_acceptance_exception" });
  assert.equal(realityMapExperienceFor(post(5107), { previewEnabled: false }).active, false);
  assert.equal(realityMapExperienceFor(post(5113), { previewEnabled: true }).active, false);
});
