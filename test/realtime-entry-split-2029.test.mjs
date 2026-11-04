import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  createLazyRealtimeClientClass2029,
  LAZY_REALTIME_2029_CONTRACT,
  RealtimeClient,
} from '../src/lib/realtimeLazy2029.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fakeRuntime({ gate = null, failures = 0 } = {}) {
  const state = {
    loads: 0,
    clients: [],
    order: [],
    failures,
  };

  class FakeChannel {
    constructor(name, params) {
      this.name = name;
      this.params = params;
      this.topic = `realtime:${name}`;
      this.calls = [];
    }
    record(method, args) {
      this.calls.push([method, ...args]);
      state.order.push(`channel:${this.name}:${method}`);
    }
    on(...args) { this.record('on', args); return this; }
    subscribe(...args) { this.record('subscribe', args); return this; }
    send(...args) { this.record('send', args); return Promise.resolve('ok'); }
    track(...args) { this.record('track', args); return Promise.resolve('ok'); }
    untrack(...args) { this.record('untrack', args); return Promise.resolve('ok'); }
    presenceState() { return { joined: true }; }
    unsubscribe(...args) { this.record('unsubscribe', args); return Promise.resolve('ok'); }
  }

  class FakeRealtimeClient {
    constructor(endpoint, options) {
      this.endpoint = endpoint;
      this.options = options;
      this.channels = [];
      this.auth = [];
      this.connects = 0;
      this.disconnects = 0;
      state.clients.push(this);
    }
    channel(name, params) {
      const existing = this.channels.find((channel) => channel.name === name);
      if (existing) return existing;
      const channel = new FakeChannel(name, params);
      this.channels.push(channel);
      state.order.push(`client:channel:${name}`);
      return channel;
    }
    setAuth(token) {
      this.auth.push(token);
      state.order.push(`client:auth:${String(token)}`);
      return Promise.resolve();
    }
    removeChannel(channel) {
      state.order.push(`client:remove:${channel.name}`);
      this.channels = this.channels.filter((item) => item !== channel);
      return channel.unsubscribe();
    }
    connect() {
      this.connects += 1;
      this.connected = true;
      state.order.push('client:connect');
    }
    disconnect() {
      this.disconnects += 1;
      this.connected = false;
      state.order.push('client:disconnect');
      return Promise.resolve('ok');
    }
  }

  const load = async () => {
    state.loads += 1;
    if (gate) await gate.promise;
    if (state.failures > 0) {
      state.failures -= 1;
      throw new Error('synthetic module failure');
    }
    return { RealtimeClient: FakeRealtimeClient };
  };
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

test('pending calls retain source order, including a broadcast binding after subscribe', async () => {
  const gate = deferred();
  const { state, load } = fakeRuntime({ gate });
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });
  const channel = client.channel('site-joins', { config: { private: false } });

  channel.on('broadcast', { event: 'early' }, () => {}).subscribe(() => {});
  channel.on('broadcast', { event: 'late' }, () => {});
  const sent = channel.send({ type: 'broadcast', event: 'join' });
  assert.throws(
    () => channel.on('presence', { event: 'sync' }, () => {}),
    /cannot add `presence` callbacks.*after `subscribe\(\)`/,
  );
  assert.throws(
    () => channel.on('postgres_changes', { event: '*', schema: 'public' }, () => {}),
    /cannot add `postgres_changes` callbacks.*after `subscribe\(\)`/,
  );

  gate.resolve();
  assert.equal(await sent, 'ok');
  const real = state.clients[0].channels[0];
  assert.deepEqual(real.calls.map((call) => call[0]), ['on', 'subscribe', 'on', 'send']);
  assert.equal(state.loads, 1);
});

test('one lazy client de-duplicates topics and forwards supported channel actions', async () => {
  const { state, load } = fakeRuntime();
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });
  const channel = client.channel('site-presence');

  assert.equal(client.channel('site-presence'), channel);
  channel.on('presence', { event: 'sync' }, () => {}).subscribe();
  await settle();
  assert.deepEqual(channel.presenceState(), { joined: true });
  await channel.track({ online: true });
  await channel.untrack();
  assert.deepEqual(state.clients[0].channels[0].calls.map((call) => call[0]), [
    'on',
    'subscribe',
    'track',
    'untrack',
  ]);
  assert.equal(channel.subscribe(), channel, 'repeat subscribe is the installed SDK 2.116 no-op');
  assert.equal(
    state.clients[0].channels[0].calls.filter((call) => call[0] === 'subscribe').length,
    1,
  );
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

test('connect followed by disconnect while loading cannot reconnect after cleanup', async () => {
  const gate = deferred();
  const { state, load } = fakeRuntime({ gate });
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });

  const connecting = client.connect();
  const disconnecting = client.disconnect(1000, 'test cleanup');
  gate.resolve();
  assert.equal(await connecting, 'ok');
  assert.equal(await disconnecting, 'ok');
  assert.equal(state.clients[0].connects, 0, 'the stale pending connect is cancelled');
  assert.equal(state.clients[0].disconnects, 1, 'cleanup runs after materialization');
  assert.equal(state.clients[0].connected, false);
});

test('removeAllChannels serializes pending subscription cleanup and cancels connect', async () => {
  const gate = deferred();
  const { state, load } = fakeRuntime({ gate });
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });

  const connecting = client.connect();
  client.channel('site-joins').on('broadcast', { event: 'join' }, () => {}).subscribe();
  const removing = client.removeAllChannels();
  gate.resolve();

  assert.equal(await connecting, 'ok');
  assert.deepEqual(await removing, ['ok']);
  assert.deepEqual(client.getChannels(), []);
  assert.equal(state.clients[0].connects, 0);
  assert.equal(state.clients[0].disconnects, 1);
  assert.deepEqual(state.clients[0].channels, []);
  assert.deepEqual(
    state.order.filter((entry) => entry.includes('site-joins')),
    [
      'client:channel:site-joins',
      'channel:site-joins:on',
      'channel:site-joins:subscribe',
      'client:remove:site-joins',
      'channel:site-joins:unsubscribe',
    ],
  );
});

test('failed materialization reports CHANNEL_ERROR and an explicit retry rebuilds safely', async () => {
  const { state, load } = fakeRuntime({ failures: 1 });
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });
  const statuses = [];
  const channel = client.channel('retry');

  channel.on('broadcast', { event: 'join' }, () => {}).subscribe((status, error) => {
    statuses.push([status, error?.message]);
  });
  await settle();
  assert.deepEqual(statuses, [['CHANNEL_ERROR', 'synthetic module failure']]);
  assert.equal(state.loads, 1);

  channel.subscribe((status) => statuses.push([status]));
  await settle();
  assert.equal(state.loads, 2);
  assert.deepEqual(state.clients[0].channels[0].calls.map((call) => call[0]), ['on', 'subscribe']);
});

test('failed action rejects once and is not replayed on a later materialization', async () => {
  const { state, load } = fakeRuntime({ failures: 1 });
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });
  const channel = client.channel('retry-action');

  await assert.rejects(channel.send({ type: 'broadcast' }), /synthetic module failure/);
  channel.subscribe();
  await settle();
  assert.deepEqual(state.clients[0].channels[0].calls.map((call) => call[0]), ['subscribe']);
});

test('removing an unused channel does not download Realtime; subscribed cleanup is forwarded', async () => {
  const { state, load } = fakeRuntime();
  const LazyClient = createLazyRealtimeClientClass2029(load);
  const client = new LazyClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });

  const unused = client.channel('unused').on('broadcast', { event: 'unused' }, () => {});
  assert.equal(await client.removeChannel(unused), 'ok');
  assert.equal(state.loads, 0);

  const active = client.channel('active').subscribe();
  await settle();
  assert.equal(await client.removeChannel(active), 'ok');
  assert.equal(state.loads, 1);
  assert.deepEqual(client.getChannels(), []);
});

test('the current joinEvents broadcast/listener path stays inside the tested subset and cleans up', () => {
  const source = readFileSync(join(root, 'src/lib/joinEvents.js'), 'utf8');
  assert.match(source, /ch\.subscribe\(\(status\)\s*=>\s*\{/);
  assert.match(source, /status\s*!==\s*["']SUBSCRIBED["']/);
  assert.match(source, /ch\.send\(\{\s*type:\s*["']broadcast["'],\s*event:\s*["']join["']/s);
  assert.match(source, /setTimeout\(\(\)\s*=>\s*\{[^}]*supabase\.removeChannel\(ch\)/s);
  assert.match(source, /\.on\(["']broadcast["'],\s*\{\s*event:\s*["']join["']/s);
  assert.match(source, /return\s*\(\)\s*=>\s*\{[^}]*supabase\.removeChannel\(ch\)/s);
});

function walkCodeFiles(path, output = []) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (['.git', 'dist', 'docs', 'node_modules'].includes(entry.name)) continue;
    const full = join(path, entry.name);
    if (entry.isDirectory()) walkCodeFiles(full, output);
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) output.push(full);
  }
  return output;
}

function matchingParen(source, open) {
  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`unbalanced call at offset ${open}`);
}

function channelChainMethods(source, channelOffset) {
  let open = source.indexOf('(', channelOffset);
  let cursor = matchingParen(source, open) + 1;
  const methods = [];
  for (;;) {
    while (/\s/.test(source[cursor] || '')) cursor += 1;
    if (source[cursor] !== '.') break;
    const match = source.slice(cursor + 1).match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
    if (!match) break;
    const method = match[1];
    open = source.indexOf('(', cursor + 1 + match[0].indexOf('('));
    methods.push(method);
    cursor = matchingParen(source, open) + 1;
  }
  return methods;
}

test('repository use is mechanically bounded to the explicit browser-only subset', () => {
  assert.equal(LAZY_REALTIME_2029_CONTRACT.runtime, 'browser-vite-only');
  assert.deepEqual([...LAZY_REALTIME_2029_CONTRACT.channelMethods], [
    'on', 'subscribe', 'send', 'track', 'untrack', 'presenceState', 'unsubscribe',
  ]);

  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  assert.equal(lock.packages['node_modules/@supabase/realtime-js'].version, '2.116.0');
  assert.equal(lock.packages['node_modules/@supabase/supabase-js'].version, '2.116.0');

  const files = walkCodeFiles(root);
  const adapterPath = join(root, 'src/lib/realtimeLazy2029.js');
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (file !== adapterPath) {
      assert.doesNotMatch(
        source,
        /(?:from\s*|import\s*\(|require\s*\()\s*['"]@supabase\/realtime-js(?:\/[^'"]*)?['"]/,
        `${relative(root, file)} must not import the partial aliased Realtime export surface`,
      );
    }
    assert.doesNotMatch(
      source,
      /(?:import\s*\(|require\s*\()\s*['"]@supabase\/supabase-js['"]\s*\)?/,
      `${relative(root, file)} must use the statically checked createClient import`,
    );
    assert.doesNotMatch(
      source,
      /export\s+(?:\*|\{[^}]*\})\s+from\s*['"]@supabase\/supabase-js['"]/s,
      `${relative(root, file)} must not re-export the SDK's aliased Realtime surface`,
    );
    for (const match of source.matchAll(/import\s+([^;]+?)\s+from\s*['"]@supabase\/supabase-js['"]/gs)) {
      const normalized = match[1].replace(/\s+/g, ' ').trim();
      assert.match(
        normalized,
        /^\{\s*createClient\s*\}$/,
        `${relative(root, file)} imports an unsupported Supabase/Realtime runtime export: ${normalized}`,
      );
    }
  }

  const expectedConsumers = new Map([
    ['src/lib/joinEvents.js', 2],
    ['src/lib/presence.js', 1],
    ['src/lib/supabase.js', 2],
    ['src/pages/AdminPage.jsx', 1],
  ]);
  const actualConsumers = new Map();
  const allowedMethods = new Set(LAZY_REALTIME_2029_CONTRACT.channelMethods);
  for (const file of walkCodeFiles(join(root, 'src'))) {
    if (file === adapterPath) continue;
    const source = readFileSync(file, 'utf8');
    const relativePath = relative(root, file);
    assert.doesNotMatch(
      source,
      /\bsupabase\s*(?:\.\s*realtime\b|\[\s*['"]realtime['"]\s*\])|\{\s*realtime\s*\}\s*=\s*supabase/,
      `${relativePath} bypasses the supported Supabase client methods`,
    );

    const offsets = [...source.matchAll(/\.\s*channel\s*\(/g)].map((match) => match.index);
    if (offsets.length > 0) actualConsumers.set(relativePath, offsets.length);
    for (const offset of offsets) {
      for (const method of channelChainMethods(source, offset)) {
        assert.ok(allowedMethods.has(method), `${relativePath} chains unsupported channel.${method}()`);
      }
    }

    const assigned = new Set(
      [...source.matchAll(/(?:\b(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*=\s*supabase\s*\.\s*channel\s*\(/g)]
        .map((match) => match[1]),
    );
    for (const variable of assigned) {
      const memberCalls = new RegExp(`\\b${variable}\\s*\\.\\s*([A-Za-z_$][\\w$]*)\\s*\\(`, 'g');
      for (const match of source.matchAll(memberCalls)) {
        assert.ok(allowedMethods.has(match[1]), `${relativePath} calls unsupported ${variable}.${match[1]}()`);
      }
    }
  }
  assert.deepEqual([...actualConsumers.entries()].sort(), [...expectedConsumers.entries()].sort());
});

test('native Node/SSR materialization fails at the explicit browser boundary and can retry', async () => {
  const client = new RealtimeClient('wss://example.test/realtime/v1', { params: { apikey: 'anon' } });
  await assert.rejects(
    client.connect(),
    (error) => error?.code === 'SOD_2029_REALTIME_BROWSER_ONLY'
      && /Vite browser build/.test(error.message),
  );
  assert.equal(client.real, null);
  assert.equal(client.realPromise, null, 'a failed boundary check does not poison later explicit retries');
  await assert.rejects(client.connect(), { code: 'SOD_2029_REALTIME_BROWSER_ONLY' });
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
  assert.doesNotMatch(staticText, /phx_join/, 'the Phoenix transport must stay outside the static entry');

  const deferredChunk = Object.values(manifest)
    .filter((item) => item.file?.endsWith('.js') && !staticFiles.includes(item.file))
    .map((item) => ({ file: item.file, text: readFileSync(join(root, 'dist', item.file), 'utf8') }))
    .find((item) => /phx_join/.test(item.text) && /postgres_changes/.test(item.text));
  assert.ok(deferredChunk, 'the real Realtime/Phoenix implementation remains available on demand');
  const deferredGzip = gzipSync(readFileSync(join(root, 'dist', deferredChunk.file)), { level: 9 }).length;
  assert.ok(deferredGzip > 10_000 && deferredGzip < 25_000, `unexpected deferred Realtime gzip size: ${deferredGzip}`);
});
