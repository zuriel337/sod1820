#!/usr/bin/env bash
set -euo pipefail
repo_root=$(cd "$(dirname "$0")/.." && pwd)
fixture_container="sod-community-follow-test-$$"
trap 'docker rm -f "$fixture_container" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$fixture_container" -e POSTGRES_PASSWORD=disposable-local-test postgres:17-alpine >/dev/null
for attempt in {1..50}; do
  if docker exec "$fixture_container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep .2
done
docker exec -i "$fixture_container" psql -U postgres -v ON_ERROR_STOP=1 < "$repo_root/test/fixtures/community-thread-follow-baseline.sql" >/dev/null
for migration in "$repo_root"/supabase/migrations/*_community_thread_follow_notifications.sql; do
  docker exec -i "$fixture_container" psql -U postgres -v ON_ERROR_STOP=1 < "$migration" >/dev/null
done
# Patches notify_on_contribution() in place (CREATE OR REPLACE) to also notify a legacy
# message's linked account (contributors.user_id), not only author_user_id.
docker exec -i "$fixture_container" psql -U postgres -v ON_ERROR_STOP=1 < "$repo_root/supabase/migrations/20261108200000_community_legacy_reply_notification_v1.sql" >/dev/null
docker exec -i "$fixture_container" psql -U postgres -v ON_ERROR_STOP=1 < "$repo_root/test/fixtures/community-thread-follow-assertions.sql" >/dev/null
