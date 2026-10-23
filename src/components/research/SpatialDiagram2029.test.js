import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./SpatialDiagram2029.jsx", import.meta.url)), "utf8");

test("the visual kit provides deterministic templates for every spatial family", () => {
  for (const template of ["cube", "icosahedron", "star", "compound", "octagon-compound"]) {
    assert.ok(source.includes(`\"${template}\"`), template);
  }
});

test("the diagram labels itself as illustration rather than source evidence", () => {
  assert.match(source, /השרטוט הוא המחשה נתונית ואינו תמונת מקור/);
  assert.match(source, /המחשה נתונית · לא תמונת מקור/);
});

test("the diagram has an accessible title and description", () => {
  assert.match(source, /role="img" aria-labelledby=/);
  assert.match(source, /<title id=/);
  assert.match(source, /<desc id=/);
});
