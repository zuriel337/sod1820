#!/usr/bin/env bash
# #1545 Traffic Intelligence v11 -> v12 (story_2029) on a throwaway PostgreSQL (never a live project), against EXACT copies of the live
# rule guard (CL-16, md5 90b5917b…), traffic_intelligence_law v11 (text md5 525452c0…, metadata) and ingest_event (md5 1b0f1f4b…), read
# 24.11.2026. The migration and its rollback run unmodified: their version-fingerprint guards are not relaxed. Checks: v11 -> v12 applies;
# a second apply refuses; every existing measurement call behaves byte for byte as before (outcome and rows written), after v12 and after
# the rollback; each story event writes exactly one row; malformed or colliding story events are refused; the live session readers'
# view / interaction / bounce expressions do not change; the rollback (forward supersession v12 -> v13) restores ingest_event exactly
# and refuses a second time; v12 cannot be re-applied after it.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
W=$(mktemp -d); D=$(mktemp -d); chmod a+rwx "$D"
cp "$ROOT/tests/sql/traffic-v12-story-20261124/"*.sql "$W/"
cp "$ROOT/tests/sql/fixtures/g1_rule_guard_live_base_20261112/fn_and_trigger.sql" "$W/base.sql"
cp "$ROOT/supabase/proposed/20261112200000_g1_rule_guard_cl16.sql" "$W/cl16.sql"
cp "$ROOT/supabase/migrations/20261124190000_traffic_intelligence_v12_story_2029.sql" "$W/migration.sql"
cp "$ROOT/supabase/proposed/ROLLBACK_20261124190000_traffic_intelligence_v12_story_2029.sql" "$W/rollback.sql"
chmod -R a+rX "$W"
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
PORT=55494
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o \"-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''\" -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h 127.0.0.1 -p $PORT t"
run "cd $W && $BIN/psql -X -h 127.0.0.1 -p $PORT -d t -q -f run.sql" 2>&1 | tee "$W/out.txt"
grep -q 'traffic_v12_story: PASS' "$W/out.txt" || { echo "FAIL: traffic v12 story isolated test" >&2; exit 1; }
for needle in 'Unexpected active traffic_intelligence_law v12' 'TI v12 rollback: unexpected law state (active v13' 'Unexpected active traffic_intelligence_law v13'; do
  grep -qF "$needle" "$W/out.txt" || { echo "FAIL: expected refusal not seen: $needle" >&2; exit 1; }
done
