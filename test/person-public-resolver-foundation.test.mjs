import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(
  "supabase/migrations/20260925144500_g3_person_public_resolver_v1.sql",
  "utf8",
);
const executable = sql.replace(/^\s*--.*$/gm, "");
const reserved = fs.readFileSync(
  "supabase/migrations/20260925144400_g3_identity_reserved_namespace_hardening_v1.sql",
  "utf8",
).replace(/^\s*--.*$/gm, "");
const creatorIndex = fs.readFileSync(
  "supabase/migrations/20260925144300_g3_contribution_links_created_by_index_v1.sql",
  "utf8",
).replace(/^\s*--.*$/gm, "");

// Canonical Person root + existing person-ref namespace.
assert.match(sql, /from\s+public\.persons\s+p/i);
assert.match(sql, /'person:'\s*\|\|\s*e\.person_id::text\s*\|\|\s*':self'/i);

// Public eligibility is Account OR reviewed/public Contributor edge, never source identity alone.
assert.match(sql, /pr\.account_user_id\s+is\s+not\s+null\s+or\s+exists\s*\(select\s+1\s+from\s+public_contributors\)/is);
assert.match(sql, /ie\.legacy_id\s*=\s*'contributor:'\s*\|\|\s*c\.id::text/i);
assert.doesNotMatch(executable, /'historical:openweb:'\s*\|\|/i, "raw OpenWeb source IDs must never become public Person rows");
assert.match(sql, /ie\.legacy_id\s+like\s+'openweb_user:%'/i, "public identityCount may count reviewed historical aliases only");
assert.doesNotMatch(executable, /count\(\*\)\s+from\s+public\.identity_edges\s+ie\s+where\s+ie\.person_id=e\.person_id\s*\)/is, "device/login edge volume must not leak into public identityCount");

// Capability authority is explicit, not inferred from free-text role/senior level.
assert.match(sql, /u\.is_researcher/i);
assert.match(sql, /kind='researcher'/i);
assert.match(sql, /kind\s+in\s*\('writer','author'\)/i);
assert.doesNotMatch(executable, /senior_level/i);
assert.doesNotMatch(executable, /\bc\.role\b|\bu\.role\b/i);


// Reviewed historical identity must be enforced by trusted bridge provenance, not client-spoofable meta alone.
assert.match(executable, /ie\.confidence\s*=\s*100/i);
assert.match(executable, /ie\.meta->>'human_gate'[^\n]*=\s*'true'/i);
assert.match(executable, /ie\.meta->>'contract'\s*=\s*'admin_person_materialize_contributor_history_v1'/i);

// Public link_identity cannot mint the reserved server-owned historical namespaces.
assert.match(reserved, /lower\(btrim\(p_sod_id\)\)\s+like\s+'historical:%'/i);
assert.match(reserved, /lower\(btrim\(p_legacy_id\)\)\s+like\s+'contributor:%'/i);
assert.match(reserved, /lower\(btrim\(p_legacy_id\)\)\s+like\s+'openweb_user:%'/i);
assert.match(reserved, /return null/i);
assert.match(reserved, /hashtextextended\('person_account:'\s*\|\|\s*p_user_id::text,\s*1820\)/i);

// Existing canonical reputation path gets its missing creator lookup index without changing semantics.
assert.match(creatorIndex, /create\s+index\s+if\s+not\s+exists\s+contribution_links_created_by_idx/i);
assert.match(creatorIndex, /on\s+public\.contribution_links\(created_by\)/i);

// Private/locked/merged Contributor identities cannot qualify the public resolver.
assert.match(sql, /not\s+coalesce\(lc\.locked,false\)/i);
assert.match(sql, /coalesce\(lc\.kind,'community'\)\s*<>\s*'private'/i);
assert.match(sql, /merged_into/i);

// Public metrics consume only public contribution states.
assert.match(sql, /rc\.status\s+in\s*\('approved','published'\)/i);
assert.doesNotMatch(executable, /rc\.status\s+in\s*\([^)]*hidden/i);
assert.match(sql, /cl\.target_type\s*=\s*'openweb_message'/i);

// Raw contact/identity secrets are never projected.
assert.doesNotMatch(executable, /\bu\.email\b|\bc\.email\b|\bc\.phone\b|access_code/i);
assert.doesNotMatch(executable, /['"](?:account_user_id|contributor_id|source_id)['"]\s*,/i);

// Lifecycle is deliberately not invented while no governed lifecycle projection is live.
assert.match(sql, /'activityState',null/i);
assert.match(sql, /'whyNow','\[\]'::jsonb/i);
assert.doesNotMatch(executable, /person_state|person_daily/i);

// Research Standing reuses canonical researcher_reputation and only under researcher capability.
assert.match(sql, /public\.researcher_reputation\(e\.account_user_id\)/i);
assert.match(sql, /when\s+c\.researcher\s+and\s+s\.dossier\s+is\s+not\s+null/i);

// Directory is bounded/paginated and bulk-projects the selected Person page.
assert.match(sql, /people_public_rows_v1/i);
assert.match(sql, /least\(greatest\(coalesce\(p_limit,100\),1\),250\)/i);
assert.doesNotMatch(executable, /select\s+public\.person_public_profile_v1\(page\.person_id\)/i, "directory must not N+1 call the profile resolver");
assert.match(sql, /contrib_person as/i);
assert.match(sql, /group by cp\.person_id/i);

// Least-privilege public read: functions are explicit public projections, not table grants.
assert.match(sql, /revoke all on function public\.person_public_profile_v1\(uuid\) from public/i);
assert.match(sql, /grant execute on function public\.person_public_profile_v1\(uuid\) to anon, authenticated/i);
assert.match(sql, /revoke all on function public\.people_public_rows_v1\(integer,integer\) from public/i);
assert.match(sql, /grant execute on function public\.people_public_rows_v1\(integer,integer\) to anon, authenticated/i);

console.log("person public resolver foundation: PASS");
