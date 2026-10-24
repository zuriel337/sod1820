import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { installStorageEgressGuard } = require('../tests/playwright-storage-egress-guard.cjs');

function harness(url, method) {
  const handlers = [];
  const page = { route: async (pattern, handler) => { handlers.push({ pattern, handler }); } };
  const calls = [];
  const route = {
    request: () => ({ url: () => url, method: () => method, headers: () => ({}) }),
    fallback: async () => { calls.push({ fallback: true }); },
    fulfill: async (response) => { calls.push(response); },
  };
  return { page, handlers, calls, route };
}

test('production POST cannot reach network from guarded browser test', async () => {
  const h = harness('https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/ingest_event', 'POST');
  await installStorageEgressGuard(h.page);
  await h.handlers[0].handler(h.route);
  assert.equal(h.calls[0].status, 403);
  assert.equal(h.calls[0].headers['x-sod-test-prod-isolation'], 'write-denied');
});
test('production read remains explicit compatibility behavior', async () => {
  const h = harness('https://linswmnnkjxvweumprav.supabase.co/rest/v1/nodes', 'GET');
  await installStorageEgressGuard(h.page);
  await h.handlers[0].handler(h.route);
  assert.equal(h.calls[0].fallback, true);
});
test('other Supabase projects are not intercepted', async () => {
  const h = harness('https://isolated-example.supabase.co/rest/v1/rpc/ingest_event', 'POST');
  await installStorageEgressGuard(h.page);
  await h.handlers[0].handler(h.route);
  assert.equal(h.calls[0].fallback, true);
});
