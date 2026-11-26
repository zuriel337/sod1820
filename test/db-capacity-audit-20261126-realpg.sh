#!/usr/bin/env bash
# DB capacity audit package (decision 337, 26.11.2026) on an isolated REAL PostgreSQL. Nothing here touches the shared database:
# every PROPOSAL/ROLLBACK file in supabase/proposed/2026112612..16* is applied to a scratch cluster, with the live "old" function bodies
# taken from the ROLLBACK files themselves (their md5 is checked against the md5 read from the live database on 26.11.2026).
# Proves: the duplicate-index drop FAILS (is never recorded as applied) and alerts in every unexpected state (including BOTH indexes missing); SIZE_INFO
# writes nothing while WATCH/ALERT behave exactly as before; no-op revisions are skipped while every real step is kept; research history is
# append-only (no delete, no truncate) and personal data is erasable only by redaction through one authorised function; log_security is
# service_role only with an exact global ceiling that cannot hide a spike; the security monitor alerts when the genuine canary goes silent;
# the anonymous visitor_events roll-up stores no identifier.
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
APPLY_RC=0
apply_like() { # a migration runner: the file is applied as ONE transaction and recorded ONLY if it succeeds; the outcome is in APPLY_RC
  if "${PSQL[@]}" -d review -v ON_ERROR_STOP=1 -qtAX -1 -f "$1" >"$TMP/apply.out" 2>&1; then Q -c "insert into public.migration_record(name) values ('$(basename "$1")')"; APPLY_RC=0; else APPLY_RC=1; fi; return 0; }
recorded() { Q -c "select count(*) from public.migration_record where name = '$1'"; }
pass=0; check() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "PASS $3"; else echo "FAIL $3 (got '$1', want '$2')"; exit 1; fi; }
extract() { sed -n '/^create or replace function public\.'"$2"'/,/\$function\$;/p' "$1"; }   # first function definition in a file

Q -c "create role anon; create role authenticated; create role service_role;
create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';
create function auth.role() returns text language sql as \$\$ select coalesce(nullif(current_setting('test.role', true), ''), 'anon') \$\$;
create function public.rd_is_admin() returns boolean language sql as \$\$ select coalesce(current_setting('test.admin', true), '') = 'yes' \$\$;
create table public.work_log(id uuid primary key default gen_random_uuid(), session_date date, topic text, what_we_did text, status text, open_threads text, created_at timestamptz default now());
create table public.notify_log(at timestamptz default now(), msg text);
create table public.migration_record(name text);
create function public.notify_admin(t text, img text default null) returns void language sql as 'insert into public.notify_log(msg) values (t)';
create table public.suggest_log(at timestamptz default now(), detector text, title text);
create function public.suggest_add(a text, b text, c text, d text, e jsonb, f int, g int, h text, i text) returns void language sql as 'insert into public.suggest_log(detector,title) values (b,c)';
grant usage on schema public to service_role;"

# ───────────────────────── 1. duplicate-index drop: failure is never success ─────────────────────────
Q -c "create table public.tanach_verses(id serial primary key, book text, words text[]);
insert into public.tanach_verses(book,words) select 'b', array['w'||(g%97),'x'||g] from generate_series(1,3000) g;
create index tv_words_gin on public.tanach_verses using gin(words); create index idx_tv_words on public.tanach_verses using gin(words);"
idx() { Q -c "select coalesce(string_agg(indexname,',' order by indexname),'-') from pg_indexes where tablename='tanach_verses' and indexname in ('idx_tv_words','tv_words_gin')"; }
alerts() { Q -c "select count(*) from public.work_log where topic like '%הסרת אינדקס כפול נעצרה%'"; }
PRE="$P/20261126120000_drop_duplicate_idx_tv_words_PRECHECK.sql"; DROP="$P/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql"; ROLL="$P/20261126120000_drop_duplicate_idx_tv_words_ROLLBACK.sql"
pre_out=$(F "$PRE" || true)
check "$(echo "$pre_out" | grep -c 'PRECHECK OK')|$(alerts)|$(idx)" '1|0|idx_tv_words,tv_words_gin' 'idx: PRECHECK on a healthy identical pair says OK, writes no alert, changes nothing'
apply_like "$DROP"; check "$APPLY_RC|$(idx)|$(recorded "$(basename "$DROP")")|$(alerts)" '0|tv_words_gin|1|0' 'idx: the drop succeeds on a healthy pair, is recorded as applied, no alert'
apply_like "$DROP"; check "$APPLY_RC|$(idx)" '0|tv_words_gin' 'idx: re-applying after the drop is a quiet success (desired end state)'
F "$ROLL" >/dev/null; check "$(idx)" 'idx_tv_words,tv_words_gin' 'idx: rollback re-creates the duplicate'
stopcase() { # $1 = label ; expects: PRECHECK alerts once, the drop file FAILS, is NOT recorded, nothing dropped
  local before; before="$(idx)"; Q -c "truncate public.work_log, public.notify_log, public.migration_record"
  F "$PRE" >/dev/null 2>&1 || true
  local a="$(alerts)|$(Q -c "select count(*) from public.notify_log where msg like '%בדיקת-טרום%'")"
  apply_like "$DROP"; local rc=$APPLY_RC
  check "$a|$([ $rc -ne 0 ] && echo failed || echo SUCCESS)|$(recorded "$(basename "$DROP")")|$(idx)" "1|1|failed|0|$before" "idx: $1 -> PRECHECK alerts once; the drop FAILS, is NOT recorded as applied, nothing changes"
}
Q -c "drop index idx_tv_words; drop index tv_words_gin;"
stopcase 'BOTH indexes missing'
check "$(Q -c "select (what_we_did like '%שני האינדקסים%') and (what_we_did like '%create index tv_words_gin%') from public.work_log where topic like '%הסרת אינדקס כפול נעצרה%'")" t 'idx: the alert names the problem and the rebuild statement'
check "$(grep -c 'duplicate-index drop STOPPED' "$TMP/apply.out")|$(F "$PRE" 2>&1 | grep -c 'PRECHECK STOP')" '1|1' 'idx: both the drop (error) and the PRECHECK (warning) print the reason'
Q -c "create index idx_tv_words on public.tanach_verses using gin(words);"; stopcase 'keeper missing (idx_tv_words is the only index)'
Q -c "create index tv_words_gin on public.tanach_verses using gin(words) with (fastupdate=off);"; stopcase 'options differ'
Q -c "drop index tv_words_gin; create index tv_words_gin on public.tanach_verses using gin(words); update pg_index set indisvalid=false where indexrelid='public.tv_words_gin'::regclass;"; stopcase 'keeper invalid'
Q -c "update pg_index set indisvalid=true where indexrelid='public.tv_words_gin'::regclass; truncate public.work_log, public.notify_log, public.migration_record;"
( "${PSQL[@]}" -d review -qc "begin; lock table public.tanach_verses in access share mode; select pg_sleep(7); commit;" >/dev/null 2>&1 & ); sleep 1
s=$(date +%s); apply_like "$DROP"; rc=$APPLY_RC; e=$(date +%s)
check "$([ $rc -ne 0 ] && echo failed)|$([ $((e-s)) -le 5 ] && echo fast)|$(idx)|$(recorded "$(basename "$DROP")")" 'failed|fast|idx_tv_words,tv_words_gin|0' 'idx: lock held -> the drop FAILS after 3 s, is not recorded, nothing dropped'
sleep 7
apply_like "$DROP"; check "$APPLY_RC|$(idx)|$(recorded "$(basename "$DROP")")" '0|tv_words_gin|1' 'idx: healthy pair again -> dropped and recorded'

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

# ───────────────────────── 4. research history protection v2 ─────────────────────────
F "$P/20261126140000_research_revision_noop_skip_PROPOSAL.sql" >/dev/null
Q -c "truncate public.research_object_revisions, public.research_objects;"
PRO="$P/20261126150000_research_history_protection_PROPOSAL.sql"
check "$(Q -c "select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_name='research_object_revisions' and grantee='service_role'")" 'DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE' 'protect: the scratch grants equal the live ones read on 26.11.2026'
F "$PRO" >/dev/null
check "$(Q -c "select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_name='research_object_revisions' and grantee='service_role'")|$(Q -c "select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_name='research_objects' and grantee='service_role'")" 'INSERT,REFERENCES,SELECT,TRIGGER|DELETE,INSERT,REFERENCES,SELECT,TRIGGER,UPDATE' 'protect: service_role loses UPDATE/DELETE/TRUNCATE on revisions and TRUNCATE on research_objects, keeps the rest'
PA='00000000-0000-0000-0000-00000000000a'; PB='00000000-0000-0000-0000-00000000000b'
Q -c "insert into public.research_objects(id,kind,statement,source_ref,status,meta,owner_person_id,contributor) values
 ('00000000-0000-0000-0000-0000000000a1','observation','פרטי של א','family:1','candidate','{\"k\":1}','$PA','alice'),
 ('00000000-0000-0000-0000-0000000000a2','observation','עוד פרטי של א','family:2','candidate','{}','$PA','alice'),
 ('00000000-0000-0000-0000-0000000000b1','observation','פרטי של ב','family:3','candidate','{}','$PB','bob');
 update public.research_objects set meta='{\"k\":2}' where owner_person_id in ('$PA','$PB');
 update public.research_objects set status='approved' where id='00000000-0000-0000-0000-0000000000a1' ;" >/dev/null 2>&1 || Q -c "update public.research_objects set meta='{\"k\":2}' where owner_person_id in ('$PA','$PB'); update public.research_objects set status='review' where id='00000000-0000-0000-0000-0000000000a1'"
n=$(Q -c "select count(*) from public.research_object_revisions")
check "$(QE -c "delete from public.research_object_revisions" | grep -c research_history_protected)|$(QE -c "update public.research_object_revisions set statement_before='x'" | grep -c research_history_protected)|$(QE -c "truncate public.research_object_revisions" | grep -c research_history_protected)|$(QE -c "truncate public.research_objects" | grep -c research_history_protected)|$(Q -c "select count(*) from public.research_object_revisions")" "1|1|1|1|$n" 'protect: even the table owner cannot DELETE, rewrite or TRUNCATE history; research_objects cannot be TRUNCATEd; nothing changed'
check "$(QE -c "begin; set local app.research_history_redaction='on'; delete from public.research_object_revisions; commit;" | grep -c research_history_protected)|$(QE -c "begin; set local app.research_history_redaction='on'; update public.research_object_revisions set statement_before=null; commit;" | grep -c research_history_protected)|$(QE -c "begin; set local app.allow_revision_erasure='on'; delete from public.research_object_revisions; commit;" | grep -c research_history_protected)" '1|1|1' 'protect: setting the switch by hand is useless: DELETE has no bypass at all, and an UPDATE outside the approved function is refused'
Q -c "create function public.evil() returns void language plpgsql security definer as \$e\$ begin perform set_config('app.research_history_redaction','on',true); update public.research_object_revisions set statement_before=null, before_snapshot='{}'::jsonb; delete from public.research_object_revisions; end \$e\$;"
check "$(QE -c "select public.evil()" | grep -c research_history_protected)|$(Q -c "select count(*) from public.research_object_revisions where statement_before is null")" '1|0' 'protect: another function that copies the switch cannot redact or delete either (the call stack must contain the approved function)'
Q -c "update public.research_object_revisions set successor_id='00000000-0000-0000-0000-0000000000aa' where id=(select min(id) from public.research_object_revisions)"
check "$(QE -c "update public.research_object_revisions set successor_id='00000000-0000-0000-0000-0000000000bb' where successor_id is not null" | grep -c research_history_protected)|$(QE -c "update public.research_object_revisions set successor_id='00000000-0000-0000-0000-0000000000cc', change_kind='x' where successor_id is null and id=(select max(id) from public.research_object_revisions)" | grep -c research_history_protected)" '1|1' 'protect: the sanctioned successor link works once; re-pointing it, or changing anything with it, is refused'
check "$(Q -c "select has_function_privilege('anon','public.fn_research_history_erase_person_v1(uuid,text)','execute')::text||has_function_privilege('authenticated','public.fn_research_history_erase_person_v1(uuid,text)','execute')::text||has_function_privilege('service_role','public.fn_research_history_erase_person_v1(uuid,text)','execute')::text")" 'falsefalsetrue' 'erase: EXECUTE is service_role only (not PUBLIC, anon or authenticated)'
Q -c "create role app_user; grant usage on schema public to app_user; grant execute on function public.fn_research_history_erase_person_v1(uuid,text) to app_user; grant select on public.work_log to app_user;"
check "$(QE -c "set session authorization app_user; select public.fn_research_history_erase_person_v1('$PA','written legal basis: request 4711')" | grep -c 'not authorized')" 1 'erase: an unauthorised session (not service_role, not admin, not the postgres session) is refused'
check "$(QE -c "set session authorization app_user; set test.admin='yes'; select public.fn_research_history_erase_person_v1('$PA','short')" | grep -c 'at least 20')" 1 'erase: even an admin must give a written basis (>= 20 characters)'
snap=$(Q -c "select md5(string_agg(id::text||research_object_id::text||change_kind||changed_fields::text||occurred_at::text, ',' order by id)) from public.research_object_revisions")
bobbefore=$(Q -c "select md5(string_agg(r::text,',' order by id)) from public.research_object_revisions r where before_snapshot->>'owner_person_id'='$PB'")
res=$(Q -c "set session authorization app_user; set test.role='service_role'; select public.fn_research_history_erase_person_v1('$PA','written legal basis: data-subject request 4711')")
check "$(echo "$res" | grep -o '"ok": true')|$(Q -c "select count(*) from public.research_object_revisions")" "\"ok\": true|$n" 'erase: the authorised call redacts and reports; the revision COUNT is unchanged (no history is deleted)'
check "$(Q -c "select count(*) from public.research_object_revisions where before_snapshot->>'erased'='true' and statement_before is null and research_object_claim_uid is null and research_object_source_uid is null and actor is null")|$(Q -c "select count(*) from public.research_object_revisions where (before_snapshot::text like '%פרטי של א%') or (statement_before like '%פרטי של א%') or (before_snapshot::text like '%alice%')")" "$(Q -c "select count(*) from public.research_object_revisions where before_snapshot->>'erased'='true'")|0" 'erase: person A revisions are stubs (erased=true, no snapshot body, no statement, no hashes, no actor) and contain no personal text'
check "$(Q -c "select md5(string_agg(id::text||research_object_id::text||change_kind||changed_fields::text||occurred_at::text, ',' order by id)) from public.research_object_revisions")|$(Q -c "select md5(string_agg(r::text,',' order by id)) from public.research_object_revisions r where before_snapshot->>'owner_person_id'='$PB'")" "$snap|$bobbefore" 'erase: ids, object ids, change kinds, changed fields and timestamps are untouched; person B is untouched'
check "$(Q -c "select count(*) from public.work_log where topic like 'מחיקת מידע אישי מהיסטוריית מחקר%' and what_we_did not like '%$PA%' and what_we_did like '%'||md5('$PA')||'%'")|$(Q -c "set session authorization app_user; set test.role='service_role'; select public.fn_research_history_erase_person_v1('$PA','written legal basis: data-subject request 4711')->>'revisions_redacted'")" '1|0' 'erase: the work_log row has a hash of the person, not the person; a second run redacts nothing (idempotent)'
Q -c "set role service_role; delete from public.research_objects where id='00000000-0000-0000-0000-0000000000b1'"
check "$(Q -c "select change_kind from public.research_object_revisions order by id desc limit 1")" delete 'protect: deleting a research OBJECT is still allowed and still writes its delete revision'
F "$P/20261126150000_research_history_protection_ROLLBACK.sql" >/dev/null
check "$(Q -c "select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_name='research_object_revisions' and grantee='service_role'")|$(Q -c "select count(*) from pg_trigger where tgname like 'trg_research_%' and not tgisinternal")|$(Q -c "select count(*) from pg_proc where proname in ('fn_research_history_protect','fn_research_history_erase_person_v1')")" 'DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE|0|0' 'protect: rollback restores the exact privileges and removes triggers and functions (redacted rows stay redacted)'

# ───────────────────────── 5. log_security lockdown + security monitor ─────────────────────────
Q -c "create table public.security_log(id bigserial primary key, ts timestamptz default now(), country text, path text, ua text, ip text);
create table public.security_alerts(id bigserial primary key, ts timestamptz default now(), total int, top_country text, top_country_count int, note text, acked boolean default false);
create index security_log_ts_idx on public.security_log (ts desc);"
extract "$P/20261126155000_log_security_lockdown_ROLLBACK.sql" log_security | Q -f - >/dev/null
Q -c "grant execute on function public.log_security(text,text,text,text) to public, anon, authenticated;"
check "$(Q -c "select md5(prosrc) from pg_proc where proname='log_security'")" 23b157d332e451d25a1c97794df0ad04 'sec: the old log_security body in the ROLLBACK file is byte-identical to the live source'
Q -c "set role anon; select public.log_security('XX','/forged','forged-ua','1.2.3.4')" >/dev/null
check "$(Q -c "select count(*) from public.security_log")" 1 'sec: BEFORE the lockdown the anon role can write security_log (the gap)'
Q -c "truncate public.security_log"
LOCK="$P/20261126155000_log_security_lockdown_PROPOSAL.sql"
apply_like "$LOCK"; check "$APPLY_RC" 0 'sec: the lockdown applies (guard passes on the live source)'
chk() { Q -c "select coalesce((select has_function_privilege('$1','public.log_security(text,text,text,text)','execute')::text),'-')"; }
Q -c "create role stranger;"
check "$(chk anon)|$(chk authenticated)|$(chk stranger)|$(chk service_role)" 'false|false|false|true' 'sec: anon, authenticated and any other role (PUBLIC) are refused; only service_role may call log_security'
check "$(QE -c "set role anon; select public.log_security('XX','/forged','x','')" | grep -c 'permission denied')|$(QE -c "set role authenticated; select public.log_security('XX','/forged','x','')" | grep -c 'permission denied')|$(Q -c "select count(*) from public.security_log")" '1|1|0' 'sec: a forged report with the public key fails at the database; nothing is written'
Q -c "set role service_role; select public.log_security('us','/wp-login.php','scanner','203.0.113.0/24')" >/dev/null
check "$(Q -c "select country||'|'||path||'|'||ip from public.security_log")" 'US|/wp-login.php|203.0.113.0/24' 'sec: the authorised caller still writes (country upper-cased, bounded fields as before)'
# the global ceiling: one session, then eight concurrent sessions
Q -c "truncate public.security_log; select count(public.log_security('CN','/x'||g,'u','')) from generate_series(1,10000) g" >/dev/null
check "$(Q -c "select count(*) from public.security_log")" 60 'sec: 10,000 reports in one minute leave exactly 60 rows (the ceiling), bounding the table'
Q -c "truncate public.security_log"
for i in 1 2 3 4 5 6 7 8; do ( "${PSQL[@]}" -d review -qtAX -c "select count(public.log_security('CN','/p$i-'||g,'u','')) from generate_series(1,400) g" >/dev/null 2>&1 & ); done; sleep 4
check "$(Q -c "select count(*) from public.security_log")" 60 'sec: eight concurrent sessions together still produce exactly 60 rows (the advisory lock makes the ceiling exact)'
# the ceiling cannot hide a spike: four "minutes" of flood -> 240 rows in the hour; the detector (original spike logic) fires
SPIKE="$P/20261126160000_security_monitor_silence_PROPOSAL.sql"; SROLL="$P/20261126160000_security_monitor_silence_ROLLBACK.sql"
extract "$SROLL" check_security_spike | Q -f - >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='check_security_spike'")" 052ef5209cc75deced4fb572a5587762 'sec: the old check_security_spike body in the ROLLBACK file is byte-identical to the live source'
Q -c "truncate public.security_log, public.security_alerts, public.work_log, public.notify_log;"
for m in 1 2 3 4; do Q -c "select count(public.log_security('CN','/f'||g,'u','')) from generate_series(1,500) g; update public.security_log set ts = ts - interval '70 seconds';" >/dev/null; done
check "$(Q -c "select count(*) from public.security_log")" 240 'sec: sustained flood over four minutes stores 240 rows (60 per minute), far above the 150-an-hour threshold'
Q -c "select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts where note like 'ספייק פריצות%'")" 1 'sec: ORIGINAL detector fires on the capped flood (spike still detected)'
apply_like "$SPIKE"; check "$APPLY_RC" 0 'sec: the silence version applies (guard passes)'
Q -c "truncate public.security_alerts, public.work_log, public.notify_log; select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts where note like 'ספייק פריצות%'")|$(Q -c "select count(*) from public.security_alerts where note like 'שקט ניטור אבטחה%'")|$(Q -c "select count(*) from public.work_log where topic like '%ניטור אבטחה שותק%'")|$(Q -c "select count(*) from public.notify_log")" '1|1|1|1' 'sec: NEW function: same spike alert, plus ONE silence alert (no genuine canary ever) in security_alerts, work_log and notify_admin'
Q -c "select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts where note like 'שקט ניטור אבטחה%'")" 1 'sec: a second run within 12 h does not repeat the silence alert'
Q -c "update public.security_alerts set ts = now() - interval '13 hours'; insert into public.security_log(country,path,ua,ip) values ('US','/wp-admin/sod-security-canary','forged-canary:sod1820-security-canary/1','1.2.3.0/24'), ('US','/wp-admin/x','Mozilla sod1820-security-canary/1','')"
Q -c "select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts where note like 'שקט ניטור אבטחה%' and ts > now() - interval '1 hour'")" 1 'sec: a forged or look-alike canary row does NOT clear the silence alert'
Q -c "update public.security_alerts set ts = now() - interval '13 hours'; insert into public.security_log(country,path,ua,ip) values ('US','/wp-admin/sod-security-canary','sod1820-security-canary/1','')"
Q -c "select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts where note like 'שקט ניטור אבטחה%' and ts > now() - interval '1 hour'")" 0 'sec: a genuine canary row (exact marker, only writable by security-probe-log after a valid proof) clears it'
Q -c "update public.security_log set ts = now() - interval '14 hours' where ua = 'sod1820-security-canary/1'; update public.security_alerts set ts = now() - interval '13 hours'; select public.check_security_spike()" >/dev/null
check "$(Q -c "select count(*) from public.security_alerts where note like '%לפני 14 שעות%'")" 1 'sec: a genuine canary older than 13 hours raises the alert with its age'
F "$SROLL" >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='check_security_spike'")" 052ef5209cc75deced4fb572a5587762 'sec: silence rollback restores the exact live source'
F "$P/20261126155000_log_security_lockdown_ROLLBACK.sql" >/dev/null
check "$(Q -c "select md5(prosrc) from pg_proc where proname='log_security'")|$(chk anon)|$(chk stranger)" '23b157d332e451d25a1c97794df0ad04|true|true' 'sec: lockdown rollback restores the exact source and the original PUBLIC/anon/authenticated grants'

# ───────────────────────── 6. anonymous visitor_events history roll-up ─────────────────────────
Q -c "create table public.visitor_events(id uuid primary key default gen_random_uuid(), visitor_id text, section text, slug text, event_type text, meta jsonb, created_at timestamptz);
create table public.traffic_history(id bigserial primary key, period date, granularity text, views integer, visitors integer, source text, note text, created_at timestamptz default now(), sessions integer);
create unique index traffic_history_uniq on public.traffic_history(period, granularity, source);
insert into public.traffic_history(period,granularity,views,visitors,source) values ('2026-11-01','day',100,40,'ga');
insert into public.visitor_events(visitor_id, section, slug, event_type, meta, created_at)
 select 'vid-'||(g%12), 'arrival', 'secret-slug-'||g, 'view', jsonb_build_object('email','alice@example.com'), timestamptz '2026-08-01 10:00+03' + (g||' minutes')::interval from generate_series(1,20) g;
insert into public.visitor_events(visitor_id, section, slug, event_type, meta, created_at)
 select 'vid-share-'||g, 'share', 'x', 'click', '{}', timestamptz '2026-08-01 12:00+03' from generate_series(1,3) g;
insert into public.visitor_events(visitor_id, section, slug, event_type, meta, created_at)
 select 'vid-'||g, 'arrival', null, 'view', '{}', timestamptz '2026-08-02 09:00+03' from generate_series(1,6) g;
insert into public.visitor_events(visitor_id, section, slug, event_type, meta, created_at) values ('vid-bad', 'Bad Section!', null, 'view', '{}', timestamptz '2026-08-02 09:00+03'), ('vid-bad2', 'a@b.com', null, 'x', '{}', timestamptz '2026-08-02 09:00+03');"
ROLLUP="$P/20261126170000_visitor_events_history_rollup_PROPOSAL.sql"
apply_like "$ROLLUP"; check "$APPLY_RC" 0 'rollup: the file applies as one transaction (function + backfill)'
check "$(Q -c "select count(*)||'|'||sum(views) from public.traffic_history where source like 'visitor_events_legacy:%'")" '3|29' 'rollup: 3 anonymous daily rows (arrival 20 and 6 events, share 3 events); the two malformed section names are excluded, not stored'
check "$(Q -c "select string_agg(source||'='||views||'/'||coalesce(visitors::text,'NULL'), ' ' order by period, source) from public.traffic_history where source like 'visitor_events_legacy:%'")" 'visitor_events_legacy:arrival:view=20/12 visitor_events_legacy:share:click=3/NULL visitor_events_legacy:arrival:view=6/6' 'rollup: events and distinct visitors per day, section and type; a cell with fewer than 5 visitors stores NULL, not the number'
check "$(Q -c "select count(*) from public.traffic_history where source like 'visitor_events_legacy:%' and (source||coalesce(note,'')) ~* '(vid-|secret-slug|alice|example\.com|@)'")" 0 'rollup: no visitor id, slug, meta or e-mail appears anywhere in what is stored'
check "$(Q -c "select string_agg(column_name,',' order by ordinal_position) from information_schema.columns where table_name='traffic_history'")" 'id,period,granularity,views,visitors,source,note,created_at,sessions' 'rollup: no schema change (same columns, same key as site_visits_legacy)'
check "$(Q -c "select note like '%First day may be partial%' from public.traffic_history where source like 'visitor_events_legacy:%' order by period limit 1")|$(Q -c "select count(*) from public.traffic_history where note like '%First day may be partial%'")" 't|2' 'rollup: only the earliest day is marked partial'
Q -c "delete from public.visitor_events where created_at < timestamptz '2026-08-02 00:00+03'; select public.refresh_visitor_events_history_v1('2026-07-01','2026-11-21')" >/dev/null
check "$(Q -c "select sum(views) from public.traffic_history where source like 'visitor_events_legacy:%'")|$(Q -c "select views||'/'||visitors from public.traffic_history where source='ga'")" '29|100/40' 'rollup: re-running after the nightly deletion removed raw rows never lowers a stored day; other sources are untouched'
check "$(QE -c "set role anon; select public.refresh_visitor_events_history_v1('2026-07-01','2026-11-21')" | grep -c 'permission denied')|$(Q -c "select has_function_privilege('service_role','public.refresh_visitor_events_history_v1(date,date)','execute')")" '1|t' 'rollup: only service_role can run it'
F "$P/20261126170000_visitor_events_history_rollup_ROLLBACK.sql" >/dev/null
check "$(Q -c "select count(*) from public.traffic_history where source like 'visitor_events_legacy:%'")|$(Q -c "select count(*) from public.traffic_history where source='ga'")|$(Q -c "select count(*) from pg_proc where proname='refresh_visitor_events_history_v1'")" '0|1|0' 'rollup: rollback removes exactly the rows it wrote and the function; nothing else'
echo "DB CAPACITY AUDIT 20261126 REAL POSTGRES ${pass} checks PASS ($("$PG_BIN/postgres" --version); isolated)"
