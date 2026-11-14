import test from "node:test";
import assert from "node:assert/strict";
import { splitMessageNumbers, messageNumberValue, MESSAGE_NUMBER_MAX_DIGITS, MESSAGE_NUMBER_MIN_VALUE } from "./messageNumbers.js";

const numbers = text => splitMessageNumbers(text).filter(part => part.number != null).map(part => part.number);
const rebuilt = text => splitMessageNumbers(text).map(part => part.text).join("");

test("a plain integer is a number from 1 upward, in the writers' own notation", () => {
  assert.equal(MESSAGE_NUMBER_MIN_VALUE, 1);
  assert.deepEqual(numbers("השמאל גנבו הבחירות מיד הימין = 1237"), [1237]);
  assert.deepEqual(numbers("חדש תעל=812 בנימין=812"), [812, 812]);
  assert.deepEqual(numbers("1237, 1158 ותשפ״ז"), [1237, 1158]);
  assert.deepEqual(numbers("סוד 1,158 ושישים ריבוא"), [1158]);
  assert.deepEqual(numbers("ב-1237 ובגימטריה (848)"), [1237, 848]);
  assert.deepEqual(numbers("משיח בן דוד×2=84"), [2, 84]);
  assert.deepEqual(numbers("9 חודשים ו-1 יחיד"), [9, 1], "one-digit numbers are numbers");
  assert.deepEqual(numbers("הערה: 12 מנדטים, ו-26 נוספים\n12 הודעות"), [12, 26, 12], "a number that only starts a line is still a number");
});

test("a year that stands by itself is a number; a year inside a date is not", () => {
  assert.deepEqual(numbers("בשנת 2026."), [2026]);
  assert.deepEqual(numbers("שנת 2026"), [2026]);
  assert.deepEqual(numbers("2026"), [2026]);
  assert.deepEqual(numbers("ב-10.11.2026 בישראל"), []);
});

test("a list of numbers separated by spaces is a list of numbers", () => {
  assert.deepEqual(numbers("812 848 1237"), [812, 848, 1237]);
  assert.deepEqual(numbers("משיח 358 ו-1237 ו-26"), [358, 1237, 26]);
  assert.deepEqual(numbers("טלפון 054 765 4321 או 1237"), [1237], "a number after a telephone number stays a number");
  assert.deepEqual(numbers("03 123 4567 1237"), [1237]);
});

test("every date, in every way a writer may join it, stays text", () => {
  for (const text of ["10.11.2026", "12-11-2026", "12–11–2026", "12—11—2026", "12‐11‐2026", "12‑11‑2026", "12−11−2026", "12־11־2026",
    "12/11/2026", "12\\11\\2026", "2026-11-12", "2026–11–12", "12–11–26", "ב-12–11–2026 בבוקר", "התאריך 12–11–2026."]) assert.deepEqual(numbers(text), [], text);
});

test("a telephone number is never partly a number, with spaces, dashes, dots or brackets", () => {
  for (const text of ["050 123 4567", "050-123-4567", "050.123.4567", "050 123 45 67", "0501234567", "03-1234567", "03 123 4567", "(03) 123 4567", "(03)1234567",
    "054 765 4321", "+972 50 123 4567", "+972-50-123-4567", "972 50 123 4567", "972-50-123-4567", "+1 (212) 555 0123", "התקשרו ל-050 123 4567 מחר"]) assert.deepEqual(numbers(text), [], text);
});

test("times, decimals, amounts, fractions, percentages, ranges and glued numbers stay text", () => {
  for (const text of ["14:33", "10:30", "3.14", "12,50", "3/4", "1/2", "10-20", "10–20", "50%", "5G", "A1", "id_7", "1,58", "1237,1158", "x=2.5",
    "0", "007", "1234567890", "ראו [12]", "12. הערה ראשונה", "קודם\n  3) שני", "תפילות 2.jpeg", "7.co.il"]) assert.deepEqual(numbers(text), [], text);
});

test("a number inside a web address or an e-mail address is never a number, with or without a scheme", () => {
  for (const text of ["https://example.com/post/1237", "https://example.com/p?id=1237", "http://example.com/a-1237", "https://youtu.be/dQw4w9WgXcQ?t=42",
    "https://example.com/p?id=1237&x=5#7", "www.example.com/a?x=55", "example.com?id=77", "example.com/1237", "sub.example.co.il:8080/9", "ftp://host/9",
    "user1237@example.com", "7@example.com", "(https://example.com/p?id=1237)", "https://example.com/p?id=1237…"]) assert.deepEqual(numbers(text), [], text);
  assert.deepEqual(numbers("ראו https://example.com/p?id=1237 ו-1237 ו-5"), [1237, 5], "only the numbers outside the address are numbers");
  assert.deepEqual(numbers("https://example.com/p?id=99\nהמשך 848"), [848]);
});

test("the parts always rebuild the exact original text and carry the integer value", () => {
  for (const text of ["", "ללא מספרים", "1237", "= 1237 =", "א 12 ב 34 ג", "10.11.2026 ו-1237,\n848", "x1 2 y3", "050 123 4567 ו-1237", "https://example.com/p?id=1237 ו-5"]) assert.equal(rebuilt(text), text);
  assert.deepEqual(splitMessageNumbers("א 1,158 ב"), [{ text: "א " }, { text: "1,158", number: 1158 }, { text: " ב" }]);
  assert.deepEqual(splitMessageNumbers(""), [{ text: "" }]);
});

test("number values are exact positive integers of bounded length", () => {
  assert.equal(messageNumberValue("1,158"), 1158);
  assert.equal(messageNumberValue("1"), 1);
  assert.equal(messageNumberValue("9"), 9);
  assert.equal(messageNumberValue("0"), null);
  assert.equal(messageNumberValue("01"), null);
  assert.equal(messageNumberValue("1".repeat(MESSAGE_NUMBER_MAX_DIGITS)), 111111111);
  assert.equal(messageNumberValue("1".repeat(MESSAGE_NUMBER_MAX_DIGITS + 1)), null);
});
