// G3_2029_CONTROL_PLANE_MEDIA_HEALTH_V2 — guard test.
//
// Implementation follow-up to the released G3_2029_CONTROL_PLANE_FOUNDATION_V1 (PR #530, live).
// Widens admin_system_health()'s media projection with bounded, decision-useful aggregates —
// storage by-type/large-object bytes, gallery + channel_updates thumbnail health, and
// gallery/post/channel thumb-cron activity — while locking in the same privacy-safety properties
// as the v1 contract test: no object paths/filenames, no new table/store/registry/RPC, and an
// exact split between missing_thumb and original_as_thumb (previously combined under one OR'd
// count in v1).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const mig = read("supabase/migrations/20260918220630_admin_system_health_media_v2.sql");

// ── 1. Same function, same auth gate — EXTEND_EXISTING, not a parallel projection. ─────────────
assert.match(mig, /create or replace function public\.admin_system_health\(\)/i);
assert.match(mig, /security definer/i);
assert.match(mig, /set search_path to 'public', 'pg_temp'/i);
assert.match(
  mig,
  /if auth\.role\(\) <> 'service_role' and not coalesce\(public\.rd_is_admin\(\), false\) then\s*\n\s*raise exception 'not authorized';/i,
  "admin_system_health must keep the same fail-closed service_role/rd_is_admin() gate"
);
assert.ok(!/create table/i.test(mig), "no new table/store/registry/health ledger may be created");
assert.ok(!/create or replace function public\.(?!admin_system_health)/i.test(mig),
  "this slice must extend admin_system_health() only — no new/other RPC");

// ── 2. Storage by-type + large-object bounded aggregates, sourced from mimetype/size only. ─────
assert.match(mig, /'total_objects',\s*\(select count\(\*\) from storage\.objects\)/i);
assert.match(mig, /'total_bytes',\s*\(select coalesce\(sum\(\(metadata ->> 'size'\)::bigint\), 0\) from storage\.objects\)/i);
assert.match(mig, /split_part\(coalesce\(metadata ->> 'mimetype', ''\), '\/', 1\)/i,
  "storage type breakdown must derive from the mimetype major type, not filenames/paths");
for (const bucket of ["image", "video", "audio"]) {
  assert.match(mig, new RegExp(`when '${bucket}' then '${bucket}'`, "i"),
    `storage.by_type must classify the '${bucket}' mimetype major explicitly`);
}
assert.match(mig, /else 'document'/i,
  "storage.by_type must collapse any non-image/video/audio major type into 'document'");
assert.match(mig, /'over_20mb',\s*\(select count\(\*\) from storage\.objects where coalesce\(\(metadata ->> 'size'\)::bigint, 0\) > 20 \* 1024 \* 1024\)/i);
assert.match(mig, /'over_50mb',\s*\(select count\(\*\) from storage\.objects where coalesce\(\(metadata ->> 'size'\)::bigint, 0\) > 50 \* 1024 \* 1024\)/i);

// ── 3. Gallery thumbnail health: missing_thumb_count and original_as_thumb_count must be exactly
//      separate (not combined under one OR'd predicate as in v1), and scoped to the canonical
//      public-gallery projection. ────────────────────────────────────────────────────────────
assert.match(mig, /'public_visible_count',\s*\(\s*select count\(\*\) from public\.gallery_images\s*\n\s*where published = 1 and coalesce\(curator_hidden, false\) = false\s*\n\s*\)/i);
assert.match(
  mig,
  /'missing_thumb_count',\s*\(\s*select count\(\*\) from public\.gallery_images\s*\n\s*where published = 1 and coalesce\(curator_hidden, false\) = false\s*\n\s*and thumb_url is null\s*\n\s*\)/i,
  "missing_thumb_count must be its own count (thumb_url is null), not combined with original_as_thumb"
);
assert.match(
  mig,
  /'original_as_thumb_count',\s*\(\s*select count\(\*\) from public\.gallery_images\s*\n\s*where published = 1 and coalesce\(curator_hidden, false\) = false\s*\n\s*and thumb_url is not null and thumb_url = image_url\s*\n\s*\)/i,
  "original_as_thumb_count must require thumb_url is not null (excluding the missing_thumb case)"
);
assert.ok(
  !/thumb_url is null or thumb_url = image_url/i.test(mig),
  "v2 must not reintroduce the v1 combined missing/original OR predicate"
);
assert.ok(
  !/published in \(1,\s*2\)/i.test(mig),
  "published=2 is not part of the canonical public gallery projection"
);

// ── 4. channel_updates thumbnail health mirrors the gallery shape. ─────────────────────────────
assert.match(mig, /'image_rows',\s*\(select count\(\*\) from public\.channel_updates where image_url is not null\)/i);
assert.match(mig, /'missing_thumb',\s*\(select count\(\*\) from public\.channel_updates where image_url is not null and thumb_url is null\)/i);

// ── 5. Thumb-cron activity is scoped to the three existing job names only, by job name — never
//      command text, and never a new cron job. ─────────────────────────────────────────────────
assert.match(mig, /where j\.jobname in \('gallery-thumbs', 'post-thumbs', 'channel-thumbs'\)/i);
assert.ok(!/cron\.schedule\s*\(/i.test(mig), "this slice must never enable/create a cron job");
assert.ok(!/select[^;]*\bcommand\b[^;]*from\s+cron\.job/i.test(mig),
  "thumb_cron must never select cron.job.command (may contain secrets)");

// ── 6. No path/filename/private-content leakage anywhere in the widened media projection. ──────
assert.ok(!/storage\.objects\.name\b/i.test(mig), "media projection must never select storage.objects.name (an object path)");
assert.ok(
  !/select[^;]*\b(name|path)\b[^;]*from\s+storage\.objects/i.test(mig),
  "media projection must never select storage.objects name/path columns"
);
assert.ok(!/select[^;]*\bpath\b[^;]*from\s+public\.media_migration_queue/i.test(mig),
  "media_migration_queue.path (an object path) must never be selected");
assert.ok(!/select[^;]*\bimage_url\b[^;]*,\s*'image_url'/i.test(mig),
  "raw image_url values must never be echoed back into the projection");

// ── 7. Provider cached-egress stays UNKNOWN (unchanged); no poster/derivative heuristic invented. ─
assert.match(mig, /'supabase_cached_egress_basis',\s*'UNKNOWN'/);
assert.ok(!/'poster|'derivative/i.test(mig),
  "no poster/derivative backlog jsonb key may be invented without a canonical live field");

// ── 8. Grants unchanged: revoke public/anon, allow authenticated + service_role. ────────────────
assert.match(mig, /revoke all on function public\.admin_system_health\(\) from public, anon;/i);
assert.match(mig, /grant execute on function public\.admin_system_health\(\) to authenticated, service_role;/i);

console.log("admin-system-health-media-v2-contract: PASS");
