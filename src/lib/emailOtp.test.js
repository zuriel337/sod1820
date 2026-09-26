import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  EMAIL_OTP_MIN_LENGTH,
  EMAIL_OTP_MAX_LENGTH,
  sanitizeEmailOtp,
  isValidEmailOtp,
} from "./emailOtp.js";

test("email OTP contract accepts every Supabase-supported length", () => {
  assert.equal(EMAIL_OTP_MIN_LENGTH, 6);
  assert.equal(EMAIL_OTP_MAX_LENGTH, 10);
  assert.equal(isValidEmailOtp("123456"), true);
  assert.equal(isValidEmailOtp("12345678"), true);
  assert.equal(isValidEmailOtp("1234567890"), true);
});

test("email OTP contract rejects out-of-range or non-numeric tokens", () => {
  assert.equal(isValidEmailOtp("12345"), false);
  assert.equal(isValidEmailOtp("12345678901"), false);
  assert.equal(isValidEmailOtp("12a45678"), false);
});

test("email OTP sanitizer supports pasted formatting and caps client input", () => {
  assert.equal(sanitizeEmailOtp("12 34-56 78"), "12345678");
  assert.equal(sanitizeEmailOtp("1234567890123"), "1234567890");
});


test("Raziel account-link email OTP accepts the same 6..10 range", () => {
  const source = fs.readFileSync("supabase/functions/wa-raziel/index.ts", "utf8");
  assert.equal(source.includes("const EMAIL_OTP_CODE_RE = /\\b(\\d{6,10})\\b/;"), true);
  assert.equal(source.includes("text.match(EMAIL_OTP_CODE_RE)"), true);
  assert.equal(source.includes("מה 6 הספרות"), false);
  assert.equal(source.includes("קוד בן 6 ספרות למייל"), false);
});
