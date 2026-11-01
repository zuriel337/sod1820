#!/usr/bin/env bash
# Runs the membership credit engine migration against a disposable local cluster.
set -euo pipefail

TMP_DIR=$(mktemp -d)
PORT=55437
MIGRATION=supabase/migrations/20261031073716_membership_credit_engine_v1.sql
FIXTURE=tests/sql/membership_credit_engine_v1.sql
APPLIED="$TMP_DIR/applied.sql"

if [ "${SOD_CREDIT_PRODUCTION_SHAPE:-0}" = 1 ]; then
  # Same synthetic rows/assertions, but the real read-only-observed canonical
  # credit_grant definition, including its UUID return and updated_at behavior.
  awk -v canonical=tests/sql/fixtures/canonical_credit_grant_20261101.sql '
    /^create function public.credit_grant\(/ {
      print "alter table public.profiles add column updated_at timestamptz not null default now();"
      while ((getline line < canonical) > 0) print line
      close(canonical)
      skipping=1; next
    }
    skipping && /^\$\$;/ { skipping=0; next }
    !skipping { print }
  ' "$FIXTURE" > "$TMP_DIR/existing-shape.sql"
  FIXTURE="$TMP_DIR/existing-shape.sql"
fi

awk -v migration="$MIGRATION" '
  /-- APPLY_MEMBERSHIP_CREDIT_MIGRATION_HERE/ {
    while ((getline line < migration) > 0) print line
    close(migration)
    next
  }
  { print }
' "$FIXTURE" > "$APPLIED"

if [ "${SOD_CREDIT_PILOT_GUARD:-0}" = 1 ]; then
  awk -v migration=supabase/migrations/20261101151621_credit_reservation_owner_pilot_guard.sql '
    /-- APPLY_OWNER_PILOT_MIGRATION_HERE/ {
      while ((getline line < migration) > 0) print line
      close(migration)
      next
    }
    { print }
  ' tests/sql/credit_owner_pilot_guard_v1.sql >> "$APPLIED"
fi

# Both are PostgreSQL17; use a cached variant without pulling images/network.
PG_IMAGE=postgres:17-alpine
if command -v docker >/dev/null && ! docker image inspect "$PG_IMAGE" >/dev/null 2>&1; then
  PG_IMAGE=postgres:17
fi

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
elif command -v docker >/dev/null && docker image inspect "$PG_IMAGE" >/dev/null 2>&1; then
  CONTAINER="membership-credit-engine-test-$$"
  trap 'docker rm -f "'"$CONTAINER"'" >/dev/null 2>&1 || true; rm -rf "'"$TMP_DIR"'"' EXIT
  docker run --name "$CONTAINER" --network none -e POSTGRES_PASSWORD=synthetic-only -d "$PG_IMAGE" >/dev/null
  for _ in $(seq 1 60); do
    if docker logs "$CONTAINER" 2>&1 | grep -q 'PostgreSQL init process complete; ready for start up.' \
       && docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
  docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null
  if ! docker exec -i "$CONTAINER" psql -h 127.0.0.1 -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$APPLIED"; then
    echo 'Membership credit SQL acceptance failed.' >&2
    exit 1
  fi
  if [ "${SOD_CREDIT_PILOT_GUARD:-0}" = 1 ]; then
    # Rehearse restoring THIS synthetic fixture, never a live project backup.
    docker exec "$CONTAINER" pg_dump -h 127.0.0.1 -U postgres -Fc -f /tmp/credit-fixture.dump postgres
    docker exec "$CONTAINER" createdb -h 127.0.0.1 -U postgres credit_fixture_restored
    docker exec "$CONTAINER" pg_restore -h 127.0.0.1 -U postgres -d credit_fixture_restored /tmp/credit-fixture.dump
    docker exec -i "$CONTAINER" psql -h 127.0.0.1 -X -U postgres -d credit_fixture_restored -v ON_ERROR_STOP=1 <<'SQL'
select public.credit_test_assert(
 (select credits=20 from public.profiles where user_id='36f5cb84-71c3-4977-a2c7-d6413e973443')
 and (select not pilot_enabled from public.credit_action_prices where action_key='raziel_fast')
 and (select status='settled' from public.credit_reservations where operation_ref='owner-success-0001'),
 'synthetic dump/restore preserves canonical balance, settled reservation and disabled pilot');
select 'SYNTHETIC_CREDIT_RESTORE_PASS' as result;
SQL
  fi
else
  echo 'PostgreSQL 17 or the cached network-isolated postgres:17-alpine image is required.' >&2
  exit 1
fi
