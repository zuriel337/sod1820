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

export async function startFixture({ authOptions, deploymentCsp = false, port: wantedPort = Number(process.env.FIXTURE_PORT || 0) } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'auth-fixture-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=sod1820.co.il',
    '-addext', `subjectAltName=DNS:sod1820.co.il,DNS:www.sod1820.co.il,DNS:${SUPABASE_HOST}`, '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem')], { stdio: 'ignore' });
  const template = readFileSync(resolve(root, 'public-reading-deploy/.generated/2029.html'), 'utf8');
  const goodWorker = readFileSync(resolve(dist, 'sw.js'), 'utf8');
  const csp = JSON.parse(readFileSync(resolve(root, 'public-reading-deploy/vercel.json'), 'utf8')).headers.flatMap(rule => rule.headers).find(header => header.key === 'Content-Security-Policy').value;
  const auth = createAuthServer(authOptions);
  const state = { worker: 'good', documents: 0, workerFetches: 0, consoleLog: [] };
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
