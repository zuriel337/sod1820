#!/usr/bin/env bash
# Private search wall (ZURIEL 21.11.2026) on an isolated REAL PostgreSQL with the live search_log policies (permissive legacy
# + restrictive #1462 floor). Proves: clients still cannot read or insert search_log directly; the writer validates and
# stores term/value/source only; the reader refuses non-admins and returns rows to admins; rollback keeps the data.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
D=$ROOT/supabase/proposed/search-wall-20261121
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); chown "${PG_USER:-postgres}" "$TMP"; fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54398 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
"$PG_BIN/psql" -h "$TMP" -p 54398 -U postgres -qc 'create database review'
Q() { "$PG_BIN/psql" -h "$TMP" -p 54398 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
Q -c "create role anon; create role authenticated;
create table public.search_log(id bigserial primary key, term text, value integer, created_at timestamptz default now());
grant select, insert on public.search_log to anon, authenticated; grant usage on sequence search_log_id_seq to anon, authenticated;
alter table public.search_log enable row level security;
create policy \"anon insert search\" on public.search_log for insert to anon, authenticated with check (true);
create policy \"anyone read search\" on public.search_log for select to anon, authenticated using (true);
create policy ti_search_history_server_only on public.search_log as restrictive for select to anon, authenticated using (false);
create policy ti_search_no_new_raw on public.search_log as restrictive for insert to anon, authenticated with check (false);
create function public.rd_is_admin() returns boolean language sql stable as \$\$ select coalesce(current_setting('test.admin', true), '') = 'yes' \$\$;
insert into public.search_log(term, value) values ('ישן', 356);" >/dev/null
Q -f "$D/search_wall.after.sql" >/dev/null
check "$(Q -c "set role anon; select count(*) from public.search_log")" 0 'anon still cannot read search_log directly'
check "$(Q -c "set role anon; insert into public.search_log(term) values ('x')" 2>&1 | grep -c 'row-level security')" 1 'anon still cannot insert directly'
Q -c "set role anon; select public.log_search_2029('  שלום   עולם ', 762, 'gematria'); select public.log_search_2029('אבג', null, 'els'); select public.log_search_2029('', 1, 'gematria'); select public.log_search_2029('!!!', 1, 'site'); select public.log_search_2029('x', 1, 'evil'); select public.log_search_2029(repeat('א',121), 1, 'site'); select public.log_search_2029('דוד', 99999999, 'site');" >/dev/null
check "$(Q -c "select string_agg(term||'|'||coalesce(value::text,'-')||'|'||source, ';' order by id) from public.search_log where source is not null")" 'שלום עולם|762|gematria;אבג|-|els;דוד|-|site' 'writer stores trimmed term, valid value and source; rejects empty, symbol-only, long and unknown source'
check "$(Q -c "select count(*) from information_schema.columns where table_name='search_log'")" 5 'only term, value, source and time are stored (no identity column)'
check "$(Q -c "set role authenticated; select public.admin_search_wall_2029()" 2>&1 | grep -c 'admin only')" 1 'a non-admin gets an error, never rows'
check "$(Q -c "set test.admin='yes'; set role authenticated; select jsonb_array_length(public.admin_search_wall_2029()->'recent')")" 4 'an admin reads the wall (old rows included)'
check "$(Q -c "set test.admin='yes'; set role authenticated; select public.admin_search_wall_2029(50,'els')->'recent'->0->>'term'")" 'אבג' 'source filter'
check "$(Q -c "set test.admin='yes'; set role authenticated; select (public.admin_search_wall_2029(50,null,'עולם')->'recent'->0->>'term') || '|' || jsonb_array_length(public.admin_search_wall_2029(50,null,'עולם')->'recent')")" 'שלום עולם|1' 'text filter'
check "$(Q -c "set test.admin='yes'; set role authenticated; select public.admin_search_wall_2029(50,null,'%')->'recent'")" '[]' 'a % in the filter is literal, not a wildcard'
check "$(Q -c "select has_function_privilege('anon','public.admin_search_wall_2029(integer,text,text,timestamptz)','execute')")" f 'anon cannot even call the reader'
Q -f "$D/rollback.sql" >/dev/null
check "$(Q -c "select count(*) from pg_proc where proname in ('log_search_2029','admin_search_wall_2029')")|$(Q -c "select count(*) from public.search_log")" '0|4' 'rollback removes both functions and deletes no row'
echo "SEARCH WALL REAL POSTGRES ${pass} checks PASS ($("$PG_BIN/postgres" --version); isolated)"
