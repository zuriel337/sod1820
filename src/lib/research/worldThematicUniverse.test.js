import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildWorldThemePostsQuery, fetchWorldThemePosts, fetchWorldThemeCounts, createRequestGuard, WORLD_SOURCE_QUERY_ORIGINS, attestedTopicsForTheme, categoriesForTheme, WORLD_THEMES, buildWorldThematicUniverse, classifyWorldSourceAccess, topicToWorldConvergence, postToWorldSourceWork } from "./worldThematicUniverse.js";

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
  assert.equal(categoriesForTheme("all"), null, "all = every eligible source post, no category constraint");
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

// Fake chainable supabase client recording the calls.
function fakeClient(result = { data: [], count: 0, error: null }) {
  const calls = [];
  const q = new Proxy({}, { get: (_, name) => {
    if (name === "then") return (res, rej) => Promise.resolve(result).then(res, rej);
    return (...args) => { calls.push([name, ...args]); return q; };
  } });
  return { client: { from: (t) => { calls.push(["from", t]); return q; } }, calls };
}

test("source query lists exact live canonical origins incl. uppercase SOD1820", () => {
  assert.ok(WORLD_SOURCE_QUERY_ORIGINS.includes("SOD1820"));
  assert.ok(WORLD_SOURCE_QUERY_ORIGINS.includes("wordpress"));
  const { client, calls } = fakeClient();
  buildWorldThemePostsQuery(client, { theme: "redemption" });
  const inCall = calls.find((c) => c[0] === "in");
  assert.deepEqual(inCall.slice(1), ["source", [...WORLD_SOURCE_QUERY_ORIGINS]]);
  // both DB-original uppercase and lowercase shapes classify as eligible source works
  assert.equal(classifyWorldSourceAccess(post({ source: "SOD1820" })).eligible, true);
  assert.equal(classifyWorldSourceAccess(post({ source: "sod1820" })).eligible, true);
});

test("'all' applies no category constraint so unmapped posts (58 wordpress) are not dropped; themes still do", async () => {
  const all = fakeClient(); buildWorldThemePostsQuery(all.client, { theme: "all" });
  assert.equal(all.calls.some((c) => c[0] === "overlaps"), false);
  assert.equal(categoriesForTheme("all"), null);
  const themed = fakeClient(); buildWorldThemePostsQuery(themed.client, { theme: "timeless" });
  assert.equal(themed.calls.some((c) => c[0] === "overlaps"), true);
  const counts = fakeClient({ data: null, count: 1296, error: null });
  const result = await fetchWorldThemeCounts(counts.client);
  assert.equal(result.all, 1296);
  assert.equal(counts.calls.filter((c) => c[0] === "overlaps").length, WORLD_THEMES.length);
  // an unclassified post is still a visible work under "all"
  const u = buildWorldThematicUniverse({ posts: [post({ categories: ["לא ממופה"] })] }, { theme: "all" });
  assert.equal(u.sourceWorks.length, 1);
  assert.deepEqual(u.sourceWorks[0].themes, []);
});

test("writer is a server-side lens over all eligible posts, with paging bounds", async () => {
  const { client, calls } = fakeClient({ data: [{ id: 1 }, { id: 2 }], count: 5, error: null });
  const page = await fetchWorldThemePosts({ theme: "all", offset: 2, limit: 2, author: "צבי" }, client);
  assert.deepEqual(calls.find((c) => c[0] === "eq").slice(1), ["author", "צבי"]);
  assert.deepEqual(calls.find((c) => c[0] === "range").slice(1), [2, 3]);
  assert.equal(page.hasMore, true);
  const none = fakeClient(); buildWorldThemePostsQuery(none.client, { author: "all" });
  assert.equal(none.calls.some((c) => c[0] === "eq"), false);
});

test("no attested relation: catalog topics appear only as NOT-LINKED general topics, never as linked", () => {
  const topics = [{ id: "t1", slug: "t", title: "נושא" }];
  const u = buildWorldThematicUniverse({ posts: [post()], topics }, { theme: "redemption" });
  assert.equal(u.convergences.length, 0);
  assert.equal(u.topicRelation, "none_attested");
  assert.equal(u.generalTopics.length, 1);
  const linked = buildWorldThematicUniverse({ topics, relations: [{ themeKey: "redemption", topicSlug: "t", attestedBy: "owner" }] }, { theme: "redemption" });
  assert.equal(linked.convergences.length, 1);
  assert.equal(linked.generalTopics.length, 0);
  assert.equal(buildWorldThematicUniverse({ topics }, { theme: "all" }).generalTopics.length, 0);
});

test("load-more race: a page resolving after a theme switch is discarded", async () => {
  const guard = createRequestGuard();
  const loadMoreToken = guard.next();
  const slow = new Promise((r) => setTimeout(() => r("old-theme-page"), 5));
  const switchToken = guard.next(); // theme switched while load-more in flight
  const page = await slow;
  assert.equal(guard.isCurrent(loadMoreToken), false, "stale load-more must not append");
  assert.equal(guard.isCurrent(switchToken), true);
  assert.equal(page, "old-theme-page");
});
