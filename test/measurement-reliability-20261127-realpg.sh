#!/usr/bin/env bash
# S1 (27.11.2026): runs the REAL 01/02/03 proposal files under psql on an isolated local PostgreSQL.
#  * classifier and /stats producer: the exact LIVE definitions (fixtures verified by md5 below) are loaded first.
#  * ingest_event: a stub with the same signature and the same clause text (the live text is not reproducible from the repository); in a TEMP COPY the md5 pins
#    are replaced by the stub's md5 values. The committed files keep the live pins.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=$ROOT/supabase/proposed/measurement-reliability-20261127
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54396 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
PSQL=("$PG_BIN/psql" -h "$TMP" -p 54396 -U postgres -d postgres -v ON_ERROR_STOP=1)
Q() { "${PSQL[@]}" -qtAX "$@"; }
F() { "${PSQL[@]}" -qX -f "$1" >/dev/null; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
refused() { if F "$1" 2>/dev/null; then echo "FAIL $2 (was not refused)"; exit 1; fi; pass=$((pass+1)); echo "PASS $2"; }
Q -c "create table public.events(session_id text, ts timestamptz default now(), event_type text, is_bot boolean default false, props jsonb, person_id uuid, sod_id text, surface text);
 create table public.persons(person_id uuid, account_user_id uuid);
 create function public.fn_human_entrances(date,date) returns table(session_id text, suspected_bot boolean, classification_reason text) language sql as 'select null::text,false,null::text where false';
 create table public.analytics_cache(cache_key text primary key, payload jsonb);"
CLS=public.fn_ti_clean_classification\(date,date\); PULSE=public.fn_ti_activity_pulse2029\(integer\)
F "$DIR/fixtures/fn_ti_clean_classification.live-20261127.sql"; F "$DIR/fixtures/fn_ti_activity_pulse2029.live-20261127.sql"
check "$(Q -c "select md5(pg_get_functiondef('$CLS'::regprocedure))")" cf9bb5f396949bffb1c4dcfda3fbab71 'fixture = the live classifier (md5)'
check "$(Q -c "select md5(pg_get_functiondef('$PULSE'::regprocedure))")" 83b931888f51de9429367006c6608e9d 'fixture = the live /stats producer (md5)'

# ---------- 02: classifier ----------
CUT=$(Q -c "select to_char((now()+interval '1 minute') at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')||'+00'")
sed -E "s/^\\\\set cutover .*/\\\\set cutover '$CUT'/" "$DIR/02-classifier-activity-proof.sql" > "$TMP/02.sql"
Q <<SQL
create or replace function pg_temp.eng(s text, v int, em int, sc int, past boolean, vis text default null) returns void language sql as \$\$
  insert into public.events(session_id,ts,event_type,surface,sod_id,props) values (s, case when past then now()-interval '1 day' else now()+interval '2 hours' end, 'engagement','page', coalesce(vis,s),
   jsonb_build_object('engagement_version',v,'engaged_ms',em,'visible_ms',em+1000,'max_scroll_pct',sc,'idle_threshold_ms',20000,'flush_reason','pagehide')) \$\$;
create or replace function pg_temp.view(s text, n int, vis text default null, tt timestamptz default now()+interval '2 hours') returns void language sql as \$\$
  insert into public.events(session_id,ts,event_type,surface,sod_id,props) select s, tt + (g||' seconds')::interval,'view','page', coalesce(vis,s), '{}'::jsonb from generate_series(1,n) g \$\$;
select pg_temp.eng('old_artifact',1,16000,0,true), pg_temp.view('old_artifact',1,null,now()-interval '1 day');
select pg_temp.eng('new_artifact',1,16000,0,false), pg_temp.view('new_artifact',1);
select pg_temp.eng('new_scroll',1,16000,30,false), pg_temp.view('new_scroll',1);
select pg_temp.eng('new_over_idle',1,25000,0,false), pg_temp.view('new_over_idle',1);
select pg_temp.eng('new_v2',2,16000,0,false), pg_temp.view('new_v2',1);
-- one visitor, 20 sessions, 600 fast page views and no human evidence at all: intensity alone must never be a bot
select pg_temp.view('heavy_'||g, 30, 'researcher') from generate_series(1,20) g;
insert into public.events(session_id,event_type,surface,is_bot,sod_id,props) values ('real_bot','view','page',true,'botv','{}');
SQL
cls() { Q -c "select clean_classification||'/'||clean_classification_source from public.fn_ti_clean_classification(null,null) where session_id='$1'"; }
check "$(cls old_artifact)" 'human/dwell>=15s' 'before the change: the automatic credit makes a human (baseline)'
check "$(cls new_artifact)" 'human/dwell>=15s' 'before the change: post-cutover artifact is still human (baseline)'
RES0=$(Q -c "select pg_get_function_result('$CLS'::regprocedure)")
F "$TMP/02.sql"
check "$(Q -c "select md5(pg_get_functiondef('$CLS'::regprocedure)) <> 'cf9bb5f396949bffb1c4dcfda3fbab71'")" t '02 applies under real psql (the md5 pin matched the live text)'
check "$(cls old_artifact)" 'human/dwell>=15s' 'PROSPECTIVE: an engagement event before the cutover keeps the old rule (no rewrite of the past)'
check "$(cls new_artifact)" 'unknown/none' 'after the cutover the automatic first-20-second credit alone is unknown, not human'
check "$(Q -c "select clean_classification from public.fn_ti_clean_classification(null,null) where session_id='new_artifact'")" unknown 'it is unknown, never bot'
check "$(cls new_scroll)" 'human/dwell>=15s' 'engagement with scrolling proves activity'
check "$(cls new_over_idle)" 'human/dwell>=15s' 'engaged_ms above the 20 s idle window proves activity'
check "$(cls new_v2)" 'human/dwell>=15s' 'engagement_version 2 with engaged_ms counts directly'
check "$(Q -c "select count(*) from public.fn_ti_clean_classification(null,null) where session_id like 'heavy_%' and clean_classification='bot'")" 0 'INTENSITY IS NOT A BOT: a visitor with 20 sessions and 600 fast views is never classified bot'
check "$(Q -c "select count(distinct clean_classification) from public.fn_ti_clean_classification(null,null) where session_id like 'heavy_%'")" 1 'the heavy sessions get the same honest class (unknown: no human evidence yet)'
check "$(cls real_bot)" 'bot/raw_is_bot' 'a real bot flag is still bot'
check "$(Q -c "select (clean_evidence->>'engagement_activity_proof') from public.fn_ti_clean_classification(null,null) where session_id='new_scroll'")" true 'the evidence records the activity proof'
check "$(Q -c "select pg_get_function_result('$CLS'::regprocedure)")" "$RES0" 'signature and output columns are unchanged'
F "$TMP/02.sql"; pass=$((pass+1)); echo 'PASS a second apply is a no-op'
sed -E "s/^\\\\set cutover .*/\\\\set cutover '2020-01-01 00:00:00+00'/" "$DIR/02-classifier-activity-proof.sql" > "$TMP/02.past.sql"
F "$DIR/02-classifier-activity-proof.rollback.sql"
check "$(Q -c "select md5(pg_get_functiondef('$CLS'::regprocedure))")" cf9bb5f396949bffb1c4dcfda3fbab71 'rollback restores the exact live classifier'
refused "$TMP/02.past.sql" 'a cutover in the past is refused'
Q -c "create or replace function public.fn_ti_clean_classification(p_from date default null, p_to date default null) returns table(session_id text, clean_classification text, clean_classification_reason text, clean_classification_source text, clean_classifier_version text, clean_evidence jsonb, clean_eligible boolean, legacy_suspected_bot boolean, legacy_classification_reason text) language sql as 'select null::text,null::text,null::text,null::text,null::text,null::jsonb,null::boolean,null::boolean,null::text where false'"
refused "$TMP/02.sql" 'a drifted classifier is refused (md5 pin)'
F "$DIR/fixtures/fn_ti_clean_classification.live-20261127.sql"

# ---------- 03: floors by visitor ----------
F "$DIR/03-floors-by-visitor.sql"
D=$(Q -c "select pg_get_functiondef('$PULSE'::regprocedure)")
check "$(printf '%s' "$D" | grep -c 'count(distinct session_id)' || true)" 0 '03: no list counts distinct sessions any more'
check "$(printf '%s' "$D" | grep -o 'count(distinct coalesce(sod_id,session_id))' | wc -l | tr -d ' ')" 15 '03: all 15 floor counts use distinct visitors (sod_id, session as fallback)'
check "$(printf '%s' "$D" | grep -c "ti_activity_pulse2029:v3:")" 1 '03: the cache key moved to v3'
check "$(printf '%s' "$D" | grep -c "'threshold',jsonb_build_object('events',10,'sessions',5,'floor_unit','distinct_visitor')")" 1 '03: the thresholds stay 10 and 5 and name their unit'
F "$DIR/03-floors-by-visitor.sql"; pass=$((pass+1)); echo 'PASS 03 second apply is a no-op'
F "$DIR/03-floors-by-visitor.rollback.sql"
check "$(Q -c "select md5(pg_get_functiondef('$PULSE'::regprocedure))")" 83b931888f51de9429367006c6608e9d '03 rollback restores the exact live producer'
Q -c "create or replace function public.fn_ti_activity_pulse2029(p_hours integer default 24) returns jsonb language plpgsql as 'begin return null; end'"
refused "$DIR/03-floors-by-visitor.sql" '03 refuses a drifted producer'

# ---------- 01: ingest_event engagement v2 (stub with the exact clause) ----------
Q <<'SQL'
create function public.ingest_event(p_sod_id text, p_surface text, p_event_type text, p_path text default null, p_ref_host text default null, p_via text default null, p_app_context text default null, p_device text default null, p_session_id text default null, p_journey_id text default null, p_depth smallint default null, p_utm jsonb default null, p_props jsonb default null, p_is_bot boolean default false)
returns void language plpgsql as $f$
declare v_props jsonb := p_props;
begin
  if (select 1) is distinct from 1
        or v_props->'engagement_version' is distinct from '1'::jsonb
        or coalesce(v_props->>'flush_reason' not in ('route_change','pagehide'),true) then raise exception 'invalid engagement'; end if;
end $f$;
SQL
IE='public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'
S0=$(Q -c "select md5(pg_get_functiondef('$IE'::regprocedure))")
S1=$(Q -c "select md5(replace(pg_get_functiondef('$IE'::regprocedure), \$q\$or v_props->'engagement_version' is distinct from '1'::jsonb\$q\$, \$q\$or (v_props->'engagement_version' is distinct from '1'::jsonb and v_props->'engagement_version' is distinct from '2'::jsonb)\$q\$))")
sed "s/3d2fa7cf1aa7513b981d338cab5aebc2/$S0/g; s/d5a37d261f13c4f910d1bdd6ecf1417c/$S1/g" "$DIR/01-ingest-event-engagement-v2.sql" > "$TMP/01.sql"
sed "s/3d2fa7cf1aa7513b981d338cab5aebc2/$S0/g" "$DIR/01-ingest-event-engagement-v2.rollback.sql" > "$TMP/01.rb.sql"
check "$(grep -c 3d2fa7cf1aa7513b981d338cab5aebc2 "$DIR/01-ingest-event-engagement-v2.sql")" 2 '01: the committed file pins the live md5'
refused_call() { if "$PG_BIN/psql" -h "$TMP" -p 54396 -U postgres -d postgres -qtAX -c "select public.ingest_event('x','page','engagement',null,null,null,null,null,null,null,null,null,'{\"engagement_version\":2,\"flush_reason\":\"pagehide\"}'::jsonb,false)" >/dev/null 2>&1; then return 1; else return 0; fi; }
check "$(refused_call && echo refused || echo accepted)" refused 'before 01: a version-2 engagement payload is refused'
F "$TMP/01.sql"
check "$(refused_call && echo refused || echo accepted)" accepted 'after 01: version 2 is accepted'
check "$("$PG_BIN/psql" -h "$TMP" -p 54396 -U postgres -d postgres -qtAX -c "select public.ingest_event('x','page','engagement',null,null,null,null,null,null,null,null,null,'{\"engagement_version\":1,\"flush_reason\":\"pagehide\"}'::jsonb,false)" >/dev/null 2>&1 && echo accepted || echo refused)" accepted 'after 01: version 1 (stale clients) is still accepted'
check "$("$PG_BIN/psql" -h "$TMP" -p 54396 -U postgres -d postgres -qtAX -c "select public.ingest_event('x','page','engagement',null,null,null,null,null,null,null,null,null,'{\"engagement_version\":3,\"flush_reason\":\"pagehide\"}'::jsonb,false)" >/dev/null 2>&1 && echo accepted || echo refused)" refused 'after 01: any other version is refused'
F "$TMP/01.sql"; pass=$((pass+1)); echo 'PASS 01 second apply is a no-op'
F "$TMP/01.rb.sql"
check "$(Q -c "select md5(pg_get_functiondef('$IE'::regprocedure))")" "$S0" '01 rollback restores the exact text'
# ---------- 05: scrub of historical issue-report text (copy first, then remove; no event row deleted) ----------
Q <<'SQL'
create table public.feedback(id uuid default gen_random_uuid(), context text, verdict text, query text, target text, detail text, visitor_id text, meta jsonb, created_at timestamptz default now());
alter table public.events add column event_id uuid default gen_random_uuid();
insert into public.events(session_id,event_type,surface,props) values ('r1','issue_report','issue_report','{"surface":"post","message":"טקסט ראשון","path":"/post"}'),('r2','issue_report','issue_report','{"surface":"number","message":"טקסט שני"}');
SQL
F "$DIR/05-scrub-issue-report-text.sql"
check "$(Q -c "select count(*) from public.events where surface='issue_report' and props ? 'message'")" 0 '05: no free text is left in the analytics events'
check "$(Q -c "select count(*) from public.events where surface='issue_report'")" 2 '05: no event row is deleted'
check "$(Q -c "select count(*) from public.feedback where context='issue_report_migrated' and detail in ('טקסט ראשון','טקסט שני')")" 2 '05: every message is in the support store first'
F "$DIR/05-scrub-issue-report-text.sql"; pass=$((pass+1)); echo 'PASS 05: a second run is a no-op'
check "$(Q -c "select count(*) from public.feedback where context='issue_report_migrated'")" 2 '05: nothing is copied twice'
# ---------- 06: reliability watch counts support reports, never reads their text (stub with the live tail and anchor) ----------
Q <<'SQL'
create table public.work_log(session_date date, topic text, what_we_did text, status text, open_threads text, created_at timestamptz default now());
create function public.notify_admin(text) returns void language sql as 'select 1';
create function public.fn_reliability_watch() returns void language plpgsql as $function$
declare
  r record;
  v_fp text;
begin
  begin
    for r in
      select 1 from public.events
      where ts > now() - interval '60 minutes'
        and not coalesce(is_bot, false)
        and (surface = 'runtime_error' or event_type = 'issue_report')
    loop
      null;
    end loop;
  exception when others then null;
  end;
end;
$function$;
SQL
FW='public.fn_reliability_watch()'
W0=$(Q -c "select md5(pg_get_functiondef('$FW'::regprocedure))")
sed "s/db5e1827ba3128023f992456778aacbe/$W0/g" "$DIR/06-reliability-watch-support-reports.sql" > "$TMP/06.sql"
sed "s/db5e1827ba3128023f992456778aacbe/$W0/g" "$DIR/06-reliability-watch-support-reports.rollback.sql" > "$TMP/06.rb.sql"
check "$(grep -c db5e1827ba3128023f992456778aacbe "$DIR/06-reliability-watch-support-reports.sql")" 2 '06: the committed file pins the live md5'
F "$TMP/06.sql"
check "$(Q -c "select position('(c) support reports' in pg_get_functiondef('$FW'::regprocedure))>0")" t '06 applies under real psql'
Q -c "insert into public.feedback(context,verdict,detail,created_at) values ('issue_report','reported','סיסמה סודית 12345',now()),('issue_report','reported','עוד טקסט פרטי',now())"
Q -c "select public.fn_reliability_watch()" >/dev/null
check "$(Q -c "select count(*) from public.work_log where topic like '%דיווחי תקלה חוזרים%'")" 1 '06: two reports in an hour raise one alert'
check "$(Q -c "select count(*) from public.work_log where what_we_did like '%סיסמה%' or what_we_did like '%טקסט פרטי%'")" 0 '06: the alert counts reports and never carries their text'
Q -c "select public.fn_reliability_watch()" >/dev/null
check "$(Q -c "select count(*) from public.work_log where topic like '%דיווחי תקלה חוזרים%'")" 1 '06: the alert is deduplicated for 6 hours'
F "$TMP/06.sql"; pass=$((pass+1)); echo 'PASS 06: a second apply is a no-op'
F "$TMP/06.rb.sql"
check "$(Q -c "select md5(pg_get_functiondef('$FW'::regprocedure))")" "$W0" '06 rollback restores the exact text'
echo "ALL PASS ($pass)"
