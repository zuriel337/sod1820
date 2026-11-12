#!/usr/bin/env bash
# EVIDENCE + SELF-CHECK: the live rule guard (byte-identical fixture, md5 56b90b0a... = live on 12.11.2026) and the same fixture after
# the REAL apply file supabase/proposed/20261112200000_g1_rule_guard_cl16.sql, each on a throwaway PostgreSQL (local binaries, or a
# network-less postgres:17 container when none are installed). Every case has an expected outcome and, for a refusal, an expected reason
# per variant; any unexpected outcome (or a changed md5) exits 1. Never connects to a live project. Runs in CI (live-contracts-2029.yml).
set -u
P=$(cd "$(dirname "$0")" && pwd); ROOT=$(git -C "$P" rev-parse --show-toplevel); FAIL=0
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
for which in live proposed; do
  D=$(mktemp -d); W=$(mktemp -d); [ "$(id -u)" = 0 ] && chown postgres "$D"
  { echo "set g1.variant = '$which';"; sed "s#GUARD_FILE#guard.sql#" "$P/db-gate-test.sql"; } > "$W/test.sql"
  cp "$ROOT/tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql" "$W/guard.sql"
  [ "$which" = proposed ] && cat "$ROOT/supabase/proposed/20261112200000_g1_rule_guard_cl16.sql" >> "$W/guard.sql"
  chmod -R a+rX "$W"
  echo "======== $which guard"
  if [ -n "$BIN" ]; then
    out=$(run "$BIN/initdb -D $D/data -A trust >/dev/null && $BIN/pg_ctl -D $D/data -o '-p 55496 -k $D' -l $D/log -w start >/dev/null && $BIN/createdb -h $D -p 55496 t && cd $W && $BIN/psql -X -h $D -p 55496 -d t -qAt -v ON_ERROR_STOP=1 -f test.sql 2>&1; echo PSQL_EXIT=\$?; $BIN/pg_ctl -D $D/data -m immediate stop >/dev/null")
  else
    C="sod-g1-db-scen-$$-$which"; docker run --rm -d --network none --name "$C" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
    for i in $(seq 1 30); do docker exec "$C" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break; sleep 1; done
    out=$(docker exec -w /w "$C" psql -X -h 127.0.0.1 -U postgres -qAt -v ON_ERROR_STOP=1 -f test.sql 2>&1; echo PSQL_EXIT=$?); docker rm -f "$C" >/dev/null 2>&1
  fi
  grep -E 'GUARD md5|=>|AS EXPECTED|UNEXPECTED|ERROR' <<<"$out"
  grep -q 'PSQL_EXIT=0' <<<"$out" || FAIL=1
  if [ "$which" = live ] && ! grep -q 'GUARD md5 56b90b0ae0f9c5915b730314d13ca7a0' <<<"$out"; then echo "MISMATCH: the live copy no longer matches the live md5"; FAIL=1; fi
  if [ "$which" = proposed ] && ! grep -q 'GUARD md5 7b03b1a78f4e04962c15399feb1668ff' <<<"$out"; then echo "MISMATCH: the applied body is not the reviewed AFTER md5"; FAIL=1; fi
done
[ $FAIL -eq 0 ] && echo "RESULT: every case behaved as expected" || echo "RESULT: UNEXPECTED OUTCOME(S)"
exit $FAIL
