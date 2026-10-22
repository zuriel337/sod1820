import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildResearchScanCursor,
  parseResearchScanRequest,
  truncateUnicode,
} from "../supabase/functions/_shared/waResearchScanWindow.js";

test("incremental scan preserves the bounded cron defaults", () => {
  const defaults = parseResearchScanRequest("https://example.test/?hours=168&limit=4");
  assert.equal(defaults.ok, true);
  assert.equal(defaults.mode, "incremental");
  assert.equal(defaults.hours, 168);
  assert.equal(defaults.limit, 4);
  assert.equal(defaults.windowSize, 500);
  assert.deepEqual(defaults.excludedChannels, []);

  const scan = parseResearchScanRequest("https://example.test/?hours=9999&limit=99");
  assert.equal(scan.ok, true);
  assert.equal(scan.mode, "incremental");
  assert.equal(scan.hours, 720);
  assert.equal(scan.limit, 8);
  assert.equal(scan.windowSize, 500);
  assert.deepEqual(scan.excludedChannels, []);
});

test("historical inventory is read-only, bounded and excludes Or Geula by default", () => {
  const scan = parseResearchScanRequest(
    "https://example.test/?mode=inventory&window=900&offset=500&channel=torat-haremez,gilui-yomi&exclude_channel=old-chat",
    { now: Date.parse("2026-10-21T12:00:00.000Z") },
  );
  assert.equal(scan.ok, true);
  assert.equal(scan.windowSize, 500);
  assert.equal(scan.offset, 500);
  assert.equal(scan.through, "2026-10-21T12:00:00.000Z");
  assert.deepEqual(scan.includedChannels, ["torat-haremez", "gilui-yomi"]);
  assert.deepEqual(scan.excludedChannels, ["or-geula", "old-chat"]);
});

test("historical request rejects ambiguous boundaries and contributor ids", () => {
  assert.deepEqual(
    parseResearchScanRequest("https://example.test/?mode=unknown"),
    { ok: false, error: "invalid_mode" },
  );
  assert.deepEqual(
    parseResearchScanRequest("https://example.test/?mode=backfill&contributor_id=zvi"),
    { ok: false, error: "invalid_contributor_id" },
  );
  assert.deepEqual(
    parseResearchScanRequest("https://example.test/?mode=inventory&after=2026-10-02&before=2026-10-01"),
    { ok: false, error: "invalid_time_window" },
  );
  assert.deepEqual(
    parseResearchScanRequest("https://example.test/?mode=backfill&repair=all"),
    { ok: false, error: "invalid_repair" },
  );
  assert.deepEqual(
    parseResearchScanRequest("https://example.test/?repair=truncated_json_v1"),
    { ok: false, error: "repair_requires_historical_mode" },
  );
  assert.deepEqual(
    parseResearchScanRequest("https://example.test/?mode=inventory&source_id=not-a-uuid"),
    { ok: false, error: "invalid_source_id" },
  );
  assert.deepEqual(
    parseResearchScanRequest("https://example.test/?source_id=00000000-0000-4000-8000-000000000001"),
    { ok: false, error: "source_id_requires_historical_mode" },
  );
});

test("engine output repair is explicit, targeted and historical-only", () => {
  const scan = parseResearchScanRequest(
    "https://example.test/?mode=inventory&repair=engine_output_v2&source_id=00000000-0000-4000-8000-000000000001,00000000-0000-4000-8000-000000000002",
  );
  assert.equal(scan.ok, true);
  assert.equal(scan.repair, "engine_output_v2");
  assert.deepEqual(scan.sourceIds, [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  ]);
});

test("truncated JSON repair is explicit and historical-only", () => {
  const scan = parseResearchScanRequest(
    "https://example.test/?mode=inventory&repair=truncated_json_v1&before=2026-10-21T02:08:21.889Z",
  );
  assert.equal(scan.ok, true);
  assert.equal(scan.mode, "inventory");
  assert.equal(scan.repair, "truncated_json_v1");
});

test("cursor advances inventory but drains each backfill window before advancing", () => {
  assert.deepEqual(buildResearchScanCursor({
    mode: "inventory", offset: 500, rawCount: 500, windowSize: 500, remainingPending: 70,
  }), { complete: false, offset: 1000, reason: "next_window" });
  assert.deepEqual(buildResearchScanCursor({
    mode: "backfill", offset: 500, rawCount: 500, windowSize: 500, remainingPending: 3,
  }), { complete: false, offset: 500, reason: "window_pending" });
  assert.deepEqual(buildResearchScanCursor({
    mode: "backfill", offset: 500, rawCount: 214, windowSize: 500, remainingPending: 0,
  }), { complete: true, offset: null, reason: "source_exhausted" });
});

test("fallback evidence truncation never splits a Unicode surrogate pair", () => {
  const source = `${"א".repeat(599)}😀suffix`;
  const truncated = truncateUnicode(source, 600);

  assert.equal(Array.from(truncated).length, 600);
  assert.equal(truncated.endsWith("😀"), true);
  assert.equal(JSON.parse(JSON.stringify({ evidence: truncated })).evidence, truncated);
  assert.equal(/[\uD800-\uDBFF]$/.test(truncated), false);
});

test("edge adapter exposes inventory before the processing loop", () => {
  const source = readFileSync("supabase/functions/wa-channel-research-intake/index.ts", "utf8");
  assert.match(source, /parseResearchScanRequest/);
  assert.match(source, /scan\.mode === "inventory"/);
  assert.match(source, /source_scope: "channel_updates"/);
  assert.match(source, /buildResearchScanCursor/);
  assert.match(source, /excluded_channels/);
  assert.match(source, /retry_engine_output_v2_ready/);
  assert.match(source, /extraction_profile: repair === "engine_output_v2"/);
  assert.ok(source.indexOf('scan.mode === "inventory"') < source.indexOf("for (const row of selected)"));
});
