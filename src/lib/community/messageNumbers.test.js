import test from "node:test";
import assert from "node:assert/strict";
import { splitMessageNumbers, messageNumberValue, MESSAGE_NUMBER_MAX_DIGITS } from "./messageNumbers.js";

const numbers = text => splitMessageNumbers(text).filter(part => part.number != null).map(part => part.number);
const rebuilt = text => splitMessageNumbers(text).map(part => part.text).join("");

test("a plain integer in the writers' own notation is a number", () => {
  assert.deepEqual(numbers("השמאל גנבו הבחירות מיד הימין = 1237"), [1237]);
  assert.deepEqual(numbers("חדש תעל=812 בנימין=812"), [812, 812]);
  assert.deepEqual(numbers("1237, 1158 ותשפ״ז"), [1237, 1158]);
  assert.deepEqual(numbers("סוד 1,158 ושישים ריבוא"), [1158]);
  assert.deepEqual(numbers("בשנת 2026."), [2026]);
  assert.deepEqual(numbers("ב-1237 ובגימטריה (848)"), [1237, 848]);
  assert.deepEqual(numbers("משיח בן דוד×2=84"), [84]);
  assert.deepEqual(numbers("הערה: 12 מנדטים, ו-26 נוספים\n12 הודעות"), [12, 26, 12], "a number that only starts a line is still a number");
});

test("dates, times, decimals, amounts, phone numbers and fractions are never numbers", () => {
  for (const text of ["10.11.2026", "ב-10.11.2026 בישראל", "14:33", "3.14", "12,50", "054-1234567", "3/4", "1237,1158", "50%", "5G", "A1", "id_7", "1,58",
    "0", "007", "1234567890", "https://example.com/post/1237", "x=2.5", "9 חודשים", "×2", "תפילות 12.jpeg", "ראו [12]", "12. הערה ראשונה", "קודם\n  3) שני", "7.co.il"]) {
    assert.deepEqual(numbers(text), [], text);
  }
});

test("the parts always rebuild the exact original text and carry the integer value", () => {
  for (const text of ["", "ללא מספרים", "1237", "= 1237 =", "א 12 ב 34 ג", "10.11.2026 ו-1237,\n848", "x1 2 y3"]) assert.equal(rebuilt(text), text);
  assert.deepEqual(splitMessageNumbers("א 1,158 ב"), [{ text: "א " }, { text: "1,158", number: 1158 }, { text: " ב" }]);
  assert.deepEqual(splitMessageNumbers(""), [{ text: "" }]);
});

test("number values are exact positive integers of bounded length", () => {
  assert.equal(messageNumberValue("1,158"), 1158);
  assert.equal(messageNumberValue("0"), null);
  assert.equal(messageNumberValue("9"), null, "a single digit is a count or a list mark, not a Number page");
  assert.equal(messageNumberValue("10"), 10);
  assert.equal(messageNumberValue("01"), null);
  assert.equal(messageNumberValue("1".repeat(MESSAGE_NUMBER_MAX_DIGITS)), 111111111);
  assert.equal(messageNumberValue("1".repeat(MESSAGE_NUMBER_MAX_DIGITS + 1)), null);
});
