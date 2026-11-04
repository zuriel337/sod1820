#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
POSTGRES_TEST_IMAGE="postgres:17-bookworm"
CONTAINER_NAME="research-item-hint-media-sql-test-$$"

# Always select this environment's local daemon. Never inherit a remote Docker
# context/endpoint or pull a registry image as a side effect of acceptance.
docker_local() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS \
    -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
    docker --host=unix:///var/run/docker.sock "$@"
}

command -v docker >/dev/null 2>&1 || { echo 'Local Docker is required for the isolated PostgreSQL 17 test.' >&2; exit 2; }
docker_local info >/dev/null
docker_local image inspect "$POSTGRES_TEST_IMAGE" >/dev/null || {
  echo 'The approved PostgreSQL 17 image must already be cached locally; no registry pull was attempted.' >&2
  exit 2
}
docker_local run --rm -d --pull=never --network none --name "$CONTAINER_NAME" \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  --mount "type=bind,src=$PROJECT_DIR,dst=/workspace,readonly" \
  --workdir /workspace "$POSTGRES_TEST_IMAGE" >/dev/null
trap 'docker_local stop --time 1 "$CONTAINER_NAME" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 40); do
  if docker_local exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done
docker_local exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null
SERVER_VERSION=$(docker_local exec "$CONTAINER_NAME" psql -U postgres -Atc 'show server_version_num')
if [[ ! "$SERVER_VERSION" =~ ^17[0-9]{4}$ ]]; then
  echo 'The acceptance fixture requires PostgreSQL major version 17.' >&2
  exit 2
fi
docker_local exec "$CONTAINER_NAME" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  -f tests/sql/research_item_hint_private_media_v1.sql
