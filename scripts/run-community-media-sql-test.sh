#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TASK_MEDIA_ROOT=$(pwd)
TASK_MEDIA_CONTAINER="community-media-$$"
TASK_MEDIA_MIGRATION=$(rg --files supabase/migrations | rg '_community_authenticated_media_paths_v1.sql$')
local_docker() { env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
local_docker run --rm -d --network none --name "$TASK_MEDIA_CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$TASK_MEDIA_ROOT:/repo:ro" -w /repo postgres:17-bookworm >/dev/null
trap 'local_docker rm -f "$TASK_MEDIA_CONTAINER" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 30); do if local_docker exec "$TASK_MEDIA_CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1;then break;fi;sleep 1;done
local_docker exec "$TASK_MEDIA_CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -v media_migration="$TASK_MEDIA_MIGRATION" -q -f tests/sql/community_authenticated_media_paths_v1.sql
