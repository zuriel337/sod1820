import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isProjectorPilotVisible as vis, normalizePostSlug } from "./projectorPilotGate.js";

const post = (id, slug, extra = {}) => ({
  subject: { id: String(id), type: "post", href: `/post/${slug}` },
  dimensions: { readingFocus: { postId: String(id), postSlug: slug } },
  ...extra,
});

test("golden posts 5112 and 92 show the projector", () => {
  assert.equal(vis({ surface: "post", pathname: "/post/fz1073", context: post(5112, "fz1073") }), true);
  assert.equal(vis({ surface: "post", pathname: "/post/nasrallah", context: post(92, "nasrallah") }), true);
});
test("post subject switched to a number still resolves via readingFocus", () => {
  const ctx = { subject: { id: "363", type: "number", href: "/2029/number/363" }, dimensions: post(5112, "fz1073").dimensions };
  assert.equal(vis({ surface: "post", pathname: "/post/fz1073", context: ctx }), true);
});
test("non-golden posts (e.g. Bennett) are hidden", () => {
  assert.equal(vis({ surface: "post", pathname: "/post/bennett", context: post(1234, "bennett") }), false);
  assert.equal(vis({ surface: "post", pathname: "/post/x", context: post(51120, "x") }), false);
});
test("stale golden context on other surfaces is hidden", () => {
  for (const surface of ["number", "topic", "world", "event", "date", "control", "home"]) {
    assert.equal(vis({ surface, pathname: "/2029/number/363", context: post(5112, "fz1073") }), false, surface);
  }
});
test("stale golden context on a different post route is hidden", () => {
  assert.equal(vis({ surface: "post", pathname: "/post/bennett", context: post(5112, "fz1073") }), false);
});
test("fail closed on missing/contradictory data", () => {
  assert.equal(vis(), false);
  assert.equal(vis({ surface: "post", pathname: "/post/a", context: null }), false);
  assert.equal(vis({ surface: "post", pathname: "/post/a", context: { dimensions: { readingFocus: { postId: "5112" } } } }), false);
  const mixed = post(5112, "a"); mixed.subject.id = "7";
  assert.equal(vis({ surface: "post", pathname: "/post/a", context: mixed }), false);
});
// Live DB slug of Post 92 is stored percent-encoded (lowercase hex); the router may hand us the
// decoded Hebrew segment or an uppercase-encoded pathname. All must normalize to the same slug.
const P92_DB_SLUG = "%d7%97%d7%99%d7%a1%d7%95%d7%9c-%d7%a0%d7%a1%d7%a8%d7%90%d7%9c%d7%9c%d7%94-%d7%94%d7%aa%d7%a8%d7%97%d7%a9-%d7%91%d7%99%d7%95%d7%9d-%d7%94358-%d7%9c%d7%9c%d7%97%d7%99%d7%9e%d7%94-%d7%9e%d7%a9%d7%99";
const P92_DECODED = decodeURIComponent(P92_DB_SLUG);

test("encoded Hebrew Golden slug (Post 92) shows the projector for decoded and encoded routes", () => {
  assert.equal(normalizePostSlug(P92_DB_SLUG), P92_DECODED);
  for (const pathname of [`/post/${P92_DECODED}`, `/post/${P92_DB_SLUG}`, `/post/${P92_DB_SLUG.toUpperCase().replace(/-/g, "-")}`, `/post/${encodeURIComponent(P92_DECODED)}`]) {
    assert.equal(vis({ surface: "post", pathname, context: post(92, P92_DB_SLUG) }), true, pathname);
    assert.equal(vis({ surface: "post", pathname, context: post(92, P92_DECODED) }), true, pathname);
  }
  // subject.href-only path (no readingFocus) with an encoded href
  const hrefOnly = { subject: { id: "92", type: "post", href: `/post/${P92_DB_SLUG}` } };
  assert.equal(vis({ surface: "post", pathname: `/post/${P92_DECODED}`, context: hrefOnly }), true);
});
test("5112 ASCII still visible; encoded stale/mismatched slug and non-post surfaces stay hidden", () => {
  assert.equal(vis({ surface: "post", pathname: "/post/flydubai-fz1073-363-14000-remzei-geula", context: post(5112, "flydubai-fz1073-363-14000-remzei-geula") }), true);
  assert.equal(vis({ surface: "post", pathname: "/post/bennett-melach-631-78", context: post(92, P92_DB_SLUG) }), false);
  assert.equal(vis({ surface: "post", pathname: `/post/${P92_DECODED}`, context: post(5113, "bennett-melach-631-78") }), false);
  assert.equal(vis({ surface: "post", pathname: `/post/${P92_DECODED}x`, context: post(92, P92_DB_SLUG) }), false);
  for (const surface of ["number", "topic", "world"]) assert.equal(vis({ surface, pathname: `/post/${P92_DECODED}`, context: post(92, P92_DB_SLUG) }), false);
  assert.equal(normalizePostSlug("%E0%A4%A"), null, "malformed encoding fails closed");
  assert.equal(vis({ surface: "post", pathname: "/post/%E0%A4%A", context: post(92, "%E0%A4%A") }), false);
});
test("gate scopes only the Golden layer; SystemFrame keeps existing (Bennett/ordinary) rail behavior", () => {
  const frame = readFileSync(new URL("../components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  assert.ok(!/isProjectorPilotVisible/.test(frame), "no global rail hiding: ordinary surfaces unchanged");
  const layer = readFileSync(new URL("../components/experience2029/GoldenProjectorModeLayer2029.jsx", import.meta.url), "utf8");
  assert.match(layer, /isProjectorPilotVisible\(\{ surface, pathname: location\.pathname, context \}\)/);
});
