#!/usr/bin/env bash
# Runs test/discovery_center.sql on a throwaway local Postgres (never a live project). Usage: bash test/run-sql-test.sh  (from this directory's parent)
set -euo pipefail
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d); chown postgres "$D" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55433 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '$D'/data -m immediate stop >/dev/null" || true; rm -rf "$D"' EXIT
run "$BIN/createdb -h $D -p 55433 t"
run "cd $(pwd) && $BIN/psql -h $D -p 55433 -d t -v ON_ERROR_STOP=1 -q -f test/discovery_center.sql" 2>&1 | grep -E "PASS|ERROR|ASSERT|assert|DETAIL|LINE|CONTEXT|NOTICE" || echo "NO-OUTPUT"
