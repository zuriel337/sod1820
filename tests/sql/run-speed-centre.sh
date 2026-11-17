#!/usr/bin/env bash
# Speed centre SQL gate (ZURIEL 17.11.2026): fixture -> the reviewed base definitions from the repository -> the migration -> assertions
# -> the rollback -> the migration refuses to run twice. Local Postgres only (PGHOST/PGUSER/PGDATABASE from the environment, or PSQL=...).
# fn_health_watch's live definition is newer than any file in the repository; the fixture loads the latest reviewed one and the migration's
# md5 guard for it is pointed at that fixture definition here (the patch itself, its anchor and the rest of the file are unchanged).
set -euo pipefail
PSQL=${PSQL:-psql}
run() { $PSQL -v ON_ERROR_STOP=1 -q "$@"; }
cd "$(dirname "$0")/../.."
run -f tests/sql/speed_centre_fixture.sql
node tests/sql/extract-function.mjs supabase/proposed/20261115180000_measurement_identity_PROPOSAL.sql admin_2029_analytics | run
run -c "revoke all on function public.admin_2029_analytics(integer,text) from public, anon; grant execute on function public.admin_2029_analytics(integer,text) to authenticated;"
node tests/sql/extract-function.mjs supabase/migrations/20260929170000_g3_reliability_preclose_v1.sql fn_health_watch | run
reader=$($PSQL -At -c "select md5(pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure))")
test "$reader" = c57a1005a8f3195f422ac4b8cee437eb || { echo "the fixture reader is not the reviewed live definition ($reader)"; exit 1; }
health=$($PSQL -At -c "select md5(pg_get_functiondef('public.fn_health_watch()'::regprocedure))")
migration=$(sed "s/f60c3bc51fb7201cd28a00070da3f38b/$health/g" supabase/migrations/20261117120000_speed_centre_web_vitals.sql)
if run -f supabase/proposed/ROLLBACK_20261117120000_speed_centre_web_vitals.sql 2>/dev/null; then echo "the rollback ran before the migration"; exit 1; fi
echo "$migration" | run
if echo "$migration" | run 2>/dev/null; then echo "the migration ran twice"; exit 1; fi
run -f tests/sql/speed_centre_web_vitals_v1.sql
run -f supabase/proposed/ROLLBACK_20261117120000_speed_centre_web_vitals.sql
test "$($PSQL -At -c "select md5(pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure))")" = c57a1005a8f3195f422ac4b8cee437eb
test "$($PSQL -At -c "select md5(pg_get_functiondef('public.fn_health_watch()'::regprocedure))")" = "$health"
test "$($PSQL -At -c "select count(*) from pg_proc where proname in ('fn_web_vitals_watch','fn_web_vital_surface_group')")" = 0
echo "speed centre SQL gate: PASS (applied, asserted, rolled back to the exact previous definitions, refuses to run twice)"
