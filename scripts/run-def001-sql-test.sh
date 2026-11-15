#!/usr/bin/env bash
# Execute tests/sql/def001*.sql on a DISPOSABLE PostgreSQL only. Never accepts a live DSN.
# Default: throwaway docker container (like the other run-*-sql-test.sh). Local alternative for sandboxes without
# docker: SOD_SQL_TEST_SOCKET_DIR=/path/to/unix-socket-dir SOD_SQL_TEST_PORT=55432 (a local unix socket only).
set -euo pipefail
cd "$(dirname "$0")/.."
SQLS=(tests/sql/def001_visitor_email_exposure_v1.sql tests/sql/def001b_visitor_id_exposure_v1.sql tests/sql/def004_gallery_storage_upload_policies_v1.sql tests/sql/def005_public_rpc_guards_v1.sql tests/sql/def003_video_assets_mv_v1.sql)
if [ -n "${SOD_SQL_TEST_SOCKET_DIR:-}" ]; then
  case "$SOD_SQL_TEST_SOCKET_DIR" in /*) ;; *) echo "socket dir must be an absolute local path" >&2; exit 2;; esac
  P=(psql -X -h "$SOD_SQL_TEST_SOCKET_DIR" -p "${SOD_SQL_TEST_PORT:-5432}" -U postgres)
  i=0
  for SQL in "${SQLS[@]}"; do
    i=$((i+1)); DB="sod_def001_$$_$i"
    "${P[@]}" -d postgres -v ON_ERROR_STOP=1 -q -c "create database $DB"
    "${P[@]}" -d "$DB" -v ON_ERROR_STOP=1 -q -f "$SQL" 2>&1 | grep -E "PASS|ERROR" || { "${P[@]}" -d postgres -q -c "drop database if exists $DB"; exit 1; }
    "${P[@]}" -d postgres -q -c "drop database if exists $DB"
  done
  node scripts/test-def001b-release-packet.mjs --socket "$SOD_SQL_TEST_SOCKET_DIR" "${SOD_SQL_TEST_PORT:-5432}"
  exit 0
fi
C="def001-sql-$$"
local_docker() { env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
local_docker run --rm -d --network none --name "$C" -e POSTGRES_HOST_AUTH_METHOD=trust -v "$PWD:/repo:ro" -w /repo postgres:17-alpine >/dev/null
trap 'local_docker rm -f "$C" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 30); do local_docker exec "$C" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break; sleep 1; done
i=0
for SQL in "${SQLS[@]}"; do
  i=$((i+1))
  local_docker exec -w /repo "$C" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c "create database t$i"
  local_docker exec -w /repo "$C" psql -X -U postgres -d "t$i" -v ON_ERROR_STOP=1 -q -f "$SQL" | grep -E "PASS"
done

node scripts/test-def001b-release-packet.mjs --container "$C"
