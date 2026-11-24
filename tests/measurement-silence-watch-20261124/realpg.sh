#!/usr/bin/env bash
# Acceptance of supabase/proposed/20261124230000_measurement_silence_watch_{PROPOSAL,ROLLBACK}.sql on an isolated local
# PostgreSQL. The fixture holds fn_reliability_watch exactly as read live on 24.11.2026 (md5 checked first), so the
# proposal's guard runs unchanged. Scenarios are written relative to now(). No live URL or credentials are read.
# Needs PostgreSQL binaries (PG_BIN, default /usr/lib/postgresql/16/bin); as root the cluster is owned by PG_USER (postgres).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
HERE="$ROOT/tests/measurement-silence-watch-20261124"
PROPOSAL="$ROOT/supabase/proposed/20261124230000_measurement_silence_watch_PROPOSAL.sql"
ROLLBACK="$ROOT/supabase/proposed/20261124230000_measurement_silence_watch_ROLLBACK.sql"
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54393 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
Q() { "$PG_BIN/psql" -h "$TMP" -p 54393 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
"$PG_BIN/psql" -h "$TMP" -p 54393 -U postgres -qc 'create database review'
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
reset() { Q -c "truncate public.events, public.site_visits, public.work_log, public.notices"; }
# page views (and one site_visit + one RUM load each) every $2 minutes from $1 minutes ago to $3 minutes ago
traffic() { Q -c "insert into public.events(ts,session_id,surface,event_type,path) select now()-make_interval(mins=>m), 's'||m, 'page','view','/' from generate_series($3,$1,$2) m;
  insert into public.site_visits(ts,path,visitor) select now()-make_interval(mins=>m), '/', 'v'||m from generate_series($3,$1,$2) m;
  insert into public.events(ts,surface,event_type,path,props) select now()-make_interval(mins=>m), 'performance','web_vital','/', jsonb_build_object('sample_id','r'||m) from generate_series($3,$1,$2) m;"; }
alerts() { Q -c "select count(*)||':'||coalesce(string_agg(open_threads, ',' order by open_threads),'') from public.work_log where status='alert'"; }
watch() { Q -c "select public.fn_reliability_watch()" >/dev/null; }
SHABBAT=$(Q -c "select ((extract(dow from now() at time zone 'Asia/Jerusalem')=5 and extract(hour from now() at time zone 'Asia/Jerusalem')>=15) or (extract(dow from now() at time zone 'Asia/Jerusalem')=6 and extract(hour from now() at time zone 'Asia/Jerusalem')<23))::text" 2>/dev/null || echo false)

Q -f "$HERE/fixture.sql"
check "$(Q -c "select md5(pg_get_functiondef('public.fn_reliability_watch()'::regprocedure))")" 3cc04b93669c01d33f513a2c8867f104 "fixture fn_reliability_watch is byte-identical to live"

# The live behaviour this replaces: page views gone, RUM flowing -> the old dead-man says nothing.
reset; traffic 70 2 0; Q -c "delete from public.events where surface='page' and ts > now()-interval '50 minutes'"; watch
check "$(alerts)" "0:" "old detector: page views stopped while RUM flows is silent (the 4.11-15.11 blind spot)"

Q -f "$PROPOSAL"
check "$(Q -c "select position('v2_measurement_silence_20261124' in pg_get_functiondef('public.fn_reliability_watch()'::regprocedure)) > 0")" t "proposal installs the new section"
check "$(Q -c "select proacl is null from pg_proc where oid='public.fn_reliability_watch()'::regprocedure")" t "privileges untouched by CREATE OR REPLACE"

reset; traffic 70 2 0; watch
check "$(alerts)" "0:" "normal traffic: no alert"

reset; traffic 70 2 0; Q -c "delete from public.events where surface='page' and ts > now()-interval '50 minutes'"; watch
check "$(alerts)" "1:kind:page_view_stopped" "page views stopped while visitors and RUM are seen: one alert"
watch; watch
check "$(alerts)" "1:kind:page_view_stopped" "same condition on later checks: no duplicate alert (24 h per kind)"
check "$(Q -c "select count(*) from public.notices")" 1 "one admin notice"
check "$(Q -c "select (what_we_did like '%צפיות בדף 0 (סשנים 0)%')::text from public.work_log")" true "the alert states the three meters"

reset; traffic 70 2 0; Q -c "delete from public.events where surface='page' and ts > now()-interval '30 minutes'"; watch
check "$(alerts)" "0:" "a gap seen at one check only (not 15 minutes earlier) waits"

reset; traffic 70 2 0; Q -c "delete from public.events where surface='page' and ts > now()-interval '50 minutes'"; Q -c "delete from public.site_visits where ts > now()-interval '50 minutes'; delete from public.events where surface='performance' and ts > now()-interval '50 minutes'; insert into public.site_visits(ts,path,visitor) values (now()-interval '40 minutes','/','q1'), (now()-interval '20 minutes','/','q2'), (now()-interval '5 minutes','/','q2')"; watch
check "$(alerts)" "0:" "natural quiet (no page view, 2 visitors, no RUM): no alert"

reset; traffic 80 2 0; Q -c "delete from public.events where surface='page' and ts > now()-interval '80 minutes' and (extract(epoch from now()-ts)::int/60) % 8 <> 0"; watch
check "$(alerts)" "1:kind:page_view_partial" "most page views lost against site_visits: partial alert"
Q -c "delete from public.events where surface='page' and ts > now()-interval '50 minutes'"; watch
check "$(alerts)" "1:kind:page_view_partial" "partial then stopped within 24 h is one incident: no second alert"

reset; traffic 70 2 0; Q -c "delete from public.site_visits where ts > now()-interval '50 minutes'"; watch
check "$(alerts)" "1:kind:visit_meter_stopped" "site_visits silent while page views arrive: visit-meter alert"

reset; traffic 200 5 100; watch
if [ "$SHABBAT" = true ]; then want="0:"; label="100 min of total silence on Shabbat waits (limit 240)"; else want="1:שני מדי האתר שקטים יחד: תקלה כוללת (אתר, Service Worker, ingest_event, track_visit) או היעדר גולשים. לבדוק את האתר ואת הפריסה האחרונה."; label="100 min of total silence on a weekday alerts (limit 90)"; fi
check "$(alerts)" "$want" "$label"

reset; traffic 400 5 250; watch
check "$(Q -c "select count(*) from public.work_log where topic='🚨 ניטור ingest אירועים (אוטומטי)'")" 1 "250 min of total silence alerts on any day"
watch
check "$(Q -c "select count(*) from public.work_log where topic='🚨 ניטור ingest אירועים (אוטומטי)'")" 1 "total silence: no duplicate within 3 hours"

reset; traffic 200 5 100; Q -c "insert into public.site_visits(ts,path,visitor) values (now()-interval '10 minutes','/','x1')"; watch
check "$(Q -c "select count(*) from public.work_log where topic='🚨 ניטור ingest אירועים (אוטומטי)'")" 0 "a recent human visit means not total silence"

# Control: every check leaves its inputs and verdict; a failure of the section is recorded and alerted, never swallowed.
reset; traffic 70 2 0; watch
check "$(Q -c "select (payload->>'ok')||':'||(payload->>'page_views_30m')||':'||coalesce(payload->>'kind_now','none') from public.analytics_cache where cache_key='reliability_watch:measurement_silence'")" "true:15:none" "state row records the inputs and verdict of the check"
Q -c "alter table public.site_visits rename to site_visits_hidden"; reset_partial() { Q -c "truncate public.events, public.work_log, public.notices"; }; reset_partial; watch
check "$(Q -c "select (payload->>'ok')||':'||(payload->>'sqlstate') from public.analytics_cache where cache_key='reliability_watch:measurement_silence'")" "false:42P01" "a failing section writes ok=false with its sqlstate"
check "$(Q -c "select count(*) from public.work_log where topic='🚨 כשל בגלאי המדידה (אוטומטי)'")" 1 "a failing section alerts"
check "$(Q -c "select count(*) from public.notices where t like '%כשל בגלאי המדידה%'")" 1 "the admin is notified of the failure"
watch; watch
check "$(Q -c "select count(*) from public.work_log where topic='🚨 כשל בגלאי המדידה (אוטומטי)'")" 1 "the failure alert is not repeated within 6 hours"
check "$(Q -c "select count(*) from public.analytics_cache where cache_key='reliability_heartbeat:health_watch'")" 1 "the heartbeat and the other sections still run"
Q -c "alter table public.site_visits_hidden rename to site_visits"; reset; traffic 70 2 0; watch
check "$(Q -c "select payload->>'ok' from public.analytics_cache where cache_key='reliability_watch:measurement_silence'")" true "after recovery the state row is ok again"

if Q -f "$PROPOSAL" 2>/dev/null; then echo "FAIL the proposal ran twice"; exit 1; else pass=$((pass+1)); echo "PASS a second run stops at the definition guard"; fi
Q -f "$ROLLBACK"
check "$(Q -c "select md5(pg_get_functiondef('public.fn_reliability_watch()'::regprocedure))")" 3cc04b93669c01d33f513a2c8867f104 "rollback restores the exact live definition"
if Q -f "$ROLLBACK" 2>/dev/null; then echo "FAIL rollback ran twice"; exit 1; else pass=$((pass+1)); echo "PASS a second rollback stops at its guard"; fi
Q -c "create or replace function public.fn_reliability_watch() returns void language plpgsql security definer set search_path to 'public' as \$\$ begin null; end \$\$"
if Q -f "$PROPOSAL" 2>/dev/null; then echo "FAIL the proposal ran over a drifted function"; exit 1; else pass=$((pass+1)); echo "PASS a drifted function stops the proposal"; fi
echo "ALL $pass PASS"
