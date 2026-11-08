import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createReadDedupe, sharedReadDedupe } from '../src/lib/readDedupe.js';

// The shared Supabase client (src/lib/supabase.js) and the anonymous public-research client must route their requests through
// ONE read-dedupe instance. This drives the REAL supabase-js client (header shapes, Accept/Prefer, body encoding) over a stubbed fetch.
const network = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  network.push(`${init?.method || 'GET'} ${String(input).replace(/^https:\/\/[^/]+/, '')}`);
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
};
test.after(() => { globalThis.fetch = realFetch; });

const { supabase, SUPABASE_URL, SUPABASE_ANON } = await import('../src/lib/supabase.js');
const { getPublicResearchClient } = await import('../src/lib/research/researchViewMode.js');
const count = (re) => network.filter((line) => re.test(line)).length;

test('the real client collapses concurrent identical listed RPC reads and remembers the settled anonymous answer', async () => {
  network.length = 0;
  await Promise.all([1, 2, 3, 4].map(() => supabase.rpc('fn_zero_scale', { p_value: 1820 })));
  await supabase.rpc('fn_zero_scale', { p_value: 1820 });
  await supabase.rpc('fn_zero_scale', { p_value: 1821 });
  assert.equal(count(/rpc\/fn_zero_scale/), 2, 'one request per distinct body');
});

test('REST reads of listed relations are shared; the same read on an unlisted relation is not', async () => {
  network.length = 0;
  await supabase.from('topic_cards_public').select('id,slug').limit(5);
  await supabase.from('topic_cards_public').select('id,slug').limit(5);
  await supabase.from('topic_cards_public').select('id,slug').limit(6);
  await supabase.from('community_messages').select('id').limit(5);
  await supabase.from('community_messages').select('id').limit(5);
  assert.equal(count(/topic_cards_public/), 2);
  assert.equal(count(/community_messages/), 2);
});

test('writes and telemetry beacons are never collapsed or remembered', async () => {
  network.length = 0;
  for (let i = 0; i < 3; i += 1) {
    await supabase.rpc('ingest_event', { p_event_type: 'view', p_surface: 'x' });
    await supabase.rpc('track_visit', { p_path: '/' });
    await supabase.rpc('link_identity', { p_kind: 'k' });
    await supabase.rpc('add_guest_community_message', { p_body: 'hello' });
  }
  assert.equal(count(/rpc\/ingest_event/), 3);
  assert.equal(count(/rpc\/track_visit/), 3);
  assert.equal(count(/rpc\/link_identity/), 3);
  assert.equal(count(/rpc\/add_guest_community_message/), 3);
});

test('the public-research client shares the session client\'s memo (one instance per origin)', async () => {
  network.length = 0;
  await supabase.rpc('number_neighbors', { p_value: 7, p_limit: 12 });
  await getPublicResearchClient().rpc('number_neighbors', { p_value: 7, p_limit: 12 });
  assert.equal(count(/rpc\/number_neighbors/), 1);
  assert.equal(sharedReadDedupe(SUPABASE_URL), sharedReadDedupe(SUPABASE_URL));
});

test('a client carrying a user token is shared in flight but never remembered', async () => {
  network.length = 0;
  const dedupe = createReadDedupe({ supabaseUrl: SUPABASE_URL });
  const user = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: dedupe.fetch, headers: { Authorization: 'Bearer user-session-token' } } });
  await Promise.all([1, 2, 3].map(() => user.rpc('fn_number_dossier', { p_value: 40 })));
  await user.rpc('fn_number_dossier', { p_value: 40 });
  assert.equal(count(/rpc\/fn_number_dossier/), 2, 'one shared in-flight request, then a fresh one - not a memo hit');
});

test('source contract: both clients are built with the shared dedupe fetch and nothing else changed in their auth options', () => {
  const main = readFileSync(new URL('../src/lib/supabase.js', import.meta.url), 'utf8');
  assert.match(main, /const readDedupe = sharedReadDedupe\(SUPABASE_URL\);/);
  assert.match(main, /global: \{ fetch: readDedupe\.fetch \}/);
  assert.match(main, /readingSessionOptions\(readingStorage, globalThis\.location, \{ productionArtifact: PUBLIC_READING_PRODUCTION_ARTIFACT \}\)/);
  const research = readFileSync(new URL('../src/lib/research/researchViewMode.js', import.meta.url), 'utf8');
  assert.match(research, /auth: \{ persistSession: false, autoRefreshToken: false, detectSessionInUrl: false \},\s*global: \{ fetch: sharedReadDedupe\(SUPABASE_URL\)\.fetch \}/);
  const account = readFileSync(new URL('../src/lib/accountLink.js', import.meta.url), 'utf8');
  assert.doesNotMatch(account, /readDedupe/, 'the account-link proof client is an auth surface and stays untouched');
});
