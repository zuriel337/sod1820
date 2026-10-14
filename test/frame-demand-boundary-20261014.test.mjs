import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const frame = readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
const boundary = readFileSync("src/components/experience2029/CompanionBoundary2029.jsx", "utf8");

test("companion panel is a lazy import, not a static cold import", () => {
  assert.match(frame, /const CompanionPanel2029 = lazy\(\(\) => import\("\.\/CompanionPanel2029\.jsx"\)\)/);
  assert.doesNotMatch(frame, /^import CompanionPanel2029 from/m);
});
test("companion css and rail stay statically bound (geometry + mobile locator unchanged)", () => {
  assert.match(frame, /^import "\.\/companionPanel2029\.css";/m);
  assert.match(frame, /^import SurfaceContextRail2029 from/m);
});
test("lazy render stays behind the existing companionActive boolean, scoped Suspense + boundary", () => {
  assert.match(frame, /companionActive \? <CompanionBoundary2029[\s\S]*<Suspense fallback=\{<CompanionPlaceholder2029[\s\S]*<CompanionPanel2029/);
});
test("boundary has no heavy imports and never reloads automatically", () => {
  assert.deepEqual([...boundary.matchAll(/^import .* from "(.*)"/gm)].map((m) => m[1]), ["react"]);
  assert.match(boundary, /onClick=\{\(\) => \{ try \{ window\.location\.reload/);
  assert.doesNotMatch(boundary, /componentDidCatch[\s\S]*reload/);
});
