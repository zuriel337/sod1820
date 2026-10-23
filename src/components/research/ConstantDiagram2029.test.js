import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./ConstantDiagram2029.jsx", import.meta.url)), "utf8");

test("constant diagrams keep exact equality separate from approximation", () => {
  assert.match(source, /relation === "exact" \? "=" : "≈"/);
  assert.match(source, /קירוב שאינו שוויון/);
  assert.match(source, /פער מוחלט/);
});

test("constant diagrams provide distinct orbit and powers templates", () => {
  assert.match(source, /"powers-balance"/);
  assert.match(source, /"constant-orbit"/);
  assert.match(source, /<PowersBalance/);
  assert.match(source, /<ConstantOrbit/);
});

test("constant diagrams expose an accessible computed description", () => {
  assert.match(source, /role="img" aria-labelledby=/);
  assert.match(source, /<title id=/);
  assert.match(source, /<desc id=/);
});
