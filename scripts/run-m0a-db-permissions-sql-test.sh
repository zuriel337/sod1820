#!/usr/bin/env bash
# M0-A permissions regression on a throwaway local PostgreSQL (never production).
set -euo pipefail
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d); chown postgres "$D" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55440 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D $D/data -m immediate stop >/dev/null" || true; rm -rf "$D"' EXIT
run "$BIN/createdb -h $D -p 55440 t"
run "cd $(pwd) && $BIN/psql -h $D -p 55440 -d t -v ON_ERROR_STOP=1 -q -f tests/sql/m0a_db_permissions_v1.sql"
