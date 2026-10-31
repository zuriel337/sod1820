#!/usr/bin/env bash
# Runs the membership credit engine migration against a disposable local cluster.
set -euo pipefail

TMP_DIR=$(mktemp -d)
PORT=55437
MIGRATION=supabase/migrations/20261031073716_membership_credit_engine_v1.sql
FIXTURE=tests/sql/membership_credit_engine_v1.sql
APPLIED="$TMP_DIR/applied.sql"

awk -v migration="$MIGRATION" '
  /-- APPLY_MEMBERSHIP_CREDIT_MIGRATION_HERE/ {
    while ((getline line < migration) > 0) print line
    close(migration)
    next
  }
  { print }
' "$FIXTURE" > "$APPLIED"

if compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
  chown postgres "$TMP_DIR" 2>/dev/null || true
  run_as_postgres() {
    if [ "$(id -u)" = 0 ]; then
      su postgres -c "$*"
    else
      bash -c "$*"
    fi
  }
  run_as_postgres "$BIN/initdb -D $TMP_DIR/data -A trust >/dev/null"
  run_as_postgres "$BIN/pg_ctl -D $TMP_DIR/data -o '-p $PORT -k $TMP_DIR' -l $TMP_DIR/log -w start >/dev/null"
  trap 'run_as_postgres "$BIN/pg_ctl -D '"$TMP_DIR"'/data -m immediate stop >/dev/null" || true; rm -rf "'"$TMP_DIR"'"' EXIT
  chown postgres "$APPLIED" 2>/dev/null || true
  run_as_postgres "$BIN/createdb -h $TMP_DIR -p $PORT membership_credit_test"
  if ! run_as_postgres "$BIN/psql -X -h $TMP_DIR -p $PORT -d membership_credit_test -v ON_ERROR_STOP=1 -f $APPLIED"; then
    echo 'Membership credit SQL acceptance failed.' >&2
    exit 1
  fi
elif command -v docker >/dev/null && docker image inspect postgres:17-alpine >/dev/null 2>&1; then
  CONTAINER="membership-credit-engine-test-$$"
  trap 'docker rm -f "'"$CONTAINER"'" >/dev/null 2>&1 || true; rm -rf "'"$TMP_DIR"'"' EXIT
  docker run --name "$CONTAINER" --network none -e POSTGRES_PASSWORD=synthetic-only -d postgres:17-alpine >/dev/null
  for _ in $(seq 1 60); do
    if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
    sleep 0.25
  done
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null
  if ! docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$APPLIED"; then
    echo 'Membership credit SQL acceptance failed.' >&2
    exit 1
  fi
else
  echo 'PostgreSQL 17 or the cached network-isolated postgres:17-alpine image is required.' >&2
  exit 1
fi
