import test from "node:test";
import assert from "node:assert/strict";
import { postsMediaScope2029, postsMediaHref, orderPostsWithVideo, groupVideoAssets, fetchPostsWithVideoPage2029, fetchVideoLibraryPage2029, fetchVideoPublicIds2029, resetPostsVideoLibraryCache2029, VIDEO_PAGE_SIZE } from "./postsVideoLibrary2029.js";
import { publicPostOnlyFilter } from "./publicPostBoundary.js";

// a tiny chainable fake of the SDK query builder: records every call, answers from a table of rows
function fakeClient(tables) {
  const calls = [];
  const client = {
    calls,
    from(table) {
      const q = { table, ops: [] };
      const chain = new Proxy({}, { get: (_, name) => {
        if (name === "then") return (resolve) => {
          calls.push(q);
          let rows = [...(tables[table] || [])];
          let from = 0, to = rows.length - 1;
          for (const [op, args] of q.ops) {
            if (op === "eq") rows = rows.filter((r) => r[args[0]] === args[1]);
            if (op === "in") rows = rows.filter((r) => args[1].map(String).includes(String(r[args[0]])));
            if (op === "contains") rows = rows.filter((r) => args[1].every((v) => (r[args[0]] || []).includes(v)));
            if (op === "range") { from = args[0]; to = args[1]; }
          }
          const total = rows.length;
          resolve({ data: rows.slice(from, to + 1), error: null, count: total });
        };
        return (...args) => { q.ops.push([name, args]); return chain; };
      } });
      return chain;
    },
  };
  return client;
}

test("the media views are read from the real media: ?media=video only, one view parameter, anything else is not a media view", () => {
  assert.deepEqual(postsMediaScope2029("media=video"), { active: true, view: "posts" });
  assert.deepEqual(postsMediaScope2029("media=video&view=videos"), { active: true, view: "videos" });
  assert.deepEqual(postsMediaScope2029("media=video&view=x"), { active: true, view: "posts" });
  for (const bad of ["media=audio", "media=video&media=video", "", "view=videos", "media="]) assert.equal(postsMediaScope2029(bad).active, false, bad);
  assert.equal(postsMediaHref("posts"), "/2029/posts?media=video");
  assert.equal(postsMediaHref("videos"), "/2029/posts?media=video&view=videos");
});

test("posts that contain video: unique ids, playable kinds only, newest placement first; a legacy-tag-only or unplayable reference is not video", () => {
  const rows = [
    { source_id: "10", video_kind: "youtube", updated_at: "2026-01-01" },
    { source_id: "10", video_kind: "selfhost", updated_at: "2026-03-01" },
    { source_id: "11", video_kind: "gdrive", updated_at: "2026-05-01" },            // not playable: needs review, not listed
    { source_id: "12", video_kind: "legacy_external", updated_at: "2026-06-01" },
    { source_id: "13", video_kind: "vimeo", updated_at: "2026-02-01" },
    { source_id: "x; drop", video_kind: "youtube", updated_at: "2026-07-01" },       // not a numeric id
  ];
  assert.deepEqual(orderPostsWithVideo(rows), ["10", "13"]);
});

test("all videos: one card per ASSET with its appearances, newest first; an unplayable kind or a non-numeric id is not listed", () => {
  const rows = [
    { asset_key: "url:a.mp4", source_id: "5", video_kind: "selfhost", updated_at: "2026-02-01" },
    { asset_key: "url:a.mp4", source_id: "6", video_kind: "selfhost", updated_at: "2026-03-01" },
    { asset_key: "url:a.mp4", source_id: "6", video_kind: "selfhost", updated_at: "2026-03-01" },     // the same appearance twice is one appearance
    { asset_key: "yt:d", source_id: "7", video_kind: "youtube", updated_at: "2026-04-01" },
    { asset_key: "url:c", source_id: "9", video_kind: "gdrive", updated_at: "2026-05-01" },
    { asset_key: "yt:e", source_id: "x", video_kind: "youtube", updated_at: "2026-06-01" },
  ];
  const out = groupVideoAssets(rows);
  assert.deepEqual(out.map((x) => x.assetKey), ["yt:d", "url:a.mp4"]);
  assert.deepEqual(out[1].postIds.sort(), ["5", "6"]);
});

test("fetchPostsWithVideoPage2029: exact total, 24 per page, every post re-admitted through the public post boundary (and unrelated rows are refused)", async () => {
  resetPostsVideoLibraryCache2029();
  const placements = Array.from({ length: 30 }, (_, i) => ({ source_type: "post", source_id: String(100 + i), video_kind: "youtube", updated_at: `2026-02-${String(i + 1).padStart(2, "0")}` }));
  const posts = placements.map((p) => ({ id: Number(p.source_id), slug: `s${p.source_id}`, title: `t${p.source_id}`, tags: [], categories: [] }));
  const client = fakeClient({ video_media_placements_v1: placements, posts });
  const first = await fetchPostsWithVideoPage2029({ page: 1, client });
  assert.equal(first.total, 30);
  assert.equal(first.posts.length, VIDEO_PAGE_SIZE);
  assert.equal(first.posts[0].id, 129, "newest first");
  const second = await fetchPostsWithVideoPage2029({ page: 2, client });
  assert.equal(second.posts.length, 6);
  const postCalls = client.calls.filter((c) => c.table === "posts");
  assert.equal(postCalls.length, 3, "one admission read of the whole candidate set (id + tags) when the placements are cached, then one page read per page: no read per card");
  assert.ok(postCalls.every((c) => c.ops.some(([op, args]) => op === "or" && args[0] === publicPostOnlyFilter())), "every posts read, the admission included, goes through the existing public filter");
  assert.deepEqual(postCalls[0].ops.find(([op]) => op === "select")[1], ["id,tags"], "the admission read is light");
  assert.equal(client.calls.filter((c) => c.table === "video_media_placements_v1").length, 1, "the placements are read once and cached");
  await assert.rejects(() => fetchPostsWithVideoPage2029({ page: 0, client }), /עמוד לא תקין/);
});

test("fetchPostsWithVideoPage2029: a post carrying a suppressed tag is refused, never shown", async () => {
  resetPostsVideoLibraryCache2029();
  const client = fakeClient({ video_media_placements_v1: [{ source_type: "post", source_id: "1", video_kind: "youtube", updated_at: "2026-01-01" }], posts: [{ id: 1, slug: "a", title: "a", tags: ["טיוטה"], categories: [] }] });
  await assert.rejects(() => fetchPostsWithVideoPage2029({ page: 1, client }), /לא ניתן לאמת/);
});

test("fetchVideoLibraryPage2029: one read of the placements, each appearance re-admitted, an asset with no public appearance disappears, the identity page is best effort", async () => {
  resetPostsVideoLibraryCache2029();
  const placements = [
    { source_type: "post", source_id: "1", asset_key: "k1", video_kind: "youtube", updated_at: "2026-02-02" },
    { source_type: "post", source_id: "2", asset_key: "k1", video_kind: "youtube", updated_at: "2026-02-03" },
    { source_type: "post", source_id: "3", asset_key: "k2", video_kind: "selfhost", updated_at: "2026-02-01" },
  ];
  const posts = [{ id: 1, slug: "p1", title: "p1", tags: [], categories: [] }, { id: 2, slug: "p2", title: "p2", tags: [], categories: [] }];   // post 3 is not public
  const client = fakeClient({ video_media_placements_v1: placements, posts, video_media_assets_v1: [{ asset_key: "k1", public_id: "a".repeat(32) }] });
  const out = await fetchVideoLibraryPage2029({ page: 1, client });
  assert.deepEqual(out.items.map((i) => i.assetKey), ["k1"], "k2's only post is not public, so it is not listed");
  assert.deepEqual(out.items[0].appearances.map((p) => p.id).sort(), [1, 2]);
  assert.equal(out.items[0].publicId, null, "the list does not wait for the identity pages");
  const ids = await fetchVideoPublicIds2029({ keys: ["k1", "nope"], client });
  assert.equal(ids.get("k1"), "a".repeat(32));
  assert.equal(ids.has("nope"), false);
  assert.equal(client.calls.filter((c) => c.table === "video_media_placements_v1").length, 1);
  // a failing identity lookup is a quiet empty answer, never an error for the list
  const broken = fakeClient({});
  broken.from = () => ({ select: () => ({ in: () => Promise.resolve({ data: null, error: { code: "57014" } }) }) });
  assert.equal((await fetchVideoPublicIds2029({ keys: ["k1"], client: broken })).size, 0);
});

// M3 (review of a141138b): the total and the pages are derived from the ADMITTED set, never from placements whose post is no longer public.
test("fetchPostsWithVideoPage2029: a placement whose post is not public is not counted and does not leave a hole in the page", async () => {
  resetPostsVideoLibraryCache2029();
  const placements = [
    { source_type: "post", source_id: "1", asset_key: "k1", video_kind: "youtube", updated_at: "2026-02-02" },
    { source_type: "post", source_id: "2", asset_key: "k2", video_kind: "selfhost", updated_at: "2026-02-03" },   // post 2 is not public any more
  ];
  const client = fakeClient({ video_media_placements_v1: placements, posts: [{ id: 1, slug: "p1", title: "p1", tags: [], categories: [] }] });
  const out = await fetchPostsWithVideoPage2029({ page: 1, client });
  assert.equal(out.total, 1, "visible = total");
  assert.deepEqual(out.posts.map((p) => p.id), [1]);
});

test("fetchVideoLibraryPage2029: an asset whose only appearance is not public is not counted; a shared asset keeps only its public appearances", async () => {
  resetPostsVideoLibraryCache2029();
  const placements = [
    { source_type: "post", source_id: "1", asset_key: "k1", video_kind: "youtube", updated_at: "2026-02-02" },
    { source_type: "post", source_id: "2", asset_key: "k1", video_kind: "youtube", updated_at: "2026-02-03" },
    { source_type: "post", source_id: "3", asset_key: "k2", video_kind: "selfhost", updated_at: "2026-02-01" },
  ];
  const posts = [{ id: 1, slug: "p1", title: "p1", tags: [], categories: [] }];   // posts 2 and 3 are not public
  const client = fakeClient({ video_media_placements_v1: placements, posts });
  const out = await fetchVideoLibraryPage2029({ page: 1, client });
  assert.equal(out.total, 1, "visible = total");
  assert.deepEqual(out.items.map((i) => i.assetKey), ["k1"]);
  assert.deepEqual(out.items[0].postIds, ["1"], "the withdrawn appearance is not listed as an appearance");
  assert.deepEqual(out.items[0].appearances.map((p) => p.id), [1]);
});

test("the admission read is chunked and never one request per card", async () => {
  resetPostsVideoLibraryCache2029();
  const placements = Array.from({ length: 400 }, (_, i) => ({ source_type: "post", source_id: String(1000 + i), asset_key: `k${i}`, video_kind: "youtube", updated_at: "2026-02-01" }));
  const posts = placements.map((p) => ({ id: Number(p.source_id), slug: `s${p.source_id}`, title: `t${p.source_id}`, tags: [], categories: [] }));
  const client = fakeClient({ video_media_placements_v1: placements, posts });
  const out = await fetchPostsWithVideoPage2029({ page: 1, client });
  assert.equal(out.total, 400);
  const admission = client.calls.filter((c) => c.table === "posts" && c.ops.some(([op, args]) => op === "select" && args[0] === "id,tags"));
  assert.equal(admission.length, 3, "400 candidates in chunks of 150");
  assert.equal(client.calls.filter((c) => c.table === "posts").length, 4, "3 admission chunks + 1 page read");
});
