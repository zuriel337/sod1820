import test from "node:test";
import assert from "node:assert/strict";
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
