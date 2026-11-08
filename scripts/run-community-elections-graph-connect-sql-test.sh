#!/usr/bin/env bash
# Runs tests/sql/community_elections_graph_connect_v1.sql on a throwaway local Postgres (never a live project).
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1 || true)
if [ -z "${BIN:-}" ]; then
  CONTAINER="sod-community-graph-test-$$"
  docker run --rm -d --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$(pwd):/repo:ro" -w /repo postgres:17-bookworm >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true' EXIT
  for i in $(seq 1 30); do docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break; sleep 1; done
  docker exec -w /repo "$CONTAINER" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -t -A -f tests/sql/community_elections_graph_connect_v1.sql | tail -1
  exit
fi
D=$(mktemp -d); chown postgres "$D" 2>/dev/null || true; chmod 755 "$D"
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55433 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '$D'/data -m immediate stop >/dev/null" || true; rm -rf "$D"' EXIT
run "$BIN/createdb -h $D -p 55433 t"
run "cd $(pwd) && $BIN/psql -h $D -p 55433 -d t -v ON_ERROR_STOP=1 -q -t -A -f tests/sql/community_elections_graph_connect_v1.sql"
