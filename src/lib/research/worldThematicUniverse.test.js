import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorldThematicUniverse, classifyWorldSourceAccess, topicToWorldConvergence, postToWorldSourceWork } from "./worldThematicUniverse.js";

const post = (o = {}) => ({ id: 1, slug: "a", title: "א", source: "wordpress", categories: ["סוד החשמל"], author: "סוד החשמל", date: "2026-01-02", ...o });

test("wordpress/SOD1820 source works are eligible; AI analyses and unreviewed origins are not", () => {
  assert.equal(classifyWorldSourceAccess(post()).eligible, true);
  assert.equal(classifyWorldSourceAccess(post({ source: "ai" })).reason, "ai_analysis_not_source");
  assert.equal(classifyWorldSourceAccess(post({ source: "uploaded_file" })).reason, "origin_needs_human_gate");
  assert.equal(classifyWorldSourceAccess(post({ source: "source_document" })).eligible, false);
});

test("private/whatsapp/person_only markers and missing identity are excluded", () => {
  assert.equal(classifyWorldSourceAccess(post({ privacy_scope: "person_only" })).reason, "private_marker");
  assert.equal(classifyWorldSourceAccess(post({ tags: ["whatsapp"] })).reason, "private_marker");
  assert.equal(classifyWorldSourceAccess(post({ slug: "" })).reason, "missing_identity");
  assert.equal(classifyWorldSourceAccess(null).eligible, false);
});

test("one world: themes filter source works, convergences stay a distinct kind, writer is a lens", () => {
  const u = buildWorldThematicUniverse(
    { posts: [post(), post({ id: 2, slug: "b", categories: ["רמזים חזקים"], author: "צבי" }), post({ id: 3, slug: "c", source: "ai" })],
      topics: [{ id: "t1", slug: "t", title: "נושא", numbers: [], highlight_numbers: [], approved_at: "2026-02-01" }] },
    { theme: "redemption" });
  assert.deepEqual(u.sourceWorks.map((w) => w.id), ["post:2"]);
  assert.equal(u.convergences.length, 1);
  assert.equal(u.convergences[0].kind, "convergence");
  assert.equal(u.excluded.ai_analysis_not_source, 1);
  assert.equal(buildWorldThematicUniverse({ posts: [post(), post({ id: 2, slug: "b", author: "צבי" })] }, { writer: "צבי" }).sourceWorks.length, 1);
  assert.deepEqual(u.writers, ["סוד החשמל", "צבי"]);
});

test("null value never becomes 0 and hrefs are exact-return routes", () => {
  const c = topicToWorldConvergence({ id: "t", slug: "x y", title: "T", numbers: [], highlight_numbers: [] });
  assert.equal(c.value, null);
  assert.equal(c.href, "/topic/x%20y");
  assert.equal(postToWorldSourceWork(post({ author: null })).writer, null);
  assert.equal(postToWorldSourceWork(post()).href, "/post/a");
});
