import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("WhatsApp trusted-author routing extends canonical source registry", () => {
  const ingest = readFileSync(new URL("../supabase/functions/wa-channel-ingest/index.ts", import.meta.url), "utf8");
  const intake = readFileSync(new URL("../supabase/functions/wa-channel-research-intake/index.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../supabase/migrations/20261004023000_wa_trusted_author_tree_routing_v1.sql", import.meta.url), "utf8");

  assert.match(migration, /add column if not exists intake_mode/);
  assert.match(migration, /add column if not exists outgoing_contributor/);
  assert.match(migration, /ki-la-hamelucha-gematria/);

  assert.match(ingest, /outgoingContributor/);
  assert.match(ingest, /outgoing_contributor/);

  assert.match(intake, /channel_ingest_sources/);
  assert.match(intake, /trustedContributor/);
  assert.match(intake, /intake_mode/);
  assert.doesNotMatch(intake, /const CHANNELS =/);
  assert.doesNotMatch(intake, /const HEAVY_CHANNELS =/);
});
