import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchPublicVideo2029 } from "../src/lib/research/publicVideo2029Reading.js";
import ogHandler from "../api/og.js";

const ID = "25e378462b55298219e5f7562698bfa7", SOURCE = "9d4e6b80-f52b-4461-9231-ca30f37f0db9";
const NOW = Date.parse("2026-11-02T16:00:00Z");
const URL = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/fixture.mp4";
const channel = patch => ({ id: SOURCE, status: "live", page_only: false, expires_at: null,
  created_at: "2026-08-04T18:50:31Z", text: "מסר ציבורי", credit: "אור הגאולה", speaker: "דובר",
  image_url: URL, thumb_url: URL.replace(".mp4", ".jpg"), ...patch });
const asset = patch => ({ public_id: ID, primary_source_type: "channel_update", primary_source_id: SOURCE,
  media_url: URL, video_kind: "selfhost", google_indexable: true, ...patch });
function fixture({ source = channel(), media = asset(), failAt, onRead } = {}) {
  const calls = [];
  const readRows = async (table, params, options) => {
    calls.push({ table, params, options }); onRead?.(calls.length);
    if (calls.length === failAt) throw Object.assign(new Error("synthetic outage"), { code: "42501" });
    return table === "video_media_assets_v1" ? media ? [media] : [] : source ? [source] : [];
  };
  return { calls, readRows };
}
const run = (f, options = {}) => fetchPublicVideo2029(ID, { readRows: f.readRows, now: NOW, ...options });

test("public video re-admits its exact source before loading playable metadata; no other placements", async () => {
  const f = fixture(), value = await run(f);
  assert.equal(value.title, "מסר ציבורי"); assert.equal(value.credit, "אור הגאולה");
  assert.equal(value.media_url, URL); assert.equal(value.first_seen_at, "2026-08-04T18:50:31Z");
  assert.deepEqual(f.calls.map(c => c.table), ["video_media_assets_v1", "channel_updates", "video_media_assets_v1"]);
  assert.equal(f.calls[0].params.select, "public_id,primary_source_type,primary_source_id");
  assert.equal(f.calls[1].params.page_only, "eq.false"); assert.equal(f.calls[1].params.status, "eq.live");
  assert.equal(f.calls[1].params.id, `eq.${SOURCE}`); assert.match(f.calls[1].params.or, /expires_at.gt/);
  assert.equal(f.calls[2].params.primary_source_id, `eq.${SOURCE}`);
  assert.ok(f.calls.every(c => c.params.limit === "1" && !/placements|topics|series_keys|source_types/.test(c.params.select)));
});

test("hidden, page-only, expired and different source cannot trigger playable asset read", async () => {
  for (const patch of [{ status: "hidden" }, { page_only: true }, { page_only: null },
    { expires_at: "2026-10-31" }, { expires_at: "not-a-date" }, { id: "wrong" }]) {
    const f = fixture({ source: channel(patch) });
    assert.equal(await run(f), null); assert.equal(f.calls.length, 2);
  }
  const absent = fixture({ source: null }); assert.equal(await run(absent), null);
});

test("missing, denied and failed remain distinct; invalid address never reads", async () => {
  for (const failAt of [1, 2, 3]) await assert.rejects(run(fixture({ failAt })), /synthetic outage/);
  assert.equal(await run(fixture({ media: null })), null);
  const f = fixture(); assert.equal(await fetchPublicVideo2029("not-an-id", { readRows: f.readRows }), null);
  assert.equal(f.calls.length, 0);
});

test("source mismatch, changed primary and private media fail closed", async () => {
  const f = fixture({ media: asset({ media_url: URL + "?token=private" }) });
  assert.equal(await run(f), null);
  assert.equal(await run(fixture({ source: channel({ image_url: URL + "?token=private" }) })), null);
  assert.equal(await run(fixture({ media: asset({ primary_source_type: "private_intake" }) })), null);
  const changed = fixture(); const original = changed.readRows;
  changed.readRows = async (...args) => { const rows = await original(...args); return changed.calls.length === 3 ? [asset({ primary_source_id: "different" })] : rows; };
  assert.equal(await run(changed), null);
});

test("cancellation before, between and after reads discards partial data", async () => {
  for (const at of [0, 1, 2, 3]) {
    const controller = new AbortController(); if (!at) controller.abort();
    const f = fixture({ onRead: count => { if (count === at) controller.abort(); } });
    await assert.rejects(run(f, { signal: controller.signal }), { name: "AbortError" });
    assert.equal(f.calls.length, at);
    assert.ok(f.calls.every(c => c.options.signal === controller.signal));
  }
});

test("authored Post keeps its old public URL and rejects suppressed tags", async () => {
  const source = { id: 5006, slug: "old-public-post", title: "פוסט", tags: [], source: "wordpress", wp_id: 5006, date: "2020-01-01" };
  const f = fixture({ source, media: asset({ primary_source_type: "post", primary_source_id: "5006" }) });
  assert.equal((await run(f)).redirectHref, "/old-public-post"); assert.equal(f.calls.length, 2);
  assert.match(f.calls[1].params.or, /טיוטה/);
  for (const tag of ["טיוטה", "פורום"]) assert.equal(await run(fixture({ source: { ...source, tags: [tag] },
    media: asset({ primary_source_type: "post", primary_source_id: "5006" }) })), null);
});

test("existing Home video and Story publication gates remain required", async () => {
  for (const [kind, state] of [["home_video", "is_active"], ["story", "active"]]) {
    const source = { id: SOURCE, [state]: true, title: "סרטון ציבורי", video_url: URL, created_at: "2026-08-04" };
    assert.equal((await run(fixture({ source, media: asset({ primary_source_type: kind }) }))).media_url, URL);
    assert.equal(await run(fixture({ source: { ...source, [state]: false }, media: asset({ primary_source_type: kind }) })), null);
  }
});

test("2029 uses the existing world media surface and shared Player, never the Legacy broad reader", () => {
  const source = readFileSync(new globalThis.URL("../src/pages/Video2029Page.jsx", import.meta.url), "utf8");
  assert.match(source, /surface="world"/); assert.doesNotMatch(source, /surface="video"|<VideoAssetPage/);
  assert.match(source, /fetchPublicVideo2029/); assert.match(source, /key=\{assetId\}/);
  assert.match(source, /state\.key === assetId/); assert.match(source, /controller\.abort\(\)/);
});

test("public-reading metadata uses the same source gate and preserves 404 versus 503", async () => {
  const original = globalThis.fetch;
  try {
    for (const [source, outage, expected] of [[channel(), false, 200], [channel({ page_only: true }), false, 404], [channel(), true, 503]]) {
      const f = fixture({ source, failAt: outage ? 2 : undefined });
      globalThis.fetch = async input => {
        const url = new globalThis.URL(String(input));
        const data = await f.readRows(url.pathname.split("/").at(-1), Object.fromEntries(url.searchParams), {});
        return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
      };
      const res = { code: 200, body: "", setHeader() {}, status(n) { this.code = n; return this; }, send(s) { this.body = s; return this; }, end(s) { this.body = s; } };
      await ogHandler({ method: "GET", url: `/video/${ID}`, query: { path: `/video/${ID}` }, headers: { host: "sod1820.co.il" },
        publicFoundationPreview: true, publicReadingRelease: "public-reading-20261101", publicReadingProductionArtifact: true }, res);
      assert.equal(res.code, expected);
      if (expected === 200) assert.match(res.body, /מסר ציבורי/);
      else { assert.doesNotMatch(res.body, /מסר ציבורי|fixture\.mp4/); assert.match(res.body, /noindex/); }
    }
  } finally { globalThis.fetch = original; }
});

test("Legacy video metadata keeps its existing single asset read", async () => {
  const original = globalThis.fetch, calls = [];
  try {
    globalThis.fetch = async input => {
      const path = String(input); calls.push(path);
      assert.match(path, /video_media_assets_v1\?/);
      return new Response(JSON.stringify([{ ...asset(), title: "Legacy video" }]));
    };
    const res = { code: null, setHeader() {}, status(n) { this.code = n; return this; }, send(s) { this.body = s; return this; } };
    await ogHandler({ method: "GET", url: `/video/${ID}`, query: { path: `/video/${ID}` }, headers: {} }, res);
    assert.equal(res.code, 200); assert.match(res.body, /Legacy video/); assert.equal(calls.length, 1);
  } finally { globalThis.fetch = original; }
});
