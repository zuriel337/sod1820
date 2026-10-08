import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { attestedTopicsForTheme, categoriesForTheme, WORLD_THEMES, buildWorldThematicUniverse, classifyWorldSourceAccess, topicToWorldConvergence, postToWorldSourceWork } from "./worldThematicUniverse.js";

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
  assert.equal(u.convergences.length, 0, "no attested topic relation -> category never manufactures one");
  assert.equal(buildWorldThematicUniverse({ topics: [{ id: "t1", slug: "t", title: "נושא" }] }).convergences[0].kind, "convergence");
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

test("topics are never linked to a theme from post categories; only attested relations link", () => {
  const topics = [{ id: "t1", slug: "t1", title: "א" }, { id: "t2", slug: "t2", title: "ב" }];
  const base = { posts: [post({ categories: ["רמזים חזקים"] })], topics };
  assert.equal(buildWorldThematicUniverse(base, { theme: "redemption" }).convergences.length, 0);
  assert.equal(buildWorldThematicUniverse(base, { theme: "redemption" }).topicRelation, "none_attested");
  assert.equal(buildWorldThematicUniverse(base).convergences.length, 2);
  const rel = [{ themeKey: "redemption", topicSlug: "t2", attestedBy: "owner" }, { themeKey: "redemption", topicSlug: "t1" }];
  const u = buildWorldThematicUniverse({ ...base, relations: rel }, { theme: "redemption" });
  assert.deepEqual(u.convergences.map((c) => c.id), ["topic:t2"]);
  assert.equal(attestedTopicsForTheme([], rel, "redemption").attested, true);
});

test("bounds are honest: unknown total stays unknown, never 0", () => {
  const known = buildWorldThematicUniverse({ posts: [post()], page: { total: 124, hasMore: true } });
  assert.deepEqual([known.bounds.total, known.bounds.totalKnown, known.bounds.hasMore], [124, true, true]);
  const unknown = buildWorldThematicUniverse({ posts: [post()], page: { total: null, hasMore: false } });
  assert.equal(unknown.bounds.total, null);
  assert.equal(unknown.bounds.totalKnown, false);
  assert.equal(buildWorldThematicUniverse({}).bounds.total, null);
});

test("theme category query is source-side and covers every theme category (no global LIMIT)", () => {
  assert.equal(categoriesForTheme("source_works").includes("סוד החשמל"), true);
  assert.equal(categoriesForTheme("all").length, WORLD_THEMES.flatMap((t) => t.categories).length);
  const src = readFileSync(new URL("./worldThematicUniverse.js", import.meta.url), "utf8");
  assert.match(src, /\.overlaps\("categories"/);
  assert.match(src, /count: "exact"/);
  assert.doesNotMatch(src, /\.limit\(/);
});

test("World first view composes the universe above the advanced research block", () => {
  const src = readFileSync(new URL("../../pages/World2029Page.jsx", import.meta.url), "utf8");
  const u = src.indexOf("<WorldThematicUniverse />");
  const adv = src.indexOf('className="wtu-advanced"');
  assert.ok(u > 0 && adv > u);
  assert.ok(src.indexOf("sod29-world-discovery-grid") > adv, "old stream/gateway live inside the advanced block");
  assert.ok(src.indexOf('id="world-researchers"') > adv);
  assert.ok(src.indexOf('id="world-all-convergences"') > adv);
  assert.doesNotMatch(src, /Number\(item\.value\)\)/);
});
