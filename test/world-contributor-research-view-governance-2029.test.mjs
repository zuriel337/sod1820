import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261023050443_world_contributor_research_public_governance_filter_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

test("World view keeps invoker RLS and a distinct admin review path", () => {
  assert.match(
    migration,
    /CREATE OR REPLACE VIEW public\.world_contributor_research_v1\s+WITH \(security_invoker = true, security_barrier = true\)/i,
  );
  assert.match(migration, /current_user IN \('postgres', 'service_role'\)/i);
  assert.match(migration, /SELECT public\.rd_is_admin\(\)/i);
  assert.match(migration, /REVOKE ALL ON TABLE public\.world_contributor_research_v1 FROM PUBLIC/i);
  assert.match(migration, /GRANT SELECT ON TABLE public\.world_contributor_research_v1 TO anon, authenticated/i);
});

test("public World rows require public governance approval and a visible channel source", () => {
  assert.match(migration, /ro\.privacy_scope = 'public'/i);
  assert.match(migration, /ro\.status IN \('approved', 'canonical'\)/i);
  assert.match(migration, /personal_scope,scope.*<> 'person_only'/is);
  assert.match(migration, /NOT LIKE 'channel_updates:%'[\s\S]*OR cu\.id IS NOT NULL/i);
});

test("migration does not rewrite the global research publication contract", () => {
  assert.doesNotMatch(migration, /ALTER POLICY|CREATE POLICY|DROP POLICY/i);
  assert.doesNotMatch(migration, /UPDATE\s+public\.research_objects/i);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+public\.research_objects/i);
  assert.doesNotMatch(migration, /ALTER TABLE\s+public\.research_objects/i);
});
