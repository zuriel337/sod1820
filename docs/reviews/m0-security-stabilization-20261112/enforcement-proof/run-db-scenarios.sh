#!/usr/bin/env bash
# EVIDENCE + SELF-CHECK: the live rule guard (byte-identical copy, md5 56b90b0a... = live on 12.11.2026) and the proposed extension
# of the SAME function, each on a throwaway local PostgreSQL. Every case has an expected outcome per variant; any unexpected outcome
# (or a changed live md5) exits 1. Never connects to a live project.
set -u
P=$(cd "$(dirname "$0")" && pwd); BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1); FAIL=0
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
for which in live proposed; do
  D=$(mktemp -d); W=$(mktemp -d); [ "$(id -u)" = 0 ] && chown postgres "$D"
  { echo "set g1.variant = '$which';"; sed "s#GUARD_FILE#guard.sql#" "$P/db-gate-test.sql"; } > "$W/test.sql"; cp "$P/db-$which-guard.sql" "$W/guard.sql"; chmod -R a+rX "$W"
  echo "======== $which guard"
  out=$(run "$BIN/initdb -D $D/data -A trust >/dev/null && $BIN/pg_ctl -D $D/data -o '-p 55496 -k $D' -l $D/log -w start >/dev/null && $BIN/createdb -h $D -p 55496 t && cd $W && $BIN/psql -X -h $D -p 55496 -d t -qAt -v ON_ERROR_STOP=1 -f test.sql 2>&1; echo PSQL_EXIT=\$?; $BIN/pg_ctl -D $D/data -m immediate stop >/dev/null")
  grep -E 'GUARD md5|=>|AS EXPECTED|UNEXPECTED|ERROR' <<<"$out"
  grep -q 'PSQL_EXIT=0' <<<"$out" || FAIL=1
  if [ "$which" = live ] && ! grep -q 'GUARD md5 56b90b0ae0f9c5915b730314d13ca7a0' <<<"$out"; then echo "MISMATCH: the live copy no longer matches the live md5"; FAIL=1; fi
done
[ $FAIL -eq 0 ] && echo "RESULT: every case behaved as expected" || echo "RESULT: UNEXPECTED OUTCOME(S)"
exit $FAIL
