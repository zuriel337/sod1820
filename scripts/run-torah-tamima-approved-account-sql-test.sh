#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TASK_TORAH_ROOT=$(pwd)
TASK_TORAH_CONTAINER="torah-approved-account-$$"
local_docker() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
    docker --host=unix:///var/run/docker.sock "$@"
}
local_docker run --rm -d --network none --name "$TASK_TORAH_CONTAINER" \
  -e POSTGRES_HOST_AUTH_METHOD=trust -v "$TASK_TORAH_ROOT:/repo:ro" -w /repo postgres:17-alpine >/dev/null
trap 'local_docker rm -f "$TASK_TORAH_CONTAINER" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 30); do
  if local_docker exec "$TASK_TORAH_CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
# Reuse the actual canonical topic function; do not substitute a Follow engine.
sed -n '/^create or replace function public.canonical_follow_topic(/,/^\$function\$;/p' \
  supabase/migrations/20260916182500_g3_f_follow_identity_one_tree_v1.sql | \
  local_docker exec -i "$TASK_TORAH_CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -q
local_docker exec -w /repo "$TASK_TORAH_CONTAINER" psql -X -U postgres -d postgres \
  -v ON_ERROR_STOP=1 -q -f tests/sql/torah_tamima_approved_account_v1.sql
