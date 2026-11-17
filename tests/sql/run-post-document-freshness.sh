#!/usr/bin/env bash
# Post document freshness SQL gate (ZURIEL 17.11.2026): the speed centre state -> posts with its live writers (bodies compared with the live
# md5) -> the migration (refused twice; the rollback refused before it) -> edge/database key agreement -> behaviour -> rollback to the exact
# previous definitions. Local Postgres only (PGHOST/PGUSER/PGDATABASE from the environment, or PSQL=...).
set -euo pipefail
PSQL=${PSQL:-psql}
run() { $PSQL -v ON_ERROR_STOP=1 -q "$@"; }
md5of() { $PSQL -At -c "select md5(pg_get_functiondef('$1'::regprocedure))"; }
cd "$(dirname "$0")/../.."

run -f tests/sql/speed_centre_fixture.sql
node tests/sql/extract-function.mjs supabase/proposed/20261115180000_measurement_identity_PROPOSAL.sql admin_2029_analytics | run
run -c "revoke all on function public.admin_2029_analytics(integer,text) from public, anon; grant execute on function public.admin_2029_analytics(integer,text) to authenticated;"
node tests/sql/extract-function.mjs supabase/migrations/20260929170000_g3_reliability_preclose_v1.sql fn_health_watch | run
health0=$(md5of 'public.fn_health_watch()')
sed "s/f60c3bc51fb7201cd28a00070da3f38b/$health0/g" supabase/migrations/20261117120000_speed_centre_web_vitals.sql | run
test "$(md5of 'public.admin_2029_analytics(integer,text)')" = 5d8fd1385da77fb4de2a43d946a02495 || { echo "the reader is not the live definition"; exit 1; }
health1=$(md5of 'public.fn_health_watch()')

run -f tests/sql/post_document_fixture.sql
run -f tests/sql/live/posts-writers-20261117.sql
for pair in admin_save_post:1f550012ff472ee24e5840f6f85aaca5 sys_save_post:172768dce5f0ff27abff2f32a66690d1 \
            admin_restore_post_revision:25b13ead26661826f670a2440f69b56a admin_set_post_home_hidden:7b34da97f8d5dfeb61d166b7702a3cbd \
            admin_reset_post_position:8e61c4fc4934054f18cdca77f8817bbb fn_snapshot_post_revision:a66d87aad421e8cd20401ed5504a456c; do
  name=${pair%%:*}; want=${pair##*:}
  got=$($PSQL -At -c "select md5(prosrc) from pg_proc where proname = '$name' and pronamespace = 'public'::regnamespace")
  test "$got" = "$want" || { echo "$name: body differs from the live one ($got)"; exit 1; }
done

migration=$(sed "s/7fbad83db7ac2a528f16766185cb9696/$health1/g" supabase/migrations/20261117160000_post_document_freshness.sql)
rollback=$(sed "s/7fbad83db7ac2a528f16766185cb9696/$health1/g" supabase/proposed/ROLLBACK_20261117160000_post_document_freshness.sql)
if echo "$rollback" | run 2>/dev/null; then echo "the rollback ran before the migration"; exit 1; fi
echo "$migration" | run
if echo "$migration" | run 2>/dev/null; then echo "the migration ran twice"; exit 1; fi

node tests/sql/post-document-keys-check.mjs "$PSQL"
run -f tests/sql/post_document_freshness_v1.sql

echo "$rollback" | run
test "$(md5of 'public.admin_2029_analytics(integer,text)')" = 5d8fd1385da77fb4de2a43d946a02495 || { echo "rollback: reader"; exit 1; }
test "$(md5of 'public.fn_health_watch()')" = "$health1" || { echo "rollback: health watch"; exit 1; }
test -z "$($PSQL -At -c "select tgname from pg_trigger where tgrelid = 'public.posts'::regclass and tgname like 'trg_post_document_change%'")" || { echo "rollback: triggers left"; exit 1; }
echo "post document freshness SQL gate: PASS (live writer bodies identical, applied, asserted, rolled back to the exact previous definitions, refuses to run twice)"
