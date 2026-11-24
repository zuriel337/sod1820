#!/usr/bin/env bash
# #1514 option 2: a group reply is private from its first write. Runs tests/sql/group-reply-private-20261124/run.sql against the
# proposal and its rollback on a throwaway PostgreSQL (never a live project). Same pattern as the other runners.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
W=$(mktemp -d); D=$(mktemp -d); chmod a+rwx "$D"
cp "$ROOT/tests/sql/group-reply-private-20261124/"*.sql "$W/"
cp "$ROOT/supabase/proposed/20261124230000_group_reply_proof_v2_REVIEW_ONLY.sql" "$W/proposal.sql"
cp "$ROOT/supabase/proposed/ROLLBACK_20261124230000_group_reply_proof_v2.sql" "$W/rollback.sql"
chmod -R a+rX "$W"
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
PORT=55493
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o \"-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''\" -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '"$D"'/data -m immediate stop >/dev/null" || true; rm -rf "$D" "$W"' EXIT
run "$BIN/createdb -h 127.0.0.1 -p $PORT t"
run "cd $W && $BIN/psql -X -h 127.0.0.1 -p $PORT -d t -q -f run.sql" 2>&1 | tee "$W/out.txt"
grep -q 'group_reply_private_v2: PASS' "$W/out.txt" || { echo "FAIL: group reply private-from-intake test" >&2; exit 1; }
# R10 must have refused the second apply (guard), not silently re-run it.
grep -q 'GROUP_REPLY_PROOF_V2 precondition: v2 already exists' "$W/out.txt" || { echo "FAIL: the second apply was not refused" >&2; exit 1; }
