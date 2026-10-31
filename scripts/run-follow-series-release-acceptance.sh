#!/usr/bin/env bash
# Synthetic disposable PostgreSQL ONLY. No DB URL, credentials, host ports or network.
set -euo pipefail
cd "$(dirname "$0")/.."
FOLLOW_RELEASE_CONTAINER="sod-follow-release-test-$$"
FOLLOW_RELEASE_ARTIFACT_DIR="${FOLLOW_RELEASE_ARTIFACT_DIR:-/workspace/scratch/follow-series-release-20261031}"
mkdir -p "$FOLLOW_RELEASE_ARTIFACT_DIR"
FOLLOW_RELEASE_MIGRATION=$(node --input-type=module -e "import('./scripts/generate-follow-content-series-only.mjs').then(m=>process.stdout.write(m.migrationPath))")
[[ "$FOLLOW_RELEASE_MIGRATION" =~ ^supabase/migrations/[0-9]{14}_follow_content_series_only_v1.sql$ ]] || exit 1
docker run --rm -d --network none --name "$FOLLOW_RELEASE_CONTAINER" \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  --mount "type=bind,src=$(pwd),dst=/repo,readonly" -w /repo postgres:17-bookworm >/dev/null
trap 'docker rm -f "$FOLLOW_RELEASE_CONTAINER" >/dev/null 2>&1 || true' EXIT
for i in $(seq 1 40); do
  if docker exec "$FOLLOW_RELEASE_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done
docker exec "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
  -v follow_series_only=true -v follow_series_migration="$FOLLOW_RELEASE_MIGRATION" \
  -f tests/sql/follow_series_release_acceptance_v1.sql
docker exec "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -At -v ON_ERROR_STOP=1 -c \
  "select jsonb_object_agg(proname,jsonb_build_object('md5',md5(pg_get_functiondef(p.oid)),'definition',pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('canonical_follow_topic','follow_topic_aliases','canonical_follow_subject','notify_on_post_publish','post_content_series_keys_v1');" \
  > "$FOLLOW_RELEASE_ARTIFACT_DIR/function-postimages.json"
docker inspect --format '{{.Image}}' "$FOLLOW_RELEASE_CONTAINER" > "$FOLLOW_RELEASE_ARTIFACT_DIR/postgres-image.txt"
echo 'Series Follow local role/claim/receipt/cancellation/mute acceptance: PASS'

# Real concurrent sessions, using the existing verified-identity trigger and lock order.
docker exec -i "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q <<'SQL'
insert into users values
 ('00000000-0000-4000-8000-000000000007','seven@example.invalid','user'),
 ('00000000-0000-4000-8000-000000000008','eight@example.invalid','user');
insert into persons values('10000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000007');
insert into notification_prefs(visitor_id,topics,channels)
values('release-race',array['series:dimension-five'],array['email']);
SQL
docker exec -i "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
  > "$FOLLOW_RELEASE_ARTIFACT_DIR/claim-race.log" 2>&1 <<'SQL' &
begin;
insert into identity_edges values('10000000-0000-4000-8000-000000000007','legacy_seed','release-race');
select pg_sleep(1);
commit;
SQL
FOLLOW_CLAIM_PID=$!
sleep 0.2
docker exec -i "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
  > "$FOLLOW_RELEASE_ARTIFACT_DIR/watch-race.log" 2>&1 <<'SQL' &
select set_config('test.uid','',false);
set role anon;
select follow_subject_toggle('series','sod-hashmal','release-race',true,'release-race');
SQL
FOLLOW_WATCH_PID=$!
wait "$FOLLOW_CLAIM_PID" || { cat "$FOLLOW_RELEASE_ARTIFACT_DIR/claim-race.log"; exit 1; }
wait "$FOLLOW_WATCH_PID" || { cat "$FOLLOW_RELEASE_ARTIFACT_DIR/watch-race.log"; exit 1; }
for slot in 1 2; do
  docker exec -i "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
    > "$FOLLOW_RELEASE_ARTIFACT_DIR/duplicate-$slot.log" 2>&1 <<'SQL' &
select set_config('test.uid','00000000-0000-4000-8000-000000000008',false);
set role authenticated;
select follow_subject_toggle('series','dimension-five','release-concurrent-retry',true,null);
SQL
  if [[ "$slot" == 1 ]]; then FOLLOW_DUP_ONE=$!; else FOLLOW_DUP_TWO=$!; fi
done
wait "$FOLLOW_DUP_ONE" || { cat "$FOLLOW_RELEASE_ARTIFACT_DIR/duplicate-1.log"; exit 1; }
wait "$FOLLOW_DUP_TWO" || { cat "$FOLLOW_RELEASE_ARTIFACT_DIR/duplicate-2.log"; exit 1; }
docker exec -i "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q <<'SQL'
do $$ begin
  if exists(select 1 from notification_prefs where visitor_id='release-race') then
    raise exception 'claim/watch race left an orphan guest projection'; end if;
  if not exists(select 1 from notification_prefs where user_id='00000000-0000-4000-8000-000000000007'
    and topics @> array['series:dimension-five','series:sod-hashmal'] and channels='{}'::text[]) then
    raise exception 'claim/watch race lost intent or copied guest email consent'; end if;
  if (select count(*) from subscribe_events where user_id='00000000-0000-4000-8000-000000000007'
    and visitor_id='release-race' and topic='series:sod-hashmal' and action='follow')<>1 then
    raise exception 'claim/watch race lost exact account and visitor provenance'; end if;
  if (select count(*) from subscribe_events where user_id='00000000-0000-4000-8000-000000000008'
    and topic='series:dimension-five' and action='follow')<>1 then
    raise exception 'concurrent retry duplicated Follow provenance'; end if;
end $$;
insert into posts values(7110,'Concurrent receipt','release-concurrent-receipt',now(),array['מימד חמש'],'{}','בדרך לנצח');
SQL
for slot in 1 2; do
  docker exec "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q -c \
    "select dispatch('series','dimension-five','post_new','7110','retry','retry','/release-concurrent-receipt');" \
    > "$FOLLOW_RELEASE_ARTIFACT_DIR/dispatch-$slot.log" 2>&1 &
  if [[ "$slot" == 1 ]]; then FOLLOW_DISPATCH_ONE=$!; else FOLLOW_DISPATCH_TWO=$!; fi
done
wait "$FOLLOW_DISPATCH_ONE" || { cat "$FOLLOW_RELEASE_ARTIFACT_DIR/dispatch-1.log"; exit 1; }
wait "$FOLLOW_DISPATCH_TWO" || { cat "$FOLLOW_RELEASE_ARTIFACT_DIR/dispatch-2.log"; exit 1; }
docker exec -i "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q <<'SQL'
do $$ begin
  if (select count(*) from user_notifications where source_ref='7110')<>4
    or exists(select 1 from user_notifications where source_ref='7110' group by user_id having count(*)>1) then
    raise exception 'concurrent publication retry did not preserve one receipt per recipient'; end if;
end $$;
SQL
echo 'Series claim/watch, duplicate Follow and dispatch concurrency: PASS'

# Roll back code only. Receipts/preferences/history must survive byte-for-byte.
FOLLOW_DATA_SQL="select jsonb_build_object('prefs',(select md5(jsonb_agg(to_jsonb(p) order by user_id nulls last,visitor_id)::text) from notification_prefs p),'receipts',(select md5(jsonb_agg(to_jsonb(n) order by id)::text) from user_notifications n),'history',(select md5(jsonb_agg(to_jsonb(s) order by ts,user_id,visitor_id,topic,action)::text) from subscribe_events s));"
FOLLOW_DATA_BEFORE=$(docker exec "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -At -v ON_ERROR_STOP=1 -c "$FOLLOW_DATA_SQL")
docker exec "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
  -f docs/reviews/follow-series-release-20261031/rollback.sql
FOLLOW_DATA_AFTER=$(docker exec "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -At -v ON_ERROR_STOP=1 -c "$FOLLOW_DATA_SQL")
[[ "$FOLLOW_DATA_BEFORE" == "$FOLLOW_DATA_AFTER" ]] || { echo 'Rollback changed synthetic data'; exit 1; }
docker exec -i "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q <<'SQL'
do $$ begin
  if canonical_follow_subject('series','dimension-five')<>''
    or to_regprocedure('public.post_content_series_keys_v1(text[],text[],text)') is not null then
    raise exception 'rollback did not restore original series admission'; end if;
end $$;
SQL
docker exec "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
  -f "$FOLLOW_RELEASE_MIGRATION"
if docker exec "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
  -f "$FOLLOW_RELEASE_MIGRATION" \
  > "$FOLLOW_RELEASE_ARTIFACT_DIR/apply-guard.log" 2>&1; then
  echo 'FAIL: second apply accepted a changed base'; exit 1
fi
rg -q 'Follow alignment base changed' "$FOLLOW_RELEASE_ARTIFACT_DIR/apply-guard.log"
docker exec "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q -c \
  "create or replace function public.canonical_follow_subject(p_entity_type text,p_stable_id text) returns text language sql immutable as 'select ''foreign-scope''::text';"
if docker exec "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q \
  -f docs/reviews/follow-series-release-20261031/rollback.sql \
  > "$FOLLOW_RELEASE_ARTIFACT_DIR/rollback-guard.log" 2>&1; then
  echo 'FAIL: rollback accepted another writer'; exit 1
fi
rg -q 'Follow rollback base changed' "$FOLLOW_RELEASE_ARTIFACT_DIR/rollback-guard.log"
docker exec -i "$FOLLOW_RELEASE_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q <<'SQL'
do $$ begin
  if canonical_follow_subject('series','dimension-five')<>'foreign-scope' then
    raise exception 'rollback guard overwrote another writer'; end if;
end $$;
SQL
echo 'Guarded rollback/data preservation/reapply/foreign-writer refusal: PASS'
