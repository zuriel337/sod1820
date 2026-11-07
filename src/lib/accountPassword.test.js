import test from "node:test";
import assert from "node:assert/strict";
import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError, AuthWeakPasswordError } from "@supabase/supabase-js";
import {
  PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, RESEND_COOLDOWN_SECONDS, STAGE_TEXT, accountCreationAllowed, describeAuthFailure,
  isEmailAddress, isSendAction, normalizeEmail, passwordProblem,
} from "./accountPassword.js";

test("account creation is allowed for the public release, ordinary builds and a granted functional preview only", () => {
  for (const [name, input, expected] of [
    ["public registration", { publicReading: true, preview: true, functionalPreview: "false" }, true],
    ["ordinary account entry", { publicReading: false, preview: false, functionalPreview: undefined }, true],
    ["approved functional preview", { publicReading: false, preview: true, functionalPreview: "true" }, true],
    ["read-only preview", { publicReading: false, preview: true, functionalPreview: "false" }, false],
    ["missing functional grant", { publicReading: false, preview: true, functionalPreview: undefined }, false],
    ["no arguments", undefined, true],
  ]) assert.equal(accountCreationAllowed(input), expected, name);
});

test("e-mail and password floors", () => {
  assert.equal(normalizeEmail("  a@b.co \n"), "a@b.co");
  assert.equal(normalizeEmail(null), "");
  for (const good of ["a@b.co", " user.name+tag@sub.example.invalid "]) assert.equal(isEmailAddress(good), true, good);
  for (const bad of ["", "a", "a@b", "a b@c.de", "@b.co", "a@.co", "a@b.", `${"x".repeat(320)}@b.co`]) assert.equal(isEmailAddress(bad), false, bad);
  assert.equal(passwordProblem("x".repeat(PASSWORD_MIN_LENGTH)), "");
  assert.equal(passwordProblem("x".repeat(PASSWORD_MAX_LENGTH)), "");
  assert.match(passwordProblem(""), /הזינו סיסמה/);
  assert.match(passwordProblem("x".repeat(PASSWORD_MIN_LENGTH - 1)), /קצרה מדי/);
  assert.match(passwordProblem("x".repeat(PASSWORD_MAX_LENGTH + 1)), /ארוכה מדי/);
  assert.equal(passwordProblem("  spaces are part of a password  "), "", "a password is never trimmed");
});

test("every failure keeps the person on an honest step: a send failure is never a success", () => {
  const smtp = new AuthRetryableFetchError("Error sending confirmation email", 500);
  const gateway = new AuthRetryableFetchError("HTTP 504", 504);
  const offline = new AuthRetryableFetchError("Failed to fetch", 0);
  for (const failure of [smtp, gateway, offline]) {
    for (const action of ["signup", "resend", "reset"]) {
      const result = describeAuthFailure(failure, action);
      assert.equal(result.kind, "unavailable", action);
      assert.equal(result.next, undefined, "a failed send must not advance to the code step");
      assert.doesNotMatch(result.message, /נשלח אליכם|שלחנו|הקוד בדרך|ייתכן שהמייל בדרך/, "no success wording on failure");
      assert.match(result.message, /לא הצלחנו לשלוח/);
    }
    for (const action of ["signin", "confirm", "reset-code", "reset-new"]) assert.equal(describeAuthFailure(failure, action).kind, "unavailable");
  }
  const limited = new AuthApiError("For security purposes, you can only request this after 52 seconds.", 429, "over_email_send_rate_limit");
  assert.equal(describeAuthFailure(limited, "signup").kind, "rate_limited");
  assert.match(describeAuthFailure(limited, "signup").message, /אם כבר קיבלתם קוד/);
  assert.equal(describeAuthFailure(limited, "signin").kind, "rate_limited");
  assert.equal(describeAuthFailure(limited, "signup").next, undefined);
});

test("credentials, confirmation and code errors map to precise, non-enumerating messages", () => {
  const invalid = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
  assert.equal(describeAuthFailure(invalid, "signin").kind, "invalid_credentials");
  assert.match(describeAuthFailure(invalid, "signin").message, /שכחתי סיסמה/);
  const unconfirmed = new AuthApiError("Email not confirmed", 400, "email_not_confirmed");
  assert.deepEqual(Object.keys(describeAuthFailure(unconfirmed, "signin")).sort(), ["kind", "message", "next"]);
  assert.equal(describeAuthFailure(unconfirmed, "signin").next, "confirm");
  const expired = new AuthApiError("Token has expired or is invalid", 403, "otp_expired");
  for (const action of ["confirm", "reset-code"]) assert.equal(describeAuthFailure(expired, action).kind, "code");
  assert.equal(describeAuthFailure(new AuthApiError("Token has expired or is invalid", 403), "confirm").kind, "code", "no error code: still a code failure");
  for (const status of [400, 403, 404, 422]) for (const action of ["confirm", "reset-code"]) {
    assert.equal(describeAuthFailure(new AuthApiError("anything", status, "invalid_credentials"), action).kind, "code", `${action} ${status}: a code step always reports a code problem`);
  }
  assert.equal(describeAuthFailure(new AuthApiError("Invalid login credentials", 400, "invalid_credentials"), "reset-new").kind, "unknown", "credentials errors belong to sign-in only");
  const same = new AuthApiError("New password should be different from the old password.", 422, "same_password");
  assert.equal(describeAuthFailure(same, "reset-new").kind, "same_password");
  const exists = new AuthApiError("User already registered", 422, "user_already_exists");
  assert.equal(describeAuthFailure(exists, "signup").kind, "exists");
  assert.doesNotMatch(describeAuthFailure(exists, "signup").message, /קיים חשבון עם הכתובת|כבר רשום/, "must not confirm that an address is registered");
  assert.equal(describeAuthFailure(new AuthApiError("Signups not allowed", 422, "signup_disabled"), "signup").kind, "signup_disabled");
  assert.equal(describeAuthFailure(new AuthApiError("Unable to validate email address: invalid format", 400, "email_address_invalid"), "signup").kind, "email_invalid");
});

test("weak passwords explain themselves; a missing or lost session restarts the reset", () => {
  const weak = new AuthWeakPasswordError("Password should be at least 8 characters.", 422, ["length", "characters"]);
  const described = describeAuthFailure(weak, "signup");
  assert.equal(described.kind, "weak_password");
  assert.match(described.message, /קצרה מדי/);
  assert.match(described.message, /אותיות ומספרים/);
  assert.match(describeAuthFailure(new AuthWeakPasswordError("pwned", 422, ["pwned"]), "reset-new").message, /שדלפו/);
  assert.match(describeAuthFailure(new AuthWeakPasswordError("weak", 422, []), "reset-new").message, /חלשה מדי/);
  const missing = describeAuthFailure(new AuthSessionMissingError(), "reset-new");
  assert.equal(missing.kind, "session");
  assert.equal(missing.next, "reset");
  assert.equal(describeAuthFailure(new AuthApiError("jwt expired", 401, "bad_jwt"), "reset-new").kind, "session");
});

test("a Worker denial and unknown errors are explained without leaking internals", () => {
  const denied = new AuthApiError("public_reading_auth_denied", 403);
  assert.equal(describeAuthFailure(denied, "signup").kind, "denied");
  assert.equal(describeAuthFailure(new Error("boom"), "signin").kind, "unavailable", "an error without a status is treated as a transport failure");
  assert.equal(describeAuthFailure(new AuthApiError("odd", 418, "teapot"), "signin").kind, "unknown");
  assert.equal(describeAuthFailure(undefined, "signin").kind, "unavailable");
  for (const kind of ["denied", "unknown"]) {
    const sample = kind === "denied" ? denied : new AuthApiError("odd", 418, "teapot");
    assert.doesNotMatch(describeAuthFailure(sample, "signin").message, /public_reading|teapot|odd/);
  }
});

test("stage text and cooldown are defined for every operation the form can run", () => {
  for (const action of ["signin", "signup", "confirm", "resend", "reset", "reset-code", "reset-new", "signout"]) assert.ok(STAGE_TEXT[action], action);
  assert.equal(Object.isFrozen(STAGE_TEXT), true);
  assert.deepEqual(["signup", "resend", "reset"].map(isSendAction), [true, true, true]);
  assert.deepEqual(["signin", "confirm", "reset-code", "reset-new"].map(isSendAction), [false, false, false, false]);
  assert.ok(RESEND_COOLDOWN_SECONDS >= 30 && RESEND_COOLDOWN_SECONDS <= 120, "matches GoTrue's per-address email frequency limit");
});
