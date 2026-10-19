#!/usr/bin/env bash
# Runs the coordination-reader SQL acceptance on a SCRATCH Supabase project (never production).
# Usage: SCRATCH_DB_URL='postgresql://postgres:...@db.<scratch-ref>.supabase.co:5432/postgres' ./run.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."
: "${SCRATCH_DB_URL:?set SCRATCH_DB_URL to the scratch project direct connection string}"
PROD_REF="linswmnnkjxvweumprav"
if [[ "$SCRATCH_DB_URL" == *"$PROD_REF"* ]]; then echo "REFUSING: URL points at the production project ($PROD_REF)"; exit 2; fi
site_tables=$(psql "$SCRATCH_DB_URL" -X -q -t -A -c "select count(*) from pg_tables where schemaname = 'public' and tablename in ('posts', 'gematria_words')")
if [ "$site_tables" != "0" ]; then
  echo "REFUSING: target looks like the real site database (has posts/gematria_words). Use an empty scratch project."; exit 2
fi
P="psql $SCRATCH_DB_URL -X -v ON_ERROR_STOP=1 -q -t -A"
out=""
for f in tests/sql/scratch-project/01_schema.sql supabase/migrations/20261019180000_work_log_coordination_reader_v1.sql tests/sql/local-harness/10_seed_synthetic.sql tests/sql/coordination_reader_v1.sql; do
  res=$($P -f "$f")
  out="$out
$res"
done
grep -q '^SQL_PASS$' <<<"$out" && echo SQL_PASS || { echo "$out"; exit 1; }
