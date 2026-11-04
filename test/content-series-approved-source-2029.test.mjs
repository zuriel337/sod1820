import test from "node:test";
import assert from "node:assert/strict";
import { CONTENT_SERIES_2029 } from "../src/lib/research/contentSeries2029Identity.js";
import { projectApprovedContentSeriesSource, fetchApprovedContentSeriesSources2029,
  fetchContentSeriesCatalog2029, mergeContentSeriesItems, projectContentSeriesItems,
} from "../src/lib/research/contentSeries2029Projection.js";

// Controlled fixtures retain the approved public identity; no network, account,
// publication, transcription or model call is part of these tests.
const KEY = "messages-from-righteous";
const ID = "9d4e6b80-f52b-4461-9231-ca30f37f0db9";
const ASSET = "25e378462b55298219e5f7562698bfa7";
const REF = `channel_updates:${ID}`;
const MEDIA = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/test.mp4";
const NOW = Date.parse("2026-11-02T14:00:00Z");
const spec = CONTENT_SERIES_2029.find(item => item.key === KEY);
const source = (patch = {}) => ({ id: ID, channel: "or-geula", status: "live", page_only: false,
  expires_at: null, created_at: "2026-08-04T18:50:31Z", text: "מסר חזק · חזרה אל ה׳",
  seo_title: "חזרה אל ה׳", speaker: "הרב אלדד שמואלי", credit: "אור הגאולה", image_url: MEDIA,
  thumb_url: MEDIA.replace("mp4", "jpg"), ...patch });
const asset = (patch = {}) => ({ public_id: ASSET, asset_key: `url:${MEDIA}`, media_url: MEDIA,
  primary_source_type: "channel_update", primary_source_id: ID,
  placements: [{ source_type: "channel_update", source_id: ID }], ...patch });
const post = (id = 5006, patch = {}) => ({ id, slug: `old-${id}`, title: "מקור מפורסם", excerpt: "טקסט מקור",
  categories: ["רמזים מצדיקים"], tags: [], date: "2026-06-29T13:12:03Z", modified: "2026-11-02T14:00:00Z",
  source: "wordpress", wp_id: id, ...patch });

function reader(handlers = {}) {
  const calls = [];
  const client = { from(table) {
    const call = { table, operations: [] }; calls.push(call);
    const q = { then(resolve, reject) {
      return Promise.resolve().then(() => {
        if (handlers[table]) return handlers[table](call);
        const data = table === "posts" ? [post()] : table === "channel_updates" ? [source()] : table === "video_media_assets_v1" ? [asset()] : [];
        return { data, count: data.length, error: null };
      }).then(resolve, reject);
    } };
    for (const name of ["select", "eq", "or", "limit", "order", "abortSignal"]) q[name] = (...args) => { call.operations.push([name, ...args]); return q; };
    return q;
  } };
  return { client, calls };
}

test("only the exact approved source joins the existing reading identity", async () => {
  assert.equal(spec.approvedSources.length, 1);
  assert.equal(spec.approvedSources[0].sourceRef, REF);
  assert.equal(spec.approvedSources[0].decisionRef, "ZURIEL/20261102/8f8876f7");
  const item = await projectApprovedContentSeriesSource(source(), asset(), KEY, { now: NOW });
  assert.equal(item.sourceRef, REF);
  assert.equal(item.kind, "channel_update");
  assert.equal(item.href, `/video/${ASSET}`);
  assert.equal(item.credit, "אור הגאולה");
  assert.equal(item.author, "הרב אלדד שמואלי");
  assert.equal(item.publishedAt, "2026-08-04T18:50:31Z");
  assert.equal(await projectApprovedContentSeriesSource(source({ id: "00000000-0000-4000-8000-000000000001" }), asset(), KEY), null);
  assert.equal(await projectApprovedContentSeriesSource(source(), asset(), "sod-hashmal"), null);
});

test("public gate rejects hidden, private, expired, wrong channel and malformed occurrence", async () => {
  for (const patch of [{ status: "hidden" }, { status: "off" }, { page_only: true }, { page_only: null },
    { expires_at: "2026-11-01" }, { expires_at: "invalid" }, { channel: "other" }, { created_at: "invalid" }]) {
    assert.equal(await projectApprovedContentSeriesSource(source(patch), asset(), KEY, { now: NOW }), null, JSON.stringify(patch));
  }
  assert.ok(await projectApprovedContentSeriesSource(source({ expires_at: "2026-11-03" }), asset(), KEY, { now: NOW }));
});

test("a route requires exact public asset and occurrence, never a title or channel-only match", async () => {
  for (const patch of [{ public_id: "another" }, { media_url: MEDIA + "?token=private" },
    { asset_key: "" }, { primary_source_id: "other", placements: [] }]) {
    assert.equal(await projectApprovedContentSeriesSource(source(), asset(patch), KEY, { now: NOW }), null, JSON.stringify(patch));
  }
  assert.equal(await projectApprovedContentSeriesSource(source({ image_url: "https://other.example/private.mp4" }), asset(), KEY), null);
  assert.equal(await projectApprovedContentSeriesSource(source(), asset({ primary_source_type: "post", primary_source_id: "5006" }), KEY, { now: NOW }), null,
    "do not read broader placements to prove an altered primary identity");
});

test("reader issues only exact metadata GETs and forwards cancellation to both stages", async () => {
  const fake = reader(), controller = new AbortController();
  const result = await fetchApprovedContentSeriesSources2029(KEY, { client: fake.client, signal: controller.signal, now: NOW });
  assert.equal(result.items.length, 1);
  assert.equal(result.sourceStates[0].state, "measured");
  assert.deepEqual(fake.calls.map(call => call.table), ["channel_updates", "video_media_assets_v1"]);
  for (const condition of [["eq", "id", ID], ["eq", "channel", "or-geula"], ["eq", "status", "live"], ["eq", "page_only", false],
    ["or", "expires_at.is.null,expires_at.gt.2026-11-02T14:00:00.000Z"], ["limit", 1]]) {
    assert.ok(fake.calls[0].operations.some(op => JSON.stringify(op) === JSON.stringify(condition)), JSON.stringify(condition));
  }
  assert.ok(fake.calls[1].operations.some(op => op[0] === "eq" && op[1] === "public_id" && op[2] === ASSET));
  assert.ok(fake.calls[1].operations.filter(op => op[0] === "select").every(op => !op[1].includes("placements")), "other placements may have different public gates");
  assert.ok(fake.calls.every(call => call.operations.some(op => op[0] === "abortSignal" && op[1] === controller.signal)));
  const unrelated = reader();
  assert.deepEqual((await fetchApprovedContentSeriesSources2029("or-geula", { client: unrelated.client })).items, []);
  assert.equal(unrelated.calls.length, 0);
});

test("denied/absent sources never initiate media lookup; failure stays distinct from empty", async () => {
  for (const response of [{ data: [], error: null }, { data: [source({ status: "hidden" })], error: null },
    { data: null, error: { code: "42501" } }]) {
    const fake = reader({ channel_updates: () => response });
    const result = await fetchApprovedContentSeriesSources2029(KEY, { client: fake.client, now: NOW });
    assert.equal(result.sourceStates[0].state, "access_filtered");
    assert.equal(result.items.length, 0); assert.equal(fake.calls.length, 1);
  }
  const failed = await fetchApprovedContentSeriesSources2029(KEY, { client: reader({ video_media_assets_v1: () => ({ error: Error("offline"), data: null }) }).client });
  assert.equal(failed.sourceStates[0].state, "failed");
});

test("cancellation before, between and after reads never returns stale or partial sources", async () => {
  const before = new AbortController(); before.abort();
  const idle = reader();
  await assert.rejects(fetchApprovedContentSeriesSources2029(KEY, { client: idle.client, signal: before.signal }), { name: "AbortError" });
  assert.equal(idle.calls.length, 0);
  for (const table of ["channel_updates", "video_media_assets_v1"]) {
    const controller = new AbortController();
    const fake = reader({ [table]: () => { controller.abort(); return { data: [table === "channel_updates" ? source() : asset()], error: null }; } });
    await assert.rejects(fetchApprovedContentSeriesSources2029(KEY, { client: fake.client, signal: controller.signal }), { name: "AbortError" });
    assert.equal(fake.calls.length, table === "channel_updates" ? 1 : 2);
  }
});

test("mixed series retains both source kinds and keeps Posts when the channel fails", async () => {
  const mixed = (await fetchContentSeriesCatalog2029({ client: reader().client, sourceSeriesKey: KEY })).byKey[KEY];
  assert.deepEqual(mixed.items.map(item => item.kind), ["channel_update", "post"], "publication date, not modified/import time");
  assert.equal(mixed.items[1].href, "/old-5006");
  assert.equal(mixed.readState, "measured");
  const partial = (await fetchContentSeriesCatalog2029({ client: reader({ channel_updates: () => ({ error: Error("offline"), data: null }) }).client, sourceSeriesKey: KEY })).byKey[KEY];
  assert.equal(partial.readState, "partial");
  assert.deepEqual(partial.items.map(item => item.sourceRef), ["posts:5006"]);
  assert.equal(partial.sourceStates[0].state, "failed");
  assert.equal(partial.sourceTotal, null, "failure is not a measured zero sources");
  const sourceOnly = (await fetchContentSeriesCatalog2029({ client: reader({ posts: () => ({ error: Error("offline"), data: null }) }).client, sourceSeriesKey: KEY })).byKey[KEY];
  assert.equal(sourceOnly.readState, "partial");
  assert.deepEqual(sourceOnly.items.map(item => item.sourceRef), [REF]);
});

test("Home and series entrances do not fetch approved media until its series is selected", async () => {
  for (const sourceSeriesKey of [null, "dimension-five", "unrecognized"]) {
    const fake = reader({ posts: () => ({ data: [], count: 0, error: null }) });
    const result = (await fetchContentSeriesCatalog2029({ client: fake.client, sourceSeriesKey })).byKey[KEY];
    assert.deepEqual(fake.calls.map(call => call.table), Array(4).fill("posts"));
    assert.equal(result.sourcesRequested, false);
    assert.equal(result.sourceTotal, null);
    assert.equal(result.readState, "not_loaded");
    assert.equal(result.hasApprovedSources, true, "the entrance can still link to its existing source when no Post is returned");
  }
});

test("same source or media occurrence groups once, but distinct authored Posts remain distinct", async () => {
  const posts = projectContentSeriesItems([post(5006), post(5007)], spec).items;
  const linked = await projectApprovedContentSeriesSource(source(), asset({ placements: [
    { source_type: "channel_update", source_id: ID }, { source_type: "post", source_id: "5006" }, { source_type: "post", source_id: "5007" },
  ] }), KEY, { now: NOW });
  const grouped = mergeContentSeriesItems(posts, [linked, linked]);
  assert.equal(grouped.length, 3);
  assert.equal(grouped.find(item => item.sourceRef === REF).sourceOccurrences.length, 1);
  assert.equal(grouped.find(item => item.sourceRef === REF).href, `/video/${ASSET}`);
  const independent = mergeContentSeriesItems(posts, [await projectApprovedContentSeriesSource(source(), asset(), KEY, { now: NOW })]);
  assert.equal(independent.length, 3, "similar text is not identity evidence");
  const controlledOtherSource = { ...linked, sourceRef: "channel_updates:controlled-fixture", id: "controlled-fixture" };
  const mediaGrouped = mergeContentSeriesItems(posts, [linked, controlledOtherSource]);
  assert.equal(mediaGrouped.length, 3);
  assert.equal(mediaGrouped.find(item => item.sourceRef === REF).sourceOccurrences.length, 2);
});
