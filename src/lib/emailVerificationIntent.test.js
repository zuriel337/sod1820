import test from "node:test";
import assert from "node:assert/strict";
import { shouldSubscribeEmailDuringVerification } from "./emailVerificationIntent.js";

test("Follow verification is identity-only even with default subscription behavior", () => {
  assert.equal(shouldSubscribeEmailDuringVerification({ source: "follow:post_footer" }), false);
  assert.equal(shouldSubscribeEmailDuringVerification({ source: "follow:entity_hub" }), false);
});

test("explicit identity-only mode never subscribes", () => {
  assert.equal(shouldSubscribeEmailDuringVerification({ source: "site", subscribeToUpdates: false }), false);
});

test("existing explicit subscription surfaces retain their opt-in behavior", () => {
  assert.equal(shouldSubscribeEmailDuringVerification({ source: "subscribe_gate" }), true);
});
