import test from "node:test";
import assert from "node:assert/strict";
import { suggestFormatting, detectNumbersAndExpressions, sameWords, wordsOf } from "./unitTextSuggestions2029.js";

test("every formatting suggestion keeps every word exactly; a changing one is never offered", () => {
  const text = "1437 = משיח הויה ,  והיום 10.11 = 1011 .הכל פעולות של הבורא! שפועל דרך כל המציאות ואין עוד מלבדו בכל מקום ובכל זמן אמיתי";
  const out = suggestFormatting(text);
  assert.ok(out.length >= 2);
  for (const s of out.filter((x) => x.kind !== "centering")) assert.equal(sameWords(text, s.after), true, s.id);
  assert.equal(sameWords("שלום עולם", "שלום עולמות"), false);
  assert.deepEqual(wordsOf("א, ב — ג!"), ["א", "ב", "ג"]);
});

test("spacing, lines, closing period and centering are suggestions only (before ≠ applied)", () => {
  const long = "זה משפט ראשון ארוך מספיק כדי להצדיק חלוקה לשורות כאן. וזה משפט שני שממשיך את הרעיון עוד קצת, ואחריו עוד מילים רבות כדי לעבור את הסף של הארוך";
  const s = suggestFormatting(long);
  assert.ok(s.find((x) => x.id === "lines").after.includes("\n"));
  assert.equal(s.find((x) => x.id === "centering").centering, "start");
  assert.equal(suggestFormatting("1437 = משיח הויה").find((x) => x.id === "centering").centering, "center");
  assert.deepEqual(suggestFormatting("   "), []);
  assert.equal(suggestFormatting("1437 = משיח הויה").some((x) => x.id === "spacing"), false);
});

test("numbers and claim lines are detected, dates are not numbers, nothing is verified", () => {
  const found = detectNumbersAndExpressions('1437 = משיח הויה\nלמה זה תשאל לשמי = 1237 אותיות אחרי\nהיום 10.11.2026 ו־77.7% ו־1,437 לייקים');
  assert.deepEqual(found.filter((f) => f.kind === "claim").map((f) => [f.phrase, f.number, f.methodText]), [["משיח הויה", 1437, null], ["למה זה תשאל לשמי", 1237, "אותיות אחרי"]]);
  const nums = found.filter((f) => f.kind === "number").map((f) => f.value);
  assert.ok(nums.includes(1437) && nums.includes(1237) && !nums.includes(2026));
  assert.equal(found.some((f) => "verified" in f), false);
});

test('a source line of the form number בגימטריא phrase is a claim too', () => {
  const found = detectNumbersAndExpressions('566 בגימטריא: "משיח בן יוסף"\n901="ויעש הישר"');
  assert.deepEqual(found.filter((f) => f.kind === "claim").map((f) => [f.phrase, f.number]), [["משיח בן יוסף", 566], ["ויעש הישר", 901]]);
});
