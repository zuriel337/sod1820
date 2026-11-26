#!/usr/bin/env bash
# DB capacity audit package (decision 337, 26.11.2026) on an isolated REAL PostgreSQL. Nothing here touches the shared database:
# every PROPOSAL/ROLLBACK file in supabase/proposed/2026112612..16* is applied to a scratch cluster, with the live "old" function bodies
# taken from the ROLLBACK files themselves (their md5 is checked against the md5 read from the live database on 26.11.2026).
# Proves: the duplicate-index drop stops and alerts in every unexpected state (including BOTH indexes missing); SIZE_INFO writes nothing
# while WATCH/ALERT behave exactly as before; no-op revisions are skipped while every real step is kept; research history is
# append-only except the one sanctioned link; the security monitor alerts when the canary goes silent and still counts real spikes.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
P=$ROOT/supabase/proposed
PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
if [ ! -x "$PG_BIN/initdb" ]; then echo "SKIP: no PostgreSQL binaries at $PG_BIN"; exit 0; fi
TMP=$(mktemp -d); chmod 755 "$TMP"
RUN=(); if [ "$(id -u)" = 0 ]; then RUN=(su "${PG_USER:-postgres}" -s /bin/bash -c); chown "${PG_USER:-postgres}" "$TMP"; fi
as() { if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$1"; else bash -c "$1"; fi; }
as "$PG_BIN/initdb -D $TMP/data -A trust -U postgres >/dev/null"
as "$PG_BIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54399 -c listen_addresses=' -l $TMP/log -w start >/dev/null"
trap 'as "$PG_BIN/pg_ctl -D $TMP/data -m immediate stop >/dev/null" || true; rm -rf "$TMP"' EXIT
PSQL=("$PG_BIN/psql" -h "$TMP" -p 54399 -U postgres)
"${PSQL[@]}" -qc 'create database review' >/dev/null
Q() { "${PSQL[@]}" -d review -v ON_ERROR_STOP=1 -qtAX "$@"; }
QE() { "${PSQL[@]}" -d review -qtAX "$@" 2>&1 || true; }        # tolerate errors, return text
F() { "${PSQL[@]}" -d review -v ON_ERROR_STOP=1 -qtAX -1 -f "$1" 2>&1; }   # one transaction, like apply
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
extract() { sed -n '/^create or replace function public\.'"$2"'/,/\$function\$;/p' "$1"; }   # first function definition in a file

Q -c "create role anon; create role authenticated; create role service_role;
create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';
create table public.work_log(id uuid primary key default gen_random_uuid(), session_date date, topic text, what_we_did text, status text, open_threads text, created_at timestamptz default now());
create table public.notify_log(at timestamptz default now(), msg text);
create function public.notify_admin(t text) returns void language sql as 'insert into public.notify_log(msg) values (t)';
create table public.suggest_log(at timestamptz default now(), detector text, title text);
create function public.suggest_add(a text, b text, c text, d text, e jsonb, f int, g int, h text, i text) returns void language sql as 'insert into public.suggest_log(detector,title) values (b,c)';
grant usage on schema public to service_role;"

# ───────────────────────── 1. duplicate-index drop: stops and alerts ─────────────────────────
Q -c "create table public.tanach_verses(id serial primary key, book text, words text[]);
insert into public.tanach_verses(book,words) select 'b', array['w'||(g%97),'x'||g] from generate_series(1,3000) g;
create index tv_words_gin on public.tanach_verses using gin(words); create index idx_tv_words on public.tanach_verses using gin(words);"
idx() { Q -c "select coalesce(string_agg(indexname,',' order by indexname),'-') from pg_indexes where tablename='tanach_verses' and indexname in ('idx_tv_words','tv_words_gin')"; }
alerts() { Q -c "select count(*) from public.work_log where topic like '%הסרת אינדקס כפול נעצרה%'"; }
F "$P/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql" >/dev/null
check "$(idx)|$(alerts)" 'tv_words_gin|0' 'idx: both present and identical -> only tv_words_gin remains, no alert'
F "$P/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql" >/dev/null
check "$(idx)|$(alerts)" 'tv_words_gin|0' 'idx: already dropped and keeper valid -> quiet no-op'
F "$P/20261126120000_drop_duplicate_idx_tv_words_ROLLBACK.sql" >/dev/null
check "$(idx)" 'idx_tv_words,tv_words_gin' 'idx: rollback re-creates the duplicate'
Q -c "drop index idx_tv_words; drop index tv_words_gin;"
out=$(F "$P/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql" || true)
check "$(idx)|$(alerts)|$(Q -c "select count(*) from public.notify_log where msg like '%הסרת אינדקס כפול נעצרה%'")" '-|1|1' 'idx: BOTH indexes missing -> nothing dropped, ONE work_log alert, ONE notify_admin'
check "$(echo "$out" | grep -c 'duplicate-index drop STOPPED')" 1 'idx: both missing -> the script itself warns (no silent success)'
check "$(Q -c "select (what_we_did like '%שני האינדקסים%') and (what_we_did like '%create index tv_words_gin%') from public.work_log where topic like '%הסרת אינדקס כפול נעצרה%'")" t 'idx: the alert names the problem and the rebuild statement'
Q -c "truncate public.work_log, public.notify_log; create index idx_tv_words on public.tanach_verses using gin(words);"
F "$P/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql" >/dev/null
check "$(idx)|$(alerts)" 'idx_tv_words|1' 'idx: keeper missing -> the only index is NOT dropped, alert written'
Q -c "truncate public.work_log, public.notify_log; create index tv_words_gin on public.tanach_verses using gin(words) with (fastupdate=off);"
F "$P/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql" >/dev/null
check "$(idx)|$(alerts)" 'idx_tv_words,tv_words_gin|1' 'idx: options differ -> nothing dropped, alert written'
Q -c "truncate public.work_log, public.notify_log; drop index tv_words_gin; create index tv_words_gin on public.tanach_verses using gin(words);"
( "${PSQL[@]}" -d review -qc "begin; lock table public.tanach_verses in access share mode; select pg_sleep(7); commit;" >/dev/null 2>&1 & ); sleep 1
s=$(date +%s); F "$P/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql" >/dev/null || true; e=$(date +%s)
check "$([ $((e-s)) -le 5 ] && echo fast)|$(idx)|$(alerts)" 'fast|idx_tv_words,tv_words_gin|1' 'idx: lock held -> gives up after 3 s, nothing dropped, alert written'
sleep 7
Q -c "update pg_index set indisvalid=false where indexrelid='public.tv_words_gin'::regclass; truncate public.work_log;"
F "$P/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql" >/dev/null
check "$(idx)|$(alerts)" 'idx_tv_words,tv_words_gin|1' 'idx: keeper invalid -> nothing dropped, alert written'
Q -c "update pg_index set indisvalid=true where indexrelid='public.tv_words_gin'::regclass; truncate public.work_log;"
F "$P/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql" >/dev/null
check "$(idx)|$(alerts)" 'tv_words_gin|0' 'idx: healthy pair again -> dropped quietly'

# ───────────────────────── 2. SIZE_INFO ─────────────────────────
OLDG=$TMP/guard_old.sql; NEWG=$TMP/guard_new.sql
extract "$P/20261126130000_capacity_size_info_ROLLBACK.sql" fn_capacity_growth_guard_v1 > "$OLDG"
extract "$P/20261126130000_capacity_size_info_PROPOSAL.sql" fn_capacity_growth_guard_v1 > "$NEWG"
Q -c "create table public.analytics_cache(cache_key text primary key, payload jsonb, computed_at timestamptz default now(), cache_kind text, producer text, producer_version text, billable_state text);"
sed -n '/create or replace function public.fn_capacity_snapshot_v1/,/^\$function\$;/p' "$ROOT/supabase/migrations/20260930170000_g3_capacity_growth_runtime_v1.sql" | Q -f - >/dev/null
Q -f "$OLDG" >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='fn_capacity_growth_guard_v1'")" 89e85b887d03b3e10095a3e99472ecc3 'size: the old body in the ROLLBACK file is byte-identical to the live source (md5 read from the shared DB)'
# behaviour copies with the byte thresholds scaled MiB -> KiB so a tiny scratch database can reach every state
mk() { sed -e 's/fn_capacity_growth_guard_v1/'"$2"'/' -e 's/\*1024\*1024;/*1024;/' "$1" | Q -f - >/dev/null; }
mk "$OLDG" t_guard_old; mk "$NEWG" t_guard_new
runguard() {   # $1 = function, $2 = bytes grown in the last 7 days; earlier weeks grew 35 KiB each (5 KiB/day). One implicit transaction,
  # so the database size used for the seed and the size the guard reads are the same to within a page.
  Q -c "delete from public.analytics_cache where cache_kind in ('capacity_snapshot','capacity_guard'); truncate public.work_log, public.suggest_log, public.notify_log;
  insert into public.analytics_cache(cache_key,payload,computed_at,cache_kind)
  select 'capacity_snapshot:'||to_char(current_date-a,'YYYY-MM-DD'),
         jsonb_build_object('db_bytes', pg_database_size(current_database()) - case when a<=7 then ($2*a/7) else $2 + 5120*(a-7) end, 'relations','{}'::jsonb),
         now()-(a||' days')::interval, 'capacity_snapshot'
  from generate_series(1,40) a;
  select public.$1();" >/dev/null
}
state() { Q -c "select payload->>'state' from public.analytics_cache where cache_key='capacity_guard:latest'"; }
emitted() { Q -c "select (select count(*) from public.work_log where topic like '%Capacity/Growth%')||'/'||(select count(*) from public.suggest_log)||'/'||(select count(*) from public.notify_log)"; }
runguard t_guard_old 20480; o1="$(state) $(emitted)"
runguard t_guard_new 20480; n1="$(state) $(emitted)"
check "$o1" 'CAPACITY_WARNING 1/1/0' 'size: OLD guard on a size-only state writes a work_log row and a suggestion'
check "$n1" 'SIZE_INFO 0/0/0' 'size: NEW guard on the same state writes NOTHING'
check "$(Q -c "select (payload->>'size_warning')||'|'||(payload->>'size_info')||'|'||(payload->>'size_warning_threshold_bytes')||'|'||(payload->>'anomaly_vs_normal') from public.analytics_cache where cache_key='capacity_guard:latest'")" 'true|true|1433600|false' 'size: the size line stays visible in capacity_guard:latest (same threshold value; scaled copy); no anomaly for a quiet week'
runguard t_guard_old 112640; o2="$(state) $(emitted)"
runguard t_guard_new 112640; n2="$(state) $(emitted)"
check "$o2|$n2" 'WATCH 1/1/0|WATCH 1/1/0' 'size: WATCH behaves identically (same state, work_log, suggestion)'
check "$(Q -c "select (payload->>'anomaly_vs_normal')||'|'||(payload->>'baseline_weekly_growth_bytes')||'|'||((payload->>'growth_vs_normal_ratio')::numeric >= 2) from public.analytics_cache where cache_key='capacity_guard:latest'")" 'true|35840|true' 'size: growth far above the normal weekly rate is flagged as an anomaly (informational), baseline = median weekly growth'
runguard t_guard_old 256000; o3="$(state) $(emitted)"
runguard t_guard_new 256000; n3="$(state) $(emitted)"
check "$o3|$n3" 'ALERT 1/1/1|ALERT 1/1/1' 'size: ALERT behaves identically (including notify_admin)'
clean() { Q -c "delete from public.analytics_cache where cache_kind in ('capacity_snapshot','capacity_guard'); truncate public.work_log, public.suggest_log, public.notify_log;"; }
clean; Q -c "select public.t_guard_old()" >/dev/null; oh="$(state) $(emitted)"
clean; Q -c "select public.t_guard_new()" >/dev/null; nh="$(state) $(emitted)"
check "$oh|$nh" 'CAPACITY_WARNING 1/1/0|SIZE_INFO 0/0/0' 'size: with no growth history the size state keeps the same precedence as before (it only changes name and stops emitting)'
# the real files: guard passes on the old body, produces exactly the new body, and rollback restores the old md5
F "$P/20261126130000_capacity_size_info_PROPOSAL.sql" >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='fn_capacity_growth_guard_v1'")" "$(Q -c "select md5(prosrc) from pg_proc where proname='t_guard_new'" | head -1 >/dev/null; sed -n '/^create or replace function/,/\$function\$;/p' "$NEWG" >/dev/null; echo "$(python3 -I -c "
import re,hashlib,sys
s=open('$P/20261126130000_capacity_size_info_ROLLBACK.sql',encoding='utf-8').read()
m=re.search(r\"md5\(prosrc\) from pg_proc where oid='public.fn_capacity_growth_guard_v1\(\)'::regprocedure\)\s*<>\s*'([0-9a-f]{32})'\",s); print(m.group(1))")")" 'size: the applied function equals the md5 that the ROLLBACK guard expects'
F "$P/20261126130000_capacity_size_info_ROLLBACK.sql" >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='fn_capacity_growth_guard_v1'")" 89e85b887d03b3e10095a3e99472ecc3 'size: rollback restores the exact live source'
check "$(QE -f "$P/20261126130000_capacity_size_info_ROLLBACK.sql" | grep -c 'not the SIZE_INFO version')" 1 'size: rollback refuses on a drifted function'

# ───────────────────────── 3. no-op revisions ─────────────────────────
Q -c "create or replace function public.fn_research_claim_uid(t text) returns text language sql immutable as 'select md5(coalesce(t,''''))';
create or replace function public.fn_research_source_uid(t text) returns text language sql immutable as 'select md5(coalesce(t,''''))';
create table public.research_objects(id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), kind text, statement text, terms text[], value integer, relates text[], source text, source_ref text, contributor text, confidence integer, engine_verified boolean, engine_detail jsonb, evidence text, status text, promoted_node_id uuid, parent_id uuid, meta jsonb, owner_person_id uuid, privacy_scope text);
create table public.research_object_revisions(id bigserial primary key, research_object_id uuid, research_object_source_uid text, research_object_claim_uid text, change_kind text, changed_fields text[], before_snapshot jsonb, statement_before text, successor_id uuid, actor uuid, actor_fallback text, occurred_at timestamptz default now());
grant select, insert, update, delete, truncate, references, trigger on public.research_object_revisions, public.research_objects to service_role;
grant usage on all sequences in schema public to service_role;"
extract "$P/20261126140000_research_revision_noop_skip_ROLLBACK.sql" fn_snapshot_research_object_revision | Q -f - >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='fn_snapshot_research_object_revision'")" c57e6d3884edc74769be98bde1d86f8b 'noop: the old body in the ROLLBACK file is byte-identical to the live source'
Q -c "create trigger trg_snapshot_research_object_before_update before update on public.research_objects for each row execute function public.fn_snapshot_research_object_revision();
create trigger trg_snapshot_research_object_before_delete before delete on public.research_objects for each row execute function public.fn_snapshot_research_object_revision();
insert into public.research_objects(id,kind,statement,source_ref,status,meta,contributor) values ('00000000-0000-0000-0000-000000000001','finding','ראשון','s#1','candidate','{}','a'),('00000000-0000-0000-0000-000000000002','fact','שני','s#2','approved','{}','a');"
revs() { Q -c "select count(*) from public.research_object_revisions"; }
Q -c "update public.research_objects set status=status where id='00000000-0000-0000-0000-000000000001'"
check "$(revs)" 1 'noop: BEFORE the change a no-op update writes a revision (the 1,565 historical ones)'
Q -c "truncate public.research_object_revisions"
F "$P/20261126140000_research_revision_noop_skip_PROPOSAL.sql" >/dev/null
Q -c "update public.research_objects set status=status, meta=meta where id='00000000-0000-0000-0000-000000000001'"
check "$(revs)" 0 'noop: a true no-op update writes NO revision'
Q -c "update public.research_objects set meta = meta || '{\"ext\":{\"corpus_batch\":{\"b\":1}}}' where id='00000000-0000-0000-0000-000000000001'"
Q -c "update public.research_objects set meta = meta || '{\"ext\":{\"corpus_batch\":{\"b\":1},\"wa_channel_intake\":{\"m\":2}}}' where id='00000000-0000-0000-0000-000000000001'"
check "$(Q -c "select count(*)||'|'||string_agg(changed_fields::text,';' order by id) from public.research_object_revisions")" '2|{meta};{meta}' 'noop: two different research steps on the same object (two meta keys, minutes apart) stay TWO revisions'
check "$(Q -c "select not coalesce(before_snapshot->'meta'->'ext' ? 'corpus_batch', false) from public.research_object_revisions order by id limit 1")|$(Q -c "select coalesce(before_snapshot->'meta'->'ext' ? 'corpus_batch', false) and not coalesce(before_snapshot->'meta'->'ext' ? 'wa_channel_intake', false) from public.research_object_revisions order by id desc limit 1")" 't|t' 'noop: each revision keeps the full preimage of its own step (before step 1, and the state after step 1)'
Q -c "update public.research_objects set status='approved', contributor='b' where id='00000000-0000-0000-0000-000000000001'"
check "$(Q -c "select changed_fields::text from public.research_object_revisions order by id desc limit 1")" '{contributor,status}' 'noop: a status/contributor change is recorded'
Q -c "update public.research_objects set statement=statement where id='00000000-0000-0000-0000-000000000002'"
check "$(revs)" 3 'noop: an unchanged approved fact writes nothing'
check "$(QE -c "update public.research_objects set value=7 where id='00000000-0000-0000-0000-000000000002'" | grep -c material_change_requires_correction_rpc)" 1 'noop: the material-change guard still blocks a direct edit of an approved fact'
Q -c "delete from public.research_objects where id='00000000-0000-0000-0000-000000000001'"
check "$(Q -c "select change_kind from public.research_object_revisions order by id desc limit 1")|$(revs)" 'delete|4' 'noop: deletes are still recorded with their preimage'
F "$P/20261126140000_research_revision_noop_skip_ROLLBACK.sql" >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='fn_snapshot_research_object_revision'")" c57e6d3884edc74769be98bde1d86f8b 'noop: rollback restores the exact live source'
Q -c "update public.research_objects set statement=statement where id='00000000-0000-0000-0000-000000000002'"
check "$(revs)" 5 'noop: after rollback a no-op writes a revision again (old behaviour)'

# ───────────────────────── 4. research history protection ─────────────────────────
F "$P/20261126140000_research_revision_noop_skip_PROPOSAL.sql" >/dev/null
before=$(Q -c "select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_name='research_object_revisions' and grantee='service_role'")
check "$before" 'DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE' 'protect: the scratch grants equal the live ones read on 26.11.2026'
F "$P/20261126150000_research_history_protection_PROPOSAL.sql" >/dev/null
check "$(Q -c "select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_name='research_object_revisions' and grantee='service_role'")" 'INSERT,REFERENCES,SELECT,TRIGGER' 'protect: service_role keeps SELECT/INSERT and loses UPDATE, DELETE, TRUNCATE on revisions'
check "$(Q -c "select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_name='research_objects' and grantee='service_role'")" 'DELETE,INSERT,REFERENCES,SELECT,TRIGGER,UPDATE' 'protect: research_objects keeps every privilege except TRUNCATE'
Q -c "insert into public.research_objects(id,kind,statement,source_ref,status,meta) values ('00000000-0000-0000-0000-000000000003','finding','שלישי','s#3','candidate','{}'); update public.research_objects set meta='{\"k\":1}' where id='00000000-0000-0000-0000-000000000003'"
n=$(revs)
check "$(QE -c "delete from public.research_object_revisions where id=(select min(id) from public.research_object_revisions)" | grep -c research_history_protected)|$(QE -c "update public.research_object_revisions set statement_before='x' where id=(select min(id) from public.research_object_revisions)" | grep -c research_history_protected)|$(revs)" "1|1|$n" 'protect: even the table owner cannot DELETE or rewrite a revision (trigger), nothing changed'
check "$(QE -c "truncate public.research_object_revisions" | grep -c research_history_protected)|$(QE -c "truncate public.research_objects" | grep -c research_history_protected)|$(revs)" "1|1|$n" 'protect: TRUNCATE of revisions and of research_objects is refused; row count unchanged'
check "$(QE -c "set role service_role; delete from public.research_object_revisions" | grep -c 'permission denied')|$(QE -c "set role service_role; truncate public.research_objects" | grep -c 'permission denied')" '1|1' 'protect: service_role is also refused at the privilege level'
Q -c "update public.research_object_revisions set successor_id='00000000-0000-0000-0000-0000000000aa' where id=(select max(id) from public.research_object_revisions where change_kind='update')"
check "$(Q -c "select count(*) from public.research_object_revisions where successor_id is not null")" 1 'protect: the sanctioned successor_id link (NULL -> value, nothing else changed) is allowed'
check "$(QE -c "update public.research_object_revisions set successor_id='00000000-0000-0000-0000-0000000000bb' where successor_id is not null" | grep -c research_history_protected)|$(QE -c "update public.research_object_revisions set successor_id='00000000-0000-0000-0000-0000000000cc', statement_before='x' where successor_id is null and id=(select min(id) from public.research_object_revisions where successor_id is null)" | grep -c research_history_protected)" '1|1' 'protect: re-pointing a link, or changing anything alongside it, is refused'
Q -c "set role service_role; delete from public.research_objects where id='00000000-0000-0000-0000-000000000003'"
check "$(Q -c "select change_kind from public.research_object_revisions order by id desc limit 1")|$(revs)" "delete|$((n+1))" 'protect: deleting a research OBJECT still works and still writes its delete revision (legitimate paths untouched)'
Q -c "begin; set local app.allow_revision_erasure='on'; delete from public.research_object_revisions where id=(select min(id) from public.research_object_revisions where successor_id is null); commit;"
check "$(revs)" "$n" 'protect: only a transaction that sets app.allow_revision_erasure=on (an approved erasure path) can remove a revision'
F "$P/20261126150000_research_history_protection_ROLLBACK.sql" >/dev/null
check "$(Q -c "select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_name='research_object_revisions' and grantee='service_role'")|$(Q -c "select count(*) from pg_trigger where tgname like 'trg_research_%' and not tgisinternal")|$(Q -c "select count(*) from pg_proc where proname='fn_research_history_protect'")" 'DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE|0|0' 'protect: rollback restores the exact privileges and removes the triggers and function; no revision was touched'

# ───────────────────────── 5. security monitor silence ─────────────────────────
Q -c "create table public.security_log(id bigserial primary key, ts timestamptz default now(), country text, path text, ua text, ip text);
create table public.security_alerts(id bigserial primary key, ts timestamptz default now(), total int, top_country text, top_country_count int, note text, acked boolean default false);"
extract "$P/20261126160000_security_monitor_silence_ROLLBACK.sql" check_security_spike | Q -f - >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='check_security_spike'")" 052ef5209cc75deced4fb572a5587762 'sec: the old body in the ROLLBACK file is byte-identical to the live source'
Q -c "select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts")" 0 'sec: OLD function with an empty security_log is silent (the live situation: succeeded, blind)'
F "$P/20261126160000_security_monitor_silence_PROPOSAL.sql" >/dev/null
Q -c "select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts where note like 'שקט ניטור אבטחה%'")|$(Q -c "select count(*) from public.work_log where topic like '%ניטור אבטחה שותק%' and status='alert'")|$(Q -c "select count(*) from public.notify_log")" '1|1|1' 'sec: NEW function with no canary ever -> one security_alerts row, one work_log alert, one notify_admin'
Q -c "select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts")" 1 'sec: a second run within 12 h does not repeat the alert'
Q -c "update public.security_alerts set ts = now() - interval '13 hours'; insert into public.security_log(country,path,ua,ip) values ('US','/wp-admin/sod-security-canary','sod1820-security-canary/1','')"
Q -c "select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts")" 1 'sec: a fresh canary row clears the silence (no new alert)'
Q -c "update public.security_log set ts = now() - interval '14 hours'"
Q -c "select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts where note like '%לפני 14 שעות%'")" 1 'sec: a stale canary (14 h) raises the silence alert with the age'
Q -c "insert into public.security_log(country,path,ua,ip) select 'CN','/x'||g,'scanner','1.2.3.0/24' from generate_series(1,40) g; update public.security_log set ts=now()-interval '20 hours' where ua like 'sod1820-security-canary%'; delete from public.security_alerts"
Q -c "insert into public.security_log(country,path,ua,ip) select 'US','/c'||g,'sod1820-security-canary/1','' from generate_series(1,400) g"
Q -c "select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts where note like 'ספייק פריצות%'")" 0 'sec: 400 canary rows are NOT counted as an attack spike'
Q -c "insert into public.security_log(country,path,ua,ip) select 'CN','/y'||g,'scanner','1.2.3.0/24' from generate_series(1,120) g; select public.check_security_spike()" >/dev/null
check "$(Q -c "select total||'|'||top_country||'|'||top_country_count from public.security_alerts where note like 'ספייק פריצות%' order by id desc limit 1")" '160|CN|160' 'sec: a real spike (160 probe rows, one country) is still detected with the original thresholds'
F "$P/20261126160000_security_monitor_silence_ROLLBACK.sql" >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='check_security_spike'")" 052ef5209cc75deced4fb572a5587762 'sec: rollback restores the exact live source'
echo "DB CAPACITY AUDIT 20261126 REAL POSTGRES ${pass} checks PASS ($("$PG_BIN/postgres" --version); isolated)"
