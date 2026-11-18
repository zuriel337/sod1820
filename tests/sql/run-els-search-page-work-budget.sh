#!/usr/bin/env bash
# ELS ordered page SQL gate (18.11.2026): the canonical letter streams (checked against the md5 of the live streams) -> the reviewed live
# definitions from the repository (each checked against the md5 of the live function) -> the rollback refuses to run first -> the migration
# -> it refuses to run twice -> every occurrence of 19 ranges, in order, against the unchanged generator, plus the one-call answers against
# the reviewed body -> the rollback puts back the exact previous body. Local Postgres only (PGHOST/PGUSER/PGDATABASE from the environment,
# or PSQL=...); nothing reaches a shared database.
set -euo pipefail
PSQL=${PSQL:-psql}
run() { $PSQL -v ON_ERROR_STOP=1 -q "$@"; }
cd "$(dirname "$0")/../.."
BASE=supabase/migrations/20260930083354_g3_els_tanakh_canonical_stream_build_v1.sql
MIGRATION=supabase/migrations/20261118090000_els_search_page_work_budget_v1.sql
ROLLBACK=supabase/proposed/ROLLBACK_20261118090000_els_search_page_work_budget_v1.sql
PAGE='public.els_search_page_core_v1(text,text,integer,integer,integer,integer,integer,integer,text)'
# One CREATE OR REPLACE FUNCTION statement of the base migration, exactly as written (either dollar tag), optionally under another name.
fn() { node -e '
const sql = require("fs").readFileSync(process.argv[1], "utf8"), name = process.argv[2], as = process.argv[3] || name;
const start = sql.toLowerCase().lastIndexOf("create or replace function public." + name + "(");
if (start < 0) throw new Error(name + " not found");
const tag = /\bas\s+(\$[a-z_]*\$)/i.exec(sql.slice(start)); if (!tag) throw new Error(name + ": no body");
const open = sql.indexOf(tag[1], start), close = sql.indexOf(tag[1], open + tag[1].length), end = sql.indexOf(";", close) + 1;
if (close < 0 || end <= 0) throw new Error(name + ": unterminated body");
process.stdout.write(sql.slice(start, end).replace("public." + name + "(", "public." + as + "(") + "\n");
' "$BASE" "$@"; }
md5fn() { $PSQL -At -c "select md5(pg_get_functiondef('$1'::regprocedure))"; }
same() { test "$2" = "$3" || { echo "FAIL: $1 is $2, expected $3" >&2; exit 1; }; }

run -f tests/sql/els_search_page_fixture.sql
node -e '
const text = require("fs").readFileSync("tools/els/data/tk-letters.txt", "utf8").trim(); let out = [];
let i = 0; for (const ch of text) { out.push(++i + "," + ch); if (out.length === 50000) { process.stdout.write(out.join("\n") + "\n"); out = []; } }
if (out.length) process.stdout.write(out.join("\n") + "\n");
' | run -c "\copy public.tanakh_stream(idx,ch) from stdin with (format csv)"
run -c "insert into public.torah_stream(idx,ch) select idx,ch from public.tanakh_stream where idx <= 304805 order by idx" -c "vacuum analyze public.tanakh_stream" -c "vacuum analyze public.torah_stream"
same "the Tanakh stream" "$($PSQL -At -c "select md5(string_agg(ch,'' order by idx)) from public.tanakh_stream")" baf161858c0b4dc57b5b96990bea18db
same "the Torah stream" "$($PSQL -At -c "select md5(string_agg(ch,'' order by idx)) from public.torah_stream")" 0066c2431821863d258745e664d3883e
for name in els_stream_relation_v1 els_stream_letters_v1 els_occurrences_internal_v1 els_search_page_core_v1; do fn "$name" | run; done
run -c "revoke all on function $PAGE from public, anon, authenticated" -c "grant execute on function $PAGE to service_role"
same fn_els_corpus_id "$(md5fn 'public.fn_els_corpus_id(text)')" a2f65675b7899b97d7876df021bf52aa
same els_stream_relation_v1 "$(md5fn 'public.els_stream_relation_v1(text)')" ed77988ddbc714eb614d51ebc5c4a89a
same els_stream_letters_v1 "$(md5fn 'public.els_stream_letters_v1(text)')" 0f0757cb643f12f3b0aa20a610d7ca73
same els_occurrences_internal_v1 "$(md5fn 'public.els_occurrences_internal_v1(text,text,integer,integer,integer,integer)')" a3e10908365f5fb3473aaba3de363163
same "els_search_page_core_v1 (reviewed)" "$(md5fn "$PAGE")" 385d18edf84b4b7bc7f9c445aec981b4
acl=$($PSQL -At -c "select proacl::text from pg_proc where oid = '$PAGE'::regprocedure")

if run -f "$ROLLBACK" 2>/dev/null; then echo "FAIL: the rollback ran before the migration" >&2; exit 1; fi
run -f "$MIGRATION"
if run -f "$MIGRATION" 2>/dev/null; then echo "FAIL: the migration ran twice" >&2; exit 1; fi
same "els_search_page_core_v1 (work budget)" "$(md5fn "$PAGE")" d791426fb9837e464732ece3e1c08121
same "the privileges after the migration" "$($PSQL -At -c "select proacl::text from pg_proc where oid = '$PAGE'::regprocedure")" "$acl"
fn els_search_page_core_v1 els_search_page_core_reviewed | run
$PSQL -v ON_ERROR_STOP=1 -f tests/sql/els_search_page_work_budget_v1.sql 2>&1 | tee /tmp/els-search-page-work-budget.out | grep -E "NOTICE|PASS|ERROR" || true
grep -q "els_search_page_work_budget_v1: PASS" /tmp/els-search-page-work-budget.out || { echo "FAIL: the page assertions did not pass" >&2; exit 1; }
test "$(grep -c "occurrences equal to the generator" /tmp/els-search-page-work-budget.out)" = 19 || { echo "FAIL: not all 19 ranges ran" >&2; exit 1; }

run -f "$ROLLBACK"
same "els_search_page_core_v1 after the rollback" "$(md5fn "$PAGE")" 385d18edf84b4b7bc7f9c445aec981b4
same "the privileges after the rollback" "$($PSQL -At -c "select proacl::text from pg_proc where oid = '$PAGE'::regprocedure")" "$acl"
if run -f "$ROLLBACK" 2>/dev/null; then echo "FAIL: the rollback ran twice" >&2; exit 1; fi
echo "ELS ordered page SQL gate: PASS (canonical streams, reviewed definitions, applied, 19 ranges equal to the generator, rolled back to the exact previous body)"
