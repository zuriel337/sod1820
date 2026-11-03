import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { fetchPostsCatalog2029, postsCatalogScope2029, postContentEntry2029, postFollowCandidates2029 } from "../src/lib/research/postsCatalog2029Projection.js";
import { postsTaxonomyRoute2029, postsTaxonomyScope2029, postsTaxonomySelection2029, postMatchesTaxonomy2029, postsTaxonomyEvidence2029, postsTaxonomyLocation2029, postsTaxonomyPage2029 } from "../src/lib/research/postsTaxonomy2029Route.js";
import { rememberPostsCatalogViewport2029, readPostsCatalogViewport2029, startPostsCatalogViewportRestore2029 } from "../src/lib/research/postsCatalogViewport2029.js";

const tag = "סוד החשמל";
const scope = postsTaxonomyScope2029("tag", tag);
const row = over => ({ id: 42, slug: "public-fixture", source: "wordpress", wp_id: 314, link: "https://sod1820.co.il/public-fixture",
  title: "כותרת אחרת לגמרי", author: "ייחוס לא פתור במקור", tags: [tag], categories: ["תיעוד אירועים"], ...over });
function client(...packets) {
  const calls = [], requests = [];
  return { calls, requests, from(table) {
    const ownCalls = [["from", table]]; calls.push(ownCalls); requests.push(packets.shift());
    const packet = requests.at(-1);
    const query = { then: (yes, no) => Promise.resolve(packet).then(yes, no) };
    for (const method of ["select", "or", "contains", "overlaps", "eq", "ilike", "order", "range", "abortSignal"]) {
      query[method] = (...args) => { ownCalls.push([method, ...args]); return query; };
    }
    return query;
  } };
}

test("encoded taxonomy addresses select one exact namespace and only the admitted category alias", () => {
  assert.deepEqual(postsTaxonomyRoute2029("/tag/" + encodeURIComponent("סוד-החשמל")), scope);
  assert.deepEqual(postsTaxonomyRoute2029("/tag/" + encodeURIComponent(tag)), scope);
  assert.equal(postsTaxonomyRoute2029("/category/" + encodeURIComponent("רמזי-הגאולה")).key, "רמזים חזקים");
  assert.equal(postsTaxonomyRoute2029("/tag/" + encodeURIComponent("רמזי-הגאולה")).key, "רמזי הגאולה", "category rename never rewrites a tag");
  assert.equal(postsTaxonomyRoute2029("/category/" + encodeURIComponent("אסונות/תופעות-טבע")).key, "אסונות/תופעות טבע");
  assert.equal(postsTaxonomyRoute2029("/category/שיעורי-שמע-סוד-החשמל").key, "שיעורי שמע סוד החשמל", "no prefix/substring fallback");
  assert.equal(postsTaxonomyRoute2029("/tag/chatbot").key, "chatbot", "chat aliases remain the existing route owner's exact exceptions");
  assert.equal(postsTaxonomyRoute2029("/tag/%25D7%25A9").key, "%D7%A9", "only one percent decode");
  assert.equal(postsTaxonomyRoute2029("/tag/%E0%A4%A").kind, "invalid");
  for (const path of ["/tag", "/tag/x/y", "/category/x/y", "/world"]) assert.equal(postsTaxonomyRoute2029(path), null);
  for (const query of ["tag=א&tag=ב", "tag=א&category=ב", "tag=א&series=dimension-five", "tag=", "tag=%00", "tag=טיוטה", "tag=פורום"]) {
    assert.equal(postsCatalogScope2029(query).kind, "invalid", query);
  }
  for (const query of ["tag=x", "category=x", "series=dimension-five"]) {
    assert.equal(postsTaxonomyRoute2029("/tag/סוד-החשמל", query).kind, "invalid");
    assert.equal(postsCatalogScope2029(query, scope).kind, "invalid");
  }
  assert.deepEqual(postsCatalogScope2029("q=foo&page=2", scope), scope);
});

test("exact stored membership preserves public Post provenance without admitting research or Follow", () => {
  assert.equal(postMatchesTaxonomy2029(row(), scope), true);
  for (const other of [row({ tags: [tag + " נוסף"] }), row({ tags: [], title: tag }), row({ tags: [], categories: [tag] }), row({ tags: [tag, " טיוטה "] }), row({ tags: [tag, "פורום"] })]) {
    assert.equal(postMatchesTaxonomy2029(other, scope), false);
  }
  const category = postsTaxonomyScope2029("category", "רמזים חזקים");
  assert.equal(postMatchesTaxonomy2029(row({ categories: ["רמזי הגאולה"] }), category), true);
  assert.equal(postMatchesTaxonomy2029(row({ categories: [], tags: ["רמזים חזקים"] }), category), false);
  assert.deepEqual(postFollowCandidates2029({ scope }), []);
  assert.equal(postContentEntry2029({ scope }), null);
  const selection = postsTaxonomySelection2029({ ...scope, field: "author", values: ["forged"], operator: "ilike" });
  assert.equal(selection.field, "tags"); assert.equal(selection.operator, "contains"); assert.deepEqual(selection.values, [tag]);
  assert.match(selection.publicFilter, /טיוטה,פורום/);
});

test("catalog queries combine exact tag membership, public exclusion, bounded stable pagination and escaped title refinement", async () => {
  const original = row();
  const io = client({ data: [original], count: 49 });
  const result = await fetchPostsCatalog2029({ scope, page: 2, search: '50%_",or(x)', client: io });
  assert.equal(result.posts[0], original, "same source row, no author/source/object reinterpretation");
  assert.deepEqual(result.taxonomy, { state: "ready", status: 200 });
  assert.equal(io.requests.length, 1);
  assert.ok(io.calls[0].some(call => call[0] === "or" && call[1].includes("tags.is.null") && call[1].includes("טיוטה,פורום")));
  assert.deepEqual(io.calls[0].find(call => call[0] === "contains"), ["contains", "tags", [tag]]);
  assert.ok(!io.calls[0].some(call => call[0] === "overlaps" || call[0] === "eq"));
  assert.deepEqual(io.calls[0].filter(call => call[0] === "order").map(call => call[1]), ["modified", "id"]);
  assert.deepEqual(io.calls[0].find(call => call[0] === "range"), ["range", 24, 47]);
  assert.deepEqual(io.calls[0].find(call => call[0] === "ilike"), ["ilike", "title", '%50\\%\\_",or(x)%']);
  assert.ok(!io.calls[0].find(call => call[0] === "select")[1].split(",").includes("content"));
});

test("PostgREST serialization preserves labels containing quotes, commas, braces, backslashes or NULL", async () => {
  for (const name of ['ארה"ב', 'א,ב', '{ערך}', 'א\\ב', 'NULL']) {
    for (const kind of ["tag", "category"]) {
      const selection = postsTaxonomySelection2029(postsTaxonomyScope2029(kind, name));
      const field = kind === "tag" ? "tags" : "categories";
      let request;
      const io = createClient("https://taxonomy-test.invalid", "controlled-anonymous-key", {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { fetch: async url => {
          request = new URL(url);
          return new Response(JSON.stringify([row({ [field]: [name] })]), { status: 200, headers: { "content-type": "application/json", "content-range": "0-0/1" } });
        } },
      });
      const result = await fetchPostsCatalog2029({ scope: postsTaxonomyScope2029(kind, name), client: io });
      assert.equal(result.taxonomy.status, 200);
      const expectedLiteral = `{${JSON.stringify(name)}}`;
      assert.equal(selection.arrayLiteral, expectedLiteral);
      assert.equal(request.searchParams.get(field), `${kind === "tag" ? "cs" : "ov"}.${expectedLiteral}`);
      assert.match(request.searchParams.get("or"), /טיוטה,פורום/);
    }
  }
});

test("unknown and draft-only taxonomies are missing; a known taxonomy with zero title matches has a public witness", async () => {
  const missing = await fetchPostsCatalog2029({ scope, client: client({ data: [], count: 0 }) });
  assert.deepEqual(missing.taxonomy, { state: "missing", status: 404 });
  for (const witness of [[], [row()]]) {
    const io = client({ data: [], count: 0 }, { data: witness });
    const result = await fetchPostsCatalog2029({ scope, search: "אין כותרת כזו", client: io });
    assert.deepEqual(result.taxonomy, witness.length ? { state: "empty", status: 200 } : { state: "missing", status: 404 });
    assert.equal(io.requests.length, 2);
    assert.deepEqual(io.calls[1].find(call => call[0] === "range"), ["range", 0, 0]);
    assert.deepEqual(io.calls[1].find(call => call[0] === "contains"), ["contains", "tags", [tag]]);
    assert.ok(!io.calls[1].some(call => call[0] === "ilike"));
    assert.equal(io.calls[1].find(call => call[0] === "select")[2].count, undefined);
  }
  await assert.rejects(fetchPostsCatalog2029({ scope, search: "אין", client: client({ data: [], count: 0 }, { data: [row({ tags: [tag, " טיוטה "] })] }) }));
  await assert.rejects(fetchPostsCatalog2029({ scope, search: "אין", client: client({ data: [], count: 0 }, { error: Error("controlled witness failure") }) }));
});

test("a page beyond the exact public count is 404, including the PostgREST range response", async () => {
  assert.equal(postsTaxonomyPage2029(), 1); assert.equal(postsTaxonomyPage2029("page=2"), 2);
  for (const query of ["page=0", "page=-1", "page=1.5", "page=10001", "page=", "page=word", "page=2&page=3"]) assert.equal(postsTaxonomyPage2029(query), null);
  const io = client({ data: null, error: { code: "PGRST103" } }, { data: null, count: 24 });
  const result = await fetchPostsCatalog2029({ scope, page: 2, client: io });
  assert.deepEqual(result.taxonomy, { state: "page-missing", status: 404 });
  assert.deepEqual(io.calls[1].find(call => call[0] === "select"), ["select", "id", { count: "exact", head: true }]);
  assert.deepEqual(io.calls[1].find(call => call[0] === "contains"), ["contains", "tags", [tag]]);
  assert.deepEqual(postsTaxonomyEvidence2029({ scope, posts: [], total: 0, page: 2, search: "x", exists: true }), { state: "page-missing", status: 404 });
});

test("unverified responses fail closed rather than claim an empty or public collection", async () => {
  for (const packet of [{ data: null, count: 0 }, { data: [], count: null }, { data: [], count: 1 },
    { data: [row({ tags: [tag + " אחר"] })], count: 1 }, { data: [row({ tags: [tag, "טיוטה"] })], count: 1 },
    { error: Error("controlled offline") }]) {
    await assert.rejects(fetchPostsCatalog2029({ scope, client: client(packet) }));
    assert.equal(postsTaxonomyEvidence2029({ scope, posts: packet.data, total: packet.count, error: packet.error }).status, 503);
  }
  assert.equal(postsTaxonomyEvidence2029({ scope, posts: [], total: 0, search: "x" }).status, 503);
  assert.equal(postsTaxonomyEvidence2029({ scope: postsTaxonomyScope2029("tag", "טיוטה"), posts: [row()], total: 1 }).status, 404);
  const aborted = new AbortController(); aborted.abort();
  const io = client({ data: [row()], count: 1 });
  await assert.rejects(fetchPostsCatalog2029({ scope, client: io, signal: aborted.signal }), error => error.name === "AbortError");
  assert.equal(io.requests.length, 0);
});

test("taxonomy query changes preserve exact address, unrelated parameters and hash without crossing namespaces", () => {
  const location = { pathname: "/category/%D7%A8%D7%9E%D7%96%D7%99-%D7%94%D7%92%D7%90%D7%95%D7%9C%D7%94", hash: "#posts-catalog" };
  const params = new URLSearchParams("page=2&q=מילה&sort=modified");
  params.set("page", "3");
  const next = postsTaxonomyLocation2029(location, params);
  assert.equal(next.pathname, location.pathname); assert.equal(next.hash, location.hash);
  assert.equal(new URLSearchParams(next.search).get("page"), "3");
  assert.equal(new URLSearchParams(next.search).get("q"), "מילה");
  assert.equal(new URLSearchParams(next.search).get("sort"), "modified");
  assert.ok(!next.search.includes("tag=") && !next.search.includes("category="));
});

test("exact tag/category history entries restore their saved viewport using the existing lifecycle", () => {
  for (const pathname of ["/tag/%D7%A1%D7%95%D7%93-%D7%94%D7%97%D7%A9%D7%9E%D7%9C", "/category/אסונות%2Fתופעות-טבע"]) {
    const href = `${pathname}?page=2&q=מסר#posts-catalog`;
    // A browser percent-encodes Hebrew in location.pathname; use its exact href.
    const location = new URL(href, "https://preview.invalid");
    const actualHref = `${location.pathname}${location.search}${location.hash}`;
    const frames = [], scrolls = [], listeners = new Map();
    const win = { location, scrollX: 0, scrollY: 1840, history: { state: { key: "tax-entry", idx: 4 },
      replaceState(state) { this.state = state; } },
      addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type) { listeners.delete(type); },
      requestAnimationFrame(fn) { frames.push(fn); return frames.length; }, cancelAnimationFrame() {},
      setTimeout: () => 1, clearTimeout() {}, scrollTo(options) { scrolls.push(options); this.scrollY = options.top; },
    };
    const doc = { addEventListener() {}, removeEventListener() {} };
    const options = { win, doc, href: actualHref, entryKey: "tax-entry", navigationType: "POP" };
    assert.equal(rememberPostsCatalogViewport2029(options), true);
    assert.equal(win.history.state.idx, 4);
    assert.equal(readPostsCatalogViewport2029(options).href, actualHref);
    assert.equal(readPostsCatalogViewport2029({ ...options, href: actualHref.replace("page=2", "page=1") }), null);
    win.scrollY = 0;
    const restore = startPostsCatalogViewportRestore2029(options);
    restore.setReady(true, {}); frames.forEach(fn => fn()); restore.stop();
    assert.deepEqual(scrolls, [{ left: 0, top: 1840, behavior: "instant" }]);
    assert.equal(listeners.size, 0);
  }
});
