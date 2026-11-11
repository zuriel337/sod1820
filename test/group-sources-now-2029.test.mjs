// Public group sources (תורת הרמז, כי לה׳ המלוכה — גימטריות, ...) on the existing source path, World and the Now window.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import {
  groupRowToWorldUpdate, fetchGroupSourceArrivals, groupMediaFromRow, publicGroupMediaUrl, groupWriterProfileHref,
  GROUP_SOURCE_CHANNELS, GROUP_SOURCE_NEUTRAL_LABEL, WORLD_GROUP_SOURCE_READER,
} from "../src/lib/research/worldGroupSource.js";
import { nowRowModel, nowModels, filterNowModels, nowSecondaryChoices } from "../src/lib/nowPublications2029.js";
import { feedRows, mergeSystemFeedItems } from "../src/lib/systemFeed2029.js";

const STORAGE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/video/2026/11/abc/original.mp4";
const IMG = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/g/x.jpg";
const row = (o = {}) => ({ id: "u1", body: "שלום 358", created_at: "2026-11-01T10:00:00Z", contributor_slug: "tzvi-opoc", contributor_name: "צבי (OPOC)", group_proof: true, proof_basis: "verified_phone_unique", group_channel: "torat-haremez", ...o });
const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("each public group is named on its publication; the neutral label only when the reader gives no channel", () => {
  assert.equal(groupRowToWorldUpdate(row()).sourceGroupLabel, "תורת הרמז");
  assert.equal(groupRowToWorldUpdate(row({ group_channel: "ki-la-hamelucha-gematria" })).sourceGroupLabel, "כי לה׳ המלוכה — גימטריות");
  const live = groupRowToWorldUpdate(row({ group_channel: undefined })); // the currently live reader returns no channel
  assert.equal(live.sourceGroupLabel, GROUP_SOURCE_NEUTRAL_LABEL);
  assert.equal(live.sourceGroup.key, null);
});

test("Or HaGeula, other channels and anything unlisted never enter the group path", () => {
  for (const channel of ["or-geula", "sfot-vheker", "main", "site-news", "reality-code", "sod-hachashmal"]) assert.equal(groupRowToWorldUpdate(row({ group_channel: channel })), null, channel);
  assert.deepEqual(Object.keys(GROUP_SOURCE_CHANNELS).sort(), ["gilui-yomi", "ki-la-hamelucha-gematria", "torat-haremez"]);
});

test("verified / unverified source and identified / unidentified author", () => {
  assert.ok(groupRowToWorldUpdate(row()));
  assert.equal(groupRowToWorldUpdate(row({ proof_basis: "unverified" })), null);
  assert.equal(groupRowToWorldUpdate(row({ group_proof: false })), null);
  assert.equal(groupRowToWorldUpdate(row({ contributor_slug: null })), null);
  assert.equal(groupRowToWorldUpdate(row({ contributor_slug: "someone-else" })), null, "no guessing: only the approved, server-proven writers");
  const identified = groupRowToWorldUpdate(row());
  assert.equal(identified.creatorHref, "/community/researcher/tzvi-opoc");
  assert.equal(groupWriterProfileHref("nobody"), null);
  assert.equal(groupWriterProfileHref(null), null);
  for (const slug of ["yaniv-levi", "shachar-kandro", "shimon-haimov"]) assert.equal(groupWriterProfileHref(slug), `/community/researcher/${slug}`);
});

test("text, image and video: media is public Storage only, preview fields are set, audio is not supported", () => {
  const text = groupRowToWorldUpdate(row());
  assert.equal(text.media, null); assert.equal(text.mediaHref, null);
  const image = groupRowToWorldUpdate(row({ body: "", media_kind: "image", media_url: IMG }));
  assert.equal(image.media.kind, "image"); assert.equal(image.thumbUrl, IMG); assert.equal(image.label, "תמונה מהקבוצה");
  const video = groupRowToWorldUpdate(row({ body: "כיתוב", media_kind: "video", media_url: STORAGE, thumb_url: IMG }));
  assert.equal(video.media.kind, "video"); assert.equal(video.mediaHref, STORAGE); assert.equal(video.thumbUrl, IMG); assert.equal(video.fullText, "כיתוב");
  for (const [kind, url] of [["audio", STORAGE], ["video", "http://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/a.mp4"], ["image", "https://evil.example/x.jpg"],
    ["image", `${IMG}?token=abc`], ["image", "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/sign/media/x.jpg"], ["image", "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/private/x.jpg"]]) {
    assert.equal(groupRowToWorldUpdate(row({ body: "טקסט", media_kind: kind, media_url: url })), null, `${kind} ${url} must drop the row, not show it as text`);
  }
  assert.equal(groupRowToWorldUpdate(row({ body: "  ", media_kind: null })), null, "empty without media is dropped");
  assert.equal(publicGroupMediaUrl(`${IMG}#frag`), null);
  assert.equal(groupMediaFromRow({ media_kind: "image" }), null);
});

test("pagination: the reader keeps the one live RPC, caps pages at 40 and passes the cursor", async () => {
  const calls = [];
  const rpc = async (name, args) => { calls.push([name, args]); return { data: [], error: null }; };
  await fetchGroupSourceArrivals({ limit: 500, before: "2026-11-01T00:00:00Z", rpc });
  await fetchGroupSourceArrivals({ limit: 0, rpc });
  assert.deepEqual(calls[0], [WORLD_GROUP_SOURCE_READER, { p_limit: 40, p_before: "2026-11-01T00:00:00Z" }]);
  assert.equal(calls[1][1].p_limit, 12);
  assert.equal(WORLD_GROUP_SOURCE_READER, "world_group_source_arrivals_v2", "extends the existing reader; no parallel RPC");
});

test("Now: a group publication is labelled by its group, keeps the writer, previews media and links to the member page", () => {
  const item = groupRowToWorldUpdate(row({ body: "", media_kind: "video", media_url: STORAGE, thumb_url: IMG, group_channel: "ki-la-hamelucha-gematria" }));
  const [feed] = feedRows([item], { now: Date.parse("2026-11-01T12:00:00Z") });
  const model = nowRowModel(feed);
  assert.equal(model.sourceName, "כי לה׳ המלוכה — גימטריות");
  assert.deepEqual(model.byline, ["כי לה׳ המלוכה — גימטריות", "צבי (OPOC)"]);
  assert.equal(model.media, "video"); assert.equal(model.previewKind, "video"); assert.equal(model.mediaHref, STORAGE); assert.equal(model.thumb, IMG);
  assert.equal(model.unverified, true); assert.equal(model.typeLabel, "מקור · טרם נבדק");
  assert.equal(model.creatorHref, "/community/researcher/tzvi-opoc");
  assert.equal(model.href, "/world#group-source-u1", "opens the full source in World, never /post");
  assert.ok(!model.lenses.has("messages") && !model.lenses.has("hints"), "group sources are not mixed into messages / Or HaGeula");
});

test("Now: text stays two lines without a media preview; image is an image", () => {
  const text = nowRowModel(feedRows([groupRowToWorldUpdate(row())])[0]);
  assert.equal(text.previewKind, null); assert.equal(text.media, "text"); assert.equal(text.excerpt, "");
  const image = nowRowModel(feedRows([groupRowToWorldUpdate(row({ body: "x", media_kind: "image", media_url: IMG }))])[0]);
  assert.equal(image.media, "image"); assert.equal(image.previewKind, "image");
});

test("Now: source filter offers the groups; unidentified-label neutral rows still list", () => {
  const items = [
    groupRowToWorldUpdate(row({ id: "a" })),
    groupRowToWorldUpdate(row({ id: "b", group_channel: "ki-la-hamelucha-gematria", created_at: "2026-11-01T11:00:00Z" })),
    groupRowToWorldUpdate(row({ id: "c", group_channel: undefined, created_at: "2026-11-01T09:00:00Z" })),
  ];
  const models = nowModels(feedRows(items, { limit: 10, caps: { group: 10 } }));
  const choices = nowSecondaryChoices(models).sources.map((s) => s.id);
  assert.deepEqual(choices.sort(), ["כי לה׳ המלוכה — גימטריות", "קבוצת מקור", "תורת הרמז"].sort());
  assert.equal(filterNowModels(models, { source: "תורת הרמז" }).length, 1);
});

test("no duplicate with an existing post: group ids are namespaced, never /post, refs never collide", () => {
  const group = groupRowToWorldUpdate(row({ id: "p1" }));
  assert.ok(group.id.startsWith("group:")); assert.ok(!group.href.startsWith("/post"));
  const post = { id: "post:5113001", kind: "source", sourceKind: "post", sourceRef: "posts:5113001", label: "פוסט", at: "2026-11-01T10:00:00Z" };
  const merged = mergeSystemFeedItems([post], [group]);
  assert.equal(merged.length, 2);
  assert.equal(mergeSystemFeedItems([group], [{ ...group }]).length, 1, "the same occurrence is one publication");
});

test("proposed SQL: extends the one reader, keeps every privacy filter, adds only the channel and group label; config is inert text", () => {
  const sql = read("docs/reviews/group-sources-20261105/proposed-sql/01_extend_world_group_source_arrivals_v2.sql");
  for (const needle of ["world_group_source_arrivals_v2", "'ki-la-hamelucha-gematria'", "g.held_at is null", "verified_phone_unique", "group_source_intake_public is true",
    "cu.status in ('live','private')", "c.slug in ('tzvi-opoc','yaniv-levi','shachar-kandro','shimon-haimov')", "general_feed_enabled", "cu.image_url is null", "@g.us", "[קישור]"]) assert.ok(sql.includes(needle), needle);
  assert.ok(!/arrivals_v3/.test(sql), "no parallel RPC");
  assert.ok(!/or-geula/.test(sql.replace(/--.*$/gm, "")), "Or HaGeula never in the group reader");
  const config = read("docs/reviews/group-sources-20261105/proposed-sql/02_ki_la_hamelucha_gematria_intake_config.sql");
  assert.ok(!config.split("\n").some((line) => /^\s*update\s/i.test(line)), "the config statement is commented out, not executable");
  const migrations = readdirSync(new URL("../supabase/migrations/", import.meta.url));
  assert.ok(!migrations.some((name) => /group_source.*(extend|ki_la)/i.test(name)), "proposals are not in supabase/migrations (not auto-applied)");
});

test("ingest: ki-la joins only the proof path in code; guard and sender-JID proof are unchanged", () => {
  const ts = read("supabase/functions/wa-channel-ingest/index.ts");
  assert.match(ts, /WORLD_GROUP_CHANNELS = new Set\(\["torat-haremez", "gilui-yomi", "ki-la-hamelucha-gematria"\]\)/);
  assert.ok(!/WORLD_GROUP_CHANNELS[^;]*or-geula/.test(ts));
  const at = ts.indexOf('rpc("record_channel_update_group_proof_v1"');
  const guard = ts.slice(ts.lastIndexOf("if (WORLD_GROUP_CHANNELS", at), at);
  assert.ok(guard.includes("!outgoing") && guard.includes("!imageUrl") && guard.includes("@g.us"));
  assert.ok(ts.slice(at, at + 400).includes("p_sender_jid: senderId"));
  // Audio messages are admitted (11.11.2026) on the same private/live rule; a world group never makes them public.
  assert.match(ts, /"audioMessage"/);
  assert.ok(guard.includes("!imageUrl"), "a message with any media (audio included) never becomes a public group source");
});

test("World and Now components render the group label, media and member link from the shared fields", () => {
  const meta = read("src/components/research/GroupSourceMeta2029.jsx");
  assert.match(meta, /sourceGroupLabel/); assert.match(meta, /creatorHref/); assert.match(meta, /controls preload="metadata"/); assert.doesNotMatch(meta, /autoPlay/);
  assert.match(read("src/components/research/SourceArrivalList2029.jsx"), /GroupSourceCreator/);
  assert.match(read("src/components/research/ZviGroupTimeline2029.jsx"), /GroupSourceBadge/);
  assert.match(read("src/components/experience2029/NowPublications2029.jsx"), /data-now-action="creator-profile"/);
  assert.equal(existsSync(new URL("../src/components/research/groupSourceMeta2029.css", import.meta.url)), true);
});
