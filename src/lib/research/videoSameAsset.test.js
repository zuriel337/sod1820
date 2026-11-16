import test from "node:test";
import assert from "node:assert/strict";
import { sameMediaAsset } from "./videoSemanticMap.js";

test("one media asset, many appearances: the time fragment and a relative/absolute form do not make a second asset", () => {
  const base = "https://sod1820.co.il/post/x";
  assert.equal(sameMediaAsset("/media/a.mp4", "https://sod1820.co.il/media/a.mp4#t=12,40", base), true);
  assert.equal(sameMediaAsset("https://cdn.example/a.mp4#t=5", "https://cdn.example/a.mp4", base), true);
  assert.equal(sameMediaAsset("https://cdn.example/a.mp4", "https://cdn.example/b.mp4", base), false);
  assert.equal(sameMediaAsset("https://cdn.example/a.mp4?v=1", "https://cdn.example/a.mp4?v=2", base), false, "a different query is a different address");
  assert.equal(sameMediaAsset("", "https://cdn.example/a.mp4", base), false);
  assert.equal(sameMediaAsset(null, undefined, base), false);
});
