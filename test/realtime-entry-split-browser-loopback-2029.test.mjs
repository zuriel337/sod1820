import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLazyRealtimeClientClass2029 } from '../src/lib/realtimeLazy2029.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRequire = createRequire(join(root, 'package.json'));
const playwrightRoot = process.env.PLAYWRIGHT_DIR
  || '/workspace/private-perf-20261017/unified-tools/node_modules';
const chromiumPath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const browserAvailable = existsSync(join(playwrightRoot, 'playwright/package.json'))
  && existsSync(chromiumPath)
  && existsSync(join(root, 'node_modules/vite/package.json'));

function decodeClientMessage(raw) {
  if (typeof raw === 'string' || raw[0] === 0x5b) {
    const [joinRef, ref, topic, event, payload] = JSON.parse(String(raw));
    return { joinRef, ref, topic, event, payload };
  }

  const view = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  if (view[0] !== 3) throw new Error(`unexpected binary client message kind ${view[0]}`);
  const decoder = new TextDecoder();
  const joinRefSize = view[1];
  const refSize = view[2];
  const topicSize = view[3];
  const eventSize = view[4];
  const metadataSize = view[5];
  const encoding = view[6];
  let offset = 7;
  const take = (size) => {
    const value = decoder.decode(view.subarray(offset, offset + size));
    offset += size;
    return value;
  };
  const joinRef = take(joinRefSize);
  const ref = take(refSize);
  const topic = take(topicSize);
  const userEvent = take(eventSize);
  const metadata = take(metadataSize);
  const body = view.subarray(offset);
  const payload = encoding === 1 ? JSON.parse(decoder.decode(body)) : body.buffer.slice(0);
  return {
    joinRef,
    ref,
    topic,
    event: 'broadcast',
    payload: { type: 'broadcast', event: userEvent, payload, metadata },
  };
}

function encodeServerBroadcast(topic, event, payload) {
  const encoder = new TextEncoder();
  const topicBytes = encoder.encode(topic);
  const eventBytes = encoder.encode(event);
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  return Buffer.concat([
    Buffer.from([4, topicBytes.length, eventBytes.length, 0, 1]),
    Buffer.from(topicBytes),
    Buffer.from(eventBytes),
    Buffer.from(payloadBytes),
  ]);
}

async function createPhoenixLoopback() {
  const { WebSocketServer } = repoRequire('ws');
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  const messages = [];
  const sockets = new Set();
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('message', (raw) => {
      const message = decodeClientMessage(raw);
      messages.push(message);
      if (message.event === 'phx_join' || message.event === 'phx_leave' || message.event === 'heartbeat') {
        socket.send(JSON.stringify([
          message.joinRef,
          message.ref,
          message.topic,
          'phx_reply',
          { status: 'ok', response: {} },
        ]));
      } else if (message.event === 'broadcast') {
        socket.send(encodeServerBroadcast(
          message.topic,
          message.payload.event,
          message.payload.payload,
        ));
      }
    });
  });

  const port = server.address().port;
  return {
    endpoint: `ws://127.0.0.1:${port}/socket`,
    messages,
    async close() {
      for (const socket of sockets) socket.terminate();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function waitFor(predicate, timeout = 3_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (predicate()) resolve();
      else if (Date.now() - started > timeout) reject(new Error('timed out waiting for loopback event'));
      else setTimeout(check, 10);
    };
    check();
  });
}

test('installed Realtime 2.116 works through the subset against a loopback Phoenix socket', async (t) => {
  let actual;
  try {
    actual = repoRequire('@supabase/realtime-js');
  } catch {
    t.skip('installed SDK is unavailable in this checkout');
    return;
  }
  assert.equal(repoRequire('@supabase/realtime-js/package.json').version, '2.116.0');
  const loopback = await createPhoenixLoopback();
  const statuses = [];
  const received = [];

  try {
    let sessionToken = 'initial-token';
    const LazyClient = createLazyRealtimeClientClass2029(async () => actual);
    const client = new LazyClient(loopback.endpoint, {
      params: { apikey: 'loopback-anon' },
      transport: WebSocket,
      timeout: 2_000,
      disconnectOnEmptyChannelsAfterMs: 0,
      accessToken: async () => sessionToken,
    });
    await client.setAuth('initial-token');
    const channel = client.channel('site-joins')
      .on('broadcast', { event: 'join' }, ({ payload }) => received.push(payload));
    assert.equal(client.channel('site-joins'), channel, 'same-topic channel is reused');
    assert.equal(client.real, null, 'binding alone does not materialize the SDK');

    await new Promise((resolve, reject) => {
      channel.subscribe((status, error) => {
        statuses.push(status);
        if (status === 'SUBSCRIBED') resolve();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(error || new Error(status));
      });
    });
    assert.equal(client.real.constructor, actual.RealtimeClient);
    assert.equal(channel.subscribe(() => statuses.push('SECOND_SUBSCRIBE_CALLBACK')), channel);
    await client.setAuth('refreshed-token');
    sessionToken = null;
    await client.setAuth();
    assert.equal(await channel.send({ type: 'broadcast', event: 'join', payload: { source: 'loopback' } }), 'ok');
    await waitFor(() => received.length === 1);
    assert.deepEqual(received, [{ source: 'loopback' }]);

    assert.equal(await client.removeChannel(channel), 'ok');
    assert.deepEqual(client.getChannels(), []);
    assert.deepEqual(client.real.getChannels(), []);
    assert.ok(statuses.includes('SUBSCRIBED'));
    assert.ok(statuses.includes('CLOSED'));
    assert.equal(statuses.includes('SECOND_SUBSCRIBE_CALLBACK'), false);
    assert.equal(loopback.messages.filter((message) => message.event === 'phx_join').length, 1);
    assert.ok(loopback.messages.some((message) => message.event === 'broadcast'));
    assert.equal(
      loopback.messages.find((message) => message.event === 'phx_join')?.payload?.access_token,
      'initial-token',
    );
    assert.deepEqual(
      loopback.messages
        .filter((message) => message.event === 'access_token')
        .map((message) => message.payload.access_token),
      ['refreshed-token', null],
    );
    await client.disconnect();
  } finally {
    await loopback.close();
  }
});

async function createStaticServer(directory) {
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
  };
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    const requested = pathname === '/' ? '/index.html' : pathname;
    const path = join(directory, requested.replace(/^\/+/, ''));
    try {
      if (!statSync(path).isFile()) throw new Error('not a file');
      response.writeHead(200, { 'content-type': contentTypes[extname(path)] || 'application/octet-stream' });
      response.end(readFileSync(path));
    } catch {
      response.writeHead(404);
      response.end('not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('Vite browser build downloads installed SDK 2.116 on demand and completes loopback flow', {
  skip: !browserAvailable,
  timeout: 60_000,
}, async () => {
  const fixture = mkdtempSync(join(tmpdir(), 'sod-realtime-browser-'));
  const output = join(fixture, 'dist');
  const loopback = await createPhoenixLoopback();
  let staticServer;
  let browser;

  try {
    writeFileSync(join(fixture, 'index.html'), '<!doctype html><script type="module" src="/entry.js"></script>');
    writeFileSync(join(fixture, 'entry.js'), `
      import { createLazyRealtimeClientClass2029 } from ${JSON.stringify(pathToFileURL(join(root, 'src/lib/realtimeLazy2029.js')).href)};
      window.runRealtimeLoopback = async (endpoint) => {
        const statuses = [];
        const events = [];
        let sessionToken = 'browser-initial';
        const LazyClient = createLazyRealtimeClientClass2029();
        const client = new LazyClient(endpoint, {
          params: { apikey: 'browser-loopback-anon' },
          timeout: 2000,
          disconnectOnEmptyChannelsAfterMs: 0,
          accessToken: async () => sessionToken,
        });
        await client.setAuth('browser-initial');
        const channel = client.channel('site-joins')
          .on('broadcast', { event: 'join' }, ({ payload }) => events.push(payload));
        const result = {
          beforeLoaded: Boolean(client.real),
          duplicate: client.channel('site-joins') === channel,
        };
        await new Promise((resolve, reject) => {
          channel.subscribe((status, error) => {
            statuses.push(status);
            if (status === 'SUBSCRIBED') resolve();
            else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(error || new Error(status));
          });
        });
        await client.setAuth('browser-refreshed');
        sessionToken = null;
        await client.setAuth();
        result.send = await channel.send({
          type: 'broadcast',
          event: 'join',
          payload: { source: 'browser-build' },
        });
        const started = Date.now();
        while (events.length === 0 && Date.now() - started < 3000) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        result.afterLoaded = Boolean(client.real);
        result.events = events;
        result.removed = await client.removeChannel(channel);
        result.wrapperChannels = client.getChannels().length;
        result.realChannels = client.real.getChannels().length;
        result.statuses = statuses;
        await client.disconnect();
        return result;
      };
    `);

    const { build } = await import('vite');
    await build({
      root: fixture,
      configFile: false,
      logLevel: 'silent',
      build: {
        outDir: output,
        emptyOutDir: true,
        manifest: true,
      },
    });
    const manifest = JSON.parse(readFileSync(join(output, '.vite/manifest.json'), 'utf8'));
    const chunks = Object.values(manifest).filter((item) => item.file?.endsWith('.js'));
    const deferred = chunks.find((item) => /phx_join/.test(readFileSync(join(output, item.file), 'utf8')));
    assert.ok(deferred, 'the installed Realtime implementation is emitted as a browser chunk');

    staticServer = await createStaticServer(output);
    const { chromium } = repoRequire(join(playwrightRoot, 'playwright'));
    browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const requested = [];
    page.on('request', (request) => requested.push(request.url()));
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') await route.continue();
      else await route.abort();
    });
    await page.goto(staticServer.origin, { waitUntil: 'networkidle' });
    assert.equal(requested.some((url) => url.endsWith(`/${deferred.file}`)), false);

    const result = await page.evaluate((endpoint) => window.runRealtimeLoopback(endpoint), loopback.endpoint);
    assert.deepEqual(result, {
      beforeLoaded: false,
      duplicate: true,
      send: 'ok',
      afterLoaded: true,
      events: [{ source: 'browser-build' }],
      removed: 'ok',
      wrapperChannels: 0,
      realChannels: 0,
      statuses: ['SUBSCRIBED', 'CLOSED'],
    });
    assert.equal(requested.some((url) => url.endsWith(`/${deferred.file}`)), true);
    assert.ok(loopback.messages.some((message) => message.event === 'broadcast'));
    assert.equal(
      loopback.messages.find((message) => message.event === 'phx_join')?.payload?.access_token,
      'browser-initial',
    );
    assert.deepEqual(
      loopback.messages
        .filter((message) => message.event === 'access_token')
        .map((message) => message.payload.access_token),
      ['browser-refreshed', null],
    );
  } finally {
    if (browser) await browser.close();
    if (staticServer) await staticServer.close();
    await loopback.close();
    rmSync(fixture, { recursive: true, force: true });
  }
});
