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
  assert.match(frame, /watchWorldDiscoveryStream\(\{\s*limit: 10, includeResearch: false,/);
  assert.match(frame, /title="מה חדש בעולם"/);
  assert.match(frame, /<small>חדש בעולם<\/small>/);
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
