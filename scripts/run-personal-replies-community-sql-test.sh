#!/usr/bin/env bash
# Execute the committed migration on disposable PostgreSQL only. Never accepts a live DSN.
set -euo pipefail
cd "$(dirname "$0")/.."
TASK_SQL_ROOT=$(pwd)
TASK_SQL_CONTAINER="personal-replies-sql-$$"
local_docker() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
    docker --host=unix:///var/run/docker.sock "$@"
}
local_docker run --rm -d --network none --name "$TASK_SQL_CONTAINER" \
  -e POSTGRES_HOST_AUTH_METHOD=trust -v "$TASK_SQL_ROOT:/repo:ro" -w /repo \
  postgres:17-bookworm >/dev/null
trap 'local_docker rm -f "$TASK_SQL_CONTAINER" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 30); do
  if local_docker exec "$TASK_SQL_CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
local_docker exec "$TASK_SQL_CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null
local_docker exec -w /repo "$TASK_SQL_CONTAINER" psql -X -U postgres -d postgres \
  -v ON_ERROR_STOP=1 -q -f tests/sql/personal_replies_community_context_v1.sql
