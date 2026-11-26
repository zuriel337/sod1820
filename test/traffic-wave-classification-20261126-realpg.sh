#!/usr/bin/env bash
# Traffic wave 26.11.2026 proposals P1-P4 on an isolated REAL PostgreSQL (nothing touches a shared database). The live ingest_event, fn_human_entrances and
# fn_ti_session_metrics are used as exact fixtures (md5-checked against the fingerprints read on 26.11.2026); the original refresh function is taken from the
# ROLLBACK file. Proves: automation-declared requests are dropped and counted apart; every other request is ingested as before with closed-value evidence only;
# validation, grants and the other paths are unchanged; the patch composes with the (re-guarded) PR #1528 action-family patch and rolls back exactly; the anomaly
# axis flags without reclassifying anything; the page/content/engagement columns fill only from the cutover day and the legacy columns are identical to the original.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
P=$ROOT/supabase/proposed; FX=$ROOT/test/fixtures
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
if [ ! -x "$PG_BIN/initdb" ]; then echo "SKIP: no PostgreSQL binaries at $PG_BIN"; exit 0; fi
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); chown "${PG_USER:-postgres}" "$TMP"; fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54398 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
PSQL=("$PG_BIN/psql" -h "$TMP" -p 54398 -U postgres)
"${PSQL[@]}" -qc 'create database review' >/dev/null
Q() { "${PSQL[@]}" -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
QE() { "${PSQL[@]}" -d review -qtAX "$@" 2>&1 || true; }
F() { "${PSQL[@]}" -d review -v ON_ERROR_STOP=1 -qtAX -1 -f "$1" 2>&1; }
FE() { "${PSQL[@]}" -d review -v ON_ERROR_STOP=0 -qtAX -1 -f "$1" 2>&1 || true; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
IE="'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure"
IEMD5() { Q -c "select md5(pg_get_functiondef($IE))"; }

Q -c "create role anon; create role authenticated; create role service_role;
create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';
create table public.events(event_id uuid, ts timestamptz not null default now(), sod_id text, person_id uuid, session_id text, surface text, event_type text, path text, ref_host text, via text,
  app_context text, device text, journey_id text, depth_reached smallint, utm jsonb, is_bot boolean, props jsonb, ingest_at timestamptz default now());
create table public.persons(person_id uuid default gen_random_uuid(), account_user_id uuid, created_at timestamptz default now(), first_seen timestamptz, last_seen timestamptz, first_source text);
create function public.resolve_person(a text, b text, c text) returns uuid language sql as 'select null::uuid';
create function public.edge_rate_limit_check(a text, b int, c int) returns jsonb language sql as \$\$ select '{\"allowed\":true}'::jsonb \$\$;
create table public.gematria_words(id int, public_trend_approved boolean);
create function public.gematria_public_word_eligible(i int) returns boolean language sql as 'select true';
create table public.crawl_daily(day date not null default ((now() at time zone 'Asia/Jerusalem')::date), bot text not null, bucket text not null, blocked boolean not null default false, hits integer not null default 0, primary key(day,bot,bucket,blocked));
create function public.log_crawl(p_bot text, p_bucket text, p_blocked boolean default false) returns void language plpgsql security definer set search_path to 'public' as \$f\$
begin
  insert into crawl_daily (day, bot, bucket, blocked, hits)
  values ((now() at time zone 'Asia/Jerusalem')::date,
          coalesce(nullif(p_bot,''),'other'), coalesce(nullif(p_bucket,''),'other'),
          coalesce(p_blocked,false), 1)
  on conflict (day, bot, bucket, blocked) do update set hits = crawl_daily.hits + 1;
end \$f\$;
create function public.fn_ti_report_day(p_ts timestamptz) returns date language sql stable as 'select (p_ts at time zone ''Asia/Jerusalem'')::date';
create function public.fn_ti_clean_classification(a date, b date) returns table(session_id text, clean_classification text, clean_evidence jsonb) language sql stable as 'select null::text, null::text, null::jsonb where false';
create table public.analytics_cache(cache_key text primary key, payload jsonb not null, computed_at timestamptz, cache_kind text, producer text, producer_version text, input_identity text, expires_at timestamptz);
create table public.traffic_daily(day date primary key, entrances int not null, engaged int not null, bounces int not null, views int not null, visitors int not null, searches int not null, bots int not null, updated_at timestamptz, suspected int not null);
create table public.migration_record(name text);"
F "$FX/ingest_event_live_20261126.sql" >/dev/null
F "$FX/traffic_fns_live_20261126.sql" >/dev/null
# original refresh function = the body the ROLLBACK file restores
python3 - "$P/20261126190200_traffic_daily_page_engagement_ROLLBACK.sql" > "$TMP/refresh_orig.sql" <<'PYEOF'
import sys,re
s=open(sys.argv[1],encoding='utf-8').read()
i=s.index('create or replace function public.refresh_traffic_daily_range_v1'); j=s.index('$function$;',s.index('as $function$'))+len('$function$;')
print(s[i:j])
PYEOF
F "$TMP/refresh_orig.sql" >/dev/null
Q -c "grant execute on function public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean) to anon, authenticated"
check "$(IEMD5)" 6dd7585345d10a3a323810fd768fcf3b 'fixture: the ingest_event fixture is byte-identical to the live definition (md5 of pg_get_functiondef)'
check "$(Q -c "select md5(prosrc) from pg_proc where proname='fn_human_entrances'")|$(Q -c "select md5(prosrc) from pg_proc where proname='refresh_traffic_daily_range_v1'")" 'ace2b9fa0943d8f10aec96abb715f04c|97616f75277d4e4b0eaa1c63c82967f5' 'fixture: fn_human_entrances and the original refresh function are byte-identical to the live sources'
Q -c "grant execute on function public.log_crawl(text,text,boolean) to anon"

# ───────────── P1 + P2: ingest_event
pv() { # $1 ua $2 referer ('-' = none) $3 session $4 visitor ; one page view through the real v2 envelope
  local hdr; if [ "$1" = "-" ]; then hdr='{}'; elif [ "$2" = "-" ]; then hdr="{\"user-agent\":\"$1\"}"; else hdr="{\"user-agent\":\"$1\",\"referer\":\"$2\"}"; fi
  QE -c "select set_config('request.headers', '$hdr', true); select public.ingest_event('sod-$4-aaaa','page','view','/post/:item',null,null,'chrome',null,'$3',null,null,null,'{\"measurement\":{\"version\":2,\"page_path\":\"/post/x-$4\",\"visitor_id\":\"vid-$4-aaaa\"}}'::jsonb,false)"
}
CHROME='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
HC='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/145.0.7632.6 Safari/537.36'
PRE_MD5=$(IEMD5)
PRE_ACL=$(Q -c "select proacl::text from pg_proc where proname='ingest_event'")
PRE_RC=$(Q -c "select count(*) from public.crawl_daily"); check "$PRE_RC" 0 'p1: no crawl rows before'
F "$P/20261126190000_ingest_request_evidence_PROPOSAL.sql" >/dev/null; check "$?" 0 'p1: the patch applies (known live fingerprint, three anchors once each)'
check "$(Q -c "select md5(pg_get_functiondef($IE)) <> '$PRE_MD5' and position('_request_evidence' in pg_get_functiondef($IE))>0")|$(Q -c "select proacl::text from pg_proc where proname='ingest_event'")" "t|$PRE_ACL" 'p1: definition changed, grants unchanged'
pv "$HC" 'https://www.google.com/' s-wave-0001 w1 >/dev/null; pv "Mozilla/5.0 Playwright/1.49" 'https://www.google.com/' s-wave-0002 w2 >/dev/null; pv "Mozilla/5.0 (X11) Selenium WebDriver" - s-wave-0003 w3 >/dev/null; pv "Mozilla/5.0 PhantomJS/2.1" - s-wave-0004 w4 >/dev/null; pv "puppeteer-core" - s-wave-0005 w5 >/dev/null
check "$(Q -c "select count(*) from public.events")|$(Q -c "select bot||':'||bucket||':'||blocked||':'||hits from public.crawl_daily")" '0|automation-declared:ingest_event:true:5' 'p1: five automation-declared requests write no event and are counted apart (bot automation-declared, blocked)'
pv "$CHROME" 'https://sod1820.co.il/post/x' s-real-0001 r1 >/dev/null; pv "$CHROME" 'https://www.google.com/' s-real-0002 r2 >/dev/null; pv "$CHROME" - s-real-0003 r3 >/dev/null
pv "$CHROME" 'https://sod1820-git-ccr-s1-security-edge-20261126-sod1820-s-projects.vercel.app/' s-real-0004 r4 >/dev/null; pv "$CHROME" 'http://localhost:4173/' s-real-0005 r5 >/dev/null; pv "curl/8.0" 'https://www.sod1820.co.il/' s-real-0006 r6 >/dev/null
check "$(Q -c "select string_agg(session_id||'='||(props->'_request_evidence'->>'ua')||'/'||(props->'_request_evidence'->>'referer'), ' ' order by session_id) from public.events")" 's-real-0001=browser/site s-real-0002=browser/external s-real-0003=browser/none s-real-0004=browser/preview s-real-0005=browser/local s-real-0006=unknown/site' 'p2: evidence classes (browser, unknown; site, preview, local, external, none) are closed values'
check "$(Q -c "select count(*) from public.events where props::text ~* '(mozilla|chrome|google|http|localhost|curl)' and (props - 'measurement')::text ~* '(mozilla|chrome|google|http|localhost|curl)'")" 0 'p2: no raw User-Agent or Referer is stored anywhere in props'
check "$(Q -c "select count(*) from public.events where (props->'_measurement_verified')::text='2' and props ? 'measurement'")|$(Q -c "select count(*) from public.crawl_daily")" '6|1' 'p2: the measurement envelope fields are still written as before; the crawl counter is not touched by normal browsers'
check "$(QE -c "select set_config('request.headers','not json',true); select public.ingest_event('sod-bad-hdr-aaaa','page','view','/post/:item',null,null,'chrome',null,'s-bad-header-1',null,null,null,'{\"measurement\":{\"version\":2,\"page_path\":\"/post/x\",\"visitor_id\":\"vid-bad-aaaa\"}}'::jsonb,false)" | grep -c ERROR)|$(Q -c "select props->'_request_evidence' from public.events where session_id='s-bad-header-1'")" '0|{"ua": "unknown", "referer": "none"}' 'p1: unparsable request headers are fail-open (ingested, evidence unknown/none)'
check "$(QE -c "select public.ingest_event('sod-nohdr-aaaa','page','view','/post/:item',null,null,'chrome',null,'s-no-header-1',null,null,null,'{\"measurement\":{\"version\":2,\"page_path\":\"/post/x\",\"visitor_id\":\"vid-nohdr-aaaa\"}}'::jsonb,false)" | grep -c ERROR)|$(Q -c "select count(*) from public.events where session_id='s-no-header-1'")" '0|1' 'p1: a request with no headers at all is ingested'
check "$(QE -c "select public.ingest_event('sod-bad-env-aaaa','page','view','/post/:item','evil.example',null,'chrome',null,'s-bad-env-1',null,null,null,'{\"measurement\":{\"version\":2,\"page_path\":\"/post/x\",\"visitor_id\":\"vid-bad-env-aaaa\"}}'::jsonb,false)" | grep -c 'invalid measurement envelope')" 1 'p1: existing validation is unchanged (a forbidden field still raises)'
Q -c "select public.ingest_event('sod-old-client-aaaa','page','view','/old',null,null,'chrome',null,'s-old-client-1',null,null,null,'{\"_request_evidence\":{\"ua\":\"forged\",\"referer\":\"forged\"},\"x\":1}'::jsonb,false); select public.ingest_event('sod-old-null-aaaa','page','view','/old',null,null,'chrome',null,'s-old-null-1',null,null,null,null,false);" >/dev/null
check "$(Q -c "select props->'_request_evidence'->>'ua' from public.events where session_id='s-old-client-1'")|$(Q -c "select props is null from public.events where session_id='s-old-null-1'")" 'unknown|t' 'p2: a forged evidence key from an old client is overwritten; null props stay null'
check "$(Q -c "select count(*) from public.events where is_bot")|$(Q -c "select count(*) from public.events where session_id like 's-wave-%'")" '0|0' 'p1: nothing is stored for the wave; no event is marked is_bot'
# drift, anchors, idempotence, rollback
F "$P/20261126190000_ingest_request_evidence_PROPOSAL.sql" >/dev/null 2>&1; check "$?" 0 'p1: re-applying is a quiet no-op (desired end state)'
F "$P/20261126190000_ingest_request_evidence_ROLLBACK.sql" >/dev/null; check "$(IEMD5)" "$PRE_MD5" 'p1: the rollback restores the exact live definition (same md5)'
check "$(FE "$P/20261126190000_ingest_request_evidence_ROLLBACK.sql" | grep -c ERROR)" 0 'p1: rolling back twice is a quiet no-op'
Q -c "create or replace function public.ingest_event(p_sod_id text, p_surface text, p_event_type text, p_path text default null, p_ref_host text default null, p_via text default null, p_app_context text default null, p_device text default null, p_session_id text default null, p_journey_id text default null, p_depth smallint default null, p_utm jsonb default null, p_props jsonb default null, p_is_bot boolean default false) returns void language plpgsql as \$\$ begin null; end \$\$"
check "$(FE "$P/20261126190000_ingest_request_evidence_PROPOSAL.sql" | grep -c 'ingest_event drift')|$(Q -c "select position('_request_evidence' in pg_get_functiondef($IE))")" '1|0' 'p1: a drifted definition makes the file FAIL (P0001) and nothing changes'
F "$FX/ingest_event_live_20261126.sql" >/dev/null
# anchors: break one anchor but keep the md5 acceptable is impossible; check the missing-anchor guard on a function that matches an accepted md5 by construction is not needed - the count check is covered by the drift path above
# composition with the PR #1528 action-family patch (its own md5 guard is stale; here its replace is applied to the same live definition)
Q -c "do \$\$ declare v_def text := pg_get_functiondef($IE); begin execute replace(v_def, '\"calculator_2029\":', '\"app_health\":{\"events\":[\"save_started\",\"save_confirmed\",\"save_failed\",\"auth_failed\",\"load_failed\",\"runtime_error\"],\"fields\":{\"reason\":\"token\",\"stage\":\"token\"}},\"calculator_2029\":'); end \$\$"
check "$(IEMD5)" 94d268f7d6d689afe5c04cd478030801 'compose: the live definition after the #1528 patch has the second accepted fingerprint (94d268f7...)'
F "$P/20261126190000_ingest_request_evidence_PROPOSAL.sql" >/dev/null; check "$(Q -c "select position('app_health' in pg_get_functiondef($IE))>0 and position('_request_evidence' in pg_get_functiondef($IE))>0")" t 'compose: the patch applies on top of the #1528 patch and keeps it'
F "$P/20261126190000_ingest_request_evidence_ROLLBACK.sql" >/dev/null; check "$(IEMD5)" 94d268f7d6d689afe5c04cd478030801 'compose: rolling back leaves exactly the #1528-patched definition'
F "$FX/ingest_event_live_20261126.sql" >/dev/null

# ───────────── P3: anomaly axis (reads P2 evidence; never classifies)
F "$P/20261126190000_ingest_request_evidence_PROPOSAL.sql" >/dev/null
Q -c "truncate public.events;
insert into public.events(event_id,ts,session_id,surface,event_type,path,is_bot,props,sod_id,person_id) values
 -- wave-like: one page view + one content view, no action, 1.4 s, external API referer, claims google
 (gen_random_uuid(), timestamptz '2026-11-27 10:00:00+02', 'sess-wave-0001', 'arrival','source','/post/:item', false, '{\"source\":\"google\",\"_request_evidence\":{\"ua\":\"browser\",\"referer\":\"external\"}}', 'sod-w1-aaaaaaaa', null),
 (gen_random_uuid(), timestamptz '2026-11-27 10:00:00.2+02', 'sess-wave-0001', 'page','view','/post/:item', false, '{\"_request_evidence\":{\"ua\":\"browser\",\"referer\":\"external\"}}', 'sod-w1-aaaaaaaa', null),
 (gen_random_uuid(), timestamptz '2026-11-27 10:00:01.4+02', 'sess-wave-0001', 'content','view','/post/:item', false, '{\"_request_evidence\":{\"ua\":\"browser\",\"referer\":\"external\"}}', 'sod-w1-aaaaaaaa', null),
 -- short but genuine referer: flagged only as short visit, still not a bot
 (gen_random_uuid(), timestamptz '2026-11-27 10:05:00+02', 'sess-short-0002', 'page','view','/post/:item', false, '{\"_request_evidence\":{\"ua\":\"browser\",\"referer\":\"site\"}}', 'sod-s2-aaaaaaaa', null),
 (gen_random_uuid(), timestamptz '2026-11-27 10:05:01+02', 'sess-short-0002', 'content','view','/post/:item', false, '{\"_request_evidence\":{\"ua\":\"browser\",\"referer\":\"site\"}}', 'sod-s2-aaaaaaaa', null),
 -- real reading: two page views and an engagement event over 90 s
 (gen_random_uuid(), timestamptz '2026-11-27 10:10:00+02', 'sess-real-0003', 'page','view','/post/:item', false, '{\"_request_evidence\":{\"ua\":\"browser\",\"referer\":\"site\"}}', 'sod-r3-aaaaaaaa', null),
 (gen_random_uuid(), timestamptz '2026-11-27 10:10:40+02', 'sess-real-0003', 'page','view','/post/:item', false, '{\"_request_evidence\":{\"ua\":\"browser\",\"referer\":\"site\"}}', 'sod-r3-aaaaaaaa', null),
 (gen_random_uuid(), timestamptz '2026-11-27 10:11:30+02', 'sess-real-0003', 'page','engagement','/post/:item', false, '{\"engaged_ms\":42000,\"_request_evidence\":{\"ua\":\"browser\",\"referer\":\"site\"}}', 'sod-r3-aaaaaaaa', null),
 -- an earlier day (26.11): two page views, no engagement
 (gen_random_uuid(), timestamptz '2026-11-26 09:00:00+02', 'sess-pre-0004', 'page','view','/post/:item', false, '{}', 'sod-p4-aaaaaaaa', null),
 (gen_random_uuid(), timestamptz '2026-11-26 09:02:00+02', 'sess-pre-0004', 'page','view','/post/:item', false, '{}', 'sod-p4-aaaaaaaa', null);"
F "$P/20261126190100_session_anomaly_axis_PROPOSAL.sql" >/dev/null; check "$?" 0 'p3: the anomaly function installs'
BEFORE_HE=$(Q -c "select md5(string_agg(h::text, '|' order by session_id)) from public.fn_human_entrances(date '2026-11-26', date '2026-11-28') h")
check "$(Q -c "select string_agg(session_id||'='||array_to_string(flags,','), ' ' order by session_id) from public.fn_ti_session_anomaly_v1(date '2026-11-27', date '2026-11-27')")" 'sess-short-0002=single_page_no_action_under_3s sess-wave-0001=api_referer_not_site,source_claim_conflicts_api_referer,single_page_no_action_under_3s' 'p3: the wave-like session carries the three flags, a short genuine-referer visit only the short-visit flag, a real reading none'
check "$(Q -c "select md5(string_agg(h::text, '|' order by session_id)) from public.fn_human_entrances(date '2026-11-26', date '2026-11-28') h")|$(Q -c "select count(*) from public.events where is_bot")" "$BEFORE_HE|0" 'p3: classification is untouched (entrances identical before and after, no is_bot, nothing reclassified)'
check "$(QE -c "set role anon; select count(*) from public.fn_ti_session_anomaly_v1(null,null)" | grep -c 'permission denied')|$(Q -c "select has_function_privilege('service_role','public.fn_ti_session_anomaly_v1(date,date)','execute')")" '1|t' 'p3: only service_role can read the axis'

# ───────────── P4: page / content / real engagement columns
Q -c "truncate public.traffic_daily; select public.refresh_traffic_daily_range_v1(date '2026-11-26', date '2026-11-28')" >/dev/null
Q -c "create table public.traffic_daily_orig as select * from public.traffic_daily"
F "$P/20261126190200_traffic_daily_page_engagement_PROPOSAL.sql" >/dev/null; check "$?" 0 'p4: the file applies (guard on the live refresh source, P3 present)'
check "$(Q -c "select (payload->>'first_full_day')::date - (now() at time zone 'Asia/Jerusalem')::date from public.analytics_cache where cache_key='traffic_daily_page_metrics_cutover'")" 1 'p4: the cutover is the first full Israel day AFTER applying (tomorrow)'
Q -c "update public.analytics_cache set payload = jsonb_build_object('first_full_day','2026-11-28') where cache_key='traffic_daily_page_metrics_cutover'; select public.refresh_traffic_daily_range_v1(date '2026-11-26', date '2026-11-28')" >/dev/null
check "$(Q -c "select count(*) from public.traffic_daily where page_views is not null or page_engaged is not null or page_bounces is not null or anomalous is not null or engagement_sessions is not null")|$(Q -c "select count(*) from public.traffic_daily")" '0|2' 'p4: days before the cutover are NOT touched (new columns stay NULL, no history rewrite)'
Q -c "update public.analytics_cache set payload = jsonb_build_object('first_full_day','2026-11-27') where cache_key='traffic_daily_page_metrics_cutover'; select public.refresh_traffic_daily_range_v1(date '2026-11-26', date '2026-11-28')" >/dev/null
check "$(Q -c "select page_views is null and page_engaged is null and page_bounces is null from public.traffic_daily where day='2026-11-26'")" t 'p4: the day before the cutover stays NULL even when the same refresh fills the day after it'
check "$(Q -c "select day||' views='||views||' engaged='||engaged||' bounces='||bounces||' | page_views='||page_views||' page_engaged='||page_engaged||' page_bounces='||page_bounces||' engagement_sessions='||engagement_sessions||' anomalous='||anomalous from public.traffic_daily where day='2026-11-27'")" '2026-11-27 views=6 engaged=3 bounces=0 | page_views=4 page_engaged=1 page_bounces=2 engagement_sessions=1 anomalous=2' 'p4: from the cutover the legacy count calls all 3 visits engaged (page + content views), the new columns separate them: 1 page-engaged, 2 page bounces, 1 with real engagement'
check "$(Q -c "select count(*) from (select day,entrances,engaged,bounces,views,visitors,searches,bots,suspected from public.traffic_daily where day='2026-11-26' except select day,entrances,engaged,bounces,views,visitors,searches,bots,suspected from public.traffic_daily_orig where day='2026-11-26') x")" 0 'p4: the legacy columns of an earlier day are identical to what the original refresh produced'
Q -c "truncate public.traffic_daily; select public.refresh_traffic_daily_range_v1(date '2026-11-27', date '2026-11-27')" >/dev/null
Q -c "create table public.td_new as select * from public.traffic_daily; truncate public.traffic_daily"
F "$TMP/refresh_orig.sql" >/dev/null; Q -c "select public.refresh_traffic_daily_range_v1(date '2026-11-27', date '2026-11-27')" >/dev/null
check "$(Q -c "select count(*) from (select day,entrances,engaged,bounces,views,visitors,searches,bots,suspected from public.td_new except select day,entrances,engaged,bounces,views,visitors,searches,bots,suspected from public.traffic_daily) x")" 0 'p4: on the cutover day itself the legacy columns equal the ORIGINAL refresh output, value for value'
F "$P/20261126190200_traffic_daily_page_engagement_ROLLBACK.sql" >/dev/null 2>&1 || true
F "$P/20261126190200_traffic_daily_page_engagement_PROPOSAL.sql" >/dev/null 2>&1 || true
# the original function is back in place above (to compare); re-apply the proposal and roll it back exactly
Q -c "select count(*) from pg_proc where proname='refresh_traffic_daily_range_v1'" >/dev/null
check "$(FE "$P/20261126190200_traffic_daily_page_engagement_PROPOSAL.sql" | grep -c 'ERROR')" 0 'p4: re-applying over its own state is a quiet idempotent re-run (no error)'
Q -c "update public.analytics_cache set payload = jsonb_build_object('first_full_day','2026-11-27') where cache_key='traffic_daily_page_metrics_cutover'; select public.refresh_traffic_daily_range_v1(date '2026-11-26', date '2026-11-28')" >/dev/null
SNAPQ="select md5(string_agg((to_jsonb(t) - 'updated_at')::text, '|' order by day)) from public.traffic_daily t"
SNAP=$(Q -c "$SNAPQ")
F "$P/20261126190200_traffic_daily_page_engagement_ROLLBACK.sql" >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='refresh_traffic_daily_range_v1'")|$(Q -c "select count(*) from information_schema.columns where table_name='traffic_daily' and column_name in ('page_views','page_engaged','page_bounces','engagement_sessions','anomalous')")|$(Q -c "select count(*) from public.analytics_cache where cache_key='traffic_daily_page_metrics_cutover'")" '97616f75277d4e4b0eaa1c63c82967f5|5|1' 'p4 rollback: the exact original function text is back (same md5); the five columns and the cutover row are KEPT'
check "$(Q -c "$SNAPQ")" "$SNAP" 'p4 rollback: not one stored value of traffic_daily changed (every row, legacy and page_* columns, identical except the refresh timestamp): no measurement history is lost'
Q -c "select public.refresh_traffic_daily_range_v1(date '2026-11-26', date '2026-11-28')" >/dev/null
check "$(Q -c "$SNAPQ")" "$SNAP" 'p4 rollback: the restored original refresh leaves the page_* values already written untouched (it does not know the columns)'
check "$(FE "$P/20261126190200_traffic_daily_page_engagement_ROLLBACK.sql" | grep -c 'is not the P4 version')" 1 'p4 rollback: rolling back twice is refused (the live function is no longer the P4 version), never a silent overwrite'
F "$P/20261126190200_traffic_daily_page_engagement_PROPOSAL.sql" >/dev/null; Q -c "select public.refresh_traffic_daily_range_v1(date '2026-11-26', date '2026-11-28')" >/dev/null
check "$(Q -c "select page_bounces||'/'||page_engaged from public.traffic_daily where day='2026-11-27'")" '2/1' 'p4 rollback: re-applying after a rollback continues from the same cutover with the same values'
F "$P/20261126190200_traffic_daily_page_engagement_ROLLBACK.sql" >/dev/null
Q -c "create or replace function public.refresh_traffic_daily_range_v1(p_from date, p_to date) returns integer language plpgsql as \$\$ begin return 0; end \$\$"
check "$(FE "$P/20261126190200_traffic_daily_page_engagement_PROPOSAL.sql" | grep -c 'refresh_traffic_daily_range_v1 drift')" 1 'p4: a drifted refresh function makes the file FAIL (P0001)'
F "$P/20261126190100_session_anomaly_axis_ROLLBACK.sql" >/dev/null; check "$(Q -c "select count(*) from pg_proc where proname='fn_ti_session_anomaly_v1'")" 0 'p3: rollback removes the function'

# ───────────── load of the separate automation counter (P1): pgbench, 8 clients x 400 requests, each request its own transaction (as PostgREST runs them)
F "$P/20261126190000_ingest_request_evidence_PROPOSAL.sql" >/dev/null 2>&1 || true
Q -c "truncate public.events, public.crawl_daily"
mkscript() { # $1 = file, $2 = user agent, $3 = tag
  cat > "$1" <<PGB
\set n random(1,1000000000)
select public.ingest_event('sod-$3-' || :n || '-aaaa','page','view','/post/:item',null,null,'chrome',null,'s-$3-' || :n || '-aaaa',null,null,null,jsonb_build_object('measurement', jsonb_build_object('version',2,'page_path','/post/x','visitor_id','vid-$3-aaaa')),false) from (select set_config('request.headers', '{"user-agent":"$2","referer":"https://www.google.com/"}', true)) h;
PGB
}
mkscript "$TMP/drop.pgb" "$HC" drop; mkscript "$TMP/keep.pgb" "$CHROME" keep
PGBENCH="$(dirname "$PG_BIN/psql")/pgbench"; [ -x "$PGBENCH" ] || PGBENCH=$(command -v pgbench)
runb() { "$PGBENCH" -h "$TMP" -p 54398 -U postgres -n -c 8 -j 4 -t 400 -f "$1" review 2>&1 | grep -E "latency average|tps =|number of failed|transactions actually" | tr '\n' ' '; }
DROP_OUT=$(runb "$TMP/drop.pgb")
check "$(Q -c "select count(*) from public.events")|$(Q -c "select count(*)||':'||sum(hits) from public.crawl_daily")" '0|1:3200' 'load: 3,200 concurrent automation-declared requests (own transactions) store no event and the single counter row is exact (no lost update, no deadlock)'
KEEP_OUT=$(runb "$TMP/keep.pgb")
check "$(Q -c "select count(*) from public.events")" 3200 'load: the same number of ordinary requests are stored as before'
echo "INFO load automation-declared (counted, not stored): $DROP_OUT"
echo "INFO load ordinary (stored):                         $KEEP_OUT"
DROP_LAT=$(echo "$DROP_OUT" | sed -n 's/.*latency average = \([0-9.]*\) ms.*/\1/p')
check "$(python3 -c "print(1 if float('$DROP_LAT') < 50 else 0)")" 1 'load: the counted-not-stored path stays under 50 ms average per request with 8 concurrent clients, on this small machine'
echo "TRAFFIC WAVE CLASSIFICATION 20261126 REAL POSTGRES ${pass} checks PASS ($("$PG_BIN/postgres" --version); isolated)"
