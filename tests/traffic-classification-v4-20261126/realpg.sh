#!/usr/bin/env bash
# Acceptance of supabase/proposed/traffic-classification-v4-20261126/{PROPOSAL,ROLLBACK}.sql on an isolated local PostgreSQL (no live URL or credentials).
# live-fn_human_entrances.sql is the live function (md5 checked first); fn_human_entrances_old is an untouched copy for old-vs-new comparison.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd); HERE="$ROOT/tests/traffic-classification-v4-20261126"; D="$ROOT/supabase/proposed/traffic-classification-v4-20261126"
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}; TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54398 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
Q() { "$PG_BIN/psql" -h "$TMP" -p 54398 -U postgres -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
"$PG_BIN/psql" -h "$TMP" -p 54398 -U postgres -qc 'create database review'
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
F="public.fn_human_entrances(date,date)"; LIVE=ed1fd14a3309be7f01b290c7bd7f28d0
md() { Q -c "select md5(pg_get_functiondef('$F'::regprocedure))"; }
Q -f "$HERE/stubs.sql"; Q -f "$HERE/live-fn_human_entrances.sql"
check "$(md)" "$LIVE" "fixture is byte-identical to the live function"
sed 's/fn_human_entrances(/fn_human_entrances_old(/' "$HERE/live-fn_human_entrances.sql" > "$TMP/old.sql"; Q -f "$TMP/old.sql"
ACL0=$(Q -c "select prosecdef||'|'||array_to_string(proconfig,',')||'|'||provolatile::text from pg_proc where oid='$F'::regprocedure")
# sessions: sid, ts, source, path, with/without engagement. One arrival/source event + one page view (+ engagement) per session.
mk() { # n, hour(ts base), path, source, engagement_every(0=never)
  Q -c "insert into public.events(ts,session_id,surface,event_type,path,props)
        select '$2'::timestamptz + (g||' seconds')::interval, '$3-$1-'||g||'-'||'$5', 'arrival','source','$4', jsonb_build_object('source','$5') from generate_series(1,$1) g;
        insert into public.events(ts,session_id,surface,event_type,path,props)
        select '$2'::timestamptz + (g||' seconds')::interval + interval '1 second', '$3-$1-'||g||'-'||'$5', 'page','view','$4', '{}'::jsonb from generate_series(1,$1) g;"; }
eng() { Q -c "insert into public.events(ts,session_id,surface,event_type,path,props) select ts + interval '5 seconds', session_id, 'page','engagement',path,'{}'::jsonb from public.events where surface='page' and event_type='view' and session_id like '$1' and (right(split_part(session_id,'-',3),1)::int % 2)=0"; }
# H1: 12 google sessions on /community/chat (below the threshold). H2: 30 on /community/chat. H3: 30 on /codes/:item (separate partition).
# H4: 30 google on /community/chat, half with engagement. H5: 40 direct sessions (v2/v3 rules, untouched). H6: 24 + 1 second path.
mk 12 '2026-11-20 10:00:00+00' h1 /community/chat google
mk 30 '2026-11-20 11:00:00+00' h2 /community/chat google
mk 30 '2026-11-20 11:00:00+00' h3 /codes/:item google
mk 30 '2026-11-20 12:00:00+00' h4 /community/chat google; eng 'h4-%'
mk 40 '2026-11-20 13:00:00+00' h5 /number/104 direct
mk 24 '2026-11-20 14:00:00+00' h6 /community/chat google
mk 25 '2026-11-20 15:00:00+00' h7 /community/chat google
Q -c "insert into public.events(ts,session_id,surface,event_type,path,props,is_bot) select ts, session_id||'-bot','arrival','source',path,props,true from public.events where session_id like 'h2-%' and surface='arrival' limit 5"
OLD=$(Q -c "select count(*) from public.fn_human_entrances_old(null,null)")
Q -f "$D/PROPOSAL.sql"
check "$(Q -c "select count(*) from public.fn_human_entrances(null,null)")" "$OLD" "same number of sessions before and after"
check "$(Q -c "select prosecdef||'|'||array_to_string(proconfig,',')||'|'||provolatile::text from pg_proc where oid='$F'::regprocedure")" "$ACL0" "SECURITY DEFINER, search_path and volatility unchanged"
check "$(Q -c "select count(*) from (select * from public.fn_human_entrances(null,null) except select * from public.fn_human_entrances_old(null,null)) x where classification_reason is null")" 0 "rows that only the new rule touches all carry a reason"
check "$(Q -c "select count(*) from (select session_id,day,first_ts,landing_path,source,device,country,visitor,is_logged_in,views,interactions,searches,engaged,bounce from public.fn_human_entrances(null,null) except select session_id,day,first_ts,landing_path,source,device,country,visitor,is_logged_in,views,interactions,searches,engaged,bounce from public.fn_human_entrances_old(null,null)) x")" 0 "every column except the classification is identical to the old function"
chg() { Q -c "select coalesce(string_agg(split_part(n.session_id,'-',1)||'='||n.c, ',' order by split_part(n.session_id,'-',1)),'none') from (select session_id, count(*) c from public.fn_human_entrances(null,null) n where suspected_bot and classification_reason like '%(rule v4)' group by 1) n" ; }
check "$(Q -c "select coalesce(string_agg(h||'='||c, ',' order by h),'none') from (select split_part(session_id,'-',1) h, count(*) c from public.fn_human_entrances(null,null) where classification_reason like '%(rule v4)' group by 1) q")" "h2=30,h3=30,h7=25" "flagged: busy hours only (30 and 30 and exactly 25); 12, 24 and the half-engaged hour are not"
check "$(Q -c "select count(*) from public.fn_human_entrances(null,null) where split_part(session_id,'-',1)='h4' and suspected_bot")" 0 "30 sessions in an hour of which half engaged: 15 signature sessions < 25, nothing flagged"
check "$(Q -c "select count(*) from public.fn_human_entrances(null,null) where split_part(session_id,'-',1)='h5' and suspected_bot")" "$(Q -c "select count(*) from public.fn_human_entrances_old(null,null) where split_part(session_id,'-',1)='h5' and suspected_bot")" "direct sessions: rules v2/v3 behave exactly as before"
check "$(Q -c "select count(*) from public.fn_human_entrances(null,null) where session_id like '%-bot'")" 0 "sessions with is_bot are still excluded"
Q -f "$D/PROPOSAL.sql"; check "$(Q -c "select count(*) from public.fn_human_entrances(null,null) where classification_reason like '%(rule v4)'")" 85 "second apply is a no-op"
Q -f "$D/ROLLBACK.sql"; check "$(md)" "$LIVE" "rollback restores the exact live md5"
check "$(Q -c "select count(*) from (select * from public.fn_human_entrances(null,null) except select * from public.fn_human_entrances_old(null,null)) x")" 0 "after rollback output equals the old function row for row"
Q -f "$D/ROLLBACK.sql"; check "$(md)" "$LIVE" "second rollback is a no-op"
Q -c "create or replace function public.fn_human_entrances(p_from date default null, p_to date default null) returns table(session_id text, day date, first_ts timestamptz, landing_path text, source text, device text, country text, visitor text, is_logged_in boolean, views integer, interactions integer, searches integer, engaged boolean, bounce boolean, suspected_bot boolean, classification_reason text) language sql as 'select null::text,null::date,null::timestamptz,null::text,null::text,null::text,null::text,null::text,null::boolean,null::int,null::int,null::int,null::boolean,null::boolean,null::boolean,null::text where false'"
if Q -f "$D/PROPOSAL.sql" >/dev/null 2>&1; then echo "FAIL a drifted function was not refused"; exit 1; else pass=$((pass+1)); echo "PASS drifted function is refused"; fi
echo "ALL $pass PASS"
