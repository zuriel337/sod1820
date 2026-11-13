#!/usr/bin/env bash
# Runs tests/sql/def004_gallery_storage_upload_policies_v1.sql on a throwaway local Postgres (never a live project; port 55441, unix socket only).
# 1) main run: must print "DEF-004 SQL regression: PASS";
# 2) negative mode: an existing gallery object above 120 MiB must stop the proposal at its precondition;
# 3) negative control: without the proposal the "after" assertions must fail.
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
PORT=55441
D=$(mktemp -d); chown postgres "$D" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
# The superuser is named postgres whoever runs the script (as on Supabase).
run "$BIN/initdb -D $D/data -A trust -U postgres >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p $PORT -k $D -c listen_addresses=' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '$D'/data -m immediate stop >/dev/null" || true; rm -rf "$D"' EXIT
SQL=tests/sql/def004_gallery_storage_upload_policies_v1.sql
psql_db() { local db=$1; shift; run "cd $(pwd) && $BIN/psql -X -h $D -p $PORT -U postgres -d $db -v ON_ERROR_STOP=1 -q $* -f $SQL" 2>&1; }

run "$BIN/createdb -h $D -p $PORT -U postgres def004_main"
OUT=$(psql_db def004_main) || { echo "$OUT"; echo "DEF-004 main run FAILED" >&2; exit 1; }
echo "$OUT" | grep -E "^DEF-004"
echo "$OUT" | grep -q "DEF-004 SQL regression: PASS" || { echo "$OUT"; exit 1; }

run "$BIN/createdb -h $D -p $PORT -U postgres def004_negative"
if OUT=$(psql_db def004_negative "-v def004_negative=1"); then echo "$OUT"; echo "negative mode unexpectedly passed" >&2; exit 1; fi
echo "$OUT" | grep -q "larger than 120 MiB" || { echo "$OUT"; echo "negative mode failed for another reason" >&2; exit 1; }
echo "DEF-004 negative mode: an object above 120 MiB stops the proposal (expected failure observed)"

run "$BIN/createdb -h $D -p $PORT -U postgres def004_control"
if OUT=$(psql_db def004_control "-v def004_skip_apply=1"); then echo "$OUT"; echo "negative control unexpectedly passed" >&2; exit 1; fi
echo "$OUT" | grep -q "ASSERTION" || { echo "$OUT"; echo "negative control failed for another reason" >&2; exit 1; }
echo "DEF-004 negative control: without the proposal the after assertions fail (expected failure observed)"
