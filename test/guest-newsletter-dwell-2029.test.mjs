import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const hook = readFileSync(new URL("../src/components/experience2029/useGuestNewsletterInvite2029.js", import.meta.url), "utf8");
test("the guest newsletter invitation is time-based only: half a minute on a visible page, no scroll/pixel trigger", () => {
  assert.match(hook, /GUEST_NEWSLETTER_DWELL_MS = 30000/);
  assert.doesNotMatch(hook, /scrollY|addEventListener\("scroll"/);
  assert.match(hook, /document\.hidden/);
});
