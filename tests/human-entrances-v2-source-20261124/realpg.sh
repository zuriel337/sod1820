#!/usr/bin/env bash
# Acceptance of supabase/proposed/20261124210000_human_entrances_v2_source_{PROPOSAL,ROLLBACK}.sql against an isolated
# local PostgreSQL. The fixture holds the two functions exactly as read live on 24.11.2026 (their md5 is checked first),
# so the proposal's own guards run unchanged. No live URL or credentials are read or accepted.
# Needs PostgreSQL binaries (PG_BIN, default /usr/lib/postgresql/16/bin); as root the cluster is owned by PG_USER (postgres).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
HERE="$ROOT/tests/human-entrances-v2-source-20261124"
PROPOSAL="$ROOT/supabase/proposed/20261124210000_human_entrances_v2_source_PROPOSAL.sql"
ROLLBACK="$ROOT/supabase/proposed/20261124210000_human_entrances_v2_source_ROLLBACK.sql"
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
day() { Q -c "select entrances||'/'||suspected||'/'||bounces||'/'||engaged from public.traffic_daily where day='$1'"; }

Q -f "$HERE/fixture.sql"
check "$(Q -c "select md5(pg_get_functiondef('public.fn_human_entrances(date,date)'::regprocedure))")" bdb2647a22c4d1c53cfc84d808a59b86 "fixture fn_human_entrances is byte-identical to live"
check "$(Q -c "select md5(pg_get_functiondef('public.refresh_traffic_daily_range_v1(date,date)'::regprocedure))")" b299c5feb8f8f39ecc96a9ae238b8cca "fixture refresh_traffic_daily_range_v1 is byte-identical to live"

Q <<'SQL'
-- Legacy envelope (before 15.11): via and country are carried on the event.
insert into public.events(ts,session_id,sod_id,surface,event_type,path,via,props) values
 ('2026-11-10 10:00:00+00','L1','s1','page','view','/post/:item','google','{"country":"IL"}'),
 ('2026-11-10 10:00:01+00','L1','s1','page','view','/post/:item','google','{"country":"IL"}'),
 ('2026-11-10 11:00:00+00','L2','s2','page','view','/post/:item','direct',null),
 ('2026-11-10 12:00:00+00','L3','s3','page','view','/number/26','direct','{"country":"IL"}'),
 ('2026-11-10 13:00:00+00','L4','s4','page','view','/post/:item','facebook','{"country":"IL"}');
-- v2 envelope (from 15.11): no via, no country; the source is the session's arrival/source token.
insert into public.events(ts,session_id,sod_id,surface,event_type,path,via,props,is_bot) values
 ('2026-11-16 08:00:00+00','V1','v1','arrival','source','/post/:item',null,'{"source":"google","tagged":false,"action_version":1}',false),
 ('2026-11-16 08:00:00+00','V1','v1','page','view','/post/:item',null,'{"measurement":{"version":2,"page_path":"/post/abc","visitor_id":"v1"}}',false),
 ('2026-11-16 09:00:00+00','V2','v2','arrival','source','/number/:value',null,'{"source":"direct","tagged":false,"action_version":1}',false),
 ('2026-11-16 09:00:00+00','V2','v2','page','view','/number/:value',null,'{"measurement":{"version":2,"page_path":"/number/26","visitor_id":"v2"}}',false),
 ('2026-11-16 10:00:00+00','V3','v3','arrival','source','/post/:item',null,'{"source":"direct","tagged":false,"action_version":1}',false),
 ('2026-11-16 10:00:00+00','V3','v3','page','view','/post/:item',null,'{"measurement":{"version":2,"page_path":"/post/def","visitor_id":"v3"}}',false),
 ('2026-11-16 11:00:00+00','V4','v4','arrival','source','/',null,'{"source":"google","tagged":false,"action_version":1}',false),
 ('2026-11-16 11:00:00+00','V4','v4','page','view','/',null,'{"measurement":{"version":2,"page_path":"/","visitor_id":"v4"}}',false),
 ('2026-11-16 11:02:00+00','V4','v4','page','view','/gematria',null,'{"measurement":{"version":2,"page_path":"/gematria","visitor_id":"v4"}}',false),
 ('2026-11-16 12:00:00+00','V5','v5','page','view','/post/:item',null,'{"measurement":{"version":2,"page_path":"/post/ghi","visitor_id":"v5"}}',false),
 ('2026-11-16 13:00:00+00','V6','v6','page','view','/post/:item',null,'{"measurement":{"version":2,"page_path":"/post/jkl","visitor_id":"v6"}}',true),
 ('2026-11-17 08:00:00+00','V7','v7','arrival','source','/gematria',null,'{"source":"direct","tagged":false,"action_version":1}',false),
 ('2026-11-17 08:00:00+00','V7','v7','page','view','/gematria',null,'{"measurement":{"version":2,"page_path":"/gematria","visitor_id":"v7"}}',false),
 ('2026-11-17 08:01:00+00','V7','v7','activity_2029','search','/gematria',null,'{"operation_id":"00000000-0000-4000-8000-000000000001","measurement":{"version":2,"page_path":"/gematria","visitor_id":"v7"}}',false);
select from public.refresh_traffic_daily_range_v1('2026-11-09', current_date);
SQL
# The live state before the fix: v2 single-view sessions are in neither entrances nor suspected.
check "$(day 2026-11-10)" "2/2/1/1" "legacy day before the fix: 2 entrances, 2 suspected (rules v2+v3), 1 bounce, 1 engaged"
check "$(day 2026-11-16)" "1/0/0/1" "v2 day before the fix reproduces live: 4 of 5 human sessions vanish, bounces 0"
check "$(day 2026-11-17)" "1/0/0/0" "v2 session with an interaction is counted before the fix (FALSE AND NULL = FALSE)"
check "$(Q -c "select count(*) from public.fn_human_entrances('2026-11-15','2026-11-24') where suspected_bot is null")" 4 "four NULL suspected_bot before the fix (V1, V2, V3, V5)"

Q -f "$PROPOSAL"
check "$(day 2026-11-10)" "2/2/1/1" "legacy day after the fix is unchanged"
check "$(day 2026-11-16)" "4/1/3/1" "v2 day after the fix: 4 entrances, V2 suspected by rule v3, 3 bounces, 1 engaged"
check "$(day 2026-11-17)" "1/0/0/0" "v2 session with an interaction is unchanged"
check "$(Q -c "select source||':'||coalesce(classification_reason,'-') from public.fn_human_entrances('2026-11-15','2026-11-17') where session_id='V2'")" "direct:direct + numeric_landing + single_view + no_interaction (rule v3)" "source comes from arrival/source; reason is rule v3"
check "$(Q -c "select suspected_bot::text||':'||coalesce(source,'none') from public.fn_human_entrances('2026-11-15','2026-11-17') where session_id='V3'")" "false:direct" "v2 direct single view is not suspected: rule v2 needs collected country evidence"
check "$(Q -c "select suspected_bot::text||':'||coalesce(source,'none') from public.fn_human_entrances('2026-11-15','2026-11-17') where session_id='V5'")" "false:none" "v2 session without arrival evidence stays unknown-source and is never NULL"
check "$(Q -c "select count(*) from public.fn_human_entrances('2026-11-15','2026-11-17') where session_id='V6'")" 0 "bot session stays excluded"
check "$(Q -c "select jsonb_array_length(payload->'rows') from public.analytics_cache where cache_key='traffic_daily_before_v2_source_fix_20261124'")" 3 "pre-fix rows kept in analytics_cache"
check "$(Q -c "select (payload->'rows'->1->>'entrances') from public.analytics_cache where cache_key='traffic_daily_before_v2_source_fix_20261124'")" 1 "snapshot holds the undercounted value of 16.11"
check "$(Q -c "select proacl is null from pg_proc where oid='public.fn_human_entrances(date,date)'::regprocedure")" t "privileges of fn_human_entrances are untouched by CREATE OR REPLACE"

if Q -f "$PROPOSAL" 2>/dev/null; then echo "FAIL the proposal ran twice"; exit 1; else pass=$((pass+1)); echo "PASS a second run stops at the definition guard"; fi

Q -f "$ROLLBACK"
check "$(Q -c "select md5(pg_get_functiondef('public.fn_human_entrances(date,date)'::regprocedure))")" bdb2647a22c4d1c53cfc84d808a59b86 "rollback restores the exact live definition"
check "$(day 2026-11-16)" "1/0/0/1" "rollback restores the pre-fix rows"
check "$(Q -c "select payload ? 'rolled_back_at' from public.analytics_cache where cache_key='traffic_daily_before_v2_source_fix_20261124'")" t "rollback marks the snapshot"
if Q -f "$ROLLBACK" 2>/dev/null; then echo "FAIL rollback ran twice"; exit 1; else pass=$((pass+1)); echo "PASS a second rollback stops at its guard"; fi

# A drifted live function stops the proposal before any write.
Q -c "delete from public.analytics_cache"
Q -c "comment on function public.fn_human_entrances(date,date) is 'x'"   # comments do not change pg_get_functiondef
Q <<'SQL'
create or replace function public.fn_human_entrances(p_from date default null, p_to date default null)
 returns table(session_id text, day date, first_ts timestamptz, landing_path text, source text, device text, country text, visitor text, is_logged_in boolean, views integer, interactions integer, searches integer, engaged boolean, bounce boolean, suspected_bot boolean, classification_reason text)
 language sql stable security definer set search_path to 'public' as $$ select null::text, null::date, null::timestamptz, null, null, null, null, null, null::boolean, 0, 0, 0, false, false, false, null where false $$;
SQL
if Q -f "$PROPOSAL" 2>/dev/null; then echo "FAIL the proposal ran over a drifted function"; exit 1; else pass=$((pass+1)); echo "PASS a drifted function stops the proposal"; fi
check "$(Q -c "select count(*) from public.analytics_cache")" 0 "nothing was written when the guard stopped"
echo "ALL $pass PASS"
