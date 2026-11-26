#!/usr/bin/env bash
# Acceptance of supabase/proposed/ingest-event-app-health-20261126/{PROPOSAL,ROLLBACK}.sql on an isolated local PostgreSQL.
# live-ingest_event.sql is the live function (md5 checked first). No live URL or credentials. Needs PG_BIN (default /usr/lib/postgresql/16/bin).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd); HERE="$ROOT/tests/ingest-event-app-health-20261126"; D="$ROOT/supabase/proposed/ingest-event-app-health-20261126"
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}; TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54396 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
Q() { "$PG_BIN/psql" -h "$TMP" -p 54396 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
"$PG_BIN/psql" -h "$TMP" -p 54396 -U postgres -qc 'create database review'
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
F="public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)"
Q -f "$HERE/stubs.sql"; Q -f "$HERE/live-ingest_event.sql"
Q -c "revoke all on function $F from public; grant execute on function $F to anon, authenticated"
LIVE=6dd7585345d10a3a323810fd768fcf3b
md() { Q -c "select md5(pg_get_functiondef('$F'::regprocedure))"; }
acl() { Q -c "select coalesce(proacl::text,'null')||'|'||proowner::regrole||'|'||prosecdef||'|'||array_to_string(proconfig,',') from pg_proc where oid='$F'::regprocedure"; }
check "$(md)" "$LIVE" "fixture is byte-identical to the live function"
ACL0=$(acl)
# an app_health event as the client would send it (envelope version 2, anonymous, no identity)
ev() { Q -c "select public.ingest_event(null,'app_health','$1','/', null,null,'chrome',null,'sess-12345678',null,null,null,'{\"action_version\":1,\"reason\":\"$2\",\"stage\":\"save\",\"measurement\":{\"version\":2,\"page_path\":\"/\",\"visitor_id\":null}}'::jsonb,false)" >/dev/null 2>&1 && echo ok || echo refused; }
check "$(ev save_failed timeout)" refused "before: app_health is refused (unknown family)"
# other families behave the same before and after: one accepted, one refused (snapshot)
els() { Q -c "select public.ingest_event(null,'els','$1','/',null,null,'chrome',null,'sess-12345678',null,null,null,'{\"action_version\":1,\"kind\":\"x\",\"skip\":3,\"measurement\":{\"version\":2,\"page_path\":\"/\",\"visitor_id\":null}}'::jsonb,false)" >/dev/null 2>&1 && echo ok || echo refused; }
BEFORE="$(els search) $(els nope)"; Q -c "truncate public.events"
Q -f "$D/PROPOSAL.sql"
AFTER_MD=$(md)
check "$(Q -c "select md5(replace(pg_get_functiondef('$F'::regprocedure), '\"app_health\":{\"events\":[\"save_started\",\"save_confirmed\",\"save_failed\",\"auth_failed\",\"load_failed\",\"runtime_error\"],\"fields\":{\"reason\":\"token\",\"stage\":\"token\"}},\"video_2029\":{\"events\":[\"play_requested\",\"player_ready\",\"embed_refused\",\"watch_opened\"],\"fields\":{\"provider\":\"token\",\"code\":\"int\",\"wait_s\":\"int\"}},', ''))")" "$LIVE" "after apply, removing the one entry gives the exact live text"
check "$(acl)" "$ACL0" "owner, privileges, SECURITY DEFINER and search_path unchanged"
check "$(ev save_failed timeout)" ok "after: app_health save_failed accepted"
for e in save_started save_confirmed auth_failed load_failed runtime_error; do check "$(ev $e x)" ok "after: $e accepted"; done
vid() { Q -c "select public.ingest_event(null,'video_2029','$1','/community/chat',null,null,'chrome',null,'sess-12345678',null,null,null,'{\"action_version\":1,$2\"measurement\":{\"version\":2,\"page_path\":\"/community/chat\",\"visitor_id\":null}}'::jsonb,false)" >/dev/null 2>&1 && echo ok || echo refused; }
check "$(vid play_requested '"provider":"youtube",')" ok "after: video_2029 play_requested accepted"
check "$(vid embed_refused '"provider":"youtube","code":150,"wait_s":3,')" ok "after: video_2029 embed_refused with code and seconds accepted"
for e in player_ready watch_opened; do check "$(vid $e '"provider":"vimeo",')" ok "after: video_2029 $e accepted"; done
check "$(vid view '"provider":"youtube",')" refused "after: a video event named view is refused"
check "$(vid play_requested '"provider":"youtube","video_id":"abc",')" refused "after: a video id field is refused"
check "$(vid play_requested '"provider":"you tube",')" refused "after: a provider that is not a token is refused"
check "$(ev save_gibberish x)" refused "after: an event name outside the six is refused"
check "$(Q -c "select public.ingest_event(null,'app_health','save_failed','/',null,null,'chrome',null,'sess-12345678',null,null,null,'{\"action_version\":1,\"reason\":\"has space and text\",\"measurement\":{\"version\":2,\"page_path\":\"/\",\"visitor_id\":null}}'::jsonb,false)" >/dev/null 2>&1 && echo ok || echo refused)" refused "after: free text in a field is refused (token only)"
check "$(Q -c "select public.ingest_event(null,'app_health','save_failed','/',null,null,'chrome',null,'sess-12345678',null,null,null,'{\"action_version\":1,\"email\":\"a\",\"measurement\":{\"version\":2,\"page_path\":\"/\",\"visitor_id\":null}}'::jsonb,false)" >/dev/null 2>&1 && echo ok || echo refused)" refused "after: an unknown field (identity-like) is refused"
check "$(Q -c "select public.ingest_event(null,'app_health','save_failed','/','ref.example',null,'chrome',null,'sess-12345678',null,null,null,'{\"action_version\":1,\"reason\":\"a\",\"measurement\":{\"version\":2,\"page_path\":\"/\",\"visitor_id\":null}}'::jsonb,false)" >/dev/null 2>&1 && echo ok || echo refused)" refused "after: the envelope still refuses a referrer host"
Q -c "truncate public.events"
check "$(els search) $(els nope)" "$BEFORE" "other families: same accept/refuse answers before and after"
check "$(Q -c "select count(*) from public.events where surface<>'els'")" 0 "the proposal itself writes no history row"
Q -f "$D/PROPOSAL.sql"; check "$(md)" "$AFTER_MD" "second apply is a no-op"
Q -f "$D/ROLLBACK.sql"; check "$(md)" "$LIVE" "rollback restores the exact live md5"
check "$(acl)" "$ACL0" "rollback keeps privileges"
Q -f "$D/ROLLBACK.sql"; check "$(md)" "$LIVE" "second rollback is a no-op"
Q -c "create or replace function public.ingest_event_drift() returns void language sql as 'select 1'"
DEF=$(Q -c "select replace(pg_get_functiondef('$F'::regprocedure), 'invalid action token', 'invalid action token x')")
Q -c "$DEF"
if Q -f "$D/PROPOSAL.sql" >/dev/null 2>&1; then echo "FAIL a drifted function was not refused"; exit 1; else pass=$((pass+1)); echo "PASS drifted function is refused"; fi
echo "ALL $pass PASS"
