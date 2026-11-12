#!/usr/bin/env bash
# M0-B ai_quota_check fail-closed regression (tests/sql/m0b_ai_quota_fail_closed_v1.sql) on a throwaway PostgreSQL - never a live project.
# Same pattern as run-gilui-yomi-zvi-parity-sql-test.sh: the files are copied to a temporary folder the database user can read;
# a local PostgreSQL is used when installed, otherwise a network-less postgres:17 container.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
W=$(mktemp -d)
FILES=(tests/sql/m0b_ai_quota_fail_closed_v1.sql supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql
  supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql tests/sql/fixtures/m0b_ai_quota_live_base_20261112/ai_quota_check.sql)
for f in "${FILES[@]}"; do mkdir -p "$W/$(dirname "$f")"; cp "$ROOT/$f" "$W/$f"; done
chmod -R a+rX "$W"
# Round 5: the negative cases must stop on the full-match guards themselves (not on some other error).
check() { tee "$W/out.txt"; grep -q 'm0b_ai_quota_fail_closed_v1: PASS' "$W/out.txt" || { echo "FAIL: M0-B regression did not PASS" >&2; exit 1; }
  grep -q 'M0B drift: live ai_quota_check is neither the body reviewed' "$W/out.txt" || { echo "FAIL: the proposal did not stop on its full-match guard" >&2; exit 1; }
  [ "$(grep -c 'M0B rollback drift: ai_quota_check is neither the M0-B body nor the original' "$W/out.txt")" -ge 2 ] || { echo "FAIL: the rollback did not stop on its full-match guard (twice)" >&2; exit 1; }
  grep -q 'M0B rollback: public.ai_quota_check(text,text,integer) not found; stop, nothing created' "$W/out.txt" || { echo "FAIL: the rollback did not stop on a missing function" >&2; exit 1; }; }

if ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-m0b-quota-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/m0b_ai_quota_fail_closed_v1.sql 2>&1 | check
  exit
fi

BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55442 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h $D -p 55442 t"
run "cd $W && $BIN/psql -X -h $D -p 55442 -d t -v ON_ERROR_STOP=1 -q -f tests/sql/m0b_ai_quota_fail_closed_v1.sql" 2>&1 | check
