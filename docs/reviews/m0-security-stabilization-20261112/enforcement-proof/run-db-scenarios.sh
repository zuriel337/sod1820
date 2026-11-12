#!/usr/bin/env bash
# EVIDENCE ONLY: the live rule guard (byte-identical copy, md5 56b90b0a... = live on 12.11.2026) versus the proposed extension of the
# SAME function, on a throwaway local PostgreSQL. Never connects to a live project.
set -u
P=$(cd "$(dirname "$0")" && pwd); BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
for which in live proposed; do
  D=$(mktemp -d); W=$(mktemp -d); [ "$(id -u)" = 0 ] && chown postgres "$D"
  sed "s#GUARD_FILE#guard.sql#" "$P/db-gate-test.sql" > "$W/test.sql"; cp "$P/db-$which-guard.sql" "$W/guard.sql"; chmod -R a+rX "$W"
  run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
  echo "======== $which guard"
  run "$BIN/initdb -D $D/data -A trust >/dev/null && $BIN/pg_ctl -D $D/data -o '-p 55495 -k $D' -l $D/log -w start >/dev/null && $BIN/createdb -h $D -p 55495 t && cd $W && $BIN/psql -X -h $D -p 55495 -d t -qAt -v ON_ERROR_STOP=1 -f test.sql 2>&1 | grep -E 'GUARD md5|=>|ERROR'; $BIN/pg_ctl -D $D/data -m immediate stop >/dev/null"
done
