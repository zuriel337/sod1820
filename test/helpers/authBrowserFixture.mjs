// Local fixture for the browser acceptance of authentication.
// One HTTPS server answers for the production origin (sod1820.co.il: the BUILT public-reading artifact, including the real
// sw.js) and for the Supabase origin (an in-memory GoTrue model). Chromium maps both host names to it, so the page, the real
// service worker and the real Supabase client run unmodified against the production URLs, and nothing leaves the machine.
import { createServer } from 'node:https';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuthServer } from './authContractHarness.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
export const dist = resolve(root, 'public-reading-deploy/dist');
const SUPABASE_HOST = 'linswmnnkjxvweumprav.supabase.co';
const TYPES = { '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

// Storage media for the transport regression (public-media-transport-2029.browser.mjs): real files from the repository and a
// generated PCM tone, answered with HTTP Range/206 exactly like Storage, under public, rendition and signed paths. Every storage
// request is logged, so a test can tell a native browser load from one the worker kept (and never forwarded).
function fixtureTone(seconds = 8, rate = 8000) {
  const samples = seconds * rate, wav = Buffer.alloc(44 + samples);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + samples, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples, 40);
  for (let i = 0; i < samples; i++) wav[44 + i] = 128 + Math.round(40 * Math.sin(2 * Math.PI * 440 * i / rate));
  return wav;
}
let storageFiles;
const fixtureStorageFile = name => {
  storageFiles ||= {
    'clip.mp4': { type: 'video/mp4', bytes: readFileSync(resolve(root, 'public/media/posts/2026-10-sprites-france/trend-is-your-friend.mp4')) },
    'tone.wav': { type: 'audio/wav', bytes: fixtureTone() },
    'poster.png': { type: 'image/png', bytes: readFileSync(resolve(root, 'public/crown-icon.png')) },
  };
  return storageFiles[name] || null;
};
function sendStorage(req, res, file, log) {
  const size = file.bytes.length, range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  // no-store: every visit (first load and reload) must really reach storage, so a native load is always visible in the log.
  const headers = { 'content-type': file.type, 'accept-ranges': 'bytes', 'access-control-allow-origin': '*', 'cache-control': 'no-store' };
  if (!range) { log.status = 200; res.writeHead(200, { ...headers, 'content-length': size }); return res.end(file.bytes); }
  let start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
  // At most 256 KiB per answer (valid for any range), so a seek always has to ask for a later range, as on a slow network.
  let end = Math.min(range[1] !== '' && range[2] !== '' ? Math.min(Number(range[2]), size - 1) : size - 1, start + 262143);
  if (!(start <= end && start < size)) { log.status = 416; res.writeHead(416, { ...headers, 'content-range': `bytes */${size}` }); return res.end(); }
  log.status = 206; log.start = start;
  res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
  return res.end(file.bytes.subarray(start, end + 1));
}

export async function startFixture({ authOptions, deploymentCsp = false, port: wantedPort = Number(process.env.FIXTURE_PORT || 0) } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'auth-fixture-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=sod1820.co.il',
    '-addext', `subjectAltName=DNS:sod1820.co.il,DNS:www.sod1820.co.il,DNS:${SUPABASE_HOST}`, '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem')], { stdio: 'ignore' });
  const template = readFileSync(resolve(root, 'public-reading-deploy/.generated/2029.html'), 'utf8');
  const goodWorker = readFileSync(resolve(dist, 'sw.js'), 'utf8');
  const csp = JSON.parse(readFileSync(resolve(root, 'public-reading-deploy/vercel.json'), 'utf8')).headers.flatMap(rule => rule.headers).find(header => header.key === 'Content-Security-Policy').value;
  const auth = createAuthServer(authOptions);
  const state = { worker: 'good', documents: 0, workerFetches: 0, consoleLog: [], storage: [], functions: [] };
  // A stale worker: still installs and activates, but answers the page handshake with another policy and denies Auth.
  const staleWorker = `self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('message',e=>{if(e.data?.type==='public-reading-policy'&&e.ports?.[0])e.ports[0].postMessage({policy:'public-reading-OLD',sourceSha:'0'.repeat(40)});});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/auth/v1/'))e.respondWith(new Response('{"error":"public_reading_auth_denied"}',{status:403,headers:{'content-type':'application/json'}}));});`;

  const server = createServer({ key: readFileSync(join(dir, 'k.pem')), cert: readFileSync(join(dir, 'c.pem')) }, async (req, res) => {
    const host = (req.headers.host || '').split(':')[0];
    const url = new URL(req.url, `https://${host}`);
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const send = (status, type, data, headers = {}) => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...headers }); res.end(data); };
    try {
      if (host === SUPABASE_HOST) {
        const cors = { 'access-control-allow-origin': 'https://sod1820.co.il', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': '*' };
        // The real meta-capi function answers CORS with Allow-Headers: content-type only; a request carrying apikey/Authorization fails the preflight.
        if (url.pathname === '/functions/v1/meta-capi') { cors['access-control-allow-origin'] = '*'; cors['access-control-allow-headers'] = 'content-type'; cors['access-control-allow-methods'] = 'POST, OPTIONS'; }
        if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
        // A provider round trip: the person "signs in" at Google/Facebook and Auth redirects back with a PKCE code bound to the request's challenge.
        if (url.pathname === '/auth/v1/authorize' && req.method === 'GET') {
          const provider = url.searchParams.get('provider') || 'google', back = new URL(url.searchParams.get('redirect_to') || 'https://sod1820.co.il/auth/callback');
          back.searchParams.set('code', auth.issueOAuthCode(`${provider}.person@example.invalid`, url.searchParams.get('code_challenge')));
          return send(302, 'text/plain', '', { location: back.toString() });
        }
        if (url.pathname.startsWith('/auth/v1/')) {
          const request = new Request(url, { method: req.method, headers: req.headers, ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { body }) });
          const response = await auth.handle(request);
          return send(response.status, 'application/json', await response.text(), cors);
        }
        // Edge-function calls that really reach the Supabase origin (the worker's denials never get here); answered as before (404).
        if (url.pathname.startsWith('/functions/v1/')) state.functions.push({ method: req.method, path: url.pathname, search: url.search, apikey: req.headers.apikey || null, authorization: req.headers.authorization || null, cookie: req.headers.cookie || null, body: body.toString('utf8') });
        const storage = /^\/storage\/v1\/(?:object\/(?:public|sign)|render\/image\/public)\/(?:media|gallery)\/fixture\/([a-z0-9.]+)$/.exec(url.pathname);
        if (storage && req.method === 'GET' && fixtureStorageFile(storage[1])) {
          const log = { path: url.pathname, search: url.search, range: req.headers.range || null };
          state.storage.push(log);
          return sendStorage(req, res, fixtureStorageFile(storage[1]), log);
        }
        return send(url.pathname.startsWith('/rest/v1/') ? 200 : 404, 'application/json', url.pathname.startsWith('/rest/v1/') ? '[]' : '{}', cors);
      }
      if (url.pathname === '/sw.js') { state.workerFetches++; return send(200, 'application/javascript', state.worker === 'good' ? goodWorker : staleWorker, { 'service-worker-allowed': '/' }); }
      if (/^\/(assets|fonts|brand|backgrounds|cards|cipher-cards)\//.test(url.pathname) || url.pathname === '/site.webmanifest' || url.pathname === '/favicon.ico') {
        const file = resolve(dist, '.' + url.pathname);
        if (!file.startsWith(dist + '/')) return send(400, 'text/plain', 'bad');
        try { return send(200, TYPES[extname(file)] || 'application/octet-stream', readFileSync(file), url.pathname.startsWith('/assets/') ? { 'cache-control': 'public, max-age=31536000, immutable' } : {}); }
        catch { return send(404, 'text/plain', 'missing'); }
      }
      if (url.pathname.startsWith('/api/')) return send(404, 'application/json', '{}');
      state.documents++;
      // Opt-in: serve documents with the deployment's real Content-Security-Policy (public-reading-deploy/vercel.json), as production does.
      const cspHeader = deploymentCsp ? { 'content-security-policy': csp } : {};
      return send(200, 'text/html; charset=utf-8', template.replace('loadEntry:entry=>import(entry)', 'loadEntry:entry=>import(entry),onFailure:error=>{window.__bootstrapFailure={name:error.name,message:error.message}}'), cspHeader);
    } catch (error) { return send(500, 'application/json', JSON.stringify({ error: String(error?.message || error) })); }
  });
  await new Promise(resolveListen => server.listen(wantedPort, '127.0.0.1', resolveListen));
  const port = server.address().port;
  return {
    auth, state, port, origin: 'https://sod1820.co.il',
    chromiumArgs: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', '--no-proxy-server',
      `--host-resolver-rules=MAP sod1820.co.il 127.0.0.1${port === 443 ? '' : ':' + port},MAP www.sod1820.co.il 127.0.0.1${port === 443 ? '' : ':' + port},MAP ${SUPABASE_HOST} 127.0.0.1${port === 443 ? '' : ':' + port},MAP * ~NOTFOUND,EXCLUDE 127.0.0.1`],
    // The sandbox's egress proxy variables would send even mapped hosts through a tunnel; the browser must go direct to the fixture.
    browserEnv: Object.fromEntries(Object.entries(process.env).filter(([key]) => !/proxy/i.test(key))),
    close: async () => { await new Promise(done => server.close(done)); rmSync(dir, { recursive: true, force: true }); },
  };
}
