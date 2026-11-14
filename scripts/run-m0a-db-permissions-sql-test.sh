#!/usr/bin/env bash
# M0-A permissions regression (tests/sql/m0a_db_permissions_v1.sql) on a throwaway PostgreSQL - never a live project.
# Same pattern as run-gilui-yomi-zvi-parity-sql-test.sh: the files are copied to a temporary folder the database user can read;
# a local PostgreSQL is used when installed, otherwise a network-less postgres:17 container.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
W=$(mktemp -d)
FILES=(tests/sql/m0a_db_permissions_v1.sql
  supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql supabase/proposed/ROLLBACK_20261106131000_def005.sql
  supabase/proposed/20261112130000_m0a_admin_and_account_guards.sql supabase/proposed/ROLLBACK_20261112130000_m0a_admin_and_account_guards.sql
  supabase/proposed/20261112130500_m0a_legacy_client_writes_close.sql supabase/proposed/ROLLBACK_20261112130500_m0a_legacy_client_writes_close.sql
  supabase/proposed/20261112131000_m0a_dormant_write_policies_admin_only.sql supabase/proposed/ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql
  supabase/proposed/20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql supabase/proposed/ROLLBACK_20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql
  supabase/proposed/20261112133000_m0a_add_contribution_client_address.sql supabase/proposed/ROLLBACK_20261112133000_m0a_add_contribution_client_address.sql)
for f in "${FILES[@]}"; do mkdir -p "$W/$(dirname "$f")"; cp "$ROOT/$f" "$W/$f"; done
chmod -R a+rX "$W"
check() { tee "$W/out.txt"; grep -q 'M0-A permissions regression: ALL PASS' "$W/out.txt" || { echo "FAIL: M0-A regression did not reach ALL PASS" >&2; exit 1; }; }

if ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-m0a-permissions-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/m0a_db_permissions_v1.sql 2>&1 | check
  exit
fi

BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
# The superuser is named postgres whoever runs the script (as on Supabase): DEF-005 checks that the reviewed functions are owned by postgres.
run "$BIN/initdb -D $D/data -A trust -U postgres >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55440 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h $D -p 55440 -U postgres t"
run "cd $W && $BIN/psql -X -h $D -p 55440 -U postgres -d t -v ON_ERROR_STOP=1 -q -f tests/sql/m0a_db_permissions_v1.sql" 2>&1 | check

# --- concurrency (independent review of 14.11.2026, findings D5 and D7) ------------------------------------------------------------------------------
# The SQL test above ends in the exact "before" state. The guards must read the catalogue only AFTER they hold the table locks (otherwise a policy change that
# another session commits between the guard and the first DROP POLICY would be silently overwritten and the postcondition would still pass), and a lock that cannot
# be had within the lock timeout must fail closed. CREATE / ALTER / DROP POLICY take ACCESS EXCLUSIVE (measured), GRANT takes no table lock.
PORT=55440
cpsql() { run "cd $W && $BIN/psql -X -h $D -p $PORT -U postgres -d t -v ON_ERROR_STOP=1 -q -At -f $1" 2>&1; }
csql() { printf '%s\n' "$1" > "$W/c.$$.sql"; chmod a+r "$W/c.$$.sql"; cpsql "$W/c.$$.sql"; }
cbg() { local f="$W/cbg.$RANDOM.sql"; printf '%s\n' "$1" > "$f"; chmod a+r "$f"; ( cpsql "$f" > "$f.out" 2>&1 ) & echo $! > "$W/c.pid"; }
cfail() { echo "FAIL: $*" >&2; exit 1; }
S6=supabase/proposed/20261112131000_m0a_dormant_write_policies_admin_only.sql
R6=supabase/proposed/ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql
auth_write_qual() { csql "select qual from pg_policies where tablename = 'page_content' and policyname = 'auth_write';"; }
trails_qual() { csql "select qual from pg_policies where tablename = 'trails' and policyname = 'admin_all';"; }
insights_qual() { csql "select qual from pg_policies where tablename = 'insights' and policyname = 'authenticated write';"; }
OLD_AUTH="(auth.role() = 'authenticated'::text)"

# K1: another session edits a policy of step 6 and commits while the apply waits for the lock: the apply reads the catalogue after the lock and refuses.
test "$(trails_qual)" = "true" || cfail "K1: unexpected start state"
cbg "begin; alter policy admin_all on public.trails using (true and false) with check (true and false); select pg_sleep(1.2); commit;"; A=$(cat "$W/c.pid"); sleep 0.4
if OUT=$(cpsql "$W/$S6"); then cfail "K1: the apply overwrote a concurrent policy change"; fi
echo "$OUT" | grep -q "not the reviewed one" || cfail "K1: expected the fingerprint refusal, got: $OUT"
wait "$A" || true
test "$(trails_qual)" = "(true AND false)" || cfail "K1: the concurrent change is not what remains"
test "$(auth_write_qual)" = "$OLD_AUTH" || cfail "K1: the refused apply changed something"
csql "alter policy admin_all on public.trails using (true) with check (true);" >/dev/null
echo "PASS K1 a policy change committed by another session while the apply waits for its lock is seen after the lock: the apply refuses and the other session's change stays"

# K2: the same for the rollback of an applied step.
cpsql "$W/$S6" >/dev/null || cfail "K2: the clean apply failed"
cbg "begin; alter policy admin_all on public.trails using (true) with check (true); select pg_sleep(1.2); commit;"; A=$(cat "$W/c.pid"); sleep 0.4
if OUT=$(cpsql "$W/$R6"); then cfail "K2: the rollback overwrote a concurrent policy change"; fi
echo "$OUT" | grep -q "not the state the apply produced" || cfail "K2: expected the changed-since-apply refusal, got: $OUT"
wait "$A" || true
test "$(trails_qual)" = "true" || cfail "K2: the concurrent change is not what remains"
case "$(auth_write_qual)" in *rd_is_admin*) ;; *) cfail "K2: the applied state did not stay";; esac
csql "alter policy admin_all on public.trails using ((select public.rd_is_admin())) with check ((select public.rd_is_admin()));" >/dev/null
cpsql "$W/$R6" >/dev/null || cfail "K2: the exact rollback of the restored applied state failed"
test "$(auth_write_qual)" = "$OLD_AUTH" || cfail "K2: the rollback did not restore the old policy"
echo "PASS K2 a policy change committed by another session while the rollback waits for its lock is seen after the lock: the rollback refuses; the unchanged applied state then rolls back exactly"

# K3: a reader that keeps one of the tables longer than the lock timeout (2s): the policy DDL of the apply fails closed and EVERYTHING it did before is rolled back.
cbg "begin; select count(*) from public.page_content; select pg_sleep(4.5); commit;"; A=$(cat "$W/c.pid"); sleep 0.4
T0=$(date +%s.%N)
if OUT=$(cpsql "$W/$S6"); then cfail "K3: the apply succeeded while a reader held the table"; fi
T1=$(date +%s.%N)
echo "$OUT" | grep -qi "lock timeout" || cfail "K3: expected a lock timeout, got: $OUT"
python3 -c "import sys; sys.exit(0 if 1.4 <= $T1 - $T0 <= 3.6 else 1)" || cfail "K3: the wait was not about the 2 s lock timeout"
test "$(auth_write_qual)" = "$OLD_AUTH" || cfail "K3: the failed apply changed page_content"
test "$(insights_qual)" = "true" || cfail "K3: the failed apply left a half change on insights (not atomic)"
wait "$A" || true
echo "PASS K3 a reader that keeps a table longer than the lock timeout makes the apply fail closed after about 2 s; the changes it had already made in its transaction are rolled back (atomic)"
echo "M0-A concurrency: 3 cases passed"
