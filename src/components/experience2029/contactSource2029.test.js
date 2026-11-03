import test from "node:test";
import assert from "node:assert/strict";
import { contactSourceHref } from "./contactSource2029.js";

const origin = "https://preview.example";
const root = "11111111-1111-4111-8111-111111111111", reply = "22222222-2222-4222-8222-222222222222";

test("contact source retains exact public reading identity and excludes credentials, arbitrary text, returns and fragments", () => {
  const source = new URL(contactSourceHref({ pathname: "/community/chat", search: `?thread=${root}&reply=${reply}&path=${root},${reply}&sort=liked&sourceSort=oldest&member=user%3A${root}&q=PRIVATE-TEXT&returnTo=%2F2029%2Fme&email=PRIVATE-EMAIL&e=PRIVATE-EMAIL&t=PRIVATE-MAIL-TOKEN&code=PRIVATE-OAUTH&state=PRIVATE-STATE&ref=PRIVATE-REF&access_token=PRIVATE-AUTH&_vercel_share=PRIVATE-GRANT`, hash: "#access_token=PRIVATE-HASH" }, origin));
  assert.equal(source.origin, origin);
  assert.equal(source.pathname, "/community/chat");
  assert.equal(source.searchParams.get("thread"), root);
  assert.equal(source.searchParams.get("reply"), reply);
  assert.equal(source.searchParams.get("path"), `${root},${reply}`);
  assert.equal(source.searchParams.get("sourceSort"), "oldest");
  assert.equal(source.searchParams.get("member"), `user:${root}`);
  assert.equal(source.hash, "");
  assert.doesNotMatch(source.href, /PRIVATE/);
});

test("auth, mail, payment and personal entry URLs retain pathname only", () => {
  for (const pathname of ["/auth/callback", "/login", "/unsubscribe", "/updates", "/credits", "/2029/me/messages", "/community/researcher/me", "/profile"]) {
    assert.equal(contactSourceHref({ pathname, search: `?thread=${root}&page=1&code=SECRET&email=SECRET&t=SECRET`, hash: "#SECRET" }, origin), origin + pathname);
  }
});

test("only bounded typed reading values survive and repeated or malformed identities are discarded", () => {
  assert.equal(contactSourceHref(`/gallery?gallery=123&image=${root}&page=2&offset=0&method=standard&section=sources`, origin), `${origin}/gallery?gallery=123&image=${root}&page=2&offset=0&method=standard&section=sources`);
  const result = new URL(contactSourceHref(`/community/chat?thread=${root}&thread=${reply}&reply=bad&path=${root},${root}&page=-1&sort=arbitrary&method=${"x".repeat(65)}&section=private&constructor=secret`, origin));
  assert.equal(result.search, "");
});

test("source context rejects foreign origins, protocol tricks and malformed locations", () => {
  for (const value of ["https://foreign.example/post/a", "//foreign.example/post/a", "javascript:alert(1)", "https://user:pass@preview.example/post/a", "/post/one\\two", "/post/%00bad", "/post/%ZZ", "\n/post/a"]) {
    assert.equal(contactSourceHref(value, origin), null, value);
  }
  assert.equal(contactSourceHref(null, origin), null);
  assert.equal(contactSourceHref("/post/a", "http://remote.example"), null);
  assert.equal(contactSourceHref("/post/a", "http://127.0.0.1:4173"), "http://127.0.0.1:4173/post/a");
});
