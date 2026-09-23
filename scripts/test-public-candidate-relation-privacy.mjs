import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// PUBLIC_CANDIDATE_RELATION_READER_PRIVACY_HARDENING_V1
// Focused, offline check that the public/anon-reachable relation reader
// (fn_relation_independent_evidence, called from fn_relation_candidate) can
// never surface research_objects content again, that the SECURITY DEFINER
// privilege escalation this depended on has been dropped, and that topic_cards
// evidence is read through the anon-readable topic_cards_public view rather
// than the base topic_cards table (which anon cannot select).

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

assert.equal(
  fnBody.includes("SECURITY DEFINER"),
  false,
  "public relation reader must revert to SECURITY INVOKER — no privilege escalation once research_objects is not read here",
);

assert.equal(
  /from\s+research_objects/i.test(fnBody),
  false,
  "public relation reader must not query research_objects at all",
);

assert.ok(
  fnBody.includes("'research_objects', '[]'::jsonb"),
  "public relation reader must always return an empty research_objects array (fail closed, shape-compatible with fn_relation_candidate)",
);

for (const needle of ["FROM edges e", "FROM topic_cards_public tc"]) {
  assert.ok(fnBody.includes(needle), `non-research relation evidence must be preserved: ${needle}`);
}

assert.equal(
  /from\s+topic_cards\s+tc/i.test(fnBody),
  false,
  "public relation reader must not read the base topic_cards table directly — anon has no SELECT grant on it, only on topic_cards_public",
);

// research_objects schema/grants/status semantics must not be touched by this migration.
for (const needle of ["ALTER TABLE public.research_objects", "GRANT", "REVOKE"]) {
  assert.equal(
    migration.includes(needle),
    false,
    `hardening fix must not touch research_objects schema/grants (found: ${needle})`,
  );
}

// no second/parallel relation reader, table, registry or publication column invented.
for (const needle of [
  "CREATE TABLE",
  "ADD COLUMN",
  "fn_relation_independent_evidence_v2",
  "fn_relation_independent_evidence_public",
]) {
  assert.equal(
    migration.includes(needle),
    false,
    `must not invent a new table/column/parallel reader (found: ${needle})`,
  );
}

console.log("PASS: public candidate relation reader privacy hardening migration is fail-closed and scope-isolated.");
