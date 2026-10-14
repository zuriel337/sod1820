#!/usr/bin/env bash
# Reproduce everything on a LOCAL Postgres 16 (superuser). Never point at Supabase. Roles anon/authenticated are created locally.
set -euo pipefail; cd "$(dirname "$0")"; P="psql -q -v ON_ERROR_STOP=1"
createdb numlab; createdb postslab; psql -d numlab -qc 'create role anon nologin' -c 'create role authenticated nologin' -c 'create role lab_admin nologin' || true
$P -d numlab -f provenance-d34a910c/numlab_setup.sql
$P -d numlab -f 00_repro_initplan.sql
$P -d numlab -v scale=100 -f 01_number_data.sql
for f in provenance-d34a910c/numlab_fn.sql provenance-d34a910c/numlab_fixed.sql 02_fn_number_lookup_v3.sql 03_dossier_groups.sql 04_roles_rls.sql 10_number_tests.sql; do $P -d numlab -f $f; done
for fn in fn_number_lookup_v2 fn_number_lookup_v3; do $P -d numlab -v fn=$fn -f 11_number_run.sql; done   # v2 (d34) must FAIL, v3 must show 0 diff
$P -d numlab -f 12_number_dossier_and_timing.sql
$P -d postslab -v bulk=3000 -f 20_posts_schema.sql -f 21_posts_old_and_d34.sql -f 22_posts_candidate_v3.sql -f 23_posts_roles.sql -f 24_posts_tests.sql
for fn in posts_by_number_strict_v2 posts_by_number_strict_v3; do $P -d postslab -v fn=$fn -f 25_posts_run.sql; done
$P -d postslab -f 26_posts_lifecycle.sql; $P -d postslab -f 27_category_videos.sql
