// DEF-003 regression: the heavy video_media_assets_v1 projection is read once per asset, not once per verification step, and the
// existing fetchPublicVideo2029 contract (call order, comparisons) is untouched.
import test from "node:test";
import assert from "node:assert/strict";
import { createVideoAssetReader } from "../src/lib/research/publicVideoAssetReader2029.js";
import { fetchPublicVideo2029 } from "../src/lib/research/publicVideo2029Reading.js";

const ID = "7abeffbb5b735eae9d03e12e34d07ddc";
const asset = { public_id: ID, primary_source_type: "home_video", primary_source_id: "42", video_kind: "selfhost", media_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/fixture.mp4",
  youtube_id: null, poster_url: null, thumb_url: null, google_indexable: true };
const homeVideo = { id: 42, is_active: true, title: "כותרת", video_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/fixture.mp4", yt: null, poster_url: null, created_at: "2026-10-01T00:00:00Z" };

function network({ rows = [asset], fail = false } = {}) {
  const calls = [];
  return { calls, fetchRows: async (table, params) => {
    calls.push({ table, params });
    if (fail) throw new Error("video-source-unavailable");
    return table === "video_media_assets_v1" ? rows : [homeVideo];
  } };
}

test("fetchPublicVideo2029 keeps its three-read sequence but only one network read hits the heavy view", async () => {
  const net = network(), seen = [];
  const reader = createVideoAssetReader({ fetchRows: net.fetchRows });
  const item = await fetchPublicVideo2029(ID, { readRows: async (table, params, options) => { seen.push(table); return reader(table, params, options); } });
  assert.deepEqual(seen, ["video_media_assets_v1", "home_videos", "video_media_assets_v1"], "the contract's call order is unchanged");
  assert.equal(net.calls.filter((c) => c.table === "video_media_assets_v1").length, 1, "one projection read, not two");
  assert.equal(item.public_id, ID);
  assert.equal(item.media_url, "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/fixture.mp4");
});

test("readers do not share state: a second reader (next request) reads the view again, so an outage is never masked", async () => {
  const net = network();
  await fetchPublicVideo2029(ID, { readRows: createVideoAssetReader({ fetchRows: net.fetchRows }) });
  await fetchPublicVideo2029(ID, { readRows: createVideoAssetReader({ fetchRows: net.fetchRows }) });
  assert.equal(net.calls.filter((c) => c.table === "video_media_assets_v1").length, 2);
});

test("concurrent reads of one asset share a single in-flight request", async () => {
  const net = network(); const reader = createVideoAssetReader({ fetchRows: net.fetchRows });
  await Promise.all(Array.from({ length: 8 }, () => reader("video_media_assets_v1", { select: "public_id", public_id: `eq.${ID}`, limit: "1" })));
  assert.equal(net.calls.length, 1);
});

test("local filtering keeps the exact-equality semantics (a mismatching source type or id yields no row)", async () => {
  const net = network(); const reader = createVideoAssetReader({ fetchRows: net.fetchRows });
  const base = { select: "public_id,primary_source_type,primary_source_id", public_id: `eq.${ID}`, limit: "1" };
  assert.equal((await reader("video_media_assets_v1", base)).length, 1);
  assert.deepEqual(await reader("video_media_assets_v1", { ...base, primary_source_type: "eq.story" }), []);
  assert.deepEqual(await reader("video_media_assets_v1", { ...base, primary_source_id: "eq.43" }), []);
  assert.deepEqual(Object.keys((await reader("video_media_assets_v1", base))[0]), ["public_id", "primary_source_type", "primary_source_id"], "projection only returns the requested columns");
});

test("errors and empty answers are never cached; unknown shapes pass straight through", async () => {
  let failing = true; const calls = [];
  const reader = createVideoAssetReader({ fetchRows: async (table, params) => { calls.push(table); if (failing) throw new Error("down"); return table === "video_media_assets_v1" ? [] : [homeVideo]; } });
  const q = { select: "public_id", public_id: `eq.${ID}`, limit: "1" };
  await assert.rejects(() => reader("video_media_assets_v1", q));
  failing = false;
  assert.deepEqual(await reader("video_media_assets_v1", q), []);
  assert.deepEqual(await reader("video_media_assets_v1", q), []);
  assert.equal(calls.filter((t) => t === "video_media_assets_v1").length, 3, "failure then two empty answers each hit the network");
  const before = calls.length;
  await reader("video_media_assets_v1", { select: "public_id,title", public_id: `eq.${ID}` }); // title is outside the superset
  await reader("video_media_assets_v1", { select: "public_id", google_indexable: "eq.true" }); // no asset id
  await reader("home_videos", { select: "id", id: "eq.1" });
  assert.equal(calls.length, before + 3, "everything outside the per-asset pattern is passed through");
});
