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

// Or-Geula and Torat-Haremez are live-feed sources; Torat remains research-first in parallel.
assert.match(ingest, /RESEARCH_FIRST_CHANNELS = new Set\(\["torat-haremez", "gilui-yomi", "sfot-vheker"\]\)/);
assert.match(ingest, /STORY_LIVE_CHANNELS = new Set\(\["or-geula", "torat-haremez"\]\)/);
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
assert.match(intake, /HEAVY_CHANNELS\.has\(row\.channel\)/);
assert.match(intake, /source_preserved_needs_transcription/);
assert.match(intake, /extracted_caption_media_needs_transcription/);
assert.match(intake, /extracted_caption_media_needs_ocr/);
assert.match(intake, /maxAttempts < 3/);
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
