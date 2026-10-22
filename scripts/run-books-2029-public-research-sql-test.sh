#!/usr/bin/env bash
set -euo pipefail

if compgen -G '/usr/lib/postgresql/*/bin/postgres' >/dev/null; then
  BIN=$(dirname "$(ls -d /usr/lib/postgresql/*/bin/postgres | tail -1)")
  DB_DIR=$(mktemp -d)
  chown postgres "$DB_DIR" 2>/dev/null || true

  run_as_postgres() {
    if [ "$(id -u)" = 0 ]; then
      su postgres -c "$*"
    else
      bash -c "$*"
    fi
  }

  run_as_postgres "$BIN/initdb -D $DB_DIR/data -A trust >/dev/null"
  run_as_postgres "$BIN/pg_ctl -D $DB_DIR/data -o '-p 55433 -k $DB_DIR' -l $DB_DIR/log -w start >/dev/null"
  trap 'run_as_postgres "$BIN/pg_ctl -D '$DB_DIR'/data -m immediate stop >/dev/null" || true; rm -rf "$DB_DIR"' EXIT
  run_as_postgres "$BIN/createdb -h $DB_DIR -p 55433 books_public_test"
  run_as_postgres "cd $(pwd) && $BIN/psql -h $DB_DIR -p 55433 -d books_public_test -v ON_ERROR_STOP=1 -q -f tests/sql/books_2029_public_research_projection_v1.sql"
  exit 0
fi

DOCKER_INPUT=$(mktemp -d)
trap 'rm -rf "$DOCKER_INPUT"' EXIT
mkdir -p "$DOCKER_INPUT/tests/sql" "$DOCKER_INPUT/supabase/migrations"
cp tests/sql/books_2029_public_research_projection_v1.sql "$DOCKER_INPUT/tests/sql/"
cp supabase/migrations/20261022001111_books_2029_public_research_projection_v1.sql "$DOCKER_INPUT/supabase/migrations/"
chmod -R a+rX "$DOCKER_INPUT"

env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock run --rm \
  --user postgres \
  --entrypoint sh \
  --mount "type=bind,src=$DOCKER_INPUT,dst=/workspace,readonly" \
  --workdir /workspace \
  postgres:17.6-alpine -c '
    set -eu
    db_dir=$(mktemp -d)
    cleanup() { pg_ctl -D "$db_dir/data" -m immediate stop >/dev/null 2>&1 || true; }
    trap cleanup EXIT
    initdb -D "$db_dir/data" -A trust >/dev/null
    pg_ctl -D "$db_dir/data" -o "-p 55433 -k $db_dir" -l "$db_dir/log" -w start >/dev/null
    createdb -h "$db_dir" -p 55433 books_public_test
    psql -h "$db_dir" -p 55433 -d books_public_test -v ON_ERROR_STOP=1 -q \
      -f tests/sql/books_2029_public_research_projection_v1.sql
  '
