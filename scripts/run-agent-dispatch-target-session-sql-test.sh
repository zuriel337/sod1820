#!/usr/bin/env bash
# Runs tests/sql/agent_dispatch_target_session_v1.sql on a throwaway local PostgreSQL (never a live project).
# The files are copied to a temporary folder first, so the database user only needs to read that folder.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
W=$(mktemp -d)
for f in tests/sql/agent_dispatch_target_session_v1.sql tests/sql/fixtures/agent_dispatch_live_base_20261111 \
         supabase/proposed/20261111210000_agent_dispatch_target_session_v1_PROPOSAL.sql \
         supabase/proposed/ROLLBACK_20261111210000_agent_dispatch_target_session_v1.sql; do
  mkdir -p "$W/$(dirname "$f")"
  cp -R "$ROOT/$f" "$W/$f"
done
chmod -R a+rX "$W"

if ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-agent-dispatch-target-$$"
  docker run --rm -d --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-bookworm >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec -w /w "$CONTAINER" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/agent_dispatch_target_session_v1.sql
  exit
fi

BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55434 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h $D -p 55434 t"
run "cd $W && $BIN/psql -h $D -p 55434 -d t -v ON_ERROR_STOP=1 -q -f tests/sql/agent_dispatch_target_session_v1.sql"
