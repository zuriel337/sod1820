#!/usr/bin/env bash
# Open-activity proposal (27.11.2026): runs the REAL PROPOSAL.sql / ROLLBACK.sql under psql against an isolated local PostgreSQL.
# No live URL or credential is read. The live fn_ti_activity_pulse2029 md5 pin is replaced by the md5 of a local stub in a TEMP COPY only
# (the committed file keeps the live pin); every other statement is the committed text.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=$ROOT/supabase/proposed/open-activity-20261127
FIX=$ROOT/supabase/proposed/sitewide-statistics-20261120
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54392 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
Q() { "$PG_BIN/psql" -h "$TMP" -p 54392 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
"$PG_BIN/psql" -h "$TMP" -p 54392 -U postgres -qc 'create database review'
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
sed -E 's/^create table public\.events\((.*)\);$/create table public.events(\1) partition by range(ts);/' "$ROOT/tests/measurement-identity-20261115/fixture.sql" | Q
Q <<'SQL'
create table public.events_cur partition of public.events for values from ('2000-01-01') to ('2100-01-01');
create role service_role;
create table public.analytics_cache(cache_key text primary key,payload jsonb,computed_at timestamptz,cache_kind text,producer text,producer_version text,input_identity text,expires_at timestamptz,invalidated_at timestamptz,billable_state text,hit_count bigint default 0,last_hit_at timestamptz);
create table public.posts(id bigint,slug text,title text,tags text[],categories text[]);
create table public.crawl_daily(day date,bot text,bucket text,blocked boolean,hits bigint);
create table public.video_media_assets_v1(public_id text,google_indexable boolean);
create function public.sitemap_numbers() returns table(value integer) language sql as $$select unnest(array[10,20,30,40,50,60,70,80,90,100,110,120])$$;
create or replace function public.fn_ti_clean_classification(date,date) returns table(session_id text,clean_classification text,clean_eligible boolean)
 language sql as $$select distinct session_id,case when session_id like 'h%' then 'human' when session_id like 'u%' then 'unknown' else 'bot' end,session_id like 'h%' from public.events$$;
revoke all on function public.fn_ti_clean_classification(date,date) from public;
create function public.fn_ti_activity_pulse2029(integer) returns jsonb language sql as $$select '{}'::jsonb$$;
SQL
for f in analytics_cache_producer_version_v1.fixture.sql analytics_cache_get_v1.fixture.sql; do { cat "$FIX/$f"; echo ';'; } | Q; done
# --- fixture data: complete Jerusalem days; D1 = yesterday ---
Q <<'SQL'
insert into public.posts values (1,'public-post-with-a-very-long-slug-that-the-path-cuts','כותרת ציבורית','{"תג א"}','{"קטגוריה א"}'),(2,'draft-post','טיוטה','{"טיוטה"}','{}'),(3,'popular-post','פוסט פופולרי','{}','{}');
insert into public.video_media_assets_v1 values ('0123456789abcdef0123456789abcdef',true);
insert into public.crawl_daily values ((now() at time zone 'Asia/Jerusalem')::date-1,'Googlebot','/number',false,500),((now() at time zone 'Asia/Jerusalem')::date-1,'Googlebot','/number',true,9999);
create or replace function pg_temp.cv(sess text, kind text, item text, n int default 1) returns void language sql as $$
  insert into public.events(ts,session_id,surface,event_type,is_bot,props)
  select (((now() at time zone 'Asia/Jerusalem')::date-1)::timestamp + interval '12 hours') at time zone 'Asia/Jerusalem' + (g||' minutes')::interval, sess, 'content','view', false,
         jsonb_build_object('_measurement_verified',2,'kind',kind,'item_id',item) from generate_series(1,n) g $$;
create or replace function pg_temp.ev(sess text, path text, n int default 1) returns void language sql as $$
  insert into public.events(ts,session_id,surface,event_type,is_bot,props)
  select (((now() at time zone 'Asia/Jerusalem')::date-1)::timestamp + interval '12 hours') at time zone 'Asia/Jerusalem' + (g||' minutes')::interval, sess, 'page','view', false,
         jsonb_build_object('_measurement_verified',2,'measurement',jsonb_build_object('page_path',path))
  from generate_series(1,n) g $$;
-- 30 human sessions on the home page (the window gate), single opens of admitted numbers, one popular post (10 opens / 5 sessions)
select pg_temp.ev('h'||g,'/',1) from generate_series(1,30) g;
select pg_temp.ev('h1','/number/10'),pg_temp.ev('h2','/number/20'),pg_temp.ev('h3','/number/20'),pg_temp.ev('h4','/number/99999'),pg_temp.ev('h5','/number/77');
select pg_temp.cv('h1','post','1'),pg_temp.cv('h6','post','2'),pg_temp.cv('h7','post','<script>x'),pg_temp.cv('h8','post','999'),pg_temp.cv('h9','other','1');
select pg_temp.cv('h'||g,'post','3',2) from generate_series(10,14) g;
-- a post page view in the measured path must NOT create a post item (posts come from content/view)
select pg_temp.ev('h26','/post/public-pos');
select pg_temp.ev('h20','/tag/תג-א'),pg_temp.ev('h21','/category/קטגוריה-א'),pg_temp.ev('h22','/tag/not-a-real-tag');
select pg_temp.ev('h23','/video/0123456789abcdef0123456789abcdef'),pg_temp.ev('h24','/video/ffffffffffffffffffffffffffffffff');
-- unknown class: totals only; a bot: never counted
select pg_temp.ev('u1','/number/30'),pg_temp.ev('u2','/number/30'),pg_temp.ev('b1','/number/40');
insert into public.events(ts,session_id,surface,event_type,is_bot,props) values (now(),'h25','page','view',false,'{"_measurement_verified":2,"measurement":{"page_path":"/number/60"}}');
insert into public.events(ts,session_id,surface,event_type,is_bot,props) values (now()-interval '1 day','h3','page','view',true,'{"_measurement_verified":2,"measurement":{"page_path":"/number/50"}}');
SQL
STUB_MD5=$(Q -c "select md5(pg_get_functiondef('public.fn_ti_activity_pulse2029(integer)'::regprocedure))")
sed "s/83b931888f51de9429367006c6608e9d/$STUB_MD5/" "$DIR/PROPOSAL.sql" > "$TMP/proposal.local.sql"
check "$(grep -c 83b931888f51de9429367006c6608e9d "$DIR/PROPOSAL.sql")" 1 'the committed file pins the live md5 once'
"$PG_BIN/psql" -h "$TMP" -p 54392 -U postgres -d review -qX -f "$TMP/proposal.local.sql" >/dev/null
check "$(Q -c "select to_regprocedure('research_open_activity_2029(text)') is not null")" t 'PROPOSAL.sql commits under real psql'
check "$(Q -c "select has_function_privilege('anon','fn_ti_open_activity2029(text)','execute')")" f 'producer is server-only'
check "$(Q -c "select has_function_privilege('anon','research_open_activity_2029(text)','execute')")" t 'wrapper is public like research_pulse_2029'
J=$(Q -c "select research_open_activity_2029('day')")
j() { Q -c "select ('$J'::jsonb)$1"; }
check "$(j "->>'state'")" measured 'window with >=25 human sessions is measured'
check "$(j "#>>'{families,number,items}'")" 2 'numbers: only admitted public numbers count (99999 and 77 are not admitted; human only)'
check "$(j "#>>'{families,number,opens}'")" 3 'numbers: opens are counted per open'
check "$(Q -c "select count(*) from jsonb_array_elements(('$J'::jsonb)#>'{families,number,list}') x where x->>'tier'='seen'")" 2 'single and double opens are listed (tier seen), not hidden by the popularity floor'
check "$(Q -c "select count(*) from jsonb_array_elements(('$J'::jsonb)#>'{families,number,list}') x where (x->>'n')::int=60")" 0 'today is never in a settled window'
check "$(j "#>>'{families,post,items}'")" 2 'posts: from content/view by exact id; public posts only (draft, crafted id, unknown id, other kind and a requested address are not listed)'
check "$(Q -c "select (('$J'::jsonb)#>'{families,post,list,0}')->>'tier'")" popular 'a post above the 10 events / 5 sessions floor is tier popular and first'
check "$(Q -c "select count(*) from jsonb_array_elements(('$J'::jsonb)#>'{families,post,list}') x where x->>'title' in ('טיוטה') or x->>'href' like '%script%'")" 0 'no draft title and no crafted text on the public payload'
check "$(j "#>>'{families,topic,items}'")" 2 'topics: a tag and a category that exist on public posts; an invented tag is not listed'
check "$(j "#>>'{families,video,items}'")" 1 'videos: only identities known to the public video view'
check "$(j "#>>'{unknown,number,opens}'")" 2 'unknown class is a total only'
check "$(j "#>>'{unknown,number,list}'")" '' 'unknown class has no list'
check "$(j "#>>'{machines,served}'")" 500 'machines are a separate served-only total (blocked hits are not published)'
check "$(Q -c "select ('$J'::jsonb)::text ~ '\"h[0-9]+\"|\"u[0-9]+\"|session_id|\"ts\"|last_at'")" f 'no session id, timestamp or last-seen time anywhere in the payload'
check "$(Q -c "select count(*) from public.analytics_cache where producer='fn_ti_open_activity2029'")" 1 'one cache row per window and settled day'
check "$(Q -c "select expires_at > now() + interval '1 hour' from public.analytics_cache where producer='fn_ti_open_activity2029'")" t 'the settled snapshot lives until after the next Jerusalem midnight'
Q -c "select research_open_activity_2029('day')" >/dev/null
check "$(Q -c "select hit_count from public.analytics_cache where producer='fn_ti_open_activity2029'")" 1 'second call is a cache hit'
check "$(Q -c "select research_open_activity_2029('nonsense')::jsonb->>'window'")" week 'unknown window falls back to week'
# window gate: fewer than 25 human sessions -> no list at all
Q -c "delete from public.events where session_id ~ '^h(1[0-9]|2[0-9]|30)\$'; delete from public.analytics_cache"
check "$(Q -c "select research_open_activity_2029('day')::jsonb->>'state'")" insufficient 'a window below 25 human sessions draws no list'
check "$(Q -c "select research_open_activity_2029('day')::jsonb->'families'")" '{}' 'insufficient window publishes no family'
# refuse a second apply; exact rollback
if "$PG_BIN/psql" -h "$TMP" -p 54392 -U postgres -d review -qX -v ON_ERROR_STOP=1 -f "$TMP/proposal.local.sql" >/dev/null 2>&1; then echo 'FAIL second apply was not refused'; exit 1; fi
pass=$((pass+1)); echo 'PASS a second apply is refused'
"$PG_BIN/psql" -h "$TMP" -p 54392 -U postgres -d review -qX -v ON_ERROR_STOP=1 -f "$DIR/ROLLBACK.sql" >/dev/null
check "$(Q -c "select count(*) from pg_proc where proname in ('fn_ti_open_activity2029','research_open_activity_2029')")" 0 'rollback removes both functions'
check "$(Q -c "select count(*) from public.analytics_cache where producer='fn_ti_open_activity2029'")" 0 'rollback removes the cache rows'
check "$(Q -c "select count(*) from pg_proc where proname='fn_ti_activity_pulse2029'")" 1 'the existing producer is untouched'
echo "ALL PASS ($pass)"
