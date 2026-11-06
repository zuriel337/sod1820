#!/usr/bin/env bash
# Throwaway local Postgres (never a live project). Proves the proposed supabase/proposed/reading_activity_v1.sql:
#   1. sequential cases (tests/sql/reading_activity_v1.sql): schema, rate limit, replay, forgery guard, privileges, atomicity;
#   2. CONCURRENT duplicates: many simultaneous sessions send the same activity_event_id -> exactly one event;
#   3. CONCURRENT burst: many simultaneous distinct ids from one address -> exactly the limit is recorded;
#   4. (optional) the real els-search-bridge handler against the same database (test/els-activity-e2e.test.mjs).
set -euo pipefail
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d); chmod 755 "$D"; chown postgres "$D" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55433 -k $D' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '$D'/data -m immediate stop >/dev/null" || true; rm -rf "$D"' EXIT
PSQL="$BIN/psql -h $D -p 55433 -d t -v ON_ERROR_STOP=1 -qtA"
run "$BIN/createdb -h $D -p 55433 t"
run "cd $(pwd) && $PSQL -f tests/sql/fixtures/reading_activity_v1_prod_replica.sql >/dev/null"
run "cd $(pwd) && $PSQL -f tests/sql/reading_activity_v1.sql" | grep -v '^$'

# fresh wall-clock minute so the limiter bucket cannot change mid-test
run "$PSQL -c \"select t.wait_for_fresh_minute()\"" >/dev/null
CALL() { # ip event_id -> prints status
  echo "select (t.call_as('anon','$1',null,'first_compute','/gematria','chrome', t.props('$2'::uuid)))->>'status'"
}
SAME=77777777-aaaa-4aaa-8aaa-000000000077
echo "--- concurrent duplicates: 40 sessions, same id, 40 different addresses"
for i in $(seq 1 40); do run "$PSQL -c \"$(CALL 10.9.0.$i $SAME)\"" > "$D/dup.$i" & done; wait
cat "$D"/dup.* | sort | uniq -c
run "$PSQL -c \"do \\\$\\\$ begin assert (select count(*) from public.events where props->>'activity_event_id'='$SAME')=1, 'exactly one event for the duplicated id'; assert (select count(*) from public.reading_activity_ids where activity_event_id='$SAME')=1, 'exactly one key'; assert (select count(*) from (select 1) x)=1; end \\\$\\\$\""
[ "$(cat "$D"/dup.* | grep -c '^recorded$')" = 1 ] && [ "$(cat "$D"/dup.* | grep -c '^duplicate$')" = 39 ] || { echo "FAIL: expected 1 recorded + 39 duplicate"; exit 1; }

echo "--- concurrent burst: 60 sessions, 60 distinct ids, ONE address (limit 30 per minute)"
run "$PSQL -c \"select t.wait_for_fresh_minute()\"" >/dev/null
for i in $(seq 1 60); do run "$PSQL -c \"$(CALL 10.9.9.9 "$(cat /proc/sys/kernel/random/uuid | sed 's/^\(........-....-\)./\14/' | sed 's/^\(.\{19\}\)./\18/')")\"" > "$D/burst.$i" & done; wait
cat "$D"/burst.* | sort | uniq -c
[ "$(cat "$D"/burst.* | grep -c '^recorded$')" = 30 ] && [ "$(cat "$D"/burst.* | grep -c '^rate_limited$')" = 30 ] || { echo "FAIL: expected exactly 30 recorded + 30 rate_limited"; exit 1; }
run "$PSQL -c \"do \\\$\\\$ begin assert not exists (select 1 from public.reading_activity_ids k where not exists (select 1 from public.events e where e.props->>'activity_event_id' = k.activity_event_id::text)), 'every key has its event'; assert (select count(*) from public.events e where e.props->>'beacon'='v1' and not exists (select 1 from public.reading_activity_ids k where k.activity_event_id::text = e.props->>'activity_event_id')) = 1, 'only the one key that T11 pruned on purpose is missing'; assert (select count(*) from (select props->>'activity_event_id' from public.events where props->>'beacon'='v1' group by 1 having count(*)>1) d) = 0, 'no event id appears twice'; end \\\$\\\$\""
echo "CONCURRENCY PASSED"

if [ "${1:-}" = "--with-els" ]; then
  echo "--- real els-search-bridge handler against this database"
  RA_PG_BIN="$BIN" RA_PG_SOCKET="$D" RA_PG_PORT=55433 RA_PG_AS_POSTGRES=$([ "$(id -u)" = 0 ] && echo 1 || echo 0) node --test test/els-activity-e2e.test.mjs
fi
