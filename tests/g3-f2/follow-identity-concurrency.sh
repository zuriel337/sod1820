#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -X -v ON_ERROR_STOP=1 -q)
RACE_USER="00000000-0000-0000-0000-0000000000d4"
RACE_PERSON="00000000-0000-0000-0000-00000000d400"
RACE_VISITOR="g3f2-race-guest"

cleanup_logs() { rm -f /tmp/g3f2-claim.log /tmp/g3f2-watch.log /tmp/g3f2-dup1.log /tmp/g3f2-dup2.log; }
trap cleanup_logs EXIT

"${PSQL[@]}" <<SQL
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('$RACE_USER','authenticated','authenticated','race@g3f2.invalid','',now(),'{}'::jsonb,'{}'::jsonb,now(),now())
on conflict (id) do nothing;
insert into public.users(id,email,username,display_name,role)
values ('$RACE_USER','race@g3f2.invalid','race-user','Race User','user')
on conflict (id) do nothing;
delete from public.identity_edges where person_id='$RACE_PERSON'::uuid or legacy_id='$RACE_VISITOR';
delete from public.persons where person_id='$RACE_PERSON'::uuid;
delete from public.notification_prefs where user_id='$RACE_USER'::uuid or visitor_id='$RACE_VISITOR';
delete from public.subscribe_events where user_id='$RACE_USER'::uuid or visitor_id='$RACE_VISITOR';
insert into public.notification_prefs(visitor_id,topics,channels)
values ('$RACE_VISITOR',array['number:100'],'{}'::text[]);
insert into public.persons(person_id,account_user_id,first_source)
values ('$RACE_PERSON','$RACE_USER','g3f2-race');
SQL

# Session 1 creates the identity proof. The trigger claims the guest projection and holds
# visitor -> account advisory transaction locks until COMMIT. Keep the transaction open so
# the concurrent anon Watch is forced through the exact post-claim re-check path.
psql "$DB_URL" -X -v ON_ERROR_STOP=1 -q > /tmp/g3f2-claim.log 2>&1 <<SQL &
begin;
insert into public.identity_edges(sod_id,person_id,kind,legacy_id)
values ('sod-race','$RACE_PERSON','legacy_seed','$RACE_VISITOR');
select pg_sleep(3);
commit;
SQL
CLAIM_PID=$!

sleep 0.75

# Session 2 starts while session 1 owns the visitor lock. It must wait, then observe the
# committed identity edge, route to the account projection, and never recreate an orphan guest.
psql "$DB_URL" -X -v ON_ERROR_STOP=1 -q > /tmp/g3f2-watch.log 2>&1 <<SQL &
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claims','{"role":"anon"}',false);
set role anon;
select public.watch_toggle('number:200','g3f2-race',true,'$RACE_VISITOR');
reset role;
SQL
WATCH_PID=$!

wait "$CLAIM_PID" || { cat /tmp/g3f2-claim.log; exit 1; }
wait "$WATCH_PID" || { cat /tmp/g3f2-watch.log; exit 1; }

"${PSQL[@]}" <<SQL
do \$\$
begin
  if exists (select 1 from public.notification_prefs where visitor_id='$RACE_VISITOR') then
    raise exception 'ASSERTION FAILED: concurrent claim/watch left orphan guest Follow';
  end if;
  if not exists (
    select 1 from public.notification_prefs
    where user_id='$RACE_USER'::uuid
      and topics @> array['number:100','number:200']::text[]
      and channels='{}'::text[]
  ) then
    raise exception 'ASSERTION FAILED: concurrent claim/watch lost topic or transferred channel consent';
  end if;
  if (select count(*) from public.subscribe_events
      where user_id='$RACE_USER'::uuid and visitor_id='$RACE_VISITOR'
        and topic='number:200' and action='follow') <> 1 then
    raise exception 'ASSERTION FAILED: linked guest Watch did not preserve account+visitor provenance exactly once';
  end if;
end
\$\$;
SQL

echo "G3-F2 claim/watch race: PASS"

# Concurrent first-Follow retries for one authenticated account must serialize to one
# subscribe_event while retaining a single canonical projection.
"${PSQL[@]}" <<SQL
delete from public.notification_prefs where user_id='$RACE_USER'::uuid;
delete from public.subscribe_events where user_id='$RACE_USER'::uuid;
SQL

for slot in 1 2; do
  psql "$DB_URL" -X -v ON_ERROR_STOP=1 -q > "/tmp/g3f2-dup${slot}.log" 2>&1 <<SQL &
select set_config('request.jwt.claim.sub','$RACE_USER',false);
select set_config('request.jwt.claims','{"sub":"$RACE_USER","role":"authenticated","email":"race@g3f2.invalid"}',false);
set role authenticated;
select public.watch_toggle('number:300','g3f2-concurrent-retry',true,null);
reset role;
SQL
  if [[ "$slot" == "1" ]]; then DUP1=$!; else DUP2=$!; fi
done
wait "$DUP1" || { cat /tmp/g3f2-dup1.log; exit 1; }
wait "$DUP2" || { cat /tmp/g3f2-dup2.log; exit 1; }

"${PSQL[@]}" <<SQL
do \$\$
begin
  if (select count(*) from public.subscribe_events
      where user_id='$RACE_USER'::uuid and topic='number:300' and action='follow') <> 1 then
    raise exception 'ASSERTION FAILED: concurrent duplicate Follow emitted duplicate provenance';
  end if;
  if not exists (select 1 from public.notification_prefs
                 where user_id='$RACE_USER'::uuid and topics=array['number:300']::text[]) then
    raise exception 'ASSERTION FAILED: concurrent duplicate Follow projection is not canonical/idempotent';
  end if;
end
\$\$;
SQL

echo "G3-F2 concurrent duplicate Follow: PASS"
