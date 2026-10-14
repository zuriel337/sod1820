// node --test src/lib/research/worldDiscoveryStream.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildWorldDiscoveryStream,
  postRowToWorldUpdate,
  researchRowToWorldUpdate,
} from "./worldDiscoveryStream.js";

const makePost = (change = {}) => ({
  id: 5114,
  slug: "hashmal-source",
  title: "<b>סוד החשמל — דברי המקור</b>",
  excerpt: "<p>דברי המקור מופיעים לפני המחקר.</p>",
  author: "סוד החשמל",
  source: "source_document",
  tags: [],
  home_hidden: false,
  created_at: "2026-10-01T10:00:00Z",
  date: "2026-10-01T10:00:00Z",
  modified: "2026-10-08T10:00:00Z",
  ...change,
});

test("a public source post arrives even with zero research Findings, without numeric 0", () => {
  const item = postRowToWorldUpdate(makePost());
  assert.equal(item.kind, "source");
  assert.equal(item.id, "post:5114");
  assert.equal(item.href, "/post/hashmal-source");
  assert.equal(item.sourceRef, "posts:5114");
  assert.equal(item.creator, "סוד החשמל"); // Attribution only, not a newly minted Person.
  assert.equal(item.label, "סוד החשמל — דברי המקור");
  assert.equal(item.summary, "דברי המקור מופיעים לפני המחקר.");
  assert.equal(item.at, "2026-10-01T10:00:00.000Z");
  assert.equal(item.arrivalAt, item.at);
  assert.equal(item.sourceUpdatedAt, "2026-10-08T10:00:00.000Z");
  assert.equal(item.researchCount, 0);
  assert.equal(item.value, null);
  assert.deepEqual(item.numbers, []);
});

test("publication, recording and discovery time are distinct; modification never invents arrival", () => {
  const item = postRowToWorldUpdate(makePost({ date: '2017-05-23T12:00:00Z' }));
  assert.equal(item.sourcePublishedAt, '2017-05-23T12:00:00.000Z');
  assert.equal(item.recordedAt, '2026-10-01T10:00:00.000Z');
  assert.equal(item.discoveredAt, null);
  const undated = postRowToWorldUpdate(makePost({ date: null, created_at: null }));
  assert.equal(undated.at, null);
  assert.equal(undated.sourceUpdatedAt, '2026-10-08T10:00:00.000Z');
});

test("recent research cannot crowd source-only material out of the source projection", () => {
  const feed = buildWorldDiscoveryStream({ posts: [makePost()], topics: [{ id: 't1', created_at: '2026-10-10T10:00:00Z' }] }, { limit: 1 });
  assert.equal(feed.items[0].kind, 'convergence');
  assert.deepEqual(feed.arrivals.map(item => item.sourceRef), ['posts:5114']);
  assert.equal(feed.arrivals[0].researchCount, 0);
});

test("exclude hidden/draft/forum and unresolved internal origins; published AI/uploaded source is still a source", () => {
  assert.equal(postRowToWorldUpdate(makePost({ home_hidden: true })), null);
  assert.equal(postRowToWorldUpdate(makePost({ tags: ["טיוטה"] })), null);
  assert.equal(postRowToWorldUpdate(makePost({ tags: ["פורום"] })), null);
  assert.equal(postRowToWorldUpdate(makePost({ source: "gpt-draft" })), null);
  assert.equal(postRowToWorldUpdate(makePost({ source: "web" })), null);
  assert.equal(postRowToWorldUpdate(makePost({ slug: null })), null);
  assert.equal(postRowToWorldUpdate(makePost({ title: "<p></p>" })), null);
  assert.equal(postRowToWorldUpdate(makePost({ source: "ai" })).kind, "source");
  assert.equal(postRowToWorldUpdate(makePost({ source: "uploaded_file" })).kind, "source");
});

test("same occurrence groups authorized research beneath the source, not two independent arrivals", () => {
  const feed = buildWorldDiscoveryStream({
    posts: [makePost()],
    research: [
      { id: "m1", status: "approved", source_ref: "posts:5114#finding:1", statement: "ממצא בהקשר", value: 358, created_at: "2026-10-08T11:00:00Z" },
      { id: "m2", status: "candidate", source_ref: "posts:5114#finding:2", statement: "מועמד בלבד", value: 0 },
      { id: "m3", status: "approved", source_ref: "channel_updates:other", statement: "מחקר ממקור אחר", value: null, created_at: "2026-10-08T09:00:00Z" },
    ],
  });
  const source = feed.items.find((item) => item.kind === "source");
  assert.equal(source.researchCount, 1);
  assert.equal(source.at, "2026-10-01T10:00:00.000Z");
  assert.equal(source.researchUpdatedAt, "2026-10-08T11:00:00.000Z");
  assert.equal(feed.items.length, 2);
  assert.ok(feed.items.some((item) => item.id === "research:m3" && item.value === null));
  assert.ok(!feed.items.some((item) => item.id === "research:m1" || item.id === "research:m2"));
  assert.equal(feed.sourceCounts.sources, 1);
  assert.equal(feed.sourceCounts.findings, 1);
  assert.equal(researchRowToWorldUpdate({ id: "candidate", status: "candidate" }), null);
});

test("one time-ordered projection serves both World and bottom attention by arrival and approval time", () => {
  const feed = buildWorldDiscoveryStream({
    posts: [makePost()],
    topics: [{ id: "t", slug: "t", title: "התכנסות", approved_at: "2026-10-07T10:00:00Z" }],
  }, { limit: 2 });
  assert.deepEqual(feed.items.map((item) => item.kind), ["convergence", "source"]);
  assert.ok(feed.note.includes("Source arrival is not research verification"));
});

test("2029 World and bottom share the same source reader; legacy WhatsApp/private DM are not queried", () => {
  const reader = readFileSync(new URL("./worldDiscoveryStream.js", import.meta.url), "utf8");
  const world = readFileSync(new URL("../../pages/World2029Page.jsx", import.meta.url), "utf8");
  const frame = readFileSync(new URL("../../components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  assert.match(reader, /Promise\.allSettled\(/);
  assert.match(reader, /\.from\("posts"\)/);
  assert.match(reader, /\.eq\("home_hidden", false\)/);
  assert.doesNotMatch(reader, /live-whatsapp-feed|wa_bot_log|wa_vip_inbox|\.from\("channel_updates"\)/);
  assert.match(world, /item\.kind === "source" && item\.sourceKind === "post" && item\.href/);
  assert.match(world, /Number\.isFinite\(item\.value\)/);
  const hook = readFileSync(new URL("../../components/experience2029/useSystemFeed2029.js", import.meta.url), "utf8");
  assert.match(hook, /watchWorldDiscoveryStream\(\{/);
  assert.match(hook, /limit:\s*40, includeResearch:\s*false/);
  assert.doesNotMatch(frame, /watchWorldDiscoveryStream\(\{/);
  assert.match(frame, /<AttentionProjection[\s\S]{0,240}?feed=\{feed\}/);
  assert.match(frame, /title="מה חדש בעולם"/);
  assert.match(frame, /className="sod29-feed-chip" onClick=\{openAttention\}/);
  assert.match(frame, /feed\.newCount > 0 && !transientKind/);
  assert.match(frame, /const openAttention = useCallback\(\(\) => openTransient\(TRANSIENT\.ATTENTION\)/);
});

test("creator chips expose recent-window counts: a creator absent from the last N has 0, not hidden", async () => {
  const { buildWorldDiscoveryStream } = await import("./worldDiscoveryStream.js");
  const posts = [
    ...Array.from({ length: 5 }, (_, i) => ({ id: i + 1, slug: `n${i}`, title: `חדש ${i}`, author: "אחר", modified: `2026-10-0${i + 1}T00:00:00Z`, tags: [] })),
    { id: 99, slug: "old", title: "ישן", author: "סוד החשמל", modified: "2020-01-01T00:00:00Z", tags: [] },
  ];
  const stream = buildWorldDiscoveryStream({ posts }, { limit: 3 });
  assert.ok(stream.creators.includes("סוד החשמל"));
  assert.equal(stream.recentCounts["סוד החשמל"] || 0, 0);
  assert.equal(stream.items.some((i) => i.creator === "סוד החשמל"), false);
  assert.equal(stream.recentCounts["אחר"], 3);
});


test("unconnected group arrivals cannot masquerade as a working empty group feed", async () => {
  const { GROUP_ARRIVALS_AVAILABILITY } = await import("./worldDiscoveryStream.js");
  assert.equal(GROUP_ARRIVALS_AVAILABILITY.state, "not_connected");
  assert.match(GROUP_ARRIVALS_AVAILABILITY.message, /תורת הרמז והגילוי היומי/);
  assert.match(GROUP_ARRIVALS_AVAILABILITY.message, /אינם זמינים/);
});


test("public World source rail puts an updated older post before newly published posts without changing original publication time", () => {
  const olderUpdated = makePost({
    id: 5107, slug: "elections",
    title: "הבחירות לכנסת ה־26",
    date: "2026-09-30T08:55:00Z",
    modified: "2026-10-10T23:19:35Z",
  });
  const newerUnedited = makePost({
    id: 5116, slug: "newer",
    title: "סיפור חדש",
    date: "2026-10-06T11:01:00Z",
    modified: "2026-10-06T11:01:00Z",
  });
  const feed = buildWorldDiscoveryStream({ posts: [newerUnedited, olderUpdated] }, { limit: 5 });
  assert.deepEqual(feed.arrivals.map(row => row.sourceRef), ["posts:5107", "posts:5116"]);
  assert.equal(feed.arrivals[0].sourcePublishedAt, "2026-09-30T08:55:00.000Z");
  assert.equal(feed.arrivals[0].sourceUpdatedAt, "2026-10-10T23:19:35.000Z");
  assert.equal(feed.arrivals[0].arrivalAt, "2026-09-30T08:55:00.000Z");
});

test("new public World uses the composed story and sources without a feature toggle or integrated-preview gate", () => {
  const world = readFileSync(new URL("../../pages/World2029Page.jsx", import.meta.url), "utf8");
  const reader = readFileSync(new URL("./worldDiscoveryStream.js", import.meta.url), "utf8");
  const flight = readFileSync(new URL("../../components/research/WorldFlightStory2029.jsx", import.meta.url), "utf8");
  assert.match(world, /if \(!controlMode\) return <>/);
  assert.doesNotMatch(world, /VITE_WORLD_2029_ENABLED/);
  assert.doesNotMatch(world, /import\.meta\.env\.VITE_INTEGRATED_PREVIEW\s*===\s*["']true["']\)\s*&&\s*!controlMode/);
  assert.match(world, /<WorldFlightStory2029 research=\{research\} shell=\{shell\}/);
  assert.match(world, /<SourceArrivalList2029 loading=\{landing\.loading\}/);
  assert.match(reader, /\.order\("modified", \{ ascending: false, nullsFirst: false \}\)/);
  assert.match(flight, /data-source-interpretation="zuriel-787"/);
});


test("exact reviewed public section update projects once from a source, retaining its publication timestamp", () => {
  const elections = makePost({
    id: 5107,
    slug: "sharshar-elections-redemption-hints-draft",
    source: "ai",
    date: "2026-09-30T08:55:06Z",
    modified: "2026-10-10T23:19:35.974936+00:00",
  });
  const item = postRowToWorldUpdate(elections);
  assert.equal(item.sourceRef, "posts:5107");
  assert.equal(item.arrivalAt, "2026-09-30T08:55:06.000Z");
  assert.equal(item.sourcePublishedAt, item.arrivalAt);
  assert.equal(item.at, "2026-10-10T23:19:35.974Z");
  assert.equal(item.sourceUpdatedAt, item.at);
  assert.equal(item.sourceUpdate.kind, "source_fragment_revision");
  assert.equal(item.sourceUpdate.targetId, "netanyahu-77-mazal");
  assert.equal(item.sourceUpdate.revision, 184);
  assert.equal(item.href, "/post/sharshar-elections-redemption-hints-draft#netanyahu-77-mazal", "a certified update enters the exact source unit");
  assert.equal(item.sourceUpdate.targetHref,
    "/post/sharshar-elections-redemption-hints-draft#netanyahu-77-mazal");

  const feed = buildWorldDiscoveryStream({
    posts: [elections, makePost({ id: 5116, slug: "ordinary", date: "2026-10-05T00:00:00Z", modified: "2026-10-05T00:00:00Z" })]
  }, { limit: 10 });
  assert.deepEqual(feed.arrivals.map((row) => row.sourceRef), ["posts:5107", "posts:5116"]);
  assert.equal(feed.items.filter((row) => row.sourceRef === "posts:5107").length, 1,
    "one source occurrence is not counted twice because a fragment was updated");
});

test("future cover edit and hidden/draft source cannot propagate the certified segment event", () => {
  const base = makePost({ id: 5107, slug: "sharshar-elections-redemption-hints-draft", source: "ai",
    modified: "2026-10-11T21:21:26.060002+00:00" });
  assert.equal(postRowToWorldUpdate(base)?.sourceUpdate, null);
  assert.equal(postRowToWorldUpdate({ ...base, home_hidden: true }), null);
  assert.equal(postRowToWorldUpdate({ ...base, tags: ["טיוטה"] }), null);
});

// Navigation freshness policy (docs/perf-bounded-cost-2029-20261014.md §7): a caller that seeded fresh data may skip the
// immediate read but must still get its first refresh at the freshness bound; cleanup cancels it.
test("watchWorldDiscoveryStream: immediate:false defers the first read to firstRefreshInMs and cleanup cancels it", async (t) => {
  const { supabase } = await import("../supabase.js");
  const { watchWorldDiscoveryStream } = await import("./worldDiscoveryStream.js");
  let reads = 0;
  t.mock.method(supabase, "from", () => { reads += 1; throw new Error("blocked in test"); });
  t.mock.method(supabase, "rpc", () => { reads += 1; return Promise.reject(new Error("blocked in test")); });
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const realWindow = globalThis.window, realDocument = globalThis.document;
  globalThis.window = { setTimeout: (...a) => setTimeout(...a), clearTimeout: (...a) => clearTimeout(...a), setInterval: (...a) => setInterval(...a), clearInterval: (...a) => clearInterval(...a), addEventListener() {}, removeEventListener() {} };
  globalThis.document = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
  try {
    let errors = 0;
    const stop = watchWorldDiscoveryStream({ immediate: false, firstRefreshInMs: 5000, onError: () => { errors += 1; } });
    assert.equal(reads, 0, "no read at mount when fresh data was seeded");
    t.mock.timers.tick(4999);
    assert.equal(reads, 0, "no read before the freshness bound");
    t.mock.timers.tick(1);
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(reads > 0 && errors === 1, "first refresh runs at the freshness bound");
    stop();
    const before = reads;
    t.mock.timers.tick(120000);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(reads, before, "cleanup cancels the scheduled refresh");
  } finally { globalThis.window = realWindow; globalThis.document = realDocument; }
});

test("frame feed reuse is bounded to the cache contract: 30s, anonymous principal only, dropped on error", () => {
  const hook = readFileSync(new URL("../../components/experience2029/useSystemFeed2029.js", import.meta.url), "utf8");
  assert.match(hook, /FEED_FRESH_MS = 30000/);
  assert.match(hook, /principal === "guest" && sharedFeed/);
  assert.match(hook, /onError: \(\) => \{ sharedFeed = null;/);
  assert.match(hook, /firstRefreshInMs: reuse/);
});
