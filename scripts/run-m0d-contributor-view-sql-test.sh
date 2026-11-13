#!/usr/bin/env bash
# M0-D contributor research view regression (tests/sql/m0d_world_contributor_research_candidates_v1.sql) on a throwaway PostgreSQL - never a live project.
# Same pattern as run-gilui-yomi-zvi-parity-sql-test.sh: the files are copied to a temporary folder the database user can read;
# a local PostgreSQL is used when installed, otherwise a network-less postgres:17 container.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
W=$(mktemp -d)
FILES=(tests/sql/m0d_world_contributor_research_candidates_v1.sql supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql
  supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql)
for f in "${FILES[@]}"; do mkdir -p "$W/$(dirname "$f")"; cp "$ROOT/$f" "$W/$f"; done
chmod -R a+rX "$W"
check() { tee "$W/out.txt"; grep -q 'M0-D contributor research view regression: PASS' "$W/out.txt" || { echo "FAIL: M0-D regression did not PASS" >&2; exit 1; }; }

# G1_PG_BIN (optional, same convention as the other runners of the foundation work) selects a specific local PostgreSQL bin directory,
# e.g. /usr/lib/postgresql/16/bin, so the same test can be run on every supported major version.
if [ -z "${G1_PG_BIN:-}" ] && ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-m0d-view-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/m0d_world_contributor_research_candidates_v1.sql 2>&1 | check
  exit
fi

BIN=${G1_PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin | tail -1)}; echo "PostgreSQL: $("$BIN/postgres" --version)"
D=$(mktemp -d)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55443 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h $D -p 55443 t"
run "cd $W && $BIN/psql -X -h $D -p 55443 -d t -v ON_ERROR_STOP=1 -q -f tests/sql/m0d_world_contributor_research_candidates_v1.sql" 2>&1 | check
