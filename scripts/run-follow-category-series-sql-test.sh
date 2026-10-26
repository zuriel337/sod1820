#!/usr/bin/env bash
# Synthetic throwaway PostgreSQL only. No host port, network or credentials.
set -euo pipefail
cd "$(dirname "$0")/.."
FOLLOW_TEST_CONTAINER="sod-follow-series-test-$$"
docker run --rm -d --network none --name "$FOLLOW_TEST_CONTAINER" \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  --mount "type=bind,src=$(pwd),dst=/repo,readonly" -w /repo postgres:17-bookworm >/dev/null
trap 'docker rm -f "$FOLLOW_TEST_CONTAINER" >/dev/null 2>&1 || true' EXIT
for i in $(seq 1 40); do
  if docker exec "$FOLLOW_TEST_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done
docker exec "$FOLLOW_TEST_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q -f tests/sql/follow_category_series_alignment_v1.sql
# A changed/already upgraded server base must abort, never overwrite another lane.
if docker exec "$FOLLOW_TEST_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
  -f supabase/migrations/20261026012207_follow_category_series_alignment_v1.sql >/tmp/sod-follow-series-guard-$$.log 2>&1; then
  echo 'FAIL: changed base was accepted'; exit 1
fi
if ! rg -q 'Follow alignment base changed' /tmp/sod-follow-series-guard-$$.log; then
  cat /tmp/sod-follow-series-guard-$$.log; exit 1
fi
rm /tmp/sod-follow-series-guard-$$.log
echo 'Optimistic server preimage guard: PASS'
