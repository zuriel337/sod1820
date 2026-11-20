#!/usr/bin/env bash
# /stats stage: run the REAL apply.psql/rollback.psql of statistics-sections-20261121 against an isolated PostgreSQL.
# The producer body loads with check_function_bodies=off (its tables are not recreated). Proves: md5 preimage gate,
# grants unchanged (producer server-only, wrapper public), exact rollback, drift refusal. No live URL or credentials.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
D=$ROOT/supabase/proposed/statistics-sections-20261121
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); chown "${PG_USER:-postgres}" "$TMP"; fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54397 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
"$PG_BIN/psql" -h "$TMP" -p 54397 -U postgres -qc 'create database review'
Q() { "$PG_BIN/psql" -h "$TMP" -p 54397 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
Q -c "create role anon; create role authenticated; create role service_role; create table public.crawl_daily(day date); create table public.research_contributions(id int);"
{ echo "set check_function_bodies=off;"; cat "$D/fn_ti_activity_pulse2029.before.sql"; echo ";"; echo "revoke all on function public.fn_ti_activity_pulse2029(integer) from public,anon,authenticated;"
  echo "create function public.research_pulse_2029(p_hours integer default 24) returns jsonb language sql security definer as 'select public.fn_ti_activity_pulse2029(p_hours)';"
  echo "revoke all on function public.research_pulse_2029(integer) from public; grant execute on function public.research_pulse_2029(integer) to anon,authenticated;"; } | Q >/dev/null
check "$(Q -c "select md5(pg_get_functiondef('public.fn_ti_activity_pulse2029(integer)'::regprocedure))")" 478b49a442419f2fd5528fa480f835cb 'the live preimage loads byte-exact'
runp() { { echo "set check_function_bodies=off;"; sed "s#\\\\ir #\\\\ir $D/#" "$D/$1"; } | Q >/dev/null; }
runp apply.psql
check "$(Q -c "select pg_get_functiondef('public.fn_ti_activity_pulse2029(integer)'::regprocedure) like '%ti_activity_pulse2029:v2:%'")" t 'apply installs the v2 producer'
check "$(Q -c "select not has_function_privilege('anon','public.fn_ti_activity_pulse2029(integer)','execute') and has_function_privilege('anon','public.research_pulse_2029(integer)','execute')")" t 'grants unchanged: producer server-only, wrapper public'
if runp apply.psql 2>/dev/null; then check applied refused 'drift'; else check refused refused 'a second apply stops at the md5 preimage gate'; fi
runp rollback.psql
check "$(Q -c "select md5(pg_get_functiondef('public.fn_ti_activity_pulse2029(integer)'::regprocedure))")" 478b49a442419f2fd5528fa480f835cb 'rollback restores the exact preimage'
echo "STATISTICS SECTIONS REAL POSTGRES ${pass} checks PASS ($("$PG_BIN/postgres" --version); isolated)"
