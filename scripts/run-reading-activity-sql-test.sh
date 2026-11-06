#!/usr/bin/env bash
# Throwaway local Postgres (never a live project). Proves the proposed supabase/proposed/reading_activity_v1.sql:
#   1. sequential cases (tests/sql/reading_activity_v1.sql): schema, size, address/global ceilings, NAT, IPv6, replay, narrow forgery guard, ACL, atomicity;
#   2. cost per outcome (tests/sql/reading_activity_cost_v1.sql);
#   3. CONCURRENCY: duplicates, a one-address burst and a many-address burst, all through real parallel sessions;
#   4. (optional --with-els) the real els-search-bridge handler against the same database (test/els-activity-e2e.test.mjs).
set -euo pipefail
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d); chmod 755 "$D"; chown postgres "$D" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$BIN/initdb -D $D/data -A trust >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p 55433 -k $D -c max_connections=400' -l $D/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D '$D'/data -m immediate stop >/dev/null" || true; rm -rf "$D"' EXIT
PSQL="$BIN/psql -h $D -p 55433 -d t -v ON_ERROR_STOP=1 -qtA"
run "$BIN/createdb -h $D -p 55433 t"
run "cd $(pwd) && $PSQL -f tests/sql/fixtures/reading_activity_v1_prod_replica.sql >/dev/null"
run "cd $(pwd) && $PSQL -f tests/sql/reading_activity_v1.sql" | grep -v '^$'
echo "--- cost per outcome (100 calls each, exact row writes from pg_stat_xact)"
run "cd $(pwd) && $PSQL -F ' | ' -f tests/sql/reading_activity_cost_v1.sql" | grep -v '^$'

CALL() { # ip event_id -> prints status|reason
  echo "select (r->>'status') || '/' || coalesce(r->>'reason','-') from (select t.call_as('anon','$1',null,'first_compute','/gematria','chrome', t.props('$2'::uuid)) r) x"
}
NEWID() { cat /proc/sys/kernel/random/uuid | sed 's/^\(........-....-\)./\14/' | sed 's/^\(.\{19\}\)./\18/'; }
FRESH() { run "$PSQL -c \"select t.fresh_minute()\"" >/dev/null; }
SAME=77777777-aaaa-4aaa-8aaa-000000000077

T0=$(run "$PSQL -c \"select clock_timestamp()\""); N0=$(run "$PSQL -c \"select coalesce(max(n),0) from t.calllog\"")
echo "--- concurrency A: 40 simultaneous sessions, ONE activity_event_id, 40 addresses"
FRESH
for i in $(seq 1 40); do run "$PSQL -c \"$(CALL 10.9.0.$i $SAME)\"" > "$D/a.$i" & done; wait
cat "$D"/a.* | sort | uniq -c
run "$PSQL -c \"do \\\$\\\$ begin assert (select count(*) from public.events where props->>'activity_event_id'='$SAME')=1, 'exactly one event for the duplicated id'; assert (select count(*) from public.reading_activity_ids where activity_event_id='$SAME')=1, 'exactly one key'; end \\\$\\\$\""
[ "$(cat "$D"/a.* | grep -c '^recorded/-$')" = 1 ] && [ "$(cat "$D"/a.* | grep -c '^duplicate/-$')" = 39 ] || { echo "FAIL A: expected 1 recorded + 39 duplicate"; exit 1; }

echo "--- concurrency B: 100 simultaneous sessions, 100 distinct ids, ONE address (ceiling 60 per minute)"
FRESH
for i in $(seq 1 100); do run "$PSQL -c \"$(CALL 10.9.9.9 "$(NEWID)")\"" > "$D/b.$i" & done; wait
cat "$D"/b.* | sort | uniq -c
[ "$(cat "$D"/b.* | grep -c '^recorded/-$')" = 60 ] && [ "$(cat "$D"/b.* | grep -c '^rate_limited/address_ceiling$')" = 40 ] || { echo "FAIL B: expected exactly 60 recorded + 40 address_ceiling"; exit 1; }

echo "--- concurrency C: 150 simultaneous sessions, 150 distinct ids, 150 addresses (global ceiling 120 per minute)"
FRESH
for i in $(seq 1 150); do run "$PSQL -c \"$(CALL 10.8.$((i / 200)).$((i % 200)) "$(NEWID)")\"" > "$D/c.$i" & done; wait
cat "$D"/c.* | sort | uniq -c
[ "$(cat "$D"/c.* | grep -c '^recorded/-$')" = 120 ] && [ "$(cat "$D"/c.* | grep -c '^rate_limited/global_ceiling$')" = 30 ] || { echo "FAIL C: expected exactly 120 recorded + 30 global_ceiling"; exit 1; }

echo "--- invariants after concurrency (counted from the start of the three scenarios)"
run "$PSQL -c \"do \\\$\\\$ declare m record; begin
  for m in select * from (values ('duplicate','duplicate',null),('rejected_size','rejected','size'),('rejected_schema','rejected','schema'),('rejected_account_id','rejected','account_id'),('rate_limited_address','rate_limited','address_ceiling'),('rate_limited_global','rate_limited','global_ceiling'),('no_address','rate_limited','no_address')) as v(outcome,status,reason) loop
    assert coalesce((select sum(n) from public.reading_activity_outcomes where outcome=m.outcome and minute > now() - interval '1 day'),0) = (select count(*) from t.calllog where status=m.status and reason is not distinct from m.reason), 'counter vs calls for ' || m.outcome;
  end loop;
  assert (select count(*) from public.events where props->>'beacon'='v1' and ts >= '$T0') = 181, 'beacon events since the scenarios = 1 + 60 + 120';
  assert (select count(*) from public.reading_activity_ids where first_seen_at >= '$T0') = 181, 'one key per recorded event';
  assert (select count(*) from t.calllog where n > $N0 and status='recorded') = 181, 'recorded calls = events';
  assert (select count(*) from (select props->>'activity_event_id' from public.events where props->>'beacon'='v1' group by 1 having count(*)>1) d)=0, 'no event id appears twice';
  assert not exists (select 1 from public.reading_activity_ids k where k.first_seen_at >= '$T0' and not exists (select 1 from public.events e where e.props->>'activity_event_id'=k.activity_event_id::text)), 'every key has its event';
end \\\$\\\$\""
echo "CONCURRENCY PASSED"

if [ "${1:-}" = "--with-els" ]; then
  echo "--- real els-search-bridge handler against this database"
  RA_PG_BIN="$BIN" RA_PG_SOCKET="$D" RA_PG_PORT=55433 RA_PG_AS_POSTGRES=$([ "$(id -u)" = 0 ] && echo 1 || echo 0) node --test test/els-activity-e2e.test.mjs
fi
