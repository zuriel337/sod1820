// «הגילוי היומי» in "עכשיו" (ZURIEL 11.11.2026): exactly the Zvi / «תורת הרמז» model — a message is public ONLY as a group-source
// arrival the server proved (group proof + verified_phone_unique + approved writer + editorial flag, world_group_source_arrivals_v2).
// On top of that one path, an arrival by שחר יצחק קנדרו or יניב לוי in «הגילוי היומי» is pinned at the top of Now for 24 hours.
// No all-members live publication, no channel writer name, no pinned_until column, no ingest change.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  APPROVED_GROUP_WRITERS, GROUP_SOURCE_CHANNELS, GROUP_SOURCE_LABEL, GROUP_WRITER_PINS_2029, GROUP_WRITER_PIN_HOURS_2029,
  WORLD_GROUP_SOURCE_READER, groupRowToWorldUpdate, groupWriterPin, groupWriterPinListed,
} from "../src/lib/research/worldGroupSource.js";
import { feedRows } from "../src/lib/systemFeed2029.js";
import { buildNowEntries, nowModels, nowPinnedMessage, nowRowModel } from "../src/lib/nowPublications2029.js";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const hours = h => new Date(NOW + h * 3600000).toISOString();
const uuid = n => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const NAMES = { "shachar-kandro": "שחר יצחק קנדרו", "yaniv-levi": "יניב לוי", "tzvi-opoc": "צבי", "shimon-haimov": "שמעון חיימוב" };
// A row exactly as the public reader returns it (server-side proof already passed).
const arrival = (n, slug, { channel = "gilui-yomi", at = hours(-n), ...extra } = {}) => groupRowToWorldUpdate({
  id: uuid(n), body: `גילוי ${n}`, created_at: at, contributor_slug: slug, contributor_name: NAMES[slug] || slug,
  group_proof: true, proof_basis: "verified_phone_unique", group_channel: channel, ...extra,
});
const models = (items, now = NOW, opts = {}) => nowModels(feedRows(items, { now, limit: 160, caps: { group: 40, post: 40 }, ...opts }), now);
const owner = { id: "post:5107", kind: "source", sourceKind: "post", label: "הודעת הבעלים", at: hours(-30), pinned: true, pinUntil: hours(40),
  central: { groups: [{ value: 1820, phrases: ["סוד הוי״ה"] }] } };

test("the pin list is exactly Kandro and Levi in «הגילוי היומי», 24 hours, and both are approved group writers", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(GROUP_WRITER_PINS_2029)), { "gilui-yomi": ["shachar-kandro", "yaniv-levi"] });
  assert.equal(GROUP_WRITER_PIN_HOURS_2029, 24);
  for (const slug of GROUP_WRITER_PINS_2029["gilui-yomi"]) assert.ok(APPROVED_GROUP_WRITERS.includes(slug), slug);
  assert.ok(Object.isFrozen(GROUP_WRITER_PINS_2029) && Object.isFrozen(GROUP_WRITER_PINS_2029["gilui-yomi"]));
  for (const [channel, slug] of [["torat-haremez", "shachar-kandro"], ["gilui-yomi", "tzvi-opoc"], ["gilui-yomi", "shimon-haimov"],
    ["constructor", "yaniv-levi"], ["__proto__", "yaniv-levi"], ["gilui-yomi", "קנדרו"], ["", "yaniv-levi"]]) {
    assert.equal(groupWriterPinListed(channel, slug), false, `${channel}/${slug}`);
  }
});

test("a server-proved arrival by Kandro or Levi in «הגילוי היומי» carries a 24-hour writer pin from its arrival", () => {
  for (const slug of ["shachar-kandro", "yaniv-levi"]) {
    const item = arrival(3, slug);
    assert.equal(item.pinned, true, slug);
    assert.equal(item.pinKind, "writer");
    assert.equal(item.pinUntil, new Date(Date.parse(hours(-3)) + 24 * 3600000).toISOString());
    // The pin never changes what the row is: the same unverified group source, the same group, the same writer.
    assert.equal(item.sourceKind, "group_message");
    assert.equal(item.publicState, "group_source_message_unverified");
    assert.equal(item.stateLabel, GROUP_SOURCE_LABEL);
    assert.deepEqual(item.sourceGroup, { key: "gilui-yomi", label: "הגילוי היומי" });
    assert.equal(item.creatorSlug, slug);
  }
  assert.deepEqual(groupWriterPin({ channel: "gilui-yomi", slug: "yaniv-levi", arrivalAt: "not-a-date" }), null);
});

test("no pin anywhere else: other writers, other groups, the neutral reader row, and never on a row without proof", () => {
  for (const item of [arrival(1, "tzvi-opoc"), arrival(2, "shimon-haimov"), arrival(3, "shachar-kandro", { channel: "torat-haremez" }),
    arrival(4, "yaniv-levi", { channel: "ki-la-hamelucha-gematria" }), arrival(5, "yaniv-levi", { group_channel: null })]) {
    assert.ok(item, "still a public arrival");
    assert.equal("pinned" in item || "pinKind" in item || "pinUntil" in item, false, item.id);
  }
  // Every server gate still excludes the row entirely — a pin cannot exist without the row.
  assert.equal(arrival(6, "shachar-kandro", { proof_basis: "unverified" }), null);
  assert.equal(arrival(7, "shachar-kandro", { group_proof: false }), null);
  assert.equal(arrival(8, "lookalike-kandro"), null);
  assert.equal(arrival(9, "yaniv-levi", { group_channel: "or-geula" }), null, "a channel outside the public source groups is dropped, never pinned");
});

test("order in Now: the owner's pin leads, then writer pins newest first, then everything else by time", () => {
  const items = [owner, arrival(1, "tzvi-opoc", { channel: "torat-haremez" }), arrival(9, "shachar-kandro"), arrival(5, "yaniv-levi"),
    { id: "post:1", kind: "source", sourceKind: "post", label: "פוסט", at: hours(-2) }];
  const all = models(items);
  assert.deepEqual(all.map(m => m.id), ["post:5107", `group:${uuid(5)}`, `group:${uuid(9)}`, `group:${uuid(1)}`, "post:1"]);
  assert.deepEqual(all.map(m => m.pinKind), ["owner", "writer", "writer", null, null]);
  const levi = all[1];
  assert.equal(levi.pinned, true);
  assert.equal(levi.typeLabel, "מקור · טרם נבדק", "a pin keeps the row's source status");
  assert.equal(levi.unverified, true);
  assert.ok(levi.byline.includes("הגילוי היומי") && levi.byline.includes("יניב לוי"), "the group is the source, the writer is in the byline");
  assert.equal(levi.updated, false, "a writer pin is not an update of the publication");
  assert.equal(levi.central, null);
  assert.equal(all[0].updated, true, "the owner's pin keeps its meaning");
  assert.equal(nowPinnedMessage(all, NOW).model.id, "post:5107", "the central pinned message is still only the owner's");
});

test("a writer pin ends by itself 24 hours after the arrival and the row falls back into the time order", () => {
  const items = [arrival(2, "shachar-kandro"), arrival(1, "tzvi-opoc", { channel: "torat-haremez" })];
  const during = models(items, NOW);
  assert.deepEqual(during.map(m => [m.id, m.pinKind]), [[`group:${uuid(2)}`, "writer"], [`group:${uuid(1)}`, null]]);
  const after = NOW + 23 * 3600000;
  assert.deepEqual(models(items, after).map(m => [m.id, m.pinned, m.pinKind]), [[`group:${uuid(1)}`, false, null], [`group:${uuid(2)}`, false, null]]);
});

test("one pin per writer: his newest arrival holds it; his older arrival in the window is a regular row", () => {
  const items = [arrival(1, "shachar-kandro"), arrival(4, "shachar-kandro"), arrival(2, "yaniv-levi"), arrival(3, "tzvi-opoc", { channel: "torat-haremez" })];
  const rows = feedRows(items, { now: NOW, limit: 160, caps: { group: 40 } });
  const older = rows.find(r => r.id === `group:${uuid(4)}`);
  assert.equal(older.item.pinned, false);
  assert.equal(older.item.pinKind, null);
  assert.equal(items.find(i => i.id === `group:${uuid(4)}`).pinned, true, "the source item is not mutated");
  const all = nowModels(rows, NOW);
  assert.deepEqual(all.filter(m => m.pinned).map(m => m.id), [`group:${uuid(1)}`, `group:${uuid(2)}`]);
  assert.deepEqual(all.filter(m => !m.pinned).map(m => m.id), [`group:${uuid(3)}`, `group:${uuid(4)}`]);
});

test("a held pin is never dropped by the group cap or the limit; an ended pin gets no exemption", () => {
  const busy = [1, 2, 3, 4, 5, 6].map(n => arrival(n, "tzvi-opoc", { channel: "torat-haremez" }));
  const items = [...busy, arrival(20, "yaniv-levi")];
  const compact = feedRows(items, { now: NOW, limit: 3 });
  assert.equal(compact.length, 3);
  assert.deepEqual(compact.map(r => r.id), [`group:${uuid(1)}`, `group:${uuid(2)}`, `group:${uuid(20)}`], "kept despite the cap of 4 and the limit; order stays chronological");
  const later = feedRows(items, { now: NOW - 20 * 3600000 + 25 * 3600000, limit: 3 });
  assert.equal(later.some(r => r.id === `group:${uuid(20)}`), false);
});

test("a pinned group row is always its own row, never folded into a collapsed run", () => {
  const items = [arrival(1, "shachar-kandro"), arrival(2, "shimon-haimov"), arrival(3, "shimon-haimov")];
  const entries = buildNowEntries(models(items));
  assert.equal(entries[0].kind, "row");
  assert.equal(entries[0].model.id, `group:${uuid(1)}`);
  assert.equal(entries[1].kind, "run", "the other two arrivals of the same group still collapse");
  assert.deepEqual(entries[1].models.map(m => m.id), [`group:${uuid(2)}`, `group:${uuid(3)}`]);
});

test("a writer pin on anything but a listed, proved group arrival with an end time is ignored", () => {
  const model = item => nowRowModel({ id: item.id, item, kind: item.kind, at: item.at, title: item.label });
  const channel = { id: "channel:x", kind: "source", sourceKind: "channel_update", channel: "gilui-yomi", label: "x", at: hours(-1),
    pinned: true, pinKind: "writer", pinUntil: hours(10) };
  assert.equal(model(channel).pinned, false, "a channel row can no longer be a writer pin");
  const levi = arrival(1, "yaniv-levi");
  assert.equal(model({ ...levi, pinKind: undefined }).pinned, false, "a group arrival is never an owner pin");
  assert.equal(model({ ...levi, pinUntil: null }).pinned, false, "a writer pin needs a real end time");
  assert.equal(model({ ...arrival(2, "tzvi-opoc"), pinned: true, pinKind: "writer", pinUntil: hours(10) }).pinned, false, "only a listed writer");
  assert.equal(model({ ...levi, sourceGroup: { key: "torat-haremez", label: "תורת הרמז" } }).pinned, false, "only in its listed group");
  assert.equal(model(levi).pinned, true);
});

test("parity with «תורת הרמז»: one reader, one label, one set of public groups; no all-members live path in the tree", () => {
  assert.equal(WORLD_GROUP_SOURCE_READER, "world_group_source_arrivals_v2");
  assert.equal(GROUP_SOURCE_CHANNELS["gilui-yomi"], "הגילוי היומי");
  assert.equal(GROUP_SOURCE_CHANNELS["torat-haremez"], "תורת הרמז");
  const ingest = readFileSync(new URL("../supabase/functions/wa-channel-ingest/index.ts", import.meta.url), "utf8");
  assert.match(ingest, /RESEARCH_FIRST_CHANNELS = new Set\(\["torat-haremez", "gilui-yomi", "sfot-vheker"\]\)/);
  assert.match(ingest, /return STORY_LIVE_CHANNELS\.has\(channel\) \? "live" : "private"/);
  assert.match(ingest, /status: channelStatus\(src\.channel\),/);
  assert.doesNotMatch(ingest, /pinned_until|waChannelPolicy|live_from|pin_writers/);
  assert.equal(existsSync(new URL("../supabase/functions/_shared/waChannelPolicy.js", import.meta.url)), false);
  const reader = readFileSync(new URL("../src/lib/research/systemFeedPublicSources2029.js", import.meta.url), "utf8");
  assert.doesNotMatch(reader, /pinned_until|credit/, "the public channel reader selects no pin column and no writer credit");
});
