// node --test src/lib/research/worldDiscoveryRouting.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { presentSafeNumber, presentFiniteNumber } from "./worldDiscoveryRouting.js";

test("null / undefined / blank never become Number 0", () => {
  for (const v of [null, undefined, "", "   ", [], {}, true, NaN, "abc"]) {
    assert.equal(presentSafeNumber(v), null, String(v));
    assert.equal(presentFiniteNumber(v), null, String(v));
  }
});

test("real values still route", () => {
  assert.equal(presentSafeNumber(1073), 1073);
  assert.equal(presentSafeNumber("1073"), 1073);
  assert.equal(presentSafeNumber(0), 0);
  assert.equal(presentSafeNumber(1.5), null);
  assert.equal(presentFiniteNumber(1.5), 1.5);
});

test("World2029Page routes findings through the guard, not bare Number()", () => {
  const src = readFileSync(new URL("../../pages/World2029Page.jsx", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("const openDiscoveryItem"), src.indexOf("const discoveryDate"));
  assert.match(fn, /presentSafeNumber\(item\.value\)/);
  assert.doesNotMatch(fn, /Number\.isFinite\(Number\(item\.value\)\)/);
  assert.match(fn, /shell\.openInspect\(\{ id: item\.id, type: "finding"/);
  assert.doesNotMatch(src, /Number\.isFinite\(Number\((claim\.value|anchor\.value)\)\)/);
});
