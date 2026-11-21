import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Vite inlines this build constant in the public artifact; mirror that single define for Node.
const source = readFileSync(new URL('../src/lib/authLazy2029.js', import.meta.url), 'utf8')
  .replace("import { PUBLIC_READING_PRODUCTION_ARTIFACT } from './publicReadingRelease2029.js';", 'const PUBLIC_READING_PRODUCTION_ARTIFACT = true;');
const { AuthClient, _setAuthImportForTests } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
function setup(t, stored = null, route = '/') {
  const original = globalThis.location;
  globalThis.location = { origin: 'https://sod1820.co.il', pathname: route, search: '', hash: '' };
  t.after(() => { globalThis.location = original; _setAuthImportForTests(); });
  let loads = 0;
  const subscriptions = [];
  class Real {
    constructor(options) { this.options = options; }
    getSession() { return { data: { session: stored ? { user: { id: 'sdk-only' } } : null }, error: null }; }
    onAuthStateChange(callback) { const item = { callback, removed: false }; subscriptions.push(item); return { data: { subscription: { unsubscribe: () => { item.removed = true; } } } }; }
    signInWithPassword(...args) { return { forwarded: args }; }
  }
  _setAuthImportForTests(async () => { loads++; return { AuthClient: Real }; });
  const options = { storageKey: 'account', persistSession: true, storage: { probe: () => 'durable', getItem: async key => key === 'account' ? stored : null } };
  return { options, loads: () => loads, subscriptions };
}
test('anonymous reader receives an empty session without downloading Auth', async t => {
  const env = setup(t), client = new AuthClient(env.options), events = [];
  client.onAuthStateChange((...args) => events.push(args));
  assert.equal((await client.getSession()).data.session, null);
  assert.equal(env.loads(), 0); assert.deepEqual(events, [['INITIAL_SESSION', null]]);
});
test('any stored bytes defer identity to the SDK, never grant a cached role', async t => {
  const env = setup(t, 'malformed-or-forged'), client = new AuthClient(env.options);
  assert.deepEqual((await client.getSession()).data.session, { user: { id: 'sdk-only' } }); assert.equal(env.loads(), 1);
});
test('callback and login paths initialize the real SDK immediately', async t => {
  const env = setup(t, null, '/auth/callback'); const client = new AuthClient(env.options);
  await client.getSession(); assert.equal(env.loads(), 1);
});
test('explicit actions share one SDK and forward exact arguments', async t => {
  const env = setup(t), client = new AuthClient(env.options); await client.getSession();
  const args = { email: 'fixture@example.invalid', password: 'fixture-only' };
  const [a,b] = await Promise.all([client.signInWithPassword(args), client.signInWithPassword(args)]);
  assert.deepEqual(a, { forwarded: [args] }); assert.deepEqual(a,b); assert.equal(env.loads(),1);
});
test('cross-tab storage wakes the real SDK and transfers only active subscriptions', async t => {
  const env=setup(t),client=new AuthClient(env.options); await client.getSession();
  const removed=client.onAuthStateChange(()=>{});removed.data.subscription.unsubscribe();client.onAuthStateChange(()=>{});
  client.onStorage({key:'account'});await client.getSession();assert.equal(env.loads(),1);assert.equal(env.subscriptions.length,1);
});
test('storage uncertainty uses the SDK rather than assuming a guest', async t => {
  const env=setup(t);env.options.storage.getItem=()=>{throw Error('blocked');};
  await new AuthClient(env.options).getSession();assert.equal(env.loads(),1);
});
