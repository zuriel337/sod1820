import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isTrustedAuthor } from "../supabase/functions/_shared/waWriterIdentity.js";

test("WhatsApp trusted-author routing extends canonical source registry", () => {
  const ingest = readFileSync(new URL("../supabase/functions/wa-channel-ingest/index.ts", import.meta.url), "utf8");
  const intake = readFileSync(new URL("../supabase/functions/wa-channel-research-intake/index.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../supabase/migrations/20261004023000_wa_trusted_author_tree_routing_v1.sql", import.meta.url), "utf8");

  assert.match(migration, /add column if not exists intake_mode/);
  assert.match(migration, /add column if not exists outgoing_contributor/);
  assert.match(migration, /ki-la-hamelucha-gematria/);

  assert.match(ingest, /outgoingContributor/);
  assert.match(ingest, /outgoing_contributor/);
  assert.match(ingest, /loadHistory/);
  assert.match(ingest, /attempt <= 3/);

  assert.match(intake, /channel_ingest_sources/);
  assert.match(intake, /trustedContributor/);
  // The admin-only / trusted-author decision moved out of the intake into the shared writer-identity
  // helper (31fa7b735, ZVI_STABLE_WRITER_BINDING_V1, 4.10). The intake must keep reading the registry's
  // admin columns and hand the channel policy to that helper; the helper keeps the exact admin-only guard.
  const writerIdentity = readFileSync(new URL("../supabase/functions/_shared/waWriterIdentity.js", import.meta.url), "utf8");
  assert.match(intake, /import \{ isTrustedAuthor \} from "\.\.\/_shared\/waWriterIdentity\.js"/);
  assert.match(intake, /\.select\("channel,intake_mode,outgoing_contributor,priority,enabled,admin_only,admin_ids"\)/);
  assert.match(intake, /isTrustedAuthor\(/);
  assert.match(intake, /\{ trustedContributorIds, vips: vipRows \|\| \[\], policy \}/);
  assert.match(writerIdentity, /policy\?\.admin_only === true/);
  assert.match(intake, /intake_mode/);
  assert.doesNotMatch(intake, /const CHANNELS =/);
  assert.doesNotMatch(intake, /const HEAVY_CHANNELS =/);
});


test("WhatsApp intake matches existing tree without creating a parallel tree", () => {
  const intake = readFileSync(new URL("../supabase/functions/wa-channel-research-intake/index.ts", import.meta.url), "utf8");
  assert.match(intake, /findExistingTreeTargets/);
  assert.match(intake, /matched_existing_tree/);
  assert.match(intake, /candidate_unmatched/);
  assert.match(intake, /topic_cards_public/);
  assert.match(intake, /tree_matches/);
});

test("trusted-author decision follows the channel registry policy", () => {
  const ctx = (policy) => ({ trustedContributorIds: new Set(), vips: [], policy });
  // An admin-only channel with admin ids is trusted regardless of the credit line.
  assert.equal(isTrustedAuthor({ contributorId: null, credit: "" }, ctx({ admin_only: true, admin_ids: ["972500000000"] })), true);
  // admin_only without admin ids, or admin ids without admin_only, grants nothing.
  assert.equal(isTrustedAuthor({ contributorId: null, credit: "" }, ctx({ admin_only: true, admin_ids: [] })), false);
  assert.equal(isTrustedAuthor({ contributorId: null, credit: "" }, ctx({ admin_only: false, admin_ids: ["972500000000"] })), false);
  // The channel's configured outgoing contributor is trusted only by an exact credit match.
  assert.equal(isTrustedAuthor({ contributorId: null, credit: "Gematria Guide" }, ctx({ outgoing_contributor: "Gematria Guide" })), true);
  assert.equal(isTrustedAuthor({ contributorId: null, credit: "Someone Else" }, ctx({ outgoing_contributor: "Gematria Guide" })), false);
  assert.equal(isTrustedAuthor({ contributorId: null, credit: "Gematria Guide Fan" }, ctx({ outgoing_contributor: "Gematria Guide" })), false);
  // A stable contributor id wins; an unknown author on an unconfigured channel is never trusted.
  assert.equal(isTrustedAuthor({ contributorId: "c1", credit: "" }, { trustedContributorIds: new Set(["c1"]), vips: [], policy: null }), true);
  assert.equal(isTrustedAuthor({ contributorId: "c2", credit: "Stranger" }, ctx(null)), false);
});
