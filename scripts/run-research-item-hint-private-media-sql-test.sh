#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=$(pwd)

if compgen -G '/usr/lib/postgresql/*/bin/pg_ctl' >/dev/null; then
  PG_BIN=$(dirname "$(ls -1 /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")
  TEST_DIR=$(mktemp -d)
  chown postgres "$TEST_DIR" 2>/dev/null || true
  run_local() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
  run_local "$PG_BIN/initdb -D $TEST_DIR/data -A trust >/dev/null"
  run_local "$PG_BIN/pg_ctl -D $TEST_DIR/data -o '-p 55443 -k $TEST_DIR' -l $TEST_DIR/log -w start >/dev/null"
  trap 'run_local "$PG_BIN/pg_ctl -D $TEST_DIR/data -m immediate stop >/dev/null" || true; rm -rf "$TEST_DIR"' EXIT
  run_local "$PG_BIN/createdb -h $TEST_DIR -p 55443 hint_media_test"
  run_local "cd $PROJECT_DIR && $PG_BIN/psql -h $TEST_DIR -p 55443 -d hint_media_test -v ON_ERROR_STOP=1 -q -f tests/sql/research_item_hint_private_media_v1.sql"
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  CONTAINER_NAME="research-item-hint-media-sql-test-$$"
  docker run --rm -d --name "$CONTAINER_NAME" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$PROJECT_DIR:/workspace:ro" postgres:15-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true' EXIT
  for _ in $(seq 1 30); do
    if docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null
  docker exec -w /workspace "$CONTAINER_NAME" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f tests/sql/research_item_hint_private_media_v1.sql
  exit 0
fi

echo 'PostgreSQL binaries or Docker are required for this isolated SQL test.' >&2
exit 2
