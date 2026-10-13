#!/usr/bin/env bash
# Real PostgREST HTTP role check against disposable, synthetic local fixtures.
set -euo pipefail

network="sod-g4-source-http-$$"
pg_container="sod-g4-source-pg-$$"
api_container="sod-g4-source-api-$$"
scratch="$(mktemp -d)"
cleanup() {
  docker rm -f "$api_container" "$pg_container" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf "$scratch"
}
trap cleanup EXIT

docker network create "$network" >/dev/null
docker run -d --rm --name "$pg_container" --network "$network" --network-alias pg \
  -e POSTGRES_HOST_AUTH_METHOD=trust -v "$PWD:/repo:ro" -w /repo postgres:17-bookworm >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$pg_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done

if ! docker exec -w /repo "$pg_container" psql -h 127.0.0.1 -U postgres \
  -v ON_ERROR_STOP=1 -q -f tests/sql/world_group_source_provenance_v2.sql >"$scratch/fixture.log" 2>&1; then
  cat "$scratch/fixture.log"
  exit 1
fi
docker exec "$pg_container" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q \
  -c 'create role authenticator login noinherit; grant anon, authenticated to authenticator; grant usage on schema public to anon, authenticated;' >/dev/null

dm_id="$(docker exec "$pg_container" psql -h 127.0.0.1 -U postgres -tA -c "select id from public.channel_updates where ext_msg_id='M5'")"
legacy_id="$(docker exec "$pg_container" psql -h 127.0.0.1 -U postgres -tA -c "select id from public.channel_updates where ext_msg_id='LEG1'")"
test -n "$dm_id" && test -n "$legacy_id"

docker run -d --rm --name "$api_container" --network "$network" -p 127.0.0.1::3000 \
  -e PGRST_DB_URI='postgres://authenticator@pg:5432/postgres' \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET='local-test-secret-at-least-32-bytes-1234567890' \
  postgrest/postgrest:v14.5@sha256:b574528fe109c8343c1247155734d03df8c34b462f342dca0ccc20244fc36ef9 >/dev/null
port="$(docker port "$api_container" 3000/tcp | sed -n 's/.*://p')"
for attempt in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$port/" >/dev/null 2>&1; then break; fi
  sleep 1
done

SOD_G4_LOCAL_PORT="$port" SOD_G4_DM_ID="$dm_id" SOD_G4_LEGACY_ID="$legacy_id" node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const secret = 'local-test-secret-at-least-32-bytes-1234567890';
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 600 })}`;
const jwt = `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
const base = `http://127.0.0.1:${process.env.SOD_G4_LOCAL_PORT}`;

async function arrivals(headers = {}) {
  const response = await fetch(`${base}/rpc/world_group_source_arrivals_v3`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ p_limit: 40 }),
  });
  assert.equal(response.status, 200, `v3 HTTP status for ${Object.keys(headers).length ? 'authenticated' : 'anon'}`);
  return response.json();
}

const anon = await arrivals();
const authenticated = await arrivals({ authorization: `Bearer ${jwt}` });
assert.deepEqual(authenticated, anon, 'public reader must project the same sanitized result to both roles');
assert.ok(anon.some((row) => row.occurrences.length > 1), 'repeat grouping reaches HTTP output');
const occurrenceIds = new Set();
let occurrenceCount = 0;
for (const row of anon) {
  assert.deepEqual(Object.keys(row).sort(), [
    'body', 'contributor_name', 'contributor_slug', 'created_at',
    'group_proof', 'id', 'occurrences', 'proof_basis',
  ]);
  for (const occurrence of row.occurrences) {
    assert.deepEqual(Object.keys(occurrence).sort(), ['created_at', 'id']);
    occurrenceIds.add(occurrence.id);
    occurrenceCount++;
  }
}
assert.equal(occurrenceIds.size, occurrenceCount, 'each eligible source event appears once');
assert.ok(!occurrenceIds.has(process.env.SOD_G4_DM_ID), 'private message excluded');
assert.ok(!occurrenceIds.has(process.env.SOD_G4_LEGACY_ID), 'unproved legacy row excluded');

for (const [role, headers, expected] of [
  ['anon', {}, 401], ['authenticated', { authorization: `Bearer ${jwt}` }, 403],
]) {
  const response = await fetch(`${base}/channel_update_group_proof?select=update_id`, { headers });
  assert.equal(response.status, expected, `${role} cannot read private proof table`);
}
console.log(`v3 local HTTP roles PASS: ${anon.length} cards, anon/authenticated 200, private proof 401/403`);
JS
