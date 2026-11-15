#!/usr/bin/env bash
# END-TO-END test of the successor of a retired rule on a throwaway PostgreSQL - never a live project:
#   database rows -> the PROPOSED rule guard -> the ONE snapshot reader (scripts/sql/g1_laws_snapshot.sql) -> the real G1 rules.
# tests/sql/g1_laws_snapshot_reader_v1.sql writes through the guard and prints the snapshot the reader produces at every step;
# scripts/check-g1-laws-snapshot-reader.mjs compares each snapshot with the expected record and runs G1 on every transition.
# Every step has an expected outcome (a refusal must be for its reason); any difference, or a step that did not run, exits 1.
# G1_READER_FLIP=<G-step> inverts one expectation (the self-check: the runner must then exit 1).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
W=$(mktemp -d)
FILES=(tests/sql/g1_laws_snapshot_reader_v1.sql scripts/sql/g1_laws_snapshot.sql supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
  tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql)
for f in "${FILES[@]}"; do mkdir -p "$W/$(dirname "$f")"; cp "$ROOT/$f" "$W/$f"; done
chmod -R a+rX "$W"
check() { cat > "$W/out.txt"; grep -q 'g1_laws_snapshot_reader_v1: SQL PART DONE' "$W/out.txt" || { cat "$W/out.txt"; echo "FAIL: the SQL part did not finish" >&2; exit 1; }
  node "$ROOT/scripts/check-g1-laws-snapshot-reader.mjs" "$W/out.txt" || { echo "FAIL: the reader or G1 did not behave as expected" >&2; exit 1; }; }

if [ -z "${G1_PG_BIN:-}" ] && ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-g1-reader-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/g1_laws_snapshot_reader_v1.sql 2>&1 | check
  exit
fi

BIN=${G1_PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin | tail -1)}; echo "PostgreSQL: $("$BIN/postgres" --version)"
D=$(mktemp -d)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55444 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h $D -p 55444 t"
run "cd $W && $BIN/psql -X -h $D -p 55444 -d t -v ON_ERROR_STOP=1 -q -f tests/sql/g1_laws_snapshot_reader_v1.sql" 2>&1 | check
