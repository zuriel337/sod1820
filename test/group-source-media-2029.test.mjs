// Group images and videos on the Zvi / «תורת הרמז» path (ZURIEL 11.11.2026; branch-only proposal, nothing applied or deployed).
// Covers: the pure routing helpers and the one public write (fake Supabase client), the ingest order of operations, the SQL proposal
// files (static), the Edge/SQL path cross-check, and the 2029 client projection of a media row of the extended reader.
// The SQL behaviour itself runs on a throwaway PostgreSQL: bash scripts/run-group-source-media-sql-test.sh.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { WA_GROUP_MEDIA_TYPES, waGroupIntakePublic, waGroupMessageRoute, waIsPrivateMediaRef, waProveAndPublishGroupMedia } from "../supabase/functions/_shared/waGroupMedia.js";
import { waPublicMediaPath, waStableAssetId } from "../supabase/functions/_shared/waMediaAsset.js";
import { groupRowToWorldUpdate } from "../src/lib/research/worldGroupSource.js";
import { feedRows } from "../src/lib/systemFeed2029.js";
import { nowModels } from "../src/lib/nowPublications2029.js";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const PRIVATE = "storage-object:0f8fad5b-d9cb-469f-a165-70867728950e";
const ORIGIN = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/";
const GROUP = { worldGroup: true, outgoing: false, chatId: "100000000000000002@g.us" };

test("routing: only an incoming plain image or video of a public source group takes the media path", () => {
  assert.deepEqual({ ...waGroupMessageRoute({ ...GROUP, typeMessage: "imageMessage", mediaKind: "image" }) }, { groupSource: true, groupMedia: true, kind: "image" });
  assert.deepEqual({ ...waGroupMessageRoute({ ...GROUP, typeMessage: "videoMessage", mediaKind: "video" }) }, { groupSource: true, groupMedia: true, kind: "video" });
  assert.deepEqual({ ...waGroupMessageRoute({ ...GROUP, typeMessage: "textMessage", mediaKind: null }) }, { groupSource: true, groupMedia: false, kind: null });
  for (const [label, input] of [
    ["audio", { ...GROUP, typeMessage: "audioMessage", mediaKind: "audio" }],
    ["reply with a file", { ...GROUP, typeMessage: "quotedMessage", mediaKind: "image" }],
    ["text with an attached file", { ...GROUP, typeMessage: "extendedTextMessage", mediaKind: "image" }],
    ["declared image, bytes of a video", { ...GROUP, typeMessage: "imageMessage", mediaKind: "video" }],
    ["prototype key", { ...GROUP, typeMessage: "constructor", mediaKind: "image" }],
    ["outgoing", { ...GROUP, outgoing: true, typeMessage: "imageMessage", mediaKind: "image" }],
    ["private chat", { ...GROUP, chatId: "000000000101@c.us", typeMessage: "imageMessage", mediaKind: "image" }],
    ["not a public group", { ...GROUP, worldGroup: false, typeMessage: "imageMessage", mediaKind: "image" }],
  ]) assert.equal(waGroupMessageRoute(input).groupMedia, false, label);
  assert.deepEqual(Object.keys(WA_GROUP_MEDIA_TYPES), ["imageMessage", "videoMessage"]);
  assert.ok(Object.isFrozen(WA_GROUP_MEDIA_TYPES));
});

test("intake marker: text as before; a group image/video only with its private original; never audio, outgoing or a public URL", () => {
  const text = waGroupMessageRoute({ ...GROUP, typeMessage: "textMessage" });
  const image = waGroupMessageRoute({ ...GROUP, typeMessage: "imageMessage", mediaKind: "image" });
  const audio = waGroupMessageRoute({ ...GROUP, typeMessage: "audioMessage", mediaKind: "audio" });
  assert.equal(waGroupIntakePublic(text, null), true);
  assert.equal(waGroupIntakePublic(image, PRIVATE), true);
  assert.equal(waGroupIntakePublic(image, null), true, "bytes failed: the caption is a text arrival, exactly as today (the text proof refuses a media type)");
  assert.equal(waGroupIntakePublic(image, ORIGIN + "sod1820/2029/image/2026/11/x/original.jpg"), false, "never a public URL at intake");
  assert.equal(waGroupIntakePublic(audio, PRIVATE), false);
  assert.equal(waGroupIntakePublic(waGroupMessageRoute({ ...GROUP, outgoing: true, typeMessage: "imageMessage", mediaKind: "image" }), PRIVATE), false);
  assert.equal(waGroupIntakePublic(undefined, null), false);
  assert.equal(waIsPrivateMediaRef(PRIVATE), true);
  for (const value of ["storage-object:", "storage-object:../x", `${PRIVATE} `, "https://x/storage-object:0f8fad5b-d9cb-469f-a165-70867728950e", null]) assert.equal(waIsPrivateMediaRef(value), false, String(value));
});

// A fake Supabase client that records every call.
function fakeSb({ proof = { data: { ok: true, publishable: true, identity_basis: "verified_phone_unique" } }, upload = { data: {}, error: null }, record = { data: { ok: true } }, throwOn = null } = {}) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => {
      calls.push({ op: "rpc", name, args });
      if (throwOn === name) throw new Error("boom");
      return name === "record_channel_update_group_media_proof_v1" ? proof : record;
    },
    storage: { from: (bucket) => ({ upload: async (path, buf, opts) => { calls.push({ op: "upload", bucket, path, size: buf.byteLength, opts }); return upload; } }) },
  };
}
const MEDIA = { buf: new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]), ct: "image/jpeg", ext: "jpg" };
const ARGS = { bucket: "media", updateId: "u-1", source: { id: "s-1", channel: "gilui-yomi" }, msgId: "TEST-MESSAGE-1", chatId: "100000000000000002@g.us",
  senderId: "000000000101@c.us", typeMessage: "imageMessage", kind: "image", sourceTs: Date.parse("2026-11-10T22:41:49Z") / 1000, media: MEDIA };
const EXPECTED_PATH = "sod1820/2029/image/2026/11/be3c12c5-7aa1-5368-9b6a-304a973b22ca/original.jpg";

test("the one public write: proof, then the copy at the exact 2029 path (upsert:false), then the record — only when publishable", async () => {
  const sb = fakeSb(); const trace = [];
  const r = await waProveAndPublishGroupMedia({ sb, trace, ...ARGS });
  assert.deepEqual(r, { published: true, path: EXPECTED_PATH });
  assert.deepEqual(sb.calls.map((c) => c.op === "rpc" ? c.name : `upload:${c.bucket}`),
    ["record_channel_update_group_media_proof_v1", "upload:media", "record_group_source_public_media_v1"]);
  assert.deepEqual(sb.calls[0].args, { p_update_id: "u-1", p_source_id: "s-1", p_ext_msg_id: "TEST-MESSAGE-1", p_group_chat_id: ARGS.chatId,
    p_sender_jid: ARGS.senderId, p_incoming: true, p_type_message: "imageMessage" });
  assert.deepEqual(sb.calls[1], { op: "upload", bucket: "media", path: EXPECTED_PATH, size: 12, opts: { contentType: "image/jpeg", upsert: false } });
  assert.deepEqual(sb.calls[2].args, { p_update_id: "u-1", p_object_path: EXPECTED_PATH });
  assert.equal(trace.at(-1).step, "group-media-public");
  assert.ok(!JSON.stringify(trace).includes(ARGS.senderId), "no sender id in traces");
});

test("nothing public when the server does not allow it, and every failure stops before the next step", async () => {
  const cases = [
    ["proof refused", { proof: { data: { ok: false, error: "update_mismatch" } } }, ["record_channel_update_group_media_proof_v1"], "group-media-proof-skip"],
    ["proof transport error", { proof: { error: { message: "network" } } }, ["record_channel_update_group_media_proof_v1"], "group-media-proof-skip"],
    ["unverified / not approved", { proof: { data: { ok: true, publishable: false, identity_basis: "unverified" } } }, ["record_channel_update_group_media_proof_v1"], "group-media-private"],
    ["publishable not literally true", { proof: { data: { ok: true, publishable: "true" } } }, ["record_channel_update_group_media_proof_v1"], "group-media-private"],
    ["upload error", { upload: { error: { statusCode: "500", message: "fail" } } }, ["record_channel_update_group_media_proof_v1", "upload:media"], "group-media-upload-fail"],
    ["record refused", { record: { data: { ok: false, error: "public_copy_mismatch" } } }, ["record_channel_update_group_media_proof_v1", "upload:media", "record_group_source_public_media_v1"], "group-media-record-skip"],
    ["throw", { throwOn: "record_channel_update_group_media_proof_v1" }, ["record_channel_update_group_media_proof_v1"], "group-media-throw"],
  ];
  for (const [label, opts, ops, step] of cases) {
    const sb = fakeSb(opts); const trace = [];
    const r = await waProveAndPublishGroupMedia({ sb, trace, ...ARGS });
    assert.equal(r.published, false, label);
    assert.deepEqual(sb.calls.map((c) => c.op === "rpc" ? c.name : `upload:${c.bucket}`), ops, label);
    assert.equal(trace.at(-1).step, step, label);
  }
  const existing = fakeSb({ upload: { error: { statusCode: "409", message: "The resource already exists" } } });
  assert.equal((await waProveAndPublishGroupMedia({ sb: existing, trace: [], ...ARGS })).published, true, "an existing object of the same message is recorded (replay)");
  for (const bad of [{ kind: "audio" }, { media: null }, { updateId: null }]) {
    const sb = fakeSb();
    assert.equal((await waProveAndPublishGroupMedia({ sb, trace: [], ...ARGS, ...bad })).published, false);
    assert.equal(sb.calls.length, 0, JSON.stringify(bad));
  }
});

test("Edge and SQL derive the same public path: UUID v5 cross-check value and the 2029 path of the message month", async () => {
  assert.equal(await waStableAssetId("gilui-yomi", "TEST-MESSAGE-1"), "be3c12c5-7aa1-5368-9b6a-304a973b22ca");
  assert.equal(waPublicMediaPath("image", "be3c12c5-7aa1-5368-9b6a-304a973b22ca", ARGS.sourceTs, "jpg"), EXPECTED_PATH);
  const sql = read("supabase/proposed/20261111234000_group_source_media_v1_PROPOSAL.sql");
  assert.ok(sql.includes("'be3c12c5-7aa1-5368-9b6a-304a973b22ca'"), "the SQL precondition asserts the same value");
  assert.ok(sql.includes("extensions.uuid_generate_v5('6f0c2f4e-1b1d-5b8a-9c3e-2029a5e7d1c0'::uuid, 'wa-channel:' || cu.channel || ':' || cu.ext_msg_id)"));
  assert.ok(read("supabase/functions/_shared/waMediaAsset.js").includes('const NAMESPACE = "6f0c2f4e-1b1d-5b8a-9c3e-2029a5e7d1c0"'));
});

test("ingest order: private original first, the proof after the insert, the public copy only through the shared write; no second private copy", () => {
  const ts = read("supabase/functions/wa-channel-ingest/index.ts");
  const i = (needle) => { const at = ts.indexOf(needle); assert.ok(at > 0, needle); return at; };
  // Group channels are research-first: every group media message is stored privately (submission-inbox) before anything else.
  assert.match(ts, /RESEARCH_FIRST_CHANNELS = new Set\(\["torat-haremez", "gilui-yomi", "sfot-vheker"\]\)/);
  assert.match(ts, /STORY_LIVE_CHANNELS = new Set\(\["or-geula"\]\)/);
  assert.ok(i("route.groupMedia ? keep : undefined") < i('const ins = await sb.from("channel_updates").insert('));
  assert.ok(i('const ins = await sb.from("channel_updates").insert(') < i("} else if (route.groupMedia && route.kind && waIsPrivateMediaRef(imageUrl) && keep.media) {"));
  assert.equal((ts.match(/waProveAndPublishGroupMedia\(\{/g) || []).length, 2, "new row and reviewed backfill: the only two callers");
  assert.equal((ts.match(/record_channel_update_group_media_proof_v1|record_group_source_public_media_v1/g) || []).length, 0, "the ingest never calls the media RPCs directly");
  // Reviewed backfill: a targeted duplicate re-reads the bytes only (fetchMedia), never stores a second private copy.
  assert.match(ts, /const groupBackfill = !!dup && targeted && route\.groupMedia && waIsPrivateMediaRef\(dup\.image_url\);/);
  assert.match(ts, /if \(\(isImg \|\| isVid \|\| isAud\) && \(!dup \|\| !dup\.image_url \|\| groupBackfill\)\) \{/);
  assert.match(ts, /if \(dl && groupBackfill\) \{\n\s+const media = await fetchMedia\(dl, msgId, mediaKind as "image" \| "video"\);/);
  assert.match(ts, /updateId: dup\.id, source: src, msgId, chatId,/);
  // The upload in the shared write targets the public 2029 bucket of the ingest, nothing else.
  assert.match(ts, /bucket: MEDIA_2029_BUCKET, updateId: ins\.data\?\.id/);
  assert.match(ts, /MEDIA_2029_BUCKET = "media"/);
});

test("SQL files: proposals only, one reader extended in place, every gate of the live reader kept, exact live fixtures, rollback restores md5", () => {
  const migrations = readdirSync(new URL("../supabase/migrations/", import.meta.url));
  assert.ok(!migrations.some((name) => /group_source_media|kandro_media/i.test(name)), "never in supabase/migrations (not auto-applied)");
  const sql = read("supabase/proposed/20261111234000_group_source_media_v1_PROPOSAL.sql");
  assert.match(sql, /^-- GROUP_SOURCE_MEDIA_V1 — PROPOSAL, NOT APPLIED\./);
  assert.ok(!/world_group_source_arrivals_v[13-9]\b/.test(sql), "no parallel reader");
  for (const gate of ["g.held_at is null", "g.identity_basis = 'verified_phone_unique'", "cu.group_source_intake_public is true", "cu.status in ('live','private')",
    "(cu.expires_at is null or cu.expires_at > now())", "c.slug in ('tzvi-opoc','yaniv-levi','shachar-kandro','shimon-haimov')", "general_feed_enabled",
    "cu.text !~* '(vcard|begin:vcard|wa\\.me/|chat\\.whatsapp\\.com)'", "s.chat_id like '%@g.us'", "'[קישור]'", "'[דוא״ל]'", "'[מספר]'"])
    assert.ok(sql.includes(gate), gate);
  assert.ok(sql.includes("(g.text_only is true and cu.image_url is null and cu.thumb_url is null)"), "text rows exactly as the live reader");
  assert.ok(sql.includes("'5e5168904f67f73c1ad1fcb6ecceb5bb'") && sql.includes("'eb6551cf1f71dbb5943c6e249b3c978b'"), "live md5 preconditions");
  assert.match(sql, /grant execute on function public\.world_group_source_arrivals_v2\(integer, timestamp with time zone\) to anon, authenticated, service_role;/);
  assert.match(sql, /revoke all on function public\.group_source_media_publishable_v1\(uuid\) from public, anon, authenticated, service_role;/);
  assert.match(sql, /revoke all on table public\.group_source_public_media from public, anon, authenticated, service_role;/);
  const fixture = read("tests/sql/fixtures/group_source_media_live_base_20261111/world_group_source_arrivals_v2.sql").trimEnd();
  const rollback = read("supabase/proposed/ROLLBACK_20261111234000_group_source_media_v1.sql");
  assert.ok(rollback.includes(fixture), "the rollback re-creates the live reader text byte for byte");
  const backfill = read("supabase/proposed/20261111234500_gilui_yomi_kandro_media_backfill_v1_PROPOSAL.sql");
  assert.equal(new Set(backfill.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g)).size, 1, "the backfill names exactly one row");
  assert.equal((backfill.match(/^update /gm) || []).length, 1, "one update statement");
  assert.ok(!/^\s*select net\.http_get/m.test(backfill), "the targeted recovery call is documentation only (commented)");
  assert.ok(!/\b0?5\d-?\d{7}\b|\+972/.test(sql + backfill + rollback), "no phone number in the files");
});

test("the 2029 client shows a media row of the extended reader with the existing projection (no client change needed)", () => {
  const row = { id: "40000000-0000-4000-8000-000000000001", body: "", created_at: "2026-11-11T10:00:00Z", contributor_slug: "shachar-kandro",
    contributor_name: "שחר יצחק קנדרו", group_proof: true, proof_basis: "verified_phone_unique", group_channel: "gilui-yomi",
    media_kind: "image", media_url: ORIGIN + "sod1820/2029/image/2026/11/be3c12c5-7aa1-5368-9b6a-304a973b22ca/original.jpg", thumb_url: null };
  const item = groupRowToWorldUpdate(row);
  assert.equal(item.media.kind, "image");
  assert.equal(item.mediaHref, row.media_url);
  assert.equal(item.label, "תמונה מהקבוצה");
  const video = groupRowToWorldUpdate({ ...row, id: "40000000-0000-4000-8000-000000000002", media_kind: "video",
    media_url: ORIGIN + "sod1820/2029/video/2026/11/0f8fad5b-d9cb-569f-a165-70867728950e/original.mp4",
    thumb_url: ORIGIN + "sod1820/2029/video/2026/11/0f8fad5b-d9cb-569f-a165-70867728950e/derivatives/poster.jpg" });
  assert.equal(video.media.kind, "video");
  assert.equal(video.thumbUrl, video.media.thumbUrl);
  assert.equal(groupRowToWorldUpdate({ ...row, media_url: "https://evil.example/x.jpg" }), null, "a media row that fails public validation is dropped, never shown as text");
  const now = Date.parse("2026-11-11T12:00:00Z");
  const [m] = nowModels(feedRows([item], { now, limit: 160, caps: { group: 40 } }), now);
  assert.equal(m.media, "image");
  assert.equal(m.previewKind, "image", "a group source with media keeps its preview in Now");
  assert.equal(m.mediaHref, row.media_url);
  const [v] = nowModels(feedRows([video], { now, limit: 160, caps: { group: 40 } }), now);
  assert.equal(v.media, "video");
  assert.equal(v.previewKind, "video");
});
