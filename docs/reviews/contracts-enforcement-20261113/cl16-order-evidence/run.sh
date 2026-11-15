#!/usr/bin/env bash
# CL-16 ORDER EVIDENCE: two interactions between the CL-16 guard and the already prepared law v7 supersession / rollback
# (docs/reviews/contracts-enforcement-20261113/cl16-database-step.md, table "Order against other proposals"). Throwaway PostgreSQL
# only, synthetic rows. Four runs with an expected outcome each; any other outcome exits 1. G1_PG_BIN selects the PostgreSQL to use.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
W=$(mktemp -d)
for f in tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql supabase/proposed/20261112200000_g1_rule_guard_cl16.sql; do mkdir -p "$W/$(dirname "$f")"; cp "$ROOT/$f" "$W/$f"; done
cp "$HERE/law-v7-supersession.sql" "$HERE/law-v7-rollback.sql" "$W/"; chmod -R a+rX "$W"
BIN=${G1_PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)}
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
D=$(mktemp -d); [ "$(id -u)" = 0 ] && chown postgres "$D"
cleanup() { [ -n "$BIN" ] && run "$BIN/pg_ctl -D $D/data -m immediate stop >/dev/null 2>&1"; [ -n "${C:-}" ] && docker rm -f "$C" >/dev/null 2>&1; rm -rf "$D" "$W"; }
trap cleanup EXIT
if [ -n "$BIN" ]; then
  echo "PostgreSQL: $("$BIN/postgres" --version)"
  run "$BIN/initdb -D $D/data -A trust >/dev/null && $BIN/pg_ctl -D $D/data -o '-p 55497 -k $D' -l $D/log -w start >/dev/null"
  psql_run() { run "cd $W && $BIN/psql -X -h $D -p 55497 -d $1 -v ON_ERROR_STOP=0 -v apply_cl16=$2 -f $3" 2>&1; }
  newdb() { run "$BIN/createdb -h $D -p 55497 $1"; }
else
  C="sod-g1-order-$$"; docker run --rm -d --network none --name "$C" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  for i in $(seq 1 30); do docker exec "$C" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break; sleep 1; done
  psql_run() { docker exec -w /w "$C" psql -X -h 127.0.0.1 -U postgres -d "$1" -v ON_ERROR_STOP=0 -v apply_cl16="$2" -f "$3" 2>&1; }
  newdb() { docker exec "$C" createdb -h 127.0.0.1 -U postgres "$1"; }
fi
FAIL=0; N=0
# case <id> <sql file> <apply on|off> <expected: a regex that must appear> <forbidden regex or ''>
case_() {
  N=$((N+1)); local db="t$N"; newdb "$db" >/dev/null 2>&1; local out; out=$(psql_run "$db" "$3" "$2")
  local guard; guard=$(grep -o '@@GUARD [0-9a-f]*' <<<"$out" | head -1)
  if grep -Eq "$4" <<<"$out" && { [ -z "$5" ] || ! grep -Eq "$5" <<<"$out"; }; then echo "ok $1 ($guard)"; else echo "MISMATCH $1: expected /$4/ ($guard)"; echo "$out" | grep -E "ERROR|@@RESULT" | head -3; FAIL=1; fi
}
case_ "supersession under the LIVE guard runs and leaves the retired row identical" law-v7-supersession.sql off '@@RESULT supersession OK' 'ERROR'
case_ "supersession AFTER CL-16 fails the post-check: the guard stamps metadata.rule_guard on the retired row" law-v7-supersession.sql on 'ERROR:.*NOT byte-identical' '@@RESULT'
case_ "rollback (reactivate the retired version) under the LIVE guard runs" law-v7-rollback.sql off '@@RESULT rollback OK: the active version is v6' 'ERROR'
case_ "rollback AFTER CL-16 is refused as a revival" law-v7-rollback.sql on 'ERROR:.*re-activated without an owner-creation verdict' '@@RESULT'
[ "$N" -eq 4 ] || { echo "MISMATCH: $N cases ran, 4 expected"; FAIL=1; }
[ $FAIL -eq 0 ] && echo "RESULT: all 4 order-evidence cases behaved as expected" || echo "RESULT: UNEXPECTED OUTCOME(S)"
exit $FAIL
