#!/usr/bin/env bash
# Security package SQL (decision 337, 26.11.2026) on an isolated REAL PostgreSQL. Nothing here touches the shared database:
# the two security PROPOSAL/ROLLBACK pairs (20261126155000 log_security lockdown, 20261126160000 security monitor silence) are applied to a
# scratch cluster, with the live "old" function bodies taken from the ROLLBACK files themselves (their md5 is checked against the md5 read
# from the live database on 26.11.2026). The database-capacity proposals have their own script on their own branch.
# Proves: log_security is service_role only with an exact global ceiling that cannot hide a spike; the security monitor alerts when the genuine
# canary goes silent and is not cleared by a forged or look-alike row; both files roll back to the exact live source.
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

echo "SECURITY EDGE PACKAGE 20261126 REAL POSTGRES ${pass} checks PASS ($("$PG_BIN/postgres" --version); isolated)"
