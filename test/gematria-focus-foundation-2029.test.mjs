import test from "node:test";
import assert from "node:assert/strict";
import { numberExpressionFocusHref, parseNumberExpressionFocus, resolveExpressionFocus } from "../src/lib/research/numberExpressionFocus.js";

const profileReader = async () => [
  { methodKey: "רגיל", computedValue: 358 },
  { methodKey: "מילוי", computedValue: 878 },
  { methodKey: "מסתתר", computedValue: null },
];

test("explicit expression and method remain the same through canonical focus navigation", async () => {
  const focus = await resolveExpressionFocus("משיח", { preferredMethod: "מילוי", expectedValue: 878, profileReader });
  assert.equal(focus.root, 878); assert.equal(focus.resultValue, 878); assert.equal(focus.method, "מילוי");
  const url = new URL(focus.href, "https://example.invalid");
  assert.equal(url.pathname, "/2029/number/878");
  assert.deepEqual(parseNumberExpressionFocus(url.search), { expression: "משיח", method: "מילוי", crossingPartner: null, explicit: true });
});
test("missing requested method, missing value and wrong claimed value do not fall back or become zero", async () => {
  assert.equal(await resolveExpressionFocus("משיח", { preferredMethod: "לא קיימת", profileReader }), null);
  assert.equal(await resolveExpressionFocus("משיח", { preferredMethod: "מסתתר", profileReader }), null);
  assert.equal(await resolveExpressionFocus("משיח", { preferredMethod: "מילוי", expectedValue: 358, profileReader }), null);
  assert.equal(await resolveExpressionFocus("משיח", { profileReader: async () => [] }), null);
  assert.equal(numberExpressionFocusHref(null), null); assert.equal(numberExpressionFocusHref(""), null);
});
test("verified numeric zero is preserved and never confused with a missing value", async () => {
  const result = await resolveExpressionFocus("א", { preferredMethod: "מסתתר", expectedValue: 0, profileReader: async () => [{ methodKey:"מסתתר", computedValue:0 }] });
  assert.equal(result.root, 0); assert.match(result.href, /^\/2029\/number\/0\?/);
});
test("unrequested method retains existing regular-first behavior", async () => {
  const result = await resolveExpressionFocus("משיח", { profileReader });
  assert.equal(result.root, 358); assert.equal(result.method, "רגיל");
});
