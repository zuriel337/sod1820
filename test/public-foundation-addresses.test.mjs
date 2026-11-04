import test from "node:test";
import assert from "node:assert/strict";
import { resolvePublicNumberAddress } from "../src/lib/research/numberExpressionFocus.js";
import { exactPostReadingHref } from "../src/lib/publicPostUrls.js";
import { safePreviewOAuthReturnPath, rememberPreviewOAuthReturn, consumePreviewOAuthReturn } from "../src/lib/oauthReturn.js";
import { submitNewsletterSignup } from "../src/lib/newsletterSignup.js";

test("numeric address never calculates or publishes; expression preserves exact method and existing canonical reader", async () => {
  let reads = 0;
  const profileReader = async phrase => { reads++; assert.equal(phrase, "בראשית"); return [{ methodKey: "רגיל", computedValue: 913 }, { methodKey: "קטן", computedValue: 13 }]; };
  assert.equal((await resolvePublicNumberAddress("1820", { profileReader })).root, 1820);
  assert.equal(reads, 0);
  const result = await resolvePublicNumberAddress("בראשית", { search: "?method=קטן&source=post", profileReader });
  assert.equal(result.root, 13); assert.equal(result.focus.method, "קטן"); assert.equal(result.focus.expression, "בראשית");
  await assert.rejects(resolvePublicNumberAddress("בראשית", { search: "?method=missing", profileReader }), /method-unavailable/);
  await assert.rejects(resolvePublicNumberAddress("9007199254740992", { profileReader }), /invalid/);
  await assert.rejects(resolvePublicNumberAddress("בראשית", { profileReader: async () => { throw Error("network unavailable"); } }), /network unavailable/);
});
test("original WordPress id/query and inert source anchors survive Number and login return; auth fragments and offsite returns do not", () => {
  const href = "/?p=34200&part=7#source-region-original";
  assert.equal(exactPostReadingHref({ slug: "original", wp_id: 34200 }, { pathname: "/", search: "?p=34200&part=7" }, "#source-region-original"), href);
  const values = new Map(); const storage = { getItem: k => values.get(k), setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) };
  rememberPreviewOAuthReturn(href, storage, 100); assert.equal(consumePreviewOAuthReturn(storage, 101), href);
  for (const value of ["//evil.invalid/#source-region-a", "/\\evil.invalid/#source-region-a", "/%2f%2fevil.invalid/#source-region-a"]) assert.equal(safePreviewOAuthReturnPath(value), "/");
  for (const hash of ["#access_token=private&refresh_token=private", "#error=denied", "#source-region-a?access_token=private"]) assert.equal(safePreviewOAuthReturnPath("/original?part=7" + hash), "/original?part=7");
});
test("newsletter consent, duplicate, failure and cancellation are tested using an offline sink only", async () => {
  let requests = 0;
  const endpoint = "https://newsletter.invalid/existing-signup";
  const request = async (url, options) => {
    requests++; assert.equal(url, endpoint + "?format=json"); assert.equal(options.method, "POST");
    assert.equal(JSON.parse(options.body).email, "reader@example.invalid");
    return new Response(JSON.stringify({ ok: true, status: "exists" }));
  };
  await assert.rejects(submitNewsletterSignup({ email: "reader@example.invalid", consent: false }, { endpoint, request }), /consent/); assert.equal(requests, 0);
  assert.deepEqual(await submitNewsletterSignup({ email: " Reader@example.invalid ", consent: true }, { endpoint, request }), { status: "exists" });
  await assert.rejects(submitNewsletterSignup({ email: "reader@example.invalid", consent: true }, { endpoint, request: async () => new Response('{"ok":false}', { status: 503 }) }), /failed/);
  const signal = AbortSignal.abort();
  await assert.rejects(submitNewsletterSignup({ email: "reader@example.invalid", consent: true }, { endpoint, signal, request: async (_, options) => { options.signal.throwIfAborted(); } }), { name: "AbortError" });
});
