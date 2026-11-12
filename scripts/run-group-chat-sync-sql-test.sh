#!/usr/bin/env bash
# Runs tests/sql/group_chat_sync_v1.sql on a throwaway local PostgreSQL (never a live project).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
W=$(mktemp -d)
for f in tests/sql/group_chat_sync_v1.sql \
         supabase/proposed/20261112150000_group_chat_sync_gilui_v1_PROPOSAL.sql \
         supabase/proposed/20261112150000_group_chat_sync_gilui_v1_ROLLBACK.sql; do
  mkdir -p "$W/$(dirname "$f")"
  cp -R "$ROOT/$f" "$W/$f"
done
chmod -R a+rX "$W"
check() { tee "$W/out.txt"; grep -q 'group_chat_sync_v1: OK' "$W/out.txt" || { echo "FAIL: group_chat_sync_v1 did not finish" >&2; exit 1; }; }

if ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-group-chat-sync-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec -w /w/tests/sql "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -t -A -f group_chat_sync_v1.sql 2>&1 | check
  exit
fi

BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55441 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h $D -p 55441 t"
run "cd $W/tests/sql && $BIN/psql -X -h $D -p 55441 -d t -v ON_ERROR_STOP=1 -q -t -A -f group_chat_sync_v1.sql" 2>&1 | check
