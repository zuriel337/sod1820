import test from "node:test";
import assert from "node:assert/strict";
import { classifyLink, buildPostUnitModels } from "./postUnitModel2029.js";

test("links are classified by their real destination", () => {
  assert.equal(classifyLink("/number/1437"), "number");
  assert.equal(classifyLink("/2029/number/77"), "number");
  assert.equal(classifyLink("/post/bennett-melach-631-78"), "post");
  assert.equal(classifyLink("https://www.hebcal.com/x"), "external");
  assert.equal(classifyLink("#knesset-sworn-1234-1011"), "anchor");
  assert.equal(classifyLink("/world?view=gallery&gallery=3"), "world");
});

test("no DOM, no units", () => {
  assert.deepEqual(buildPostUnitModels(null, { post: { id: 5107 } }), []);
  assert.deepEqual(buildPostUnitModels({}, { post: { id: 5107 } }), []);
});
