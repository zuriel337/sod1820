#!/usr/bin/env bash
# Disposable local PostgreSQL only (no network, no production). Applies the generated QA definitions on Supabase-like stubs (roles, auth.uid/jwt, auth.users)
# and exercises the message / notification / counter flow of scripts/qa-scenarios-p1.mjs at the SQL level, so a definition that does not apply or behave is caught
# before the 4-minute CI job. Usage: node scripts/build-qa-prod-definitions.mjs && bash scripts/run-qa-defs-sql-check.sh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BIN=$(compgen -G '/usr/lib/postgresql/*/bin' | sort -V | tail -1 || true)
[[ -n "$BIN" ]] || { echo 'Local PostgreSQL required.' >&2; exit 1; }
D=$(mktemp -d)
run() { if [[ "$(id -u)" = 0 ]]; then runuser -u postgres -- "$@"; else "$@"; fi; }
cleanup() { run "$BIN/pg_ctl" -D "$D/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$D"; }
trap cleanup EXIT
if [[ "$(id -u)" = 0 ]]; then chown postgres "$D"; fi
chmod a+rx "$D"
cp "$ROOT/qa/supabase/migrations/20260101000050_qa_prod_defs.sql" "$D/defs.sql"; chmod a+r "$D/defs.sql"
cat > "$D/stubs.sql" <<'SQL'
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create schema extensions; create extension pgcrypto with schema extensions;
grant usage on schema auth to public; grant usage on schema public to anon, authenticated, service_role;
SQL
chmod a+r "$D/stubs.sql"
run "$BIN/initdb" -D "$D/data" -A trust -U postgres -E UTF8 --locale=C.UTF-8 >/dev/null
run "$BIN/pg_ctl" -D "$D/data" -o "-h '' -p 55449 -k $D" -l "$D/log" -w start >/dev/null
run "$BIN/createdb" -h "$D" -p 55449 -U postgres qa_defs
q() { run "$BIN/psql" -h "$D" -p 55449 -U postgres -d qa_defs -v ON_ERROR_STOP=1 -q "$@"; }
q -f "$D/stubs.sql" >/dev/null
q -f "$D/defs.sql" >/dev/null
echo "PASS definitions apply on a clean database"
A=00000000-0000-0000-0000-00000000000a; B=00000000-0000-0000-0000-00000000000b; C=00000000-0000-0000-0000-00000000000c
q -c "insert into auth.users values ('$A','a@x.test'),('$B','b@x.test'),('$C','c@x.test'); insert into public.users(id,email,role) values ('$A','a@x.test','user'),('$B','b@x.test','user'),('$C','c@x.test','user');" >/dev/null
as() { echo "set role authenticated; set request.jwt.claim.sub to '$1';"; }
res=$( { as $A; echo "select (dm_send('$B','  שלום  ')->>'ok');"; echo "select (dm_send('$A','x')->>'error');"; echo "select (dm_send('$B','   ')->>'error');"; } | q -At)
[[ "$res" == $'true\nbad_recipient\nempty' ]] || { echo "FAIL dm_send results: $res"; exit 1; }; echo "PASS dm_send accepts, refuses self and empty"
n=$( { as $B; echo "select count(*) from public.user_notifications where read_at is null;"; } | q -At | tail -1)
[[ "$n" == 1 ]] || { echo "FAIL expected one notification from the trigger, got $n"; exit 1; }; echo "PASS the trigger created one notification for the recipient"
n=$( { as $C; echo "select count(*) from public.user_notifications; select count(*) from public.direct_messages; select count(*) from dm_inbox();"; } | q -At | tail -3 | tr '\n' ,)
[[ "$n" == "0,0,0," ]] || { echo "FAIL third member sees rows: $n"; exit 1; }; echo "PASS a third member sees nothing"
u=$( { as $B; echo "select unread from dm_inbox();"; echo "select count(*) from dm_thread('$A');"; echo "select unread from dm_inbox();"; } | q -At | tail -3 | tr '\n' ,)
[[ "$u" == "1,1,0," ]] || { echo "FAIL read mark flow: $u"; exit 1; }; echo "PASS opening the thread marks the message as read (unread 1 -> 0)"
if { as $B; echo "update public.user_notifications set title='x';"; } | q >/dev/null 2>&1; then echo "FAIL a non-read_at column was updatable"; exit 1; fi; echo "PASS only read_at is updatable"
{ as $B; echo "update public.user_notifications set read_at=now();"; } | q >/dev/null; echo "PASS read_at is updatable by the owner"
v=$(echo "set role anon; insert into public.page_views(kind,ref) values ('post','r'),('post','r'),('post','r'); select view_count('post','r',7);" | q -At | tail -1)
[[ "$v" == 3 ]] || { echo "FAIL view counter: $v"; exit 1; }; echo "PASS three anonymous views count 3"
if echo "set role anon; select dm_inbox();" | q >/dev/null 2>&1; then echo "FAIL anonymous can execute dm_inbox (default privileges not revoked)"; exit 1; fi; echo "PASS anonymous cannot execute the member functions"
if echo "set role anon; select count(*) from public.page_views;" | q >/dev/null 2>&1; then echo "FAIL anonymous can read page_views"; exit 1; fi; echo "PASS anonymous cannot read the raw views table"
# the verification path read from production, on the existing Torah corpus (the golden occurrence of the engine tests: torah-kedosha, skip 10065, start 50890)
node "$ROOT/scripts/build-qa-corpus.mjs" >/dev/null
cp "$ROOT/qa/corpus/torah.csv" "$D/torah.csv"; chmod a+r "$D/torah.csv"
q -c "\\copy public.torah_stream(idx,ch) from '$D/torah.csv' csv" >/dev/null
v=$(echo "select (els_verify_batch_v1('תורהקדשה','torah','0b022e8eef6f9c16','[{\"skip\":10065,\"dir\":1,\"start\":50890},{\"skip\":10065,\"dir\":1,\"start\":50891}]'::jsonb)->'counts'->>'verified');" | q -At | tail -1)
[[ "$v" == 1 ]] || { echo "FAIL verification of the golden occurrence: $v"; exit 1; }; echo "PASS the existing verification function accepts the golden occurrence and rejects a shifted one on the Torah corpus"
echo "ALL PASS"
