import test from "node:test";
import assert from "node:assert/strict";
import { isPostEnglishExpression } from "../src/lib/research/post2029ReadingProjection.js";
import { buildEnglishLaneRows } from "../src/lib/research/calculator2029English.js";
import { englishAll } from "../src/lib/englishGematria.js";

test("source-word exploration distinguishes English markings from arithmetic and other scripts", () => {
  for (const text of ["God", "G", "Elohim", "Bereshit", "Godhood", "NEW WORD", "don't"]) assert.equal(isPostEnglishExpression(text), true, text);
  for (const text of ["", "26", "70 x 26", "God = 26", "יהוה", "God יהוה", "Привет", "Müller"]) assert.equal(isPostEnglishExpression(text), false, text);
});

test("English source words reuse Legacy values while remaining previews", () => {
  for (const expression of ["God", "Elohim", "Bereshit", "Godhood", "New expression"]) {
    const legacy = englishAll(expression), projected = buildEnglishLaneRows(expression);
    assert.deepEqual(projected.map(row => row.computedValue), legacy.map(row => row.value));
    assert.ok(projected.every(row => row.previewOnly && !row.canonical && row.executionKind === "client_preview"));
  }
  for (const [expression, expected] of [["God", 26], ["Elohim", 62], ["Bereshit", 86], ["Godhood", 68]]) {
    assert.equal(buildEnglishLaneRows(expression).find(row => row.methodKey === "en_ordinal").computedValue, expected);
  }
});

test("the existing adapter can replace a preview with the same future canonical method/version", () => {
  const result = buildEnglishLaneRows("God", [{ methodKey: "en_ordinal", computedValue: 26, definitionVersion: 7 }]);
  const ordinal = result.find(row => row.methodKey === "en_ordinal");
  assert.equal(ordinal.previewOnly, false); assert.equal(ordinal.definitionVersion, 7);
  assert.ok(result.filter(row => row.methodKey !== "en_ordinal").every(row => row.previewOnly));
});
