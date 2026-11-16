import test from "node:test";
import assert from "node:assert/strict";
import { publicPostUnitHref, publicPostHref, publicPageShareUrl } from "./publicPostUrls.js";

const post = { id: 5107, slug: "sharshar-elections-redemption-hints-draft", source: "ai", wp_id: null, link: null };

test("ONE builder: <post address>?unit=<id>#<id>, from a post row or from a post path, with or without an origin", () => {
  const id = "yamin-smol-2026-5787-1237-1158";
  assert.equal(publicPostUnitHref(post, id), `/post/sharshar-elections-redemption-hints-draft?unit=${id}#${id}`);
  assert.equal(publicPostUnitHref(post, id, { origin: "https://sod1820.co.il/" }), `https://sod1820.co.il/post/sharshar-elections-redemption-hints-draft?unit=${id}#${id}`);
  assert.equal(publicPostUnitHref("/post/p", "knesset-sworn-1234-1011", { origin: "https://x.vercel.app" }), "https://x.vercel.app/post/p?unit=knesset-sworn-1234-1011#knesset-sworn-1234-1011");
  assert.equal(publicPostUnitHref(post, "netanyahu-77-mazal").startsWith(publicPostHref(post)), true, "the post address is the same one publicPostHref owns (no second route)");
});

test("an id that is not a plain anchor token, or a post without an address, yields null (callers fall back to the post)", () => {
  for (const bad of ["", null, undefined, "a b", "x#y", "x?y", "../etc", "<script>", "-lead", "a".repeat(200)]) assert.equal(publicPostUnitHref(post, bad), null, String(bad));
  assert.equal(publicPostUnitHref({ slug: "" }, "ok-id"), null);
  assert.equal(publicPostUnitHref("relative/path", "ok-id"), null);
});

test("the public share sanitizer keeps ?unit and the fragment but strips the admin-demo and access parameters", () => {
  const url = publicPageShareUrl({ pathname: "/post/p", search: "?proto=admin&unit=knesset-sworn-1234-1011&_vercel_share=SECRET&token=T", hash: "#knesset-sworn-1234-1011" }, "https://sod1820.co.il/post/p");
  assert.equal(url, "https://sod1820.co.il/post/p?unit=knesset-sworn-1234-1011#knesset-sworn-1234-1011");
});
