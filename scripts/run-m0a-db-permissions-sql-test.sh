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
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55440 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h $D -p 55440 t"
run "cd $W && $BIN/psql -X -h $D -p 55440 -d t -v ON_ERROR_STOP=1 -q -f tests/sql/m0a_db_permissions_v1.sql" 2>&1 | check
