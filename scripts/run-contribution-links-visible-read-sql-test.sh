#!/usr/bin/env bash
# Runs tests/sql/contribution_links_visible_message_read_v1.sql, then four two-session concurrency cases, on a throwaway local PostgreSQL
# (never a live project). The files are copied to a temporary folder first, so the database user only needs to read that folder.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
W=$(mktemp -d)
T=tests/sql/contribution_links_visible_message_read_v1.sql
APPLY=supabase/proposed/20261114180000_contribution_links_visible_message_read_v1_PROPOSAL.sql
ROLLBACK=supabase/proposed/ROLLBACK_20261114180000_contribution_links_visible_message_read_v1.sql
for f in $T tests/sql/fixtures/contribution_links_live_base_20261114/g3_openweb_import_message.sql $APPLY $ROLLBACK; do
  mkdir -p "$W/$(dirname "$f")"
  cp "$ROOT/$f" "$W/$f"
done
chmod -R a+rX "$W"
EXPECTED_MAIN=8
EXPECTED_CONCURRENCY=4

# --- engine: a local PostgreSQL when installed (CI), else a container ---------------------------------------------------------------------------
if ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-cl-visible-read-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  psql_file() { docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -t -f "$1" 2>&1; }
else
  BIN=${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin | tail -1)}
  D=$(mktemp -d)
  PORT=${PG_PORT:-55437}
  run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
  if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
  run "$BIN/initdb -D $D/data -A trust -U postgres >/dev/null"
  run "$BIN/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log -w start >/dev/null"
  trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
  run "$BIN/createdb -U postgres -h $D -p $PORT t"
  psql_file() { run "cd $W && $BIN/psql -X -U postgres -h $D -p $PORT -d t -v ON_ERROR_STOP=1 -q -t -f $1" 2>&1; }
fi
sql() { printf '%s\n' "$1" > "$W/q.$$.sql"; chmod a+r "$W/q.$$.sql"; psql_file "$W/q.$$.sql"; }
sql_bg() { local f="$W/bg.$RANDOM.sql"; printf '%s\n' "$1" > "$f"; chmod a+r "$f"; psql_file "$f" > "$f.out" 2>&1 & echo $! > "$W/last.pid"; }
sql_val() { sql "$1" | tr -d ' \n'; }
fail() { echo "FAIL: $*" >&2; exit 1; }

# --- 1. the functional test (ends in the applied state) ----------------------------------------------------------------------------------------
psql_file "$W/$T" | tee "$W/out.txt"
test "$(grep -c '^ *PASS [0-7] ' "$W/out.txt")" = "$EXPECTED_MAIN" || fail "expected $EXPECTED_MAIN PASS lines from the SQL test"
APPLIED_MD5=$(sql_val "select substring(obj_description(oid, 'pg_policy') from 'qual_md5=([0-9a-f]{32})') from pg_policy where polname = 'cl_public_read' and polrelid = 'public.contribution_links'::regclass;")
test -n "$APPLIED_MD5" || fail "the applied record is missing at the end of the SQL test"

# --- 2. concurrency: two sessions ------------------------------------------------------------------------------------------------------------------
# C1: another session holds a policy-DDL lock; the rollback must fail closed on the lock timeout and change nothing.
sql_bg "begin; lock table public.contribution_links in share update exclusive mode; select pg_sleep(6); rollback;"
A=$(cat "$W/last.pid"); sleep 1
if OUT=$(psql_file "$W/$ROLLBACK"); then fail "C1: the rollback ran while another session held the policy lock"; fi
echo "$OUT" | grep -qi "lock timeout\|could not obtain lock" || fail "C1: expected a lock timeout, got: $OUT"
wait "$A" || true
test "$(sql_val "select md5(pg_get_expr(polqual, polrelid)) from pg_policy where polname = 'cl_public_read' and polrelid = 'public.contribution_links'::regclass;")" = "$APPLIED_MD5" || fail "C1: the policy changed"
echo "PASS C1 a policy change in flight in another session makes the rollback fail closed (lock timeout); the applied policy is untouched"

# C2: another session edits the policy and commits while the rollback waits for the lock; the rollback then sees the change and refuses.
sql_bg "begin; alter policy cl_public_read on public.contribution_links using (from_contribution_id is not null); select pg_sleep(1.5); commit;"
A=$(cat "$W/last.pid"); sleep 0.5
if OUT=$(psql_file "$W/$ROLLBACK"); then fail "C2: the rollback overwrote a concurrent change"; fi
echo "$OUT" | grep -q "changed since it was applied" || fail "C2: expected the changed-since-apply refusal, got: $OUT"
wait "$A" || true
test "$(sql_val "select pg_get_expr(polqual, polrelid) from pg_policy where polname = 'cl_public_read' and polrelid = 'public.contribution_links'::regclass;")" = "(from_contribution_idISNOTNULL)" || fail "C2: the concurrent edit is not what remains"
echo "PASS C2 a concurrent edit committed while the rollback waited is seen after the lock: the rollback refuses and the other session's change stays"

# C3: the proposal, from the live state, while another session adds a policy: it waits, sees two policies and refuses.
sql "alter policy cl_public_read on public.contribution_links using (true); comment on policy cl_public_read on public.contribution_links is null;" >/dev/null
sql_bg "begin; create policy cl_race on public.contribution_links for select to authenticated using (true); select pg_sleep(1.5); commit;"
A=$(cat "$W/last.pid"); sleep 0.5
if OUT=$(psql_file "$W/$APPLY"); then fail "C3: the apply ran over a concurrent policy change"; fi
echo "$OUT" | grep -q "expected exactly one policy" || fail "C3: expected the one-policy refusal, got: $OUT"
wait "$A" || true
test "$(sql_val "select count(*) from pg_policy where polrelid = 'public.contribution_links'::regclass and pg_get_expr(polqual, polrelid) = 'true';")" = "2" || fail "C3: the state is not the untouched live one plus the concurrent policy"
echo "PASS C3 the apply waits for a concurrent policy change, then refuses on the changed state; nothing of the proposal is applied"
sql "drop policy cl_race on public.contribution_links;" >/dev/null
psql_file "$W/$APPLY" >/dev/null || fail "the apply from the restored live state failed"

# C4: the table lock blocks neither a guest's read nor the import's writes (service_role) while a policy change holds it.
sql_bg "begin; lock table public.contribution_links in share update exclusive mode; select pg_sleep(5); rollback;"
A=$(cat "$W/last.pid"); sleep 1
GUEST=$(sql_val "set statement_timeout = 2000; set role anon; select count(*) from public.contribution_links;") || fail "C4: a guest read was blocked"
test "$GUEST" = "7" || fail "C4: a guest should see 7 links, saw $GUEST"
sql "set statement_timeout = 2000; set role service_role; insert into public.contribution_links(from_contribution_id, target_type, target_id, relation_type) values ('10000000-0000-4000-8000-000000000001', 'openweb_message', 'sp_C4_probe', 'derived_from'); delete from public.contribution_links where target_id = 'sp_C4_probe';" >/dev/null || fail "C4: an import-style write was blocked"
wait "$A" || true
echo "PASS C4 while a policy change holds its lock a guest still reads and service_role still writes (no blocking of readers or of the import)"

echo "ALL: $EXPECTED_MAIN SQL cases + $EXPECTED_CONCURRENCY concurrency cases passed"
