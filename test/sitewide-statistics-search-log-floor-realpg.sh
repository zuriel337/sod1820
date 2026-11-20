#!/usr/bin/env bash
# #1462 release stage 1: run the REAL search-log-floor.standalone.psql and its rollback against an isolated
# PostgreSQL shaped like live (20.11.2026 policies, definer reader owned by postgres). No live URL or credentials.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
D=$ROOT/supabase/proposed/sitewide-statistics-20261120
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); chown "${PG_USER:-postgres}" "$TMP"; fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54395 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
"$PG_BIN/psql" -h "$TMP" -p 54395 -U postgres -qc 'create database review'
Q() { "$PG_BIN/psql" -h "$TMP" -p 54395 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
Q <<'SQL'
create role anon; create role authenticated; create role service_role;
create table public.search_log(id bigserial primary key, term text, value integer, created_at timestamptz default now());
insert into public.search_log(term,value) values ('a',1),('b',2);
alter table public.search_log enable row level security;
create policy "anyone read search" on public.search_log for select using (true);
create policy "anon insert search" on public.search_log for insert with check (true);
grant select, insert on public.search_log to anon, authenticated;
grant usage on sequence public.search_log_id_seq to anon, authenticated;
create function public.fn_name_research_stats(integer) returns bigint language sql security definer as 'select count(*) from public.search_log';
grant execute on function public.fn_name_research_stats(integer) to anon;
SQL
check "$(Q -c "set role anon; select count(*) from public.search_log")" 2 'before: a guest reads every raw search (the live leak)'
Q -f "$D/search-log-floor.standalone.psql" >/dev/null
check "$(Q -c "set role anon; select count(*) from public.search_log")" 0 'after: a guest reads no search'
if Q -c "set role anon; insert into public.search_log(term) values ('x')" >/dev/null 2>&1; then check inserted refused 'guest write'; else check refused refused 'after: a guest write is refused'; fi
check "$(Q -c "set role anon; select public.fn_name_research_stats(1)")" 2 'the SECURITY DEFINER server reader is unaffected'
check "$(Q -c "select count(*) from public.search_log")" 2 'history is kept (no row deleted, canary insert rolled back)'
if Q -f "$D/search-log-floor.standalone.psql" >/dev/null 2>&1; then check applied refused 'drift'; else check refused refused 'a second run stops at the policy-drift gate (nothing written)'; fi
Q -f "$D/search-log-floor.rollback.psql" >/dev/null
check "$(Q -c "select string_agg(polname,',' order by polname) from pg_policy where polrelid='public.search_log'::regclass")" 'anon insert search,anyone read search' 'rollback restores exactly the two live policies'
Q -c "create function public.bad_reader() returns bigint language sql as 'select count(*) from public.search_log'" >/dev/null
if Q -f "$D/search-log-floor.standalone.psql" >/dev/null 2>&1; then check applied refused 'invoker gate'; else check refused refused 'an invoker-rights reader of search_log stops the apply'; fi
echo "SEARCH LOG FLOOR REAL POSTGRES ${pass} checks PASS ($("$PG_BIN/postgres" --version); isolated)"
