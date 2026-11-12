#!/usr/bin/env bash
# CL-13 personal-memory pause: the REAL Edge handlers against a throwaway PostgreSQL (test/cl13-personal-memory-pg.test.mjs) -
# never a live project. The database starts as the live 12.11.2026 state (byte-identical copies of the five live functions and
# synthetic rows), the test runs the handlers BEFORE the proposal (the Edge code deployed first), applies the proposal, runs them
# again, and then simulates a consent. Providers (auth, the model, WhatsApp) are mocks; the memory functions, the trigger and the
# rows are real.
# The number of tests is pinned: a test that was skipped or did not run fails this runner.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
EXPECTED_TESTS=19
W=$(mktemp -d)
FILES=(tests/sql/cl13_handlers_base.sql supabase/proposed/20261112230000_cl13_personal_memory_pause.sql
  supabase/proposed/ROLLBACK_20261112230000_cl13_personal_memory_pause.sql)
for f in "${FILES[@]}"; do mkdir -p "$W/$(dirname "$f")"; cp "$ROOT/$f" "$W/$f"; done
mkdir -p "$W/tests/sql/fixtures"; cp -r "$ROOT/tests/sql/fixtures/cl13_memory_live_base_20261112" "$W/tests/sql/fixtures/"
chmod -R a+rX "$W"
check() {
  cat > "$W/out.txt"
  local pass fail skipped
  pass=$(grep -E '^# pass ' "$W/out.txt" | awk '{print $3}'); fail=$(grep -E '^# fail ' "$W/out.txt" | awk '{print $3}'); skipped=$(grep -E '^# skipped ' "$W/out.txt" | awk '{print $3}')
  grep -E '^(not ok|ok) ' "$W/out.txt" | sed -E 's/ # duration.*//' || true
  if [ "${fail:-1}" != 0 ] || [ "${skipped:-1}" != 0 ] || [ "${pass:-0}" != "$EXPECTED_TESTS" ]; then
    { grep -E -A14 '^not ok ' "$W/out.txt" | head -60; } || true
    echo "FAIL: CL-13 handler tests: pass=${pass:-?} fail=${fail:-?} skipped=${skipped:-?}, expected $EXPECTED_TESTS passed, 0 failed, 0 skipped" >&2; exit 1
  fi
  echo "RESULT: $pass handler tests on the throwaway database behaved as expected"
}

if [ -z "${G1_PG_BIN:-}" ] && ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-cl13-handlers-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/cl13_handlers_base.sql
  CL13_ROOT="$W" CL13_PSQL_CMD="[\"docker\",\"exec\",\"-i\",\"-w\",\"/w\",\"$CONTAINER\",\"psql\",\"-h\",\"127.0.0.1\",\"-U\",\"postgres\"]" \
    node --test --test-concurrency=1 "$ROOT/test/cl13-personal-memory-pg.test.mjs" 2>&1 | check
  exit
fi

BIN=${G1_PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin | tail -1)}; echo "PostgreSQL: $("$BIN/postgres" --version)"
D=$(mktemp -d); chmod 755 "$D"
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55446 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
PGUSER_NAME=$([ "$(id -u)" = 0 ] && echo postgres || id -un)
run "$BIN/createdb -h $D -p 55446 t"
(cd "$W" && "$BIN/psql" -X -h "$D" -p 55446 -U "$PGUSER_NAME" -d t -v ON_ERROR_STOP=1 -q -f tests/sql/cl13_handlers_base.sql)
CL13_ROOT="$W" CL13_PSQL_CMD="[\"$BIN/psql\",\"-h\",\"$D\",\"-p\",\"55446\",\"-U\",\"$PGUSER_NAME\",\"-d\",\"t\"]" \
  node --test --test-concurrency=1 "$ROOT/test/cl13-personal-memory-pg.test.mjs" 2>&1 | check
