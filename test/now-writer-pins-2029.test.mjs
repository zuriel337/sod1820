// «הגילוי היומי» in "עכשיו" (ZURIEL 11.11.2026): exactly the Zvi / «תורת הרמז» model — a message is public ONLY as a group-source
// arrival the server proved (group proof + verified_phone_unique + approved writer + editorial flag, world_group_source_arrivals_v2).
// On top of that one path, an arrival by שחר יצחק קנדרו or יניב לוי in «הגילוי היומי» is pinned at the top of Now for 24 hours.
// No all-members live publication, no channel writer name, no pinned_until column, no ingest change.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  APPROVED_GROUP_WRITERS, GROUP_ROW_PINS_2029, GROUP_SOURCE_CHANNELS, GROUP_SOURCE_LABEL, GROUP_WRITER_PINS_2029, GROUP_WRITER_PIN_HOURS_2029,
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

test("order in Now (D2, ZURIEL 25.11.2026): time only; neither the owner's pin nor a writer pin holds any priority in the public stream", () => {
  const items = [owner, arrival(1, "tzvi-opoc", { channel: "torat-haremez" }), arrival(9, "shachar-kandro"), arrival(5, "yaniv-levi"),
    { id: "post:1", kind: "source", sourceKind: "post", label: "פוסט", at: hours(-2) }];
  const all = models(items);
  assert.deepEqual(all.map(m => m.id), [`group:${uuid(1)}`, "post:1", `group:${uuid(5)}`, `group:${uuid(9)}`, "post:5107"], "newest first, whoever was pinned");
  assert.ok(all.every(m => m.pinned === false && m.pinKind === null && m.pinUntil === null), "no pin reaches the public stream");
  const levi = all.find(m => m.id === `group:${uuid(5)}`);
  assert.equal(levi.typeLabel, "מקור · טרם נבדק", "the row keeps its source status");
  assert.equal(levi.unverified, true);
  assert.ok(levi.byline.includes("הגילוי היומי") && levi.byline.includes("יניב לוי"), "the group is the source, the writer is in the byline");
  assert.equal(levi.updated, false);
  assert.equal(nowPinnedMessage(all, NOW), null, "no central pinned message is shown from the public stream");
});

test("a writer's arrival is a regular row at its own time, during the old pin window and after it", () => {
  const items = [arrival(2, "shachar-kandro"), arrival(1, "tzvi-opoc", { channel: "torat-haremez" })];
  const during = models(items, NOW);
  assert.deepEqual(during.map(m => [m.id, m.pinKind]), [[`group:${uuid(1)}`, null], [`group:${uuid(2)}`, null]]);
  const after = NOW + 23 * 3600000;
  assert.deepEqual(models(items, after).map(m => [m.id, m.pinned, m.pinKind]), [[`group:${uuid(1)}`, false, null], [`group:${uuid(2)}`, false, null]]);
});

test("all of a writer's arrivals are regular rows; the source items are not mutated and the writer pin data stays for other domains", () => {
  const items = [arrival(1, "shachar-kandro"), arrival(4, "shachar-kandro"), arrival(2, "yaniv-levi"), arrival(3, "tzvi-opoc", { channel: "torat-haremez" })];
  const rows = feedRows(items, { now: NOW, limit: 160, caps: { group: 40 } });
  assert.ok(rows.every(r => !r.item.pinned && !r.item.pinKind), "no row of the stream is pinned");
  assert.equal(items.find(i => i.id === `group:${uuid(4)}`).pinned, true, "the source item is not mutated: the mechanism still produces the pin");
  const all = nowModels(rows, NOW);
  assert.deepEqual(all.map(m => m.id), [1, 2, 3, 4].map(n => `group:${uuid(n)}`), "time order only");
});

test("no pin exemption: the bucket cap and the limit apply to every row alike", () => {
  const busy = [1, 2, 3, 4, 5, 6].map(n => arrival(n, "tzvi-opoc", { channel: "torat-haremez" }));
  const items = [...busy, arrival(20, "yaniv-levi")];
  const compact = feedRows(items, { now: NOW, limit: 3 });
  assert.equal(compact.length, 3);
  assert.deepEqual(compact.map(r => r.id), [1, 2, 3].map(n => `group:${uuid(n)}`), "the newest three; an old writer arrival gets no exemption");
});

test("with no pins, a writer's arrival is not kept apart from the other arrivals of its group", () => {
  const items = [arrival(1, "shachar-kandro"), arrival(2, "shimon-haimov"), arrival(3, "shimon-haimov")];
  const entries = buildNowEntries(models(items));
  const ids = entries.flatMap(e => e.kind === "run" ? e.models.map(m => m.id) : [e.model.id]);
  assert.deepEqual(ids, [1, 2, 3].map(n => `group:${uuid(n)}`), "time order is kept inside the entries");
  assert.ok(entries.flatMap(e => e.kind === "run" ? e.models : [e.model]).every(m => !m.pinned));
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

test("an editorial extension moves the pin end of ONE proved arrival later, only for a listed writer, never earlier", () => {
  const ID = "8d30aba8-e510-443b-9de0-456df8875a22";
  assert.deepEqual(JSON.parse(JSON.stringify(GROUP_ROW_PINS_2029)), { [ID]: "2026-11-13T06:00:00.000Z" });
  assert.ok(Object.isFrozen(GROUP_ROW_PINS_2029));
  const arrival10 = "2026-11-10T22:41:49.000Z";
  const pin = groupWriterPin({ channel: "gilui-yomi", slug: "shachar-kandro", arrivalAt: arrival10, id: ID });
  assert.equal(pin.pinKind, "writer");
  assert.equal(pin.pinUntil, "2026-11-13T06:00:00.000Z");
  // Any other row id, a missing id, a prototype key: the natural 24 hours from arrival only.
  for (const id of ["00000000-0000-4000-8000-000000000000", undefined, "constructor", "__proto__"]) {
    assert.equal(groupWriterPin({ channel: "gilui-yomi", slug: "shachar-kandro", arrivalAt: arrival10, id }).pinUntil, "2026-11-11T22:41:49.000Z", String(id));
  }
  // Never for an unlisted writer or another group, even with the listed id; and never earlier than the natural end.
  assert.equal(groupWriterPin({ channel: "gilui-yomi", slug: "tzvi-opoc", arrivalAt: arrival10, id: ID }), null);
  assert.equal(groupWriterPin({ channel: "torat-haremez", slug: "shachar-kandro", arrivalAt: arrival10, id: ID }), null);
  assert.equal(groupWriterPin({ channel: "gilui-yomi", slug: "shachar-kandro", arrivalAt: "2026-11-20T00:00:00Z", id: ID }).pinUntil, "2026-11-21T00:00:00.000Z");
});

test("Now: the 10.11 picture row is a regular row at its own time; it keeps its picture and carries no pin", () => {
  const ID = "8d30aba8-e510-443b-9de0-456df8875a22";
  const base = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/11/62e3180b-9c28-5b94-b41d-d39d6de4bc69/original.jpg";
  const item = groupRowToWorldUpdate({ id: ID, body: "כיתוב", created_at: "2026-11-10T22:41:49Z", contributor_slug: "shachar-kandro", contributor_name: "שחר יצחק קנדרו",
    group_proof: true, proof_basis: "verified_phone_unique", group_channel: "gilui-yomi", media_kind: "image", media_url: base, thumb_url: null });
  const other = arrival(9, "tzvi-opoc", { channel: "torat-haremez", at: "2026-11-12T01:00:00Z" });
  const at = Date.parse("2026-11-12T02:00:00Z");
  const all = nowModels(feedRows([other, item], { now: at, limit: 160, caps: { group: 40 } }), at);
  assert.deepEqual(all.map(m => m.id), [`group:${uuid(9)}`, `group:${ID}`], "the newer arrival leads; the picture row is not lifted by its writer");
  const row = all[1];
  assert.equal(row.pinned, false); assert.equal(row.pinKind, null); assert.equal(row.pinUntil, null);
  assert.equal(row.media, "image");
});

test("order (D2, ZURIEL 25.11.2026): no pin of any kind reorders the stream, standing or time-bounded, owner or writer", () => {
  const post1 = { id: "post:1", kind: "source", sourceKind: "post", label: "פוסט", at: hours(-2) };
  const shortOwner = { ...owner, pinUntil: hours(5) };
  let all = models([shortOwner, arrival(1, "shachar-kandro"), post1]);
  assert.deepEqual(all.map(m => m.id), [`group:${uuid(1)}`, "post:1", "post:5107"], "an owner pin does not lead");
  assert.ok(all.every(m => m.pinKind === null));
  const standing = { ...owner };
  delete standing.pinUntil; standing.central = undefined;
  all = models([standing, arrival(1, "shachar-kandro"), post1]);
  assert.equal(all[all.length - 1].id, "post:5107", "a standing owner pin has no end and still holds no priority");
  all = models([arrival(9, "shachar-kandro"), arrival(2, "yaniv-levi")]);
  assert.deepEqual(all.map(m => m.id), [`group:${uuid(2)}`, `group:${uuid(9)}`], "newest first");
});
