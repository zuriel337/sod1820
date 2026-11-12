#!/usr/bin/env bash
# G1 rule guard (CL-16) lifecycle test (tests/sql/g1_rule_guard_cl16_v1.sql) on a throwaway PostgreSQL - never a live project.
# Same pattern as run-m0b-ai-quota-sql-test.sh. Also checks statically that no SQL file of the M0 apply plan touches public.nodes or the
# rule guard, so the simulated post-M0 state of these objects is the live 12.11.2026 state.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
node -e '
const fs = require("fs"); const p = require(process.argv[1]);
const files = [...new Set(p.steps.flatMap((s) => [s.file, s.rollback]).filter((f) => f && f.endsWith(".sql")))];
const hits = files.filter((f) => /\bnodes\b|fn_rule_compaction|trg_rule_compaction/i.test(fs.readFileSync(f, "utf8")));
if (!files.length || hits.length) { console.error("FAIL: M0 files touching the rule guard objects: " + hits.join(", ")); process.exit(1); }
console.log("M0 apply plan: " + files.length + " SQL files, none touches public.nodes or the rule guard");
' "$ROOT/docs/reviews/m0-security-stabilization-20261112/apply-plan.json"
W=$(mktemp -d)
FILES=(tests/sql/g1_rule_guard_cl16_v1.sql supabase/proposed/20261112200000_g1_rule_guard_cl16.sql
  supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql)
for f in "${FILES[@]}"; do mkdir -p "$W/$(dirname "$f")"; cp "$ROOT/$f" "$W/$f"; done
chmod -R a+rX "$W"
# The negative steps must stop on the guards themselves (not on some other error).
check() { tee "$W/out.txt"; grep -q 'g1_rule_guard_cl16_v1: PASS' "$W/out.txt" || { echo "FAIL: G1 rule guard lifecycle did not PASS" >&2; exit 1; }
  grep -q 'G1 rule guard precondition: public.fn_rule_compaction_integrity_guard_v1() not found; stop, nothing changed' "$W/out.txt" || { echo "FAIL: the proposal did not stop on a missing function" >&2; exit 1; }
  grep -q 'G1 rule guard rollback: public.fn_rule_compaction_integrity_guard_v1() not found; stop, nothing created' "$W/out.txt" || { echo "FAIL: the rollback did not stop on a missing function" >&2; exit 1; }
  [ "$(grep -c 'G1 rule guard drift: function md5' "$W/out.txt")" -ge 2 ] || { echo "FAIL: the proposal did not stop on drift (twice)" >&2; exit 1; }
  [ "$(grep -c 'G1 rule guard rollback drift: function md5' "$W/out.txt")" -ge 2 ] || { echo "FAIL: the rollback did not stop on drift (twice)" >&2; exit 1; }
  grep -q 'G1 rule guard: already applied' "$W/out.txt" || { echo "FAIL: the second apply was not a no-op" >&2; exit 1; }
  grep -q 'G1 rule guard rollback: already the live 12.11.2026 state' "$W/out.txt" || { echo "FAIL: the second rollback was not a no-op" >&2; exit 1; }; }

if ! compgen -G '/usr/lib/postgresql/*/bin' >/dev/null; then
  CONTAINER="sod-g1-rule-guard-$$"
  docker run --rm -d --network none --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$W:/w:ro" -w /w postgres:17-alpine >/dev/null
  trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$W"' EXIT
  for i in $(seq 1 30); do
    if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
    sleep 1
  done
  docker exec -w /w "$CONTAINER" psql -X -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/g1_rule_guard_cl16_v1.sql 2>&1 | check
  exit
fi

BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$D"; fi
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55443 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h $D -p 55443 t"
run "cd $W && $BIN/psql -X -h $D -p 55443 -d t -v ON_ERROR_STOP=1 -q -f tests/sql/g1_rule_guard_cl16_v1.sql" 2>&1 | check
