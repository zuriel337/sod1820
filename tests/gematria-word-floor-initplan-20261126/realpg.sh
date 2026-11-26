#!/usr/bin/env bash
# Acceptance of supabase/proposed/20261126120000_gematria_word_floor_initplan_{PROPOSAL,ROLLBACK}.sql on an isolated local PostgreSQL.
# The fixture mirrors the live policies and function bodies read on 26.11.2026 (md5 checked first). No live URL or credentials.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
HERE="$ROOT/tests/gematria-word-floor-initplan-20261126"
PROPOSAL="$ROOT/supabase/proposed/20261126120000_gematria_word_floor_initplan_PROPOSAL.sql"
ROLLBACK="$ROOT/supabase/proposed/20261126120000_gematria_word_floor_initplan_ROLLBACK.sql"
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54394 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
Q() { "$PG_BIN/psql" -h "$TMP" -p 54394 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
"$PG_BIN/psql" -h "$TMP" -p 54394 -U postgres -qc 'create database review'
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
# md5 of visible ids and count as a given role/subject, under whatever policy is installed
vis() { Q -c "begin; set local role $1; select set_config('request.jwt.claim.sub','$2',true); select count(*)||':'||coalesce(md5(string_agg(id::text,',' order by id)),'') from public.gematria_words; rollback;" | grep -v '^$' | tail -1; }
ANON=""; MEM=00000000-0000-0000-0000-0000000000b1; ADM=00000000-0000-0000-0000-0000000000a1
snapshot() { echo "$(vis anon "$ANON") $(vis authenticated "$MEM") $(vis authenticated "$ADM") $(vis authenticated '')"; }

Q -f "$HERE/fixture.sql"
check "$(Q -c "select md5(pg_get_functiondef('public.gematria_public_word_eligible(uuid)'::regprocedure))")" 37daef8c3d317d509cdfd1afad87d12f "fixture eligible() is byte-identical to live"
check "$(Q -c "select md5(pg_get_functiondef('public.rd_is_admin()'::regprocedure))")" 3005d3f9ef5e4e58203452a42899fc9c "fixture rd_is_admin() is byte-identical to live"
BEFORE=$(snapshot)
check "$(echo "$BEFORE" | awk '{print ($1!=$3)}')" 1 "anon and admin see different sets (the grid is meaningful)"
POLSIG_BEFORE=$(Q -c "select polcmd::text||polpermissive::text||array_to_string(polroles::oid[]::regrole[],',') from pg_policy where polname='ti_public_word_floor'")

Q -f "$PROPOSAL"
AFTER=$(snapshot)
check "$AFTER" "$BEFORE" "visible rows identical for anon, member, admin, authenticated-without-subject (md5 over every grid row)"
check "$(Q -c "select polcmd::text||polpermissive::text||array_to_string(polroles::oid[]::regrole[],',') from pg_policy where polname='ti_public_word_floor'")" "$POLSIG_BEFORE" "policy stays RESTRICTIVE, SELECT, anon+authenticated"
check "$(Q -c "select count(*) from pg_policy where polrelid='public.gematria_words'::regclass")" 4 "no policy added or dropped"
check "$(Q -c "select position('( SELECT rd_is_admin() AS rd_is_admin)' in pg_get_expr(polqual,polrelid))>0 from pg_policy where polname='ti_public_word_floor'")" t "admin check is an InitPlan (once per statement)"
check "$(Q -c "select (select count(*) from pg_proc where proname in ('rd_is_admin','gematria_public_word_eligible') and md5(pg_get_functiondef(oid)) in ('37daef8c3d317d509cdfd1afad87d12f','3005d3f9ef5e4e58203452a42899fc9c'))")" 2 "function bodies untouched"
check "$(Q -c "select has_table_privilege('anon','public.gematria_blocklist','select')::text||has_table_privilege('authenticated','public.gematria_blocklist','select')")" falsefalse "anon/authenticated still cannot read the blocklist"
check "$(Q -c "select count(*) from pg_proc where proname like 'gematria%' and pronamespace='public'::regnamespace")" 1 "no new function (no new oracle over blocklist text)"
# double apply and drift are refused
if Q -f "$PROPOSAL" >/dev/null 2>&1; then echo "FAIL double apply was not refused"; exit 1; else pass=$((pass+1)); echo "PASS second apply refused (policy no longer the expected text)"; fi

Q -f "$ROLLBACK"
check "$(snapshot)" "$BEFORE" "after rollback the visible rows are identical again"
check "$(Q -c "select pg_get_expr(polqual,polrelid) from pg_policy where polname='ti_public_word_floor'")" "(rd_is_admin() OR gematria_public_word_eligible(id))" "rollback restores the exact old expression"
Q -c "alter policy ti_public_word_floor on public.gematria_words using (true)"
if Q -f "$PROPOSAL" >/dev/null 2>&1; then echo "FAIL drifted policy was not refused"; exit 1; else pass=$((pass+1)); echo "PASS drifted policy is refused"; fi
Q -c "alter policy ti_public_word_floor on public.gematria_words using (rd_is_admin() OR gematria_public_word_eligible(id))"

# Cost: same statement under the old and the new policy, as anon, on a larger table (buffers are the stable meter)
Q -c "insert into public.gematria_words(phrase, ragil, is_verified, is_published, is_encrypted, visibility_tier) select 'w'||g, 100+g%900, true, true, false, 0 from generate_series(1,40000) g; analyze public.gematria_words"
cost() { Q -c "begin; set local role anon; select set_config('request.jwt.claim.sub','',true); explain (analyze, buffers, timing off, costs off) select count(*) from public.gematria_words where ragil >= 10 and is_verified; rollback;" | awk '/Buffers: shared/ {gsub(/[^0-9 ]/,""); print $NF; exit}'; }
OLDB=$(cost); Q -f "$PROPOSAL"; NEWB=$(cost)
echo "INFO buffers old=$OLDB new=$NEWB"
check "$([ "$NEWB" -le "$OLDB" ] && echo ok)" ok "new policy never reads more buffers than the old"
Q -f "$ROLLBACK"
echo "ALL $pass PASS"
