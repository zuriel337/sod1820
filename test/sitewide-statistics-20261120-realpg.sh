#!/usr/bin/env bash
# #1461 acceptance review: run the REAL psql wrappers (apply/rollback) against an
# isolated local PostgreSQL whose public.events is partitioned with no unique key,
# exactly like live (20.11.2026). No live URL or credentials are read or accepted.
# Needs PostgreSQL binaries (PG_BIN, default /usr/lib/postgresql/16/bin) and a
# non-root user to own the cluster (PG_USER, default postgres when run as root).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=${SQL_DIR:-$ROOT/supabase/proposed/sitewide-statistics-20261120}
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54391 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
Q() { "$PG_BIN/psql" -h "$TMP" -p 54391 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
"$PG_BIN/psql" -h "$TMP" -p 54391 -U postgres -qc 'create database review'
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
sed -E 's/^create table public\.events\((.*)\);$/create table public.events(\1) partition by range(ts);/' "$ROOT/tests/measurement-identity-20261115/fixture.sql" | Q
Q <<'SQL'
create table public.events_old partition of public.events for values from ('2000-01-01') to ('2026-11-01');
create table public.events_cur partition of public.events for values from ('2026-11-01') to ('2100-01-01');
create index on public.events(surface,event_type,ts);
create role service_role;
create table gematria_words(id uuid primary key default gen_random_uuid(),phrase text,ragil integer,is_verified boolean,is_published boolean,is_encrypted boolean,visibility_tier integer,lead_rank integer);
create table gematria_wall(phrase text unique,private boolean,last_at timestamptz,hits integer,ragil integer);
create table gematria_blocklist(pattern text);
create table search_log(id bigint,term text,value integer,created_at timestamptz);
create table visitor_events(id bigint,section text);
alter table visitor_events enable row level security;
create policy old_visitor_write on visitor_events for insert with check(true);
grant insert on visitor_events to anon,authenticated;
create table analytics_cache(cache_key text primary key,payload jsonb,computed_at timestamptz,cache_kind text,producer text,producer_version text,input_identity text,expires_at timestamptz,invalidated_at timestamptz,billable_state text,hit_count bigint default 0,last_hit_at timestamptz);
create table auth.users(id uuid,created_at timestamptz,email_confirmed_at timestamptz);
create table topic_cards_public(id uuid);
create table els_records(id uuid,status text,visibility text,home_hidden boolean);
create table posts(id bigint,slug text,title text,tags text[]);
create table system_suggestions(id uuid,created_at timestamptz,detector text,title text,reason text,observed jsonb,status text,sample_size integer,confidence numeric);
create function fn_web_vital_surface_group(text,text) returns text language sql as $$select 'other'$$;
create function edge_rate_limit_check(text,integer,integer) returns jsonb language sql as $$select '{"allowed":true}'::jsonb$$;
create function _analytics_cache_on() returns boolean language sql as $$select true$$;
create or replace function fn_ti_clean_classification(date,date) returns table(session_id text,clean_classification text,clean_eligible boolean)
 language sql as $$select distinct session_id,case when session_id like 'human-%' then 'human' else 'unknown' end,session_id like 'human-%' from events$$;
revoke all on function fn_ti_clean_classification(date,date) from public; -- live ACL: postgres only
alter table gematria_words enable row level security; alter table gematria_wall enable row level security; alter table search_log enable row level security;
create policy baseline_words on gematria_words for select using(is_verified and is_published and not coalesce(is_encrypted,false));
create policy baseline_wall on gematria_wall for select using(not coalesce(private,false));
create policy baseline_search on search_log for select using(true);
create policy baseline_search_write on search_log for insert with check(true);
grant usage on schema public to anon,authenticated;
grant select on gematria_words,gematria_wall,search_log to anon,authenticated; grant insert on search_log to anon,authenticated;
SQL
# The exact live preimages, so preflight.sql's md5 gate runs for real.
for f in analytics_cache_producer_version_v1.fixture.sql analytics_cache_get_v1.fixture.sql ingest_event.before.sql admin_2029_analytics.before.sql recent_number_opens.before.sql add_wall_word.before.sql fn_human_entrances.before.sql; do
  { cat "$DIR/$f"; echo ';'; } | Q
done
(cd "$DIR" && "$PG_BIN/psql" -h "$TMP" -p 54391 -U postgres -d review -qX -f apply.psql >/dev/null)
check "$(Q -c "select to_regprocedure('research_pulse_2029(integer)') is not null")" t 'apply.psql commits under real psql (preflight md5 gate passed)'
check "$(Q -c "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'fn\\_ti\\_%' and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))")" 0 'TI v4: no fn_ti_* function is callable by anon/authenticated; only the research_pulse_2029 wrapper is public'
check "$(Q -c "select md5(pg_get_functiondef('fn_human_entrances(date,date)'::regprocedure))<>'747fde54209aa41e572fe98f46fe2864'")" t 'TI landing identity fix applied'
Q -c "select ingest_event('sod-00002','page','view',p_path=>'/')" >/dev/null
check "$(Q -c "select count(*) from events where surface='page'")" 1 'legacy ingest still inserts on a partitioned events table without a unique key'
ACT=$(cat <<'SQL'
set request.headers='{"cf-connecting-ip":"192.0.2.1"}';
select ingest_event('sod-00001','activity_2029','compute',p_path=>'/gematria',p_app_context=>'chrome',p_session_id=>'human-0001',p_props=>'{"action_version":1,"operation_id":"11111111-1111-4111-8111-111111111111","measurement":{"version":2,"visitor_id":"browser-0001","page_path":"/gematria"}}'::jsonb);
SQL
)
for i in $(seq 1 16); do Q -c "$ACT" >/dev/null & done
wait
Q -c "$ACT" >/dev/null; Q -c "$ACT" >/dev/null
check "$(Q -c "select count(*) from events where surface='activity_2029'")" 1 'replayed operation is stored once'
if Q -c "set role anon; insert into visitor_events values(1,'old-client')" >/dev/null 2>&1; then
  check written refused 'retired visitor_events writer'; else check refused refused 'retired visitor_events writer'; fi
Q <<'SQL' >/dev/null
insert into events(ts,session_id,surface,event_type,path,props) select now()-interval '1 minute','human-'||i%5,'page','view','/number/:value',jsonb_build_object('_measurement_verified',2,'measurement',jsonb_build_object('page_path','/number/104')) from generate_series(1,12)i;
insert into gematria_words(phrase,ragil,is_verified,is_published,is_encrypted) values('שלום',104,true,true,false);
SQL
check "$(Q -c "set role anon; select (research_pulse_2029(720)->>'state')||':'||jsonb_array_length(research_pulse_2029(720)->'numbers')||':'||extract(minute from (research_pulse_2029(720)->>'latest_event')::timestamptz)")" 'measured:1:0' 'anon reader: number above the floor, hour-granular freshness'
check "$(Q -c "set role anon; select count(*) from search_log")" 0 'anon cannot read raw search_log'
# --- PostgREST request emulation (what PostgREST v12 does per request, inside one transaction):
#     SET LOCAL ROLE <jwt role>; set_config('request.jwt.claims', <json>, true); set_config('request.headers', <json>, true).
#     auth.uid() is Supabase's own definition (claim.sub, else request.jwt.claims->>'sub'). Not a PostgREST binary run.
Q <<'SQL' >/dev/null
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
-- exact live definition (read 20.11.2026)
create or replace function public.rd_is_admin() returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'); $$;
insert into public.users(id,role) values ('00000000-0000-4000-8000-0000000000ad','admin'),('00000000-0000-4000-8000-000000000001','member');
grant execute on function public.admin_2029_analytics(integer,text) to authenticated;
SQL
REQALL() { # role claims headers sql -> full output (errors print ERROR then CONTEXT lines)
  Q -c "begin; set local role $1; select set_config('request.jwt.claims','$2',true); select set_config('request.headers','$3',true); $4; commit;" 2>&1 || true; }
REQ() { REQALL "$@" | tail -1; }
OP() { printf '%s' "{\"action_version\":1,\"operation_id\":\"$1\",\"measurement\":{\"version\":2,\"visitor_id\":\"browser-0101\",\"page_path\":\"/gematria\"}}"; }
ACT="select ingest_event('sod-00101','activity_2029','compute',p_path=>'/gematria',p_app_context=>'chrome',p_session_id=>'human-0101'"
before=$(Q -c "select count(*) from events where surface='activity_2029'")
REQ anon '{"role":"anon"}' '{}' "$ACT,p_props=>'$(OP 44444444-4444-4444-8444-444444444444)'::jsonb)" >/dev/null
check "$(Q -c "select count(*) from events where surface='activity_2029'")" "$before" 'PostgREST anon request without cf-connecting-ip writes no activity (fails closed)'
REQ anon '{"role":"anon"}' '{"cf-connecting-ip":"198.51.100.7"}' "$ACT,p_props=>'$(OP 55555555-5555-4555-8555-555555555555)'::jsonb)" >/dev/null
check "$(Q -c "select count(*) from events where event_id='55555555-5555-4555-8555-555555555555' and (props->>'_measurement_account') is null")" 1 'anon request with the edge address header is stored once, as a guest'
REQ authenticated '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001"}' '{"cf-connecting-ip":"198.51.100.7"}' "$ACT,p_props=>'$(OP 66666666-6666-4666-8666-666666666666)'::jsonb)" >/dev/null
check "$(Q -c "select props->>'_measurement_account' from events where event_id='66666666-6666-4666-8666-666666666666'")" 00000000-0000-4000-8000-000000000001 'JWT claims (request.jwt.claims.sub) stamp the verified account; the client cannot supply it'
check "$(REQ anon '{"role":"anon"}' '{}' "select length(research_pulse_2029(24)::text)>0")" t 'anon may call the one public wrapper research_pulse_2029'
check "$(REQALL anon '{"role":"anon"}' '{}' "select fn_ti_activity_pulse2029(24)" | grep -c 'permission denied')" 1 'anon is refused the server-only TI producer'
check "$(REQALL authenticated '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001"}' '{}' "select admin_2029_analytics(24)" | grep -c 'not authorized')" 1 'a signed-in non-admin JWT is refused the admin report'
check "$(REQ authenticated '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000ad"}' '{}' "select (admin_2029_analytics(24)->'site_activity'->>'version')")" 1 'an admin JWT reads the site activity report'
check "$(REQ anon '{"role":"anon"}' '{}' "select count(*) from search_log")" 0 'anon REST read of search_log returns nothing'
# The real PostgREST binary (Codex, #1461): runs when the workflow provides POSTGREST_BIN.
if [ -n "${POSTGREST_BIN:-}" ]; then
  PG_SOCKET="$TMP" PG_BIN="$PG_BIN" node "$ROOT/test/sitewide-statistics-postgrest.mjs"
else
  echo 'PostgREST/JWT: NOT RUN (POSTGREST_BIN missing)'
fi
(cd "$DIR" && "$PG_BIN/psql" -h "$TMP" -p 54391 -U postgres -d review -qX -f rollback.psql >/dev/null)
check "$(Q -c "select md5(pg_get_functiondef('ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure))")" e7017ece28ccfe1b59fb9b5f66e8af44 'rollback.psql restores the exact ingest_event preimage'
check "$(Q -c "select md5(pg_get_functiondef('fn_human_entrances(date,date)'::regprocedure))")" 747fde54209aa41e572fe98f46fe2864 'rollback.psql restores the exact fn_human_entrances preimage'
check "$(Q -c "select has_function_privilege('anon','research_pulse_2029(integer)','execute')")" f 'rollback.psql closes the public activity API'
echo "REAL POSTGRES ${pass} checks PASS ($("$PG_BIN/postgres" --version); isolated cluster, not live/PostgREST)"
