#!/usr/bin/env bash
# CL-13 WhatsApp unit: the REAL Edge handlers of wa-raziel and ai-analyze against a throwaway PostgreSQL - never a live project.
# The database starts as the live 12.11.2026 state (byte-identical copies of the five live functions and synthetic rows). The database
# proposal, its rollback and the five fixtures are NOT part of this unit: they are exported from the pinned commit of the
# database-step branch (docs/reviews/cl13-whatsapp-unit-20261113/unit.json -> source_references.database_step), fetched by SHA when
# the clone does not have it. Providers (auth, the model, WhatsApp) are mocks; the memory functions, the trigger and the rows are real.
#   1. test/cl13-whatsapp-unit.test.mjs        both functions, every deploy candidate, Edge first -> proposal -> consent -> rollback
#   2. test/cl13-whatsapp-unit-states.test.mjs the DEPLOYED code (v21, v91) and the mixed states of the release, on a second database
#   3. test/cl13-whatsapp-unit-pins.test.mjs   what each candidate and each rollback IS (SHA-256, A = deployed + CL-13, B = A + accompanying diff)
# The number of tests is pinned: a test that was skipped or did not run fails this runner. Without the commits of the rollback
# manifest (CI fetches them by SHA) it fails here, it is never reported as passed.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
EXPECTED_UNIT=${CL13_WA_EXPECTED_UNIT:-13}
EXPECTED_STATES=${CL13_WA_EXPECTED_STATES:-9}
EXPECTED_PINS=${CL13_WA_EXPECTED_PINS:-9}
W=$(mktemp -d)
DB_SHA=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).source_references.database_step.sha)' "$ROOT/docs/reviews/cl13-whatsapp-unit-20261113/unit.json")
DB_FILES=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).source_references.database_step.files.join("\n"))' "$ROOT/docs/reviews/cl13-whatsapp-unit-20261113/unit.json")
EDGE_SHA=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).source_references.edge_code_origin.sha)' "$ROOT/docs/reviews/cl13-whatsapp-unit-20261113/unit.json")
for c in "$DB_SHA" "$EDGE_SHA" 949c24ad549ae9e95ced528a4ee8159670b52678 b4d5ec47132ed8003b822cc70de9e1b82447cb7c; do
  git -C "$ROOT" cat-file -e "$c^{commit}" 2>/dev/null || git -C "$ROOT" fetch --quiet --depth=1 origin "$c"
done
while IFS= read -r f; do mkdir -p "$W/$(dirname "$f")"; git -C "$ROOT" show "$DB_SHA:$f" > "$W/$f"; done <<< "$DB_FILES"
mkdir -p "$W/tests/sql"; cp "$ROOT/tests/sql/cl13_handlers_base.sql" "$W/tests/sql/"
chmod -R a+rX "$W"
check() {
  local EXPECTED=$1 label=$2
  cat > "$W/out.txt"
  local pass fail skipped
  pass=$(awk '/^# pass /{print $3}' "$W/out.txt"); fail=$(awk '/^# fail /{print $3}' "$W/out.txt"); skipped=$(awk '/^# skipped /{print $3}' "$W/out.txt")
  { grep -E '^(not ok|ok) ' "$W/out.txt" | sed -E 's/ # duration.*//'; } || true
  if [ "${fail:-?}" != 0 ] || [ "${skipped:-?}" != 0 ] || [ "${pass:-?}" != "$EXPECTED" ]; then
    if [ -z "$pass" ]; then echo "--- the test runner printed no summary; its output:" >&2; tail -60 "$W/out.txt" >&2; fi
    { grep -E -A14 '^not ok ' "$W/out.txt" | head -60; } || true
    echo "FAIL: CL-13 WhatsApp unit ($label): pass=${pass:-?} fail=${fail:-?} skipped=${skipped:-?}, expected $EXPECTED passed, 0 failed, 0 skipped" >&2; exit 1
  fi
  echo "RESULT: $pass $label behaved as expected (database proposal from $DB_SHA)"
}

if [ -z "${G1_PG_BIN:-}" ] && ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-cl13-wa-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break; sleep 1; done
  docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/cl13_handlers_base.sql
  CL13_ROOT="$W" CL13_PSQL_CMD="[\"docker\",\"exec\",\"-i\",\"-w\",\"/w\",\"$CONTAINER\",\"psql\",\"-h\",\"127.0.0.1\",\"-U\",\"postgres\"]" \
    node --test --test-reporter=tap --test-concurrency=1 "$ROOT/test/cl13-whatsapp-unit.test.mjs" 2>&1 | check "$EXPECTED_UNIT" "tests of both functions on every deploy candidate"
  docker exec "$CONTAINER" createdb -h 127.0.0.1 -U postgres t2
  docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -d t2 -v ON_ERROR_STOP=1 -q -f tests/sql/cl13_handlers_base.sql
  CL13_ROOT="$W" CL13_PSQL_CMD="[\"docker\",\"exec\",\"-i\",\"-w\",\"/w\",\"$CONTAINER\",\"psql\",\"-h\",\"127.0.0.1\",\"-U\",\"postgres\",\"-d\",\"t2\"]" \
    node --test --test-reporter=tap --test-concurrency=1 "$ROOT/test/cl13-whatsapp-unit-states.test.mjs" 2>&1 | check "$EXPECTED_STATES" "tests of the deployed code in the intermediate states"
  node --test --test-reporter=tap --test-concurrency=1 "$ROOT/test/cl13-whatsapp-unit-pins.test.mjs" 2>&1 | check "$EXPECTED_PINS" "pin tests of the candidates and the rollbacks"
  exit
fi

BIN=${G1_PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin | tail -1)}; echo "PostgreSQL: $("$BIN/postgres" --version)"
D=$(mktemp -d); chmod 755 "$D"
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55447 -k $D -c listen_addresses=' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
PGUSER_NAME=$([ "$(id -u)" = 0 ] && echo postgres || id -un)
run "$BIN/createdb -h $D -p 55447 t"
(cd "$W" && "$BIN/psql" -X -h "$D" -p 55447 -U "$PGUSER_NAME" -d t -v ON_ERROR_STOP=1 -q -f tests/sql/cl13_handlers_base.sql)
CL13_ROOT="$W" CL13_PSQL_CMD="[\"$BIN/psql\",\"-h\",\"$D\",\"-p\",\"55447\",\"-U\",\"$PGUSER_NAME\",\"-d\",\"t\"]" \
  node --test --test-reporter=tap --test-concurrency=1 "$ROOT/test/cl13-whatsapp-unit.test.mjs" 2>&1 | check "$EXPECTED_UNIT" "tests of both functions on every deploy candidate"
run "$BIN/createdb -h $D -p 55447 t2"
(cd "$W" && "$BIN/psql" -X -h "$D" -p 55447 -U "$PGUSER_NAME" -d t2 -v ON_ERROR_STOP=1 -q -f tests/sql/cl13_handlers_base.sql)
CL13_ROOT="$W" CL13_PSQL_CMD="[\"$BIN/psql\",\"-h\",\"$D\",\"-p\",\"55447\",\"-U\",\"$PGUSER_NAME\",\"-d\",\"t2\"]" \
  node --test --test-reporter=tap --test-concurrency=1 "$ROOT/test/cl13-whatsapp-unit-states.test.mjs" 2>&1 | check "$EXPECTED_STATES" "tests of the deployed code in the intermediate states"
node --test --test-reporter=tap --test-concurrency=1 "$ROOT/test/cl13-whatsapp-unit-pins.test.mjs" 2>&1 | check "$EXPECTED_PINS" "pin tests of the candidates and the rollbacks"
