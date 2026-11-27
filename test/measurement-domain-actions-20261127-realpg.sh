#!/usr/bin/env bash
# S3 (27.11.2026): runs the REAL PROPOSAL.sql / ROLLBACK.sql under psql on an isolated local PostgreSQL with stub domain tables. No live URL or credential.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=$ROOT/supabase/proposed/measurement-domain-actions-20261127
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
chown "${PG_USER:-postgres}" "$TMP" 2>/dev/null || true
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54397 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
PSQL=("$PG_BIN/psql" -h "$TMP" -p 54397 -U postgres -d postgres -v ON_ERROR_STOP=1)
Q() { "${PSQL[@]}" -qtAX "$@"; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
Q <<'SQL'
create role anon; create role authenticated;
create schema auth;
create table auth.users(id uuid primary key default gen_random_uuid(), created_at timestamptz, last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.uid', true),'')::uuid$$;
create table public.users(id uuid, role text);
create table public.research_contributions(origin text, created_at timestamptz, reactions jsonb);
create table public.subscribers(created_at timestamptz); create table public.subscribe_events(created_at timestamptz); create table public.push_subscriptions(created_at timestamptz);
create table public.feedback(context text, detail text, created_at timestamptz);
create table public.events(session_id text, ts timestamptz default now(), event_type text, is_bot boolean default false, props jsonb, person_id uuid, sod_id text, surface text);
create function public.fn_ti_clean_classification(date,date) returns table(session_id text, clean_classification text) language sql as $$select distinct session_id, case when session_id like 'h%' then 'human' else 'unknown' end from public.events$$;
SQL
Q <<'SQL'
create or replace function pg_temp.yday(h int) returns timestamptz language sql as $$select (((now() at time zone 'Asia/Jerusalem')::date-1)::timestamp + make_interval(hours=>h)) at time zone 'Asia/Jerusalem'$$;
insert into public.users values ('11111111-1111-1111-1111-111111111111','admin'),('22222222-2222-2222-2222-222222222222','user');
insert into auth.users(created_at,last_sign_in_at) values (pg_temp.yday(10),pg_temp.yday(11)),(pg_temp.yday(12),null),(now()-interval '10 days',now()-interval '10 days'),(now(),now());
insert into public.research_contributions values ('community_2029',pg_temp.yday(9),'{"like":2}'),('community_2029',pg_temp.yday(9),'{}'),('community_2029',pg_temp.yday(9),null),('other',pg_temp.yday(9),null);
insert into public.subscribers values (pg_temp.yday(8)),(pg_temp.yday(8)); insert into public.subscribe_events values (pg_temp.yday(8)); insert into public.push_subscriptions values (now()-interval '3 days');
insert into public.feedback values ('issue_report','טקסט פרטי של מבקר',pg_temp.yday(7)),('search','x',pg_temp.yday(7));
-- one visitor with 50 views in 5 sessions, two visitors with 5 views each
insert into public.events(session_id,ts,surface,event_type) values ('hZ',now()-interval '40 days','calculator_2029','first_compute'), ('hZ',pg_temp.yday(5),'els','ui_action');
insert into public.events(session_id,ts,sod_id,surface,event_type) select 'hA'||(g%5), pg_temp.yday(6)+(g||' minutes')::interval, 'visA','page','view' from generate_series(1,50) g;
insert into public.events(session_id,ts,sod_id,surface,event_type) select 'hB', pg_temp.yday(6)+(g||' minutes')::interval, 'visB','page','view' from generate_series(1,5) g;
insert into public.events(session_id,ts,sod_id,surface,event_type) select 'hC', pg_temp.yday(6)+(g||' minutes')::interval, 'visC','page','view' from generate_series(1,5) g;
SQL
"${PSQL[@]}" -qX -f "$DIR/PROPOSAL.sql" >/dev/null
check "$(Q -c "select to_regprocedure('research_domain_actions_2029(text)') is not null")" t 'PROPOSAL.sql commits under real psql'
check "$(Q -c "select has_function_privilege('anon','research_domain_actions_2029(text)','execute')")" f 'anonymous visitors cannot call the wrapper'
check "$(Q -c "select has_function_privilege('authenticated','fn_ti_domain_actions2029(text)','execute')")" f 'the producer is server-only'
A() { Q -c "set request.uid='$1'; select public.research_domain_actions_2029('day')"; }
check "$(A 22222222-2222-2222-2222-222222222222 | python3 -c 'import json,sys;print(json.loads(sys.stdin.read().strip().splitlines()[-1])["state"])' 2>/dev/null || Q -c "set request.uid='22222222-2222-2222-2222-222222222222'; select (public.research_domain_actions_2029('day'))->>'state'" | tail -1)" forbidden 'a signed-in non-administrator gets forbidden'
J=$(Q -c "set request.uid='11111111-1111-1111-1111-111111111111'; select public.research_domain_actions_2029('day')" | tail -1)
g() { Q -c "select ('$J'::jsonb)$1"; }
check "$(g "->>'state'")" measured 'the administrator gets the measurement'
check "$(g "->>'registrations'")" 2 'registrations: only the settled day'
check "$(g "->>'signed_in_users'")" 1 'sign-ins in the day'
check "$(g "->>'community_messages'")" 3 'community messages'
check "$(g "->>'contributions'")" 1 'contributions'
check "$(g "->>'messages_with_reactions'")" 1 'messages with reactions'
check "$(g "->>'subscribers'")" 2 'subscribers'
check "$(g "->>'push_subscriptions'")" 0 'push subscriptions outside the window are not counted'
check "$(g "->>'issue_reports'")" 1 'issue reports are counted from the support store'
check "$(g "#>>'{visitor_load,visitors}'")" 3 'load: three visitors (four concepts kept apart)'
check "$(g "#>>'{visitor_load,sessions}'")" 7 'load: seven sessions are not seven people'
check "$(g "#>>'{visitor_load,top1_share_pct}'")" 83.3 'load: the top visitor holds 83.3% of the views (a distribution, no identifier)'
check "$(Q -c "select (('$J'::jsonb)-'expected_silence')::text ~ 'visA|visB|visC|hA|טקסט פרטי|suspect|bot'")" f 'no identifier, no text and no suspicion word in the payload'
check "$(g "->>'expected_catalog_size'")" "$(python3 -c "import json;print(len(json.load(open('$ROOT/docs/reviews/measurement-closure-20261127/expected-events.json'))['events']))")" 'the SQL catalog has every entry of expected-events.json'
check "$(g "#>>'{expected_silence}'" | python3 -c "import json,sys;d=json.loads(sys.stdin.read());print(len([x for x in d if x['surface']=='els' and x['event']=='ui_action']))")" 0 'an event that arrived is not listed as silent'
check "$(g "#>>'{expected_silence}'" | python3 -c "import json,sys;d=json.loads(sys.stdin.read());print([x['status'] for x in d if x['surface']=='story_2029'][0])")" preserved 'a preserved capability is listed as preserved, never as expected'
check "$(g "#>>'{expected_silence}'" | python3 -c "import json,sys;d=json.loads(sys.stdin.read());print([x['status'] for x in d if x['surface']=='nav_2029'][0])")" awaiting_release 'a family waiting for its release is listed as awaiting_release'
check "$(g "#>>'{expected_silence}'" | python3 -c "import json,sys;d=json.loads(sys.stdin.read());x=[x for x in d if x['surface']=='calculator_2029' and x['event']=='first_compute'][0];print(x['status']+':'+str(str(x['last_seen']).startswith('2026')))")" expected:True 'an expected event that went silent shows the last DAY it was seen'
"${PSQL[@]}" -qX -f "$DIR/ROLLBACK.sql" >/dev/null
check "$(Q -c "select count(*) from pg_proc where proname in ('fn_ti_domain_actions2029','research_domain_actions_2029')")" 0 'rollback removes both functions'
echo "ALL PASS ($pass)"
