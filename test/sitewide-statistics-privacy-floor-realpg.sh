#!/usr/bin/env bash
# #1461 privacy floor: run the REAL psql apply/rollback of privacy-floor/ against an isolated
# PostgreSQL. Bodies load with check_function_bodies=off (their tables are not recreated);
# the helper is stubbed. Proves: md5 preimage gate, exact patched bytes, revokes, exact rollback.
# No live URL or credentials. PG_BIN default /usr/lib/postgresql/16/bin; non-root owner when root.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
F=${SQL_DIR:-$ROOT/supabase/proposed/sitewide-statistics-20261120/privacy-floor}
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); chown "${PG_USER:-postgres}" "$TMP"; fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54393 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
"$PG_BIN/psql" -h "$TMP" -p 54393 -U postgres -qc 'create database review'
Q() { "$PG_BIN/psql" -h "$TMP" -p 54393 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
Q <<'SQL'
create role anon; create role authenticated; create role service_role;
create function public.gematria_public_word_eligible(uuid) returns boolean language sql as 'select true';
create function public.research_level_of(uuid) returns jsonb language sql security definer as 'select null::jsonb';
create function public.fn_cohort_acceptance(text) returns jsonb language sql security definer as 'select null::jsonb';
create function public.fn_metatron_gaps() returns jsonb language sql security definer as 'select null::jsonb';
-- live ACLs (20.11.2026) the grant-drift guard expects
revoke all on function public.research_level_of(uuid) from public;
grant execute on function public.research_level_of(uuid) to anon,authenticated;
grant execute on function public.fn_cohort_acceptance(text),public.fn_metatron_gaps() to public;
SQL
for b in "$F"/*.before.sql; do { echo "set check_function_bodies=off;"; cat "$b"; echo ";"; } | Q >/dev/null; done
n=$(ls "$F"/*.before.sql | wc -l)
md5s() { local ext=$1 c=0; for b in "$F"/*.before.sql; do local name; name=$(basename "$b" .before.sql)
  [ "$(Q -c "select md5(pg_get_functiondef(oid)) from pg_proc where proname='$name'")" = "$(md5sum < "$F/$name.$ext.sql" | cut -c1-32)" ] && c=$((c+1)); done; echo $c; }
check "$(md5s before)" "$n" "all $n live preimages load byte-exact (md5 gate input)"
runp() { { echo "set check_function_bodies=off;"; sed "s#\\\\ir #\\\\ir $F/#" "$F/$1"; } | Q >/dev/null; }
runp apply.psql
check "$(md5s after)" "$n" "apply.psql: every function equals its reviewed .after.sql"
check "$(Q -c "select bool_and(not has_function_privilege('anon',oid,'execute') and has_function_privilege('service_role',oid,'execute')) from pg_proc where proname in ('research_level_of','fn_cohort_acceptance','fn_metatron_gaps')")" t 'revoked readers are server-only'
runp rollback.psql
check "$(md5s before)" "$n" 'rollback.psql restores every exact preimage'
check "$(Q -c "select has_function_privilege('anon','research_level_of(uuid)','execute') and has_function_privilege('anon','fn_metatron_gaps()','execute')")" t 'rollback restores the previous grants'
Q -c "update pg_proc set prosrc=prosrc||' ' where proname='strongest_crossings'" >/dev/null
if runp apply.psql 2>/dev/null; then check applied refused 'drift guard'; else check refused refused 'a drifted preimage stops apply.psql (nothing overwritten)'; fi
echo "PRIVACY FLOOR REAL POSTGRES ${pass} checks PASS ($("$PG_BIN/postgres" --version); isolated, bodies not executed)"
