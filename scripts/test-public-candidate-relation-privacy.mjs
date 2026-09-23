import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260923213000_public_candidate_relation_reader_privacy_hardening_v1.sql",
  "utf8",
);

const fnStart = migration.indexOf(
  "CREATE OR REPLACE FUNCTION public.fn_relation_independent_evidence",
);
assert.ok(fnStart >= 0, "hardening migration must redefine fn_relation_independent_evidence");
const fnEnd = migration.indexOf("$function$;", fnStart);
assert.ok(fnEnd > fnStart, "function body must be terminated");
const fnBody = migration.slice(fnStart, fnEnd);

assert.equal(fnBody.includes("SECURITY DEFINER"), false);
assert.equal(/from\s+research_objects/i.test(fnBody), false);
assert.ok(fnBody.includes("'research_objects', '[]'::jsonb"));
for (const needle of ["FROM edges e", "FROM topic_cards_public tc"]) assert.ok(fnBody.includes(needle));
assert.equal(/from\s+topic_cards\s+tc/i.test(fnBody), false);

for (const needle of ["ALTER TABLE public.research_objects", "GRANT", "REVOKE"]) {
  assert.equal(migration.includes(needle), false);
}
for (const needle of ["CREATE TABLE", "ADD COLUMN", "fn_relation_independent_evidence_v2", "fn_relation_independent_evidence_public"]) {
  assert.equal(migration.includes(needle), false);
}
console.log("PASS: public candidate relation reader privacy hardening migration is fail-closed and scope-isolated.");
