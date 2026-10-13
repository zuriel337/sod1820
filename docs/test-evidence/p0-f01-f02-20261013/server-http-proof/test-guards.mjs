// Tests harness control and cleanup only. These are not native HTTP security evidence.
import assert from 'node:assert/strict';
import { createHandler, CHILD_REF, ORIGIN, sha256, denialEvidence, resolveInjectedKeyMode } from './index.ts';
const nonce = 'A'.repeat(43);
const time = Date.now();
const configuration = { nonce_sha256: await sha256(new TextEncoder().encode(nonce)), expires_at_ms: time + 60000 };
const jwt = (role, ref = CHILD_REF) => `${btoa('{}').replaceAll('=', '')}.${btoa(JSON.stringify({ role, ref })).replaceAll('=', '')}.LOCAL_TEST_SIGNATURE`;
const anon = jwt('anon');
const service = jwt('service_role');
const env = (name) => ({ SUPABASE_URL: ORIGIN, DENO_DEPLOYMENT_ID: `${CHILD_REF}_fake_1`, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service })[name];
const request = (supplied = nonce) => new Request(`${ORIGIN}/functions/v1/p0-999-supplemental-http-proof`, { method: 'POST', headers: { 'x-proof-nonce': supplied } });
let calls = 0;
const forbiddenNetwork = async () => { calls++; throw new Error('guard must not fetch'); };
assert.equal((await createHandler({ env, fetcher: forbiddenNetwork, configuration })(request('B'.repeat(43)))).status, 403);
assert.equal((await createHandler({ env, fetcher: forbiddenNetwork, configuration: { ...configuration, expires_at_ms: 0 } })(request())).status, 403);
assert.equal((await createHandler({ env: (name) => name === 'SUPABASE_URL' ? 'https://linswmnnkjxvweumprav.supabase.co' : env(name), fetcher: forbiddenNetwork, configuration })(request())).status, 403);
assert.equal(calls, 0);
const runtimeForm = new Request(`${ORIGIN}/p0-999-supplemental-http-proof`, { method: 'POST', headers: { 'x-proof-nonce': 'B'.repeat(43) } });
assert.equal((await createHandler({ env, fetcher: forbiddenNetwork, configuration })(runtimeForm)).status, 403);
assert.equal(calls, 0);
const arbitraryPath = new Request(`${ORIGIN}/another-function`, { method: 'POST', headers: { 'x-proof-nonce': nonce } });
assert.equal((await createHandler({ env, fetcher: forbiddenNetwork, configuration })(arbitraryPath)).status, 404);
assert.equal(calls, 0);
for (const response of [
  { status: 409, data: { message: 'The resource already exists' } },
  { status: 400, data: { error: 'Unauthorized', message: 'Unauthorized' } },
  { status: 500, data: { message: 'new row violates row-level security policy' } },
  { status: 400, data: { code: 'PGRST301', message: 'JWT expired' } },
]) assert.equal(denialEvidence(response), null);

function fakeServer({ unexpectedFreshSuccess = false, conflictDenial = false, commitThenRejectServiceUploadAt = null, failCleanup = false, baselineDrift = false, keyMode = 'legacy', publicKey = anon, serviceKey = service } = {}) {
  const sentinel = 'community/p0-local-1791499873650.png';
  const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='), (c) => c.charCodeAt(0));
  const objects = new Map([[sentinel, baselineDrift ? new TextEncoder().encode('Existing baseline drift; must not mutate') : bytes]]);
  const seen = [];
  let privilegedUploadCount = 0;
  const fetcher = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, ORIGIN);
    const privileged = options.headers.apikey === serviceKey;
    assert.ok(options.headers.apikey === publicKey || options.headers.apikey === serviceKey);
    if (keyMode === 'modern') {
      assert.equal(Object.keys(options.headers).some((name) => name.toLowerCase() === 'authorization'), false);
    } else {
      assert.equal(options.headers.Authorization, `Bearer ${options.headers.apikey}`);
    }
    seen.push({ path: url.pathname, method: options.method, privileged });
    const json = (data, status = 200) => Response.json(data, { status });
    if (url.pathname === '/rest/v1/rpc/get_work_log') {
      assert.ok(privileged, 'The genuine privileged API key must make the service-role RPC attempt');
      return json({ code: '42501', message: 'permission denied for function get_work_log' }, 403);
    }
    if (url.pathname === '/storage/v1/object/gallery' && options.method === 'DELETE') {
      assert.ok(privileged);
      if (failCleanup) return json({ message: 'backend temporarily unavailable' }, 503);
      for (const path of JSON.parse(options.body).prefixes) objects.delete(path);
      return json([]);
    }
    const prefix = ['/storage/v1/object/public/gallery/', '/storage/v1/object/authenticated/gallery/', '/storage/v1/object/gallery/'].find((p) => url.pathname.startsWith(p));
    assert.ok(prefix);
    const path = url.pathname.slice(prefix.length);
    if (options.method === 'GET') return objects.has(path) ? new Response(objects.get(path)) : json({ error: 'not_found', message: 'Object not found' }, 400);
    if (privileged) {
      if (objects.has(path) && options.method === 'POST' && options.headers['x-upsert'] === 'false') return json({ message: 'The resource already exists' }, 409);
      objects.set(path, options.body);
      if (options.method === 'POST' && ++privilegedUploadCount === commitThenRejectServiceUploadAt) {
        throw new Error('Simulated transport failure after Storage committed the object');
      }
      return json({ Key: path }, 200);
    }
    if (conflictDenial) return json({ message: 'The resource already exists' }, 409);
    if (unexpectedFreshSuccess && options.method === 'POST' && options.headers['x-upsert'] === 'false') {
      objects.set(path, options.body);
      return json({ Key: path }, 200);
    }
    return json({ error: 'Unauthorized', message: 'new row violates row-level security policy' }, 400);
  };
  return { objects, seen, fetcher, sentinel };
}

const successful = fakeServer();
const handler = createHandler({ env, fetcher: successful.fetcher, configuration });
const response = await handler(request());
assert.equal(response.status, 200);
const body = await response.json();
assert.equal(body.result, 'PASS_SUPPLEMENTAL_HTTP_ONLY');
assert.equal(body.checks.length, 28);
assert.equal(body.negative_request_count, 26);
assert.equal(body.cleanup.length, 9);
assert.equal(body.public_fixture_before_sha256, body.public_fixture_after_sha256);
assert.deepEqual(Array.from(successful.objects.keys()), [successful.sentinel]);
assert.equal(JSON.stringify(body).includes(service), false);
assert.equal(JSON.stringify(body).includes(anon), false);
assert.equal((await handler(request())).status, 409);
const gatewayStripped = fakeServer();
const strippedResponse = await createHandler({ env, fetcher: gatewayStripped.fetcher, configuration })(new Request(`${ORIGIN}/p0-999-supplemental-http-proof`, { method: 'POST', headers: { 'x-proof-nonce': nonce } }));
assert.equal(strippedResponse.status, 200);
assert.deepEqual(Array.from(gatewayStripped.objects.keys()), [gatewayStripped.sentinel]);

for (const options of [{ unexpectedFreshSuccess: true }, { conflictDenial: true }]) {
  const server = fakeServer(options);
  const result = await createHandler({ env, fetcher: server.fetcher, configuration })(request());
  const failure = await result.json();
  assert.equal(failure.result, 'NO_GO');
  assert.equal(failure.failure.reason, 'authorization_reason_not_proven');
  assert.deepEqual(Array.from(server.objects.keys()), [server.sentinel]);
}
for (const index of [1, 2]) {
  const server = fakeServer({ commitThenRejectServiceUploadAt: index });
  const result = await createHandler({ env, fetcher: server.fetcher, configuration })(request());
  const failure = await result.json();
  assert.equal(failure.result, 'NO_GO');
  assert.equal(failure.failure.reason, 'request_failed');
  assert.equal(failure.cleanup.length, index);
  assert.ok(failure.cleanup.every((item) => item.delete_status === 200 && item.absent_status === 400));
  assert.deepEqual(Array.from(server.objects.keys()), [server.sentinel]);
}
const failedCleanup = fakeServer({ commitThenRejectServiceUploadAt: 1, failCleanup: true });
const failedCleanupResponse = await createHandler({ env, fetcher: failedCleanup.fetcher, configuration })(request());
const incomplete = await failedCleanupResponse.json();
assert.equal(incomplete.result, 'NO_GO');
assert.ok(incomplete.cleanup.some((item) => item.failed));
assert.equal(failedCleanup.objects.size, 2);
const drifted = fakeServer({ baselineDrift: true });
const driftBefore = await sha256(drifted.objects.get(drifted.sentinel));
const driftResponse = await createHandler({ env, fetcher: drifted.fetcher, configuration })(request());
const driftResult = await driftResponse.json();
assert.equal(driftResult.result, 'NO_GO');
assert.equal(driftResult.failure.stage, 'existing_public_fixture_hash');
assert.equal(driftResult.cleanup.length, 0);
assert.equal(drifted.seen.length, 1);
assert.equal(await sha256(drifted.objects.get(drifted.sentinel)), driftBefore);

const modernPublic = 'sb_publishable_SYNTHETIC_PUBLIC_ONLY';
const modernSecret = 'sb_secret_SYNTHETIC_SERVER_ONLY';
const modernEnv = (name) => name === 'SUPABASE_ANON_KEY' ? modernPublic : name === 'SUPABASE_SERVICE_ROLE_KEY' ? modernSecret : env(name);
const modernServer = fakeServer({ keyMode: 'modern', publicKey: modernPublic, serviceKey: modernSecret });
const modernResponse = await createHandler({ env: modernEnv, fetcher: modernServer.fetcher, configuration })(request());
const modernResult = await modernResponse.json();
assert.equal(modernResponse.status, 200);
assert.equal(modernResult.credential_mode, 'modern');
assert.equal(modernResult.checks.length, 28);
assert.equal(modernResult.negative_request_count, 26);
assert.equal(modernResult.cleanup.length, 9);
assert.equal(modernServer.seen.length, successful.seen.length, 'Modern support must add no native requests');
assert.deepEqual(Array.from(modernServer.objects.keys()), [modernServer.sentinel]);
assert.equal(JSON.stringify(modernResult).includes(modernPublic), false);
assert.equal(JSON.stringify(modernResult).includes(modernSecret), false);
assert.ok(modernServer.seen.some((call) => call.path === '/rest/v1/rpc/get_work_log' && call.privileged));
assert.ok(modernServer.seen.some((call) => call.method === 'PUT' && !call.privileged));
assert.equal(resolveInjectedKeyMode(anon, service), 'legacy');
assert.equal(resolveInjectedKeyMode(modernPublic, modernSecret), 'modern');
for (const [publicKey, serviceKey] of [
  [anon, modernSecret],
  [modernPublic, service],
  [modernSecret, modernPublic],
  [modernPublic, 'unknown_SERVER_KEY'],
  [jwt('anon', 'linswmnnkjxvweumprav'), service],
  [anon, jwt('service_role', 'linswmnnkjxvweumprav')],
  [anon, jwt('authenticated')],
]) {
  assert.equal(resolveInjectedKeyMode(publicKey, serviceKey), null);
  let unsafeCalls = 0;
  const invalidEnv = (name) => name === 'SUPABASE_ANON_KEY' ? publicKey : name === 'SUPABASE_SERVICE_ROLE_KEY' ? serviceKey : env(name);
  const rejected = await createHandler({ env: invalidEnv, fetcher: async () => { unsafeCalls++; throw new Error('Rejected pair must not issue HTTP'); }, configuration })(request());
  assert.equal(rejected.status, 503);
  assert.equal(unsafeCalls, 0);
}
console.log('PASS: fixed runtime/nonce guards; false-denial rejection; 28 cases/26 negatives; response-loss cleanup and drift; modern role-specific apikey with no Authorization; strict legacy role/ref guards; reject mixed pairs before HTTP; no credential output.');
