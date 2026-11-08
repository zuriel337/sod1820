import test from "node:test";
import assert from "node:assert/strict";
import { verifyEmailOtp } from "./auth.js";

const clientWith = answers => { const calls = []; return { calls, auth: { verifyOtp: async args => { calls.push(args.type); return answers[args.type] ?? { data: null, error: { message: "x" } }; } } }; };

test("a signup confirmation code is accepted when the 'email' type says expired or invalid", async () => {
  const client = clientWith({ email: { data: null, error: { code: "otp_expired", message: "Token has expired or is invalid" } }, signup: { data: { session: "s" }, error: null } });
  assert.deepEqual(await verifyEmailOtp(" a@b.co ", " 123456 ", client), { session: "s" });
  assert.deepEqual(client.calls, ["email", "signup"]);
});
test("a normal login code is verified once, and a bad code still fails", async () => {
  const ok = clientWith({ email: { data: { session: "e" }, error: null } });
  assert.deepEqual(await verifyEmailOtp("a@b.co", "1", ok), { session: "e" });
  assert.deepEqual(ok.calls, ["email"]);
  const bad = clientWith({ email: { data: null, error: { code: "otp_expired", message: "expired or is invalid" } }, signup: { data: null, error: { code: "otp_expired", message: "expired or is invalid" } } });
  await assert.rejects(verifyEmailOtp("a@b.co", "9", bad), error => error.code === "otp_expired");
  const other = clientWith({ email: { data: null, error: { code: "over_request_rate_limit", message: "slow down" } } });
  await assert.rejects(verifyEmailOtp("a@b.co", "9", other), error => error.code === "over_request_rate_limit");
  assert.deepEqual(other.calls, ["email"]);
});
