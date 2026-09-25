import assert from "node:assert/strict";
import fs from "node:fs";

const race = fs.readFileSync(
  "supabase/migrations/20260925130000_g3_resolve_person_race_stop_v1.sql",
  "utf8",
);
const bridge = fs.readFileSync(
  "supabase/migrations/20260925131500_g3_historical_contributor_person_bridge_v1.sql",
  "utf8",
);

// Race stopper: same signature/owner path, transaction-scoped serialization,
// and no attempt to reconcile historical duplicate Persons.
assert.match(race, /create or replace function public\.resolve_person\s*\(/i);
assert.match(race, /security definer/i);
assert.match(race, /pg_advisory_xact_lock/i);
assert.match(race, /hashtextextended\('resolve_person:'\s*\|\|\s*p_sod_id,\s*1820\)/i);
assert.match(race, /order by first_seen, person_id/i);
assert.doesNotMatch(race, /delete\s+from\s+public\.persons/i);
assert.doesNotMatch(race, /update\s+public\.identity_edges\s+set\s+person_id/i);

// Historical bridge stays on the existing Person spine and never invokes the
// anonymous/device resolver internally.
assert.match(bridge, /admin_person_materialize_contributor_history_v1/i);
assert.match(bridge, /security definer/i);
assert.match(bridge, /public\.rd_is_admin\(\)/i);
assert.doesNotMatch(bridge, /perform\s+(?:public\.)?link_identity\s*\(/i);
assert.doesNotMatch(bridge, /perform\s+(?:public\.)?resolve_person\s*\(/i);
assert.doesNotMatch(bridge, /select\s+(?:public\.)?resolve_person\s*\(/i);
assert.doesNotMatch(bridge, /create\s+table/i);

// No name/email identity inference. Source IDs are derived from already-attributed
// contributions and canonical contribution_links only.
assert.match(bridge, /rc\.author_contributor_id\s*=\s*p_contributor_id/i);
assert.match(bridge, /v_contribution_count\s*<\s*1/i);
assert.match(bridge, /no currently-attributed contributions/i);
assert.match(bridge, /cl\.target_type\s*=\s*'openweb_user'/i);
assert.match(bridge, /cl\.target_type\s*=\s*'openweb_message'/i);
assert.match(bridge, /clu\.target_type\s*=\s*'openweb_user'/i);
assert.match(bridge, /clm\.target_type\s*=\s*'openweb_message'/i);
assert.match(bridge, /s\.user_id\s*=\s*v_source_id/i);
assert.doesNotMatch(bridge, /\bc\.email\b|\bs\.email\b|\bu\.email\b/i);
assert.doesNotMatch(bridge, /display_name\s*=|lower\([^)]*display_name/i);

// Canonical namespaces reuse legacy_seed without inventing another edge kind.
assert.match(bridge, /'historical:contributor:'/i);
assert.match(bridge, /'contributor:'/i);
assert.match(bridge, /'historical:openweb:'/i);
assert.match(bridge, /'openweb_user:'/i);
assert.match(bridge, /'legacy_seed'/i);
assert.doesNotMatch(bridge, /kind\s*=\s*'openweb'|kind\s*=\s*'contributor'/i);

// Account-linked Contributor does not let this RPC mint a second account Person.
assert.match(bridge, /v_account_person_count\s*<>\s*1/i);
assert.match(bridge, /requires exactly one existing account Person/i);
assert.doesNotMatch(bridge, /min\s*\(\s*(?:\w+\.)?person_id\s*\)/i, "PostgreSQL live has no min(uuid) aggregate");
assert.match(bridge, /order by p\.created_at, p\.person_id/i);

// Unclaimed historical materialization is serialized per Contributor.
assert.match(bridge, /pg_advisory_xact_lock/i);
assert.match(bridge, /person_contributor:/i);

// Cross-Person ownership conflicts abort; no silent move/merge or merged_into mutation.
assert.match(bridge, /already belongs to another Person/i);
assert.doesNotMatch(bridge, /update\s+public\.contributors/i);
assert.doesNotMatch(bridge, /set\s+merged_into/i);
assert.doesNotMatch(bridge, /update\s+public\.identity_edges\s+set\s+person_id/i);

// Least privilege and explicit Human-Gate provenance.
assert.match(bridge, /revoke all on function public\.admin_person_materialize_contributor_history_v1\(uuid,text\)\s+from public, anon/i);
assert.match(bridge, /grant execute on function public\.admin_person_materialize_contributor_history_v1\(uuid,text\)\s+to authenticated/i);
assert.match(bridge, /decision_ledger/i);
assert.match(bridge, /'human_gate',\s*true/i);
assert.match(bridge, /'person_foundation_contract_law',\s*6/i);

// Public/source history remains untouched.
assert.doesNotMatch(bridge, /delete\s+from\s+public\.research_contributions/i);
assert.doesNotMatch(bridge, /delete\s+from\s+public\.contribution_links/i);
assert.doesNotMatch(bridge, /delete\s+from\s+public\.g3_openweb_import_stage/i);

console.log("person identity bridge foundation: PASS");
