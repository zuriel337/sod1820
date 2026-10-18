import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createLazyRealtimeClientClass2029 } from '../src/lib/realtimeLazy2029.js';

const root = new URL('..', import.meta.url).pathname;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeRuntime() {
  const state = { loads: 0, clients: [] };
  class FakeChannel {
    constructor(name, params) {
      this.name = name;
      this.params = params;
      this.topic = `realtime:${name}`;
      this.calls = [];
    }
    on(...args) { this.calls.push(['on', ...args]); return this; }
    subscribe(...args) { this.calls.push(['subscribe', ...args]); return this; }
    send(...args) { this.calls.push(['send', ...args]); return Promise.resolve('ok'); }
    track(...args) { this.calls.push(['track', ...args]); return Promise.resolve('ok'); }
    untrack(...args) { this.calls.push(['untrack', ...args]); return Promise.resolve('ok'); }
    presenceState() { return { joined: true }; }
    unsubscribe(...args) { this.calls.push(['unsubscribe', ...args]); return Promise.resolve('ok'); }
  }
  class FakeRealtimeClient {
    constructor(endpoint, options) {
      this.endpoint = endpoint;
      this.options = options;
      this.channels = [];
      this.auth = [];
      state.clients.push(this);
    }
    channel(name, params) {
      const existing = this.channels.find((channel) => channel.name === name);
      if (existing) return existing;
      const channel = new FakeChannel(name, params);
      this.channels.push(channel);
      return channel;
    }
    setAuth(token) { this.auth.push(token); return Promise.resolve(); }
    removeChannel(channel) {
      this.channels = this.channels.filter((item) => item !== channel);
      return channel.unsubscribe();
    }
    connect() { this.connected = true; }
    disconnect() { this.connected = false; return Promise.resolve('ok'); }
  }
  const load = async () => { state.loads += 1; return { RealtimeClient: FakeRealtimeClient }; };
  return { state, load };
}

test('construction and auth events do not load Realtime or create a second Auth client', async () => {
  const { state, load } = fakeRuntime();
  const accessToken = async () => 'session-token';
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { accessToken, params: { apikey: 'anon' } });

  await client.setAuth('initial-session');
  await client.setAuth('refreshed-session');
  assert.equal(state.loads, 0);
  assert.equal(state.clients.length, 0);
  assert.deepEqual(client.getChannels(), []);

  const channel = client.channel('site-joins');
  assert.equal(state.loads, 0, 'declaring a channel is still side-effect free');
  channel.on('broadcast', { event: 'join' }, () => {}).subscribe();
  await settle();

  assert.equal(state.loads, 1);
  assert.equal(state.clients.length, 1);
  assert.equal(state.clients[0].options.accessToken, accessToken, 'the existing Supabase Auth token callback is preserved');
  assert.deepEqual(state.clients[0].auth, ['refreshed-session'], 'only the latest pre-load token is applied');
});

test('one lazy client replays channel bindings before subscribe and is shared by all actions', async () => {
  const { state, load } = fakeRuntime();
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });
  const handler = () => {};
  const status = () => {};
  const channel = client.channel('site-joins', { config: { private: false } });

  assert.equal(client.channel('site-joins'), channel, 'matching topics retain Supabase channel de-duplication');
  assert.equal(channel.on('broadcast', { event: 'join' }, handler).subscribe(status), channel);
  await settle();

  const real = state.clients[0].channels[0];
  assert.equal(state.loads, 1);
  assert.equal(real.calls[0][0], 'on');
  assert.equal(real.calls[1][0], 'subscribe');
  assert.equal(real.calls[0][3], handler);
  assert.equal(real.calls[1][1], status);

  const lateHandler = () => {};
  channel.on('broadcast', { event: 'late' }, lateHandler);
  assert.equal(real.calls[2][3], lateHandler, 'bindings added after subscribe are forwarded');

  await channel.send({ type: 'broadcast' });
  await channel.track({ online: true });
  await channel.untrack();
  assert.deepEqual(real.calls.slice(3).map((call) => call[0]), ['send', 'track', 'untrack']);
  assert.equal(state.loads, 1, 'all channels/actions share one actual Realtime client');
});

test('login, refresh and logout tokens continue to the loaded Realtime client', async () => {
  const { state, load } = fakeRuntime();
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });

  await client.setAuth('initial-session');
  client.channel('site-joins').subscribe();
  await settle();
  await client.setAuth('signed-in');
  await client.setAuth('token-refreshed');
  await client.setAuth();

  assert.deepEqual(state.clients[0].auth, [
    'initial-session',
    'signed-in',
    'token-refreshed',
    null,
  ]);
});

test('removing an unused channel does not download Realtime; subscribed cleanup is forwarded', async () => {
  const { state, load } = fakeRuntime();
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });

  const unused = client.channel('unused');
  assert.equal(await client.removeChannel(unused), 'ok');
  assert.equal(state.loads, 0);

  const active = client.channel('active').subscribe();
  await settle();
  assert.equal(await client.removeChannel(active), 'ok');
  assert.equal(state.loads, 1);
  assert.deepEqual(client.getChannels(), []);

  await client.removeAllChannels();
  assert.equal(state.clients[0].connected, false, 'removeAllChannels retains the real client disconnect contract');
});

test('Vite aliases Realtime only for 2029 and keeps the actual module behind a dynamic import', () => {
  const vite = readFileSync(join(root, 'vite.config.js'), 'utf8');
  const adapter = readFileSync(join(root, 'src/lib/realtimeLazy2029.js'), 'utf8');
  assert.match(vite, /resolve:\s*is2029\s*\?/);
  assert.match(vite, /find:\s*\/\^@supabase\\\/realtime-js\$\//);
  assert.match(adapter, /import\('@supabase\/realtime-js\/dist\/module\/index\.js'\)/);
  assert.doesNotMatch(readFileSync(join(root, 'src/lib/supabase.js'), 'utf8'), /createLazyRealtimeClientClass2029/);
});

test('built 2029 entry excludes the deferred Realtime/Phoenix chunk', { skip: !existsSync(join(root, 'dist/.vite/manifest.json')) }, () => {
  const manifest = JSON.parse(readFileSync(join(root, 'dist/.vite/manifest.json'), 'utf8'));
  const entryKey = Object.keys(manifest).find((key) => key === '2029.html' || manifest[key].src === '2029.html');
  const seen = new Set();
  const queue = [entryKey];
  while (queue.length) {
    const key = queue.shift();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    queue.push(...(manifest[key].imports || []));
  }
  const staticFiles = [...seen].map((key) => manifest[key].file).filter(Boolean);
  const staticText = staticFiles.filter((file) => file.endsWith('.js'))
    .map((file) => readFileSync(join(root, 'dist', file), 'utf8')).join('\n');
  assert.doesNotMatch(staticText, /Phoenix|phx_join|postgres_changes/);

  const deferred = Object.values(manifest).filter((item) => item.file?.endsWith('.js') && !staticFiles.includes(item.file))
    .map((item) => ({ file: item.file, text: readFileSync(join(root, 'dist', item.file), 'utf8') }))
    .find((item) => /phx_join/.test(item.text) && /postgres_changes/.test(item.text));
  assert.ok(deferred, 'the real Realtime/Phoenix implementation remains available as an on-demand chunk');
  const deferredGzip = gzipSync(readFileSync(join(root, 'dist', deferred.file)), { level: 9 }).length;
  assert.ok(deferredGzip > 10_000 && deferredGzip < 25_000, `unexpected deferred Realtime gzip size: ${deferredGzip}`);
});
