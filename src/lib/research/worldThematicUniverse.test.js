import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { fetchWorldThemePosts, fetchWorldThemeCounts, readWorldThemeSearch } from "./worldThematicUniverse.js";

function reader(rows = [], count = 60) {
  const requests = [];
  const client = createClient("https://example.supabase.co", "test-anon", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, options) => {
      requests.push({ url: new URL(url), options });
      return new Response(options.method === "HEAD" ? null : JSON.stringify(rows), {
        headers: { "content-type": "application/json", ...(count == null ? {} : { "content-range": `0-23/${count}` }) },
      });
    } },
  });
  return { client, requests };
}

test("theme pages and all counts suppress drafts/forum on the server and retain currently published source origins", async () => {
  const { client, requests } = reader();
  await fetchWorldThemePosts({ theme: "source_works", writer: "סוד החשמל", page: 1 }, client);
  await fetchWorldThemeCounts(client);
  assert.equal(requests.length, 5);
  for (const { url, options } of requests) {
    assert.equal(url.searchParams.get("or"), "(tags.is.null,tags.not.ov.{טיוטה,פורום})");
    for (const origin of ["SOD1820", "ai", "source_document", "uploaded_file"]) assert.ok(url.searchParams.get("source").includes(origin));
    assert.ok(!url.searchParams.get("source").includes("gpt-draft"));
    assert.equal(new Headers(options.headers).get("authorization"), "Bearer test-anon");
  }
  const query = requests[0].url.searchParams;
  assert.equal(query.get("author"), "eq.סוד החשמל");
  assert.match(query.get("categories"), /^ov\./);
  assert.equal(query.get("offset"), "24");
  assert.equal(query.get("limit"), "24");
  assert.ok(requests[2].url.searchParams.get("categories").includes('"משיח בתשע\\"ו"'));
  assert.ok(requests[3].url.searchParams.get("categories").includes('"ארה\\"ב"'));
});

test("source projection reuses corpus text/identity guards and keeps AI origin separate from verification", async () => {
  const { client } = reader([
    { id: 1, slug: "%D7%90", title: "<b>מקור</b>", excerpt: "<p>תוכן &amp; מקור</p>", tags: null, source: "ai", author: "כותב", home_hidden: true },
    { id: 2, slug: "draft", title: "טיוטה", tags: ["טיוטה"] },
    { id: 3, slug: "forum", title: "פורום", tags: ["פורום"] },
    { id: 4, slug: "empty", title: "<p></p>", tags: [] },
  ], 4);
  const page = await fetchWorldThemePosts({}, client);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].title, "מקור");
  assert.equal(page.items[0].excerpt, "תוכן & מקור");
  assert.equal(page.items[0].origin, "ai");
  assert.equal(page.items[0].href, "/post/%25D7%2590");
  assert.equal(page.items[0].homeHidden, true); // home placement is not publication
  assert.equal(page.excluded.length, 3);
  assert.equal(page.hasMore, false);
});

test("unknown totals stay unknown and a failed page rejects instead of claiming an empty corpus", async () => {
  const { client } = reader([], null);
  assert.equal((await fetchWorldThemePosts({}, client)).total, null);
  assert.equal((await fetchWorldThemeCounts(client)).all, null);
  const failed = { from: () => ({ select() { return this; }, not() { return this; }, in() { return this; }, or() { return this; }, order() { return this; }, range() { return Promise.resolve({ error: new Error("offline") }); } }) };
  await assert.rejects(fetchWorldThemePosts({}, failed), /offline/);
});

test("router URL restores theme, writer and page while invalid inputs return a bounded first page", () => {
  assert.deepEqual(readWorldThemeSearch("?theme=timeless&writer=%D7%90&sourcePage=2"), { theme: "timeless", writer: "א", page: 2 });
  for (const page of ["-1", "NaN", "1.5", "Infinity"]) assert.equal(readWorldThemeSearch(`?sourcePage=${page}`).page, 0);
  assert.deepEqual(readWorldThemeSearch("?theme=unknown&writer="), { theme: "all", writer: "all", page: 0 });
});
