import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { discoveryFindingRoute } from "./worldDiscoveryRoute.js";

const zvi = { kind: "finding", id: "research:abc", sourceRef: "research_objects:abc", label: "מטוס", value: null };

test("null value never routes to number 0", () => {
  const r = discoveryFindingRoute(zvi);
  assert.notEqual(r.route, "number");
  assert.equal(r.route, "inspect");
});
test("undefined and empty/blank string never route to number 0", () => {
  for (const value of [undefined, "", "  "]) assert.notEqual(discoveryFindingRoute({ ...zvi, value }).route, "number");
});
test("numeric 1073 (number or string) still routes to Number 1073", () => {
  assert.deepEqual(discoveryFindingRoute({ ...zvi, value: 1073 }), { route: "number", value: 1073 });
  assert.deepEqual(discoveryFindingRoute({ ...zvi, value: "1073" }), { route: "number", value: 1073 });
});
test("value-less finding opens its exact finding identity with sourceRef", () => {
  assert.deepEqual(discoveryFindingRoute(zvi), { route: "inspect", id: "research:abc", type: "finding", sourceRef: "research_objects:abc" });
});
test("explicit real number 0 remains routable", () => {
  assert.deepEqual(discoveryFindingRoute({ ...zvi, value: 0 }), { route: "number", value: 0 });
});
test("World page uses the gate and keeps returnTo /world", () => {
  const src = fs.readFileSync(new URL("../../pages/World2029Page.jsx", import.meta.url), "utf8");
  assert.match(src, /discoveryFindingRoute\(item\)/);
  assert.doesNotMatch(src, /Number\.isFinite\(Number\(item\.value\)\)/);
  assert.match(src, /type: target\.type, label: item\.label, href: "\/world"/);
});
