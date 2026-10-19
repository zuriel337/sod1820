#!/usr/bin/env bash
# Usage: run.sh <socket_dir> <port> <user>   — rebuilds db "coordtest" from the minimal harness and runs the SQL tests.
# Exits non-zero on any SQL error or failed assertion; prints SQL_PASS only when every assertion held.
set -euo pipefail
cd "$(dirname "$0")/../../.."
P="psql -h $1 -p $2 -U $3 -v ON_ERROR_STOP=1 -q -t -A"
$P -d postgres -c "drop database if exists coordtest" -c "create database coordtest" >/dev/null 2>&1
out=""
for f in tests/sql/local-harness/00_minimal_supabase.sql supabase/migrations/20261019180000_work_log_coordination_reader_v1.sql tests/sql/local-harness/10_seed_synthetic.sql tests/sql/coordination_reader_v1.sql; do
  out+=$($P -d coordtest -f "$f")$'\n'
done
grep -q '^SQL_PASS$' <<<"$out" && echo SQL_PASS || { echo "$out"; exit 1; }
