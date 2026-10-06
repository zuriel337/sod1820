import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isProjectorPilotVisible as vis } from "./projectorPilotGate.js";

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
test("SystemFrame consumes the single gate for rail, layout and sheet", () => {
  const src = readFileSync(new URL("../components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  assert.match(src, /isProjectorPilotVisible\(/);
  assert.match(src, /const showContextRail = projectorPilotVisible/);
  assert.match(src, /transientKind === TRANSIENT\.CONTEXT && showContextRail/);
});
