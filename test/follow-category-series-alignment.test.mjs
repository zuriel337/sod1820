import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalFollowTopic, followTopicAliases, includesFollowSubject } from "../src/lib/followIdentity.js";
import { CONTENT_SERIES_2029, contentSeriesKeysForPost } from "../src/lib/research/contentSeries2029Identity.js";
import { postsCatalogScope2029, fetchPostsCatalog2029 } from "../src/lib/research/postsCatalog2029Projection.js";
import { topicLabel } from "../src/lib/notifications.js";
import { buildFollowCenterModel } from "../src/components/followCenter2029/followCenterModel2029.js";
import { generatedMigration, migrationPath } from "../scripts/generate-follow-category-series-alignment.mjs";

const post = (over = {}) => ({ id: 1, slug: "fixture", title: "פרסום", categories: [], tags: [], ...over });
function client(result = { data: [], count: 0, error: null }) {
  const calls = [];
  const query = { then: (yes, no) => Promise.resolve(result).then(yes, no) };
  for (const name of ["select", "or", "overlaps", "eq", "order", "range"]) query[name] = (...args) => { calls.push([name, ...args]); return query; };
  return { calls, from(name) { calls.push(["from", name]); return query; } };
}

test("approved category rename recognizes both stored namespaces, without widening series intent", () => {
  assert.equal(canonicalFollowTopic("category:רמזי הגאולה"), "cat:רמזים חזקים");
  assert.deepEqual(new Set(followTopicAliases("cat:רמזים חזקים")), new Set(["cat:רמזים חזקים", "category:רמזים חזקים", "cat:רמזי הגאולה", "category:רמזי הגאולה"]));
  assert.equal(includesFollowSubject(["cat:רמזי הגאולה"], "cat:רמזים חזקים"), true);
  assert.equal(includesFollowSubject(["cat:מימד חמש"], "series:dimension-five"), false);
  assert.equal(includesFollowSubject(["author:אלון לוי"], "series:mah-kore-habora"), false);
  assert.equal(canonicalFollowTopic("cat:סרט"), "cat:סרט", "an unresolved old name is not merged by similarity");
});

test("series membership is exact and keeps author, publisher and topic separate", () => {
  assert.equal(CONTENT_SERIES_2029.length, 3);
  assert.deepEqual(contentSeriesKeysForPost(post({ author: "אלון לוי", tags: ["מה קורה הבורא"] })), ["mah-kore-habora"]);
  assert.deepEqual(contentSeriesKeysForPost(post({ author: "אלון לוי", title: "מה קורה הבורא" })), []);
  assert.deepEqual(contentSeriesKeysForPost(post({ author: null, categories: ["מימד חמש", "הצופן בסרטים"] })), []);
  assert.deepEqual(contentSeriesKeysForPost(post({ author: "בדרך לנצח", categories: ["מימד חמש"] })), ["dimension-five"]);
  assert.deepEqual(contentSeriesKeysForPost(post({ author: "אחר", tags: ["סוד החשמל"] })), ["sod-hashmal"]);
  assert.deepEqual(contentSeriesKeysForPost(post({ author: " אלון לוי ", tags: ["מה קורה הבורא"] })), [], "no unapproved author alias");
  assert.deepEqual(contentSeriesKeysForPost(post({ author: "אלון לוי", tags: [" מה קורה הבורא "] })), [], "membership matches the exact server filter");
});

test("native destination filters reject ambiguous/unknown selections, preserve an approved rename", () => {
  assert.equal(postsCatalogScope2029("category=" + encodeURIComponent("רמזי הגאולה")).key, "רמזים חזקים");
  for (const query of ["series=unknown", "category=x&series=dimension-five", "series=dimension-five&series=sod-hashmal", "category=x&category=y", "category=%00", "category="]) {
    assert.equal(postsCatalogScope2029(query).kind, "invalid", query);
  }
  assert.equal(postsCatalogScope2029("series=dimension-five").label, "מימד חמש");
  assert.equal(postsCatalogScope2029().kind, "all");
});

test("paginated series reader applies membership, author and public filters together", async () => {
  const io = client({ data: [post({ author: "בדרך לנצח", categories: ["מימד חמש"] })], count: 31 });
  await fetchPostsCatalog2029({ scope: postsCatalogScope2029("series=dimension-five"), page: 2, client: io });
  assert.ok(io.calls.some(call => call[0] === "or" && call[1].includes("tags.is.null") && call[1].includes("טיוטה,פורום")));
  assert.ok(io.calls.some(call => call[0] === "or" && call[1] === 'categories.cs.{"מימד חמש"}'));
  assert.ok(io.calls.some(call => call[0] === "eq" && call[1] === "author" && call[2] === "בדרך לנצח"));
  assert.deepEqual(io.calls.find(call => call[0] === "range"), ["range", 24, 47]);
  assert.equal(io.calls.filter(call => call[0] === "order").length, 2);
  assert.ok(!io.calls.find(call => call[0] === "select")[1].includes("content"), "no full corpus/card content download");
});

test("category reader covers both approved names; tag-only Sod Hashmal membership remains reachable", async () => {
  const io = client();
  await fetchPostsCatalog2029({ scope: postsCatalogScope2029("category=" + encodeURIComponent("רמזים חזקים")), client: io });
  assert.deepEqual(io.calls.find(call => call[0] === "overlaps"), ["overlaps", "categories", ["רמזים חזקים", "רמזי הגאולה"]]);
  const tagOnly = client({ data: [post({ tags: ["סוד החשמל"] })], count: 1 });
  const result = await fetchPostsCatalog2029({ scope: postsCatalogScope2029("series=sod-hashmal"), client: tagOnly });
  assert.equal(result.posts.length, 1);
  assert.ok(tagOnly.calls.some(call => call[0] === "or" && call[1].includes('tags.cs.{"סוד החשמל"}')));
});

test("missing counts, private/draft rows and mismatched membership fail rather than masquerade as zero", async () => {
  const scope = postsCatalogScope2029("series=dimension-five");
  for (const result of [
    { data: [], count: null }, { data: null, count: 0 }, { data: [], count: -1 },
    { data: [post({ author: "אחר", categories: ["מימד חמש"] })], count: 1 },
    { data: [post({ author: "בדרך לנצח", categories: ["מימד חמש"], tags: ["טיוטה"] })], count: 1 },
    { error: new Error("RLS/read unavailable") },
  ]) await assert.rejects(fetchPostsCatalog2029({ scope, client: client(result) }));
  await assert.rejects(fetchPostsCatalog2029({ scope: { ...scope, key: "unknown", spec: scope.spec }, client: client() }));
});

test("2029 follows and reasons name approved series and stay native; unknown keys are not invented", () => {
  const model = buildFollowCenterModel({ principal: "registered", follows: { state: "ready", topics: ["cat:מימד חמש", "series:dimension-five", "series:unknown"] },
    notifications: { state: "ready", items: [{ id: "n", kind: "post_new", title: "פרסום", link: "/old-post-slug", source_topic: "series:dimension-five" }] } });
  assert.deepEqual(model.following.groups.map(group => group.heading), ["קטגוריות", "סדרות", "אחר"]);
  assert.equal(model.following.groups[0].items[0].href, "/2029/posts?category=" + encodeURIComponent("מימד חמש"));
  assert.equal(model.following.groups[1].items[0].href, "/2029/posts?series=dimension-five");
  assert.equal(model.following.groups[2].items[0].href, null);
  assert.equal(model.updates.items[0].why.label, "מימד חמש");
  assert.equal(model.updates.items[0].href, "/post/old-post-slug");
  assert.equal(topicLabel("cat:מימד חמש").link, "/category/" + encodeURIComponent("מימד חמש"), "Legacy default route remains compatible");
});

test("generated server patch matches descriptors and has no historical preference rewrite", () => {
  const sql = readFileSync(migrationPath, "utf8");
  assert.equal(sql, generatedMigration());
  assert.match(sql, /Follow alignment base changed/);
  assert.doesNotMatch(sql, /(?:update|delete from|insert into)\s+(?:public\.)?notification_prefs\b/i);
  assert.doesNotMatch(sql, /alter\s+table|create\s+table|enable\s+row\s+level/i);
  assert.match(sql, /revoke all on function public\.post_content_series_keys_v1/);
});
