// Lab server: serves the BUILT public-reading artifact of one worktree under the real origin names over HTTP/2 (so the page, the real service
// worker and the real Supabase client run unmodified) and REPLAYS everything else from a recorded cache. Nothing is ever sent to analytics,
// ad or pixel endpoints; reads of Supabase are recorded once (record-on-miss, through curl so the sandbox proxy is honoured) and replayed
// with identical content to every build under test. Production headers (Cache-Control, CSP, compression) are reproduced from
// public-reading-deploy/vercel.json.
import { createSecureServer } from 'node:http2';
import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import { brotliCompressSync, gzipSync, constants as Z } from 'node:zlib';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const SUPABASE_HOST = 'linswmnnkjxvweumprav.supabase.co';
const TYPES = { '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4' };
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|manifest\+json)|image\/svg|font\/ttf)/;
// Third-party hosts the page may reference. Scripts/styles/fonts/images are replayed from bytes recorded once with a plain GET; every
// beacon/ad/tracking request is answered 204 locally and never leaves the machine.
const THIRD_PARTY_HOSTS = ['www.googletagmanager.com', 'connect.facebook.net', 'www.facebook.com', 'pagead2.googlesyndication.com', 'www.google-analytics.com', 'analytics.google.com',
  'region1.google-analytics.com', 'stats.g.doubleclick.net', 'googleads.g.doubleclick.net', 'tpc.googlesyndication.com', 'ep1.adtrafficquality.google', 'fonts.googleapis.com', 'fonts.gstatic.com',
  'www.youtube.com', 'i.ytimg.com', 's.ytimg.com', 'www.google.com', 'd2ol7oe51mr4n9.cloudfront.net'];
const BEACON = /google-analytics\.com|analytics\.google\.com|doubleclick\.net|facebook\.com\/(tr|privacy)|adtrafficquality|googlesyndication\.com\/(pagead\/(ads|gen_204|viewthroughconversion|sodar|js\/th)|safeframe)|tpc\.googlesyndication\.com|googleads\.|\/g\/collect|\/j\/collect|\/pagead\/(ads|viewthroughconversion)|youtube\.com\/(api\/stats|youtubei)|\/generate_204/i;
const sha = s => createHash('sha1').update(s).digest('hex');
const FWD = ['accept', 'accept-profile', 'content-profile', 'content-type', 'prefer', 'range', 'range-unit', 'x-client-info'];

export async function startLabServer({ root, cacheDir, readRpc = [], docDelayFor = () => 800, supabaseExtraMs = 120, anon, port = 0, record = true, staticCacheControl = null, inject = {}, docCacheControl = null, trustCert = false } = {}) {
  const dist = resolve(root, 'public-reading-deploy/dist');
  const template = readFileSync(resolve(root, 'public-reading-deploy/.generated/2029.html'));
  const cfg = JSON.parse(readFileSync(resolve(root, 'public-reading-deploy/vercel.json'), 'utf8'));
  const baseHeaders = Object.fromEntries((cfg.headers.find(h => h.source === '/(.*)')?.headers || []).map(h => [h.key.toLowerCase(), h.value]));
  // Static files take the headers of the DEPLOYED rules (public-reading-deploy/vercel.json) of the tree under test, in file order (a later rule overrides an earlier one),
  // so a candidate that changes those rules is measured with its own rules. Vercel's path syntax: `(.*)` any suffix, `:name(a|b)` an alternation.
  const sourceToRegExp = src => new RegExp('^' + src.replace(/\(\.\*\)/g, '\u0001').replace(/:[A-Za-z_]+\(([^)]*)\)/g, '($1)').replace(/\./g, '\\.').replace(/\u0001/g, '.*') + '$');
  const staticRules = (cfg.headers || []).filter(r => r.source !== '/(.*)').map(r => ({ re: sourceToRegExp(r.source), headers: r.headers }));
  mkdirSync(cacheDir, { recursive: true });
  const dir = mkdtempSync(join(tmpdir(), 'lab-'));
  const hosts = ['sod1820.co.il', 'www.sod1820.co.il', SUPABASE_HOST, ...THIRD_PARTY_HOSTS];
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=sod1820.co.il', '-addext', 'subjectAltName=' + hosts.map(h => 'DNS:' + h).join(','),
    '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem')], { stdio: 'ignore' });
  const state = { documents: 0, supabase: [], thirdParty: [], misses: [], beacons: 0, static: 0 };
  const memo = new Map();   // compressed static bodies

  const send = (res, status, headers, body) => { const h = { ...headers }; res.writeHead(status, h); res.end(body); };
  const encode = (req, type, buf, level = 5) => {
    if (!COMPRESSIBLE.test(type) || buf.length < 256) return { buf, enc: null };
    const ae = String(req.headers['accept-encoding'] || '');
    const key = sha(type + buf.length + ae + level + buf.subarray(0, 64).toString('hex'));
    if (memo.has(key)) return memo.get(key);
    let out;
    if (/\bbr\b/.test(ae)) out = { buf: brotliCompressSync(buf, { params: { [Z.BROTLI_PARAM_QUALITY]: level } }), enc: 'br' };
    else if (/\bgzip\b/.test(ae)) out = { buf: gzipSync(buf, { level: 6 }), enc: 'gzip' };
    else out = { buf, enc: null };
    memo.set(key, out); return out;
  };
  const cors = (req, extra = {}) => ({ 'access-control-allow-origin': req.headers.origin || '*', 'access-control-allow-headers': req.headers['access-control-request-headers'] || '*', 'access-control-allow-methods': 'GET,POST,OPTIONS,HEAD',
    'access-control-expose-headers': 'content-range,content-profile,range-unit', vary: 'Origin', ...extra });
  const curlFetch = (method, url, headers, body) => {
    const hf = join(dir, 'h.txt'), bf = join(dir, 'b.bin'); const args = ['-sS', '-L', '--compressed', '-m', '40', '-X', method, '-D', hf, '-o', bf, '-w', '%{http_code}|%{time_starttransfer}', '-A', 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 SOD1820-Post-Speed-Audit/1.0'];
    for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`);
    if (body && body.length) { writeFileSync(join(dir, 'in.bin'), body); args.push('--data-binary', '@' + join(dir, 'in.bin')); }
    args.push(url);
    const w = execFileSync('curl', args, { encoding: 'utf8' }).split('|');
    const h = readFileSync(hf, 'utf8'); const ct = (h.match(/^content-type:\s*(.*)$/gim) || []).pop()?.split(':').slice(1).join(':').trim() || 'application/octet-stream';
    const cr = (h.match(/^content-range:\s*(.*)$/gim) || []).pop()?.split(':').slice(1).join(':').trim();
    return { status: Number(w[0]), serverMs: Math.round(Number(w[1]) * 1000), type: ct, contentRange: cr || null, body: readFileSync(bf) };
  };
  const replay = (key, doFetch) => {
    const meta = join(cacheDir, key + '.json'), bin = join(cacheDir, key + '.bin');
    if (existsSync(meta) && existsSync(bin)) return { ...JSON.parse(readFileSync(meta, 'utf8')), body: readFileSync(bin), hit: true };
    if (!record) { state.misses.push(key); return null; }
    const r = doFetch(); if (r.status >= 500 || r.status === 0) { state.misses.push(key + ':upstream' + r.status); return r; }
    writeFileSync(bin, r.body); writeFileSync(meta, JSON.stringify({ status: r.status, type: r.type, contentRange: r.contentRange, serverMs: r.serverMs })); return { ...r, hit: false };
  };

  const server = createSecureServer({ key: readFileSync(join(dir, 'k.pem')), cert: readFileSync(join(dir, 'c.pem')), allowHTTP1: true }, async (req, res) => {
    const host = String(req.headers[':authority'] || req.headers.host || '').split(':')[0];
    const url = new URL(req.url, `https://${host}`);
    const chunks = []; for await (const c of req) chunks.push(c); const body = Buffer.concat(chunks);
    try {
      if (host === SUPABASE_HOST) {
        if (req.method === 'OPTIONS') return send(res, 204, cors(req), '');
        await sleep(supabaseExtraMs);
        const p = url.pathname;
        const rpc = /^\/rest\/v1\/rpc\/([A-Za-z0-9_]+)/.exec(p);
        const readable = (req.method === 'GET' || req.method === 'HEAD') && (/^\/(rest\/v1|storage\/v1\/(object\/public|render\/image\/public))\//.test(p) && !rpc)
          || (rpc && readRpc.includes(rpc[1]));
        state.supabase.push({ m: req.method, p: p.slice(0, 80), q: url.search.slice(0, 60), ok: !!readable });
        if (p.startsWith('/auth/v1/')) return send(res, 401, cors(req, { 'content-type': 'application/json' }), '{"msg":"no session in lab"}');
        if (!readable) return send(res, 204, cors(req), '');
        const key = sha(req.method + ' ' + p + url.search + body.toString('utf8'));
        const hdr = { apikey: anon, authorization: 'Bearer ' + anon }; for (const k of FWD) if (req.headers[k]) hdr[k] = req.headers[k];
        const r = replay(key, () => curlFetch(req.method === 'HEAD' ? 'GET' : req.method, 'https://' + SUPABASE_HOST + p + url.search, hdr, body));
        if (!r) return send(res, 504, cors(req), 'lab cache miss');
        const enc = encode(req, r.type, r.body);
        const h = cors(req, { 'content-type': r.type, 'cache-control': /\/storage\//.test(p) ? 'public, max-age=3600' : 'no-store', ...(enc.enc ? { 'content-encoding': enc.enc } : {}), ...(r.contentRange ? { 'content-range': r.contentRange } : {}) });
        return send(res, r.status, h, req.method === 'HEAD' ? '' : enc.buf);
      }
      if (THIRD_PARTY_HOSTS.includes(host)) {
        const full = host + url.pathname + url.search;
        state.thirdParty.push({ m: req.method, u: full.slice(0, 110) });
        if (req.method === 'OPTIONS') return send(res, 204, cors(req), '');
        if (req.method !== 'GET' || BEACON.test(full)) { state.beacons++; return send(res, 204, cors(req), ''); }
        const key = sha('GET ' + host + url.pathname + url.search);
        const r = replay(key, () => curlFetch('GET', 'https://' + host + url.pathname + url.search, { accept: req.headers.accept || '*/*', 'accept-language': 'he-IL,he;q=0.9' }));
        if (!r || r.status >= 400) return send(res, 204, cors(req), '');
        const enc = encode(req, r.type, r.body);
        return send(res, r.status, cors(req, { 'content-type': r.type, 'cache-control': 'public, max-age=1800', ...(enc.enc ? { 'content-encoding': enc.enc } : {}) }), enc.buf);
      }
      // the production origin
      const decoded = decodeURIComponent(url.pathname);
      const file = resolve(dist, '.' + decoded);
      if (decoded !== '/' && file.startsWith(dist + '/') && existsSync(file) && statSync(file).isFile()) {
        state.static++;
        const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
        const raw = readFileSync(file); const enc = encode(req, type, raw, 2);   // brotli q2 reproduces Vercel's transfer sizes (entry 120.9 KB vs 121.2 KB live)
        const h = { ...baseHeaders, 'content-type': type, ...(enc.enc ? { 'content-encoding': enc.enc } : {}), etag: '"' + sha(file + raw.length) + '"' };
        if (staticCacheControl && !url.pathname.startsWith('/assets/') && !/^\/(sw\.js|preview-readonly-sw\.js|public-reading-sw\.js)$/.test(url.pathname)) h['cache-control'] = staticCacheControl;
        for (const rule of staticRules) if (rule.re.test(url.pathname)) for (const x of rule.headers) h[x.key.toLowerCase()] = x.value;
        if (url.pathname.startsWith('/assets/')) h['cache-control'] = 'public, max-age=31536000, immutable';
        if (/^\/(favicon\.ico|apple-touch-icon(-precomposed)?\.png)$/.test(url.pathname)) h['cache-control'] = 'public, max-age=86400';
        if (/^\/(sw\.js|preview-readonly-sw\.js|public-reading-sw\.js)$/.test(url.pathname)) h['service-worker-allowed'] = '/';
        return send(res, 200, h, enc.buf);
      }
      if (url.pathname.startsWith('/api/')) return send(res, 404, { 'content-type': 'application/json' }, '{}');
      // any other path is a document: no-store, dynamic (server think time modelled), production CSP
      state.documents++;
      const delay = docDelayFor(decoded); if (delay > 0) await sleep(delay);
      const extra = inject[decoded] || inject[url.pathname] || '';
      const html = extra ? Buffer.from(template.toString('utf8').replace('</head>', extra + '</head>')) : template;
      const enc = encode(req, 'text/html; charset=utf-8', html, 2);
      return send(res, 200, { ...baseHeaders, 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'index, follow', ...(docCacheControl ? { 'cache-control': docCacheControl } : {}), ...(enc.enc ? { 'content-encoding': enc.enc } : {}) }, enc.buf);
    } catch (e) { return send(res, 500, { 'content-type': 'application/json' }, JSON.stringify({ error: String(e.message || e).slice(0, 200) })); }
  });
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  const p = server.address().port;
  const map = hosts.map(h => `MAP ${h} 127.0.0.1:${p}`).join(',');
  const spki = execSync(`openssl x509 -in ${join(dir, 'c.pem')} -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl base64`, { encoding: 'utf8' }).trim();
  return { state, port: p, origin: 'https://sod1820.co.il',
    // Chromium never stores responses of a connection that has certificate errors in its HTTP cache, and `--ignore-certificate-errors` keeps the errors: with it every
    // repeat-visit measurement silently ran without the HTTP cache. `trustCert` accepts this server's own certificate by its public-key hash, which leaves no certificate error
    // (the HTTP cache then behaves as for a real site). Default stays as before so that earlier series remain comparable.
    chromiumArgs: ['--no-sandbox', '--disable-dev-shm-usage', trustCert ? `--ignore-certificate-errors-spki-list=${spki}` : '--ignore-certificate-errors', '--no-proxy-server', `--host-resolver-rules=${map}`],
    browserEnv: Object.fromEntries(Object.entries(process.env).filter(([k]) => !/proxy/i.test(k))),
    close: async () => { await new Promise(r => server.close(r)); rmSync(dir, { recursive: true, force: true }); } };
}
