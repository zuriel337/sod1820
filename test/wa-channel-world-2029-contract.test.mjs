import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const ingest = fs.readFileSync("supabase/functions/wa-channel-ingest/index.ts", "utf8");
const intake = fs.readFileSync("supabase/functions/wa-channel-research-intake/index.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260920002000_g3_wa_channels_to_world_2029_v1.sql", "utf8");

const syntax = spawnSync(process.execPath, ["--check", "supabase/functions/wa-channel-ingest/index.ts"], {
  encoding: "utf8",
});
assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout || "wa-channel-ingest TypeScript syntax check failed");

// Or-Geula stays story/live; heavy research channels become private source ingress.
assert.match(ingest, /RESEARCH_FIRST_CHANNELS = new Set\(\["torat-haremez", "gilui-yomi", "sfot-vheker"\]\)/);
assert.match(ingest, /STORY_LIVE_CHANNELS = new Set\(\["or-geula"\]\)/);
assert.match(ingest, /return STORY_LIVE_CHANNELS\.has\(channel\) \? "live" : "private"/);
assert.match(ingest, /status: channelStatus\(src\.channel\)/);
assert.match(ingest, /waAdmin\("getStateInstance", \{\}, "GET"\)/);
assert.match(ingest, /providerState !== "authorized"/);
assert.match(ingest, /error: "green_not_authorized"/);
assert.match(ingest, /status: 503/);
assert.match(ingest, /storage\.from\("submission-inbox"\)\.upload/);
assert.match(ingest, /channelStatus\(src\.channel\) === "private"/);
assert.match(ingest, /return \`storage-object:\$\{up\.data\.id\}\`/);
assert.match(ingest, /function normalizeProviderMediaUrl/);
assert.match(ingest, /candidate = `https:\/\/\$\{v\}`/);
assert.match(ingest, /step: "invalid-media-url"/);
assert.match(ingest, /recover_channel/);
assert.match(ingest, /recover_message_id/);
assert.match(ingest, /targeted_recovery_requires_channel_and_message_id/);
assert.match(ingest, /targeted_recovery_source_not_found/);
assert.match(ingest, /Targeted repair is source-local and never advances checkpoints/);
assert.match(ingest, /targetedRecovery: targeted/);
assert.ok(ingest.includes("digitaloceanspaces.com"));
assert.ok(ingest.includes('select("id,image_url")'));
assert.match(ingest, /targeted-media-repaired/);
assert.match(ingest, /targeted-media-repair-fail/);
assert.ok(ingest.includes("update({ image_url: imageUrl })"));

// A long outage cannot silently skip from a 30-message window.
assert.match(ingest, /RECOVERY_HISTORY_COUNT = 1000/);
assert.match(ingest, /RECOVERY_BATCH = 10/);
assert.match(ingest, /sort\(\(a, b\) => Number\(a\?\.timestamp \|\| 0\) - Number\(b\?\.timestamp \|\| 0\)\)/);
assert.match(ingest, /recovery-window-saturated/);
assert.match(ingest, /gapRows\.slice\(0, RECOVERY_BATCH\)/);
assert.match(ingest, /if \(!recoveryPending\) upd\.last_run_at/);

// The adapter reuses existing canonical capabilities rather than a second research engine.
assert.match(intake, /invokeInternal\("research-extract"/);
assert.match(intake, /invokeInternal\("wa-ocr"/);
assert.match(intake, /\.from\("research_objects"\)/);
assert.match(intake, /privacy_scope: "private"/);
assert.match(intake, /source: "channel_updates"/);
assert.match(intake, /story_first_selective/);
assert.match(intake, /private_channel_media_access/);
assert.match(intake, /createSignedUrl\(resolved\.path, 300\)/);
// Heavy-research channels (private media -> OCR) are selected by the channel_ingest_sources registry
// policy, not by a hard-coded channel set: d55221013 (trusted-author tree routing v1, 4.10) replaced
// `HEAVY_CHANNELS.has(row.channel)` with the row's `_sourcePolicy.intake_mode`, and
// wa-trusted-author-tree-routing.test.mjs asserts that no hard-coded channel set returns.
assert.match(intake, /row\.image_url && row\._sourcePolicy\?\.intake_mode === "research_first"/);
assert.match(intake, /_sourcePolicy: policy/);
assert.doesNotMatch(intake, /HEAVY_CHANNELS/);
assert.match(intake, /source_preserved_needs_transcription/);
assert.match(intake, /extracted_caption_media_needs_transcription/);
assert.match(intake, /extracted_caption_media_needs_ocr/);
// Bounded automatic retry. 6ab185b54 (resumable historical intake scan, 21.10) expressed the old single
// predicate `maxAttempts < 3 && latestFailure > 0 && now - latestFailure >= 30m` as explicit states:
// 3 failed attempts end the retry (retry_exhausted), a failure younger than 30 minutes waits
// (retry_cooldown), and only the remaining case is retried (retry_ready).
assert.match(intake, /if \(maxAttempts >= 3\) \{\s*eligibilityState\.set\(r\.id, "retry_exhausted"\);\s*return false;\s*\}/);
assert.match(intake, /if \(!\(latestFailure > 0 && now - latestFailure >= 30 \* 60 \* 1000\)\) \{\s*eligibilityState\.set\(r\.id, "retry_cooldown"\);\s*return false;\s*\}/);
assert.match(intake, /eligibilityState\.set\(r\.id, "retry_ready"\);\s*return true;/);
assert.match(intake, /30 \* 60 \* 1000/);
assert.match(intake, /processing_error_retry_pending/);
assert.match(intake, /One malformed\/transient source must not abort/);

// Resource trim + existing health owner, not a parallel watchdog.
assert.match(migration, /when 'or-geula' then 5/);
assert.match(migration, /when 'torat-haremez' then 5/);
assert.match(migration, /when 'gilui-yomi' then 5/);
assert.match(migration, /when 'sfot-vheker' then 15/);
assert.match(migration, /cron\.alter_job\(job_id := v_id, schedule := '\*\/5 \* \* \* \*'\)/);
assert.match(migration, /wa-channel-research-intake\?hours=168&limit=4/);
assert.match(migration, /private_channel_media_access/);
assert.match(migration, /v_ref is distinct from \('storage-object:' \|\| p_storage_object_id::text\)/);
assert.match(migration, /public\.wa_admin\('getStateInstance'/);
assert.match(migration, /perform public\.notify_admin/);
assert.match(migration, /topic = '🚨 ניטור ערוצי WhatsApp \(אוטומטי\)'/);

console.log("PASS wa-channel → Research/World 2029 backend contract");

// WhatsApp media → the one 2029 public media identity (ingress convention): image, video and audio, stable per message.
{
  const media = await import("../supabase/functions/_shared/waMediaAsset.js");
  assert.match(ingest, /from "\.\.\/_shared\/waMediaAsset\.js"/);
  assert.ok(!/LEGACY_PUBLIC_BUCKET|sod1820\/broadcasts|upsert: true/.test(ingest), "new public media never go to the legacy overwritable broadcast path");
  assert.match(ingest, /const assetId = await waStableAssetId\(channel, msgId\)/);
  assert.match(ingest, /storage\.from\(MEDIA_2029_BUCKET\)\.upload\(path, buf, \{ contentType: ct, upsert: false \}\)/);
  assert.match(ingest, /"audioMessage"/);
  assert.match(ingest, /const sniffed = waSniffMedia\(buf, kind\)/);
  // the private inbox path and the public/live rule are untouched
  assert.match(ingest, /sod1820\/2029\/unresolved\/\$\{yyyy\}\/\$\{mm\}\/\$\{submissionId\}\/\$\{kind\}\/original\.\$\{ext\}/);
  assert.ok(ingest.indexOf('if (privateMedia)') < ingest.indexOf('const assetId = await waStableAssetId'), "private media leave before any public path is built");

  const a = await media.waStableAssetId("or-geula", "3EB0ABCDEF"), b = await media.waStableAssetId("or-geula", "3EB0ABCDEF");
  assert.equal(a, b, "a repeated or recovered run maps the same message to the same asset id");
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(a, await media.waStableAssetId("or-geula", "3EB0ABCDEG"));
  assert.notEqual(a, await media.waStableAssetId("other-channel", "3EB0ABCDEF"));
  assert.equal(media.waPublicMediaPath("image", a, Date.UTC(2026, 10, 11) / 1000, "jpg"), `sod1820/2029/image/2026/11/${a}/original.jpg`);
  assert.equal(media.waPublicMediaPath("audio", a, Date.UTC(2026, 0, 2) / 1000, "ogg"), `sod1820/2029/audio/2026/01/${a}/original.ogg`);
  assert.throws(() => media.waPublicMediaPath("document", a, 0, "pdf"));
  assert.throws(() => media.waPublicMediaPath("image", "../x", 0, "jpg"));

  const bytes = (...head) => { const out = new Uint8Array(64); out.set(head.map(x => typeof x === "string" ? [...x].map(c => c.charCodeAt(0)) : [x]).flat()); return out; };
  const cases = [
    ["image", bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg"], ["image", bytes("\x89PNG\r\n\x1a\n"), "image/png"], ["image", bytes("RIFF", 0, 0, 0, 0, "WEBP"), "image/webp"],
    ["video", bytes(0, 0, 0, 0x20, "ftypisom"), "video/mp4"], ["video", bytes(0x1a, 0x45, 0xdf, 0xa3), "video/webm"],
    ["audio", bytes("OggS"), "audio/ogg"], ["audio", bytes("ID3"), "audio/mpeg"], ["audio", bytes(0xff, 0xfb, 0x90), "audio/mpeg"],
    ["audio", bytes(0, 0, 0, 0x20, "ftypM4A "), "audio/mp4"], ["audio", bytes("RIFF", 0, 0, 0, 0, "WAVE"), "audio/wav"], ["audio", bytes(0xff, 0xf1, 0x50), "audio/aac"],
  ];
  for (const [kind, data, type] of cases) assert.equal(media.waSniffMedia(data, kind)?.contentType, type, `${kind} ${type}`);
  for (const [kind, data] of [["image", bytes("<!doctype html>")], ["video", bytes("OggS")], ["audio", bytes(0xff, 0xd8, 0xff)], ["image", bytes("OggS")],
    ["video", bytes(0, 0, 0, 0x20, "ftypM4A ")], ["audio", new Uint8Array(4)]])
    assert.equal(media.waSniffMedia(data, kind), null, `${kind} rejects a foreign or truncated body`);
  assert.equal(media.waMessageMediaKind("audioMessage", ""), "audio");
  assert.equal(media.waMessageMediaKind("quotedMessage", "audio/ogg; codecs=opus"), "audio");
  assert.ok(!/"stickerMessage"|"documentMessage"/.test(ingest), "stickers and documents are never admitted by the message-type list");
  assert.equal(media.waMessageMediaKind("documentMessage", "application/pdf"), null);
  assert.equal(media.waUploadAlreadyExists({ statusCode: "409", message: "The resource already exists" }), true);
  assert.equal(media.waUploadAlreadyExists({ statusCode: "403", message: "new row violates row-level security" }), false);
  assert.equal(media.waUploadAlreadyExists(null), false);
}
