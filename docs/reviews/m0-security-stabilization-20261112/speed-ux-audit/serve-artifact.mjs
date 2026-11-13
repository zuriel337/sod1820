// AUDIT TOOL — serves a locally built public artifact the way the deployment serves it, for before/after comparisons.
// It is a measuring fixture, not a deployment and not a copy of the platform:
//   - an address that is a file of public-reading-deploy/dist is answered with that file and with the response headers that
//     public-reading-deploy/vercel.json ("headers") gives that address (later rules win per header, as on the platform);
//   - every other address is answered with the built document template (the metadata merge of the hosted function is not
//     reproduced; the document is the same shell for every address), Cache-Control: no-store, like the hosted function;
//   - --delay MS is added before every answer (a round-trip model), --doc-delay MS before the document only (a server-time model);
//   - --h2 serves HTTP/2 over TLS with the given self-signed certificate (the browser must be told to accept it), so that many
//     small files travel in parallel as they do from the real edge. Without it the server is HTTP/1.1 (six parallel requests).
//   - GET /__lab/stats returns what was served since the last GET /__lab/reset (count and bytes per cache policy).
// Usage: node serve-artifact.mjs --port 4190 [--root <repo root>] [--delay 0] [--doc-delay 0] [--h2 --key key.pem --cert cert.pem]
import { createServer } from 'node:http';
import { createSecureServer } from 'node:http2';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';

const arg = (name, fallback = null) => { const i = process.argv.indexOf('--' + name); return i > 0 ? (process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] == null ? true : process.argv[i + 1]) : fallback; };
const root = resolve(arg('root', fileURLToPath(new URL('../../../../', import.meta.url))));
const dist = resolve(root, 'public-reading-deploy/dist');
const template = readFileSync(resolve(root, 'public-reading-deploy/.generated/2029.html'));
const config = JSON.parse(readFileSync(resolve(root, 'public-reading-deploy/vercel.json'), 'utf8'));
const DELAY = Number(arg('delay', '0')), DOC_DELAY = Number(arg('doc-delay', '0')), PORT = Number(arg('port', '4190'));

// The subset of the platform's source syntax that the "headers" section of this configuration uses.
export function sourceToRegExp(source) {
  let out = '', i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '(') { let depth = 0, j = i; do { if (source[j] === '(') depth++; if (source[j] === ')') depth--; j++; } while (depth > 0 && j < source.length); out += source.slice(i, j); i = j; continue; }
    if (ch === ':') { const name = /^:[A-Za-z0-9_]+/.exec(source.slice(i))[0]; i += name.length;
      if (source[i] === '(') continue; if (source[i] === '*') { out += '(.*)'; i++; continue; } out += '([^/]+)'; continue; }
    out += /[.+?^${}|[\]\\]/.test(ch) ? '\\' + ch : ch; i++;
  }
  return new RegExp('^' + out + '$');
}
const rules = (config.headers || []).map((rule) => ({ test: sourceToRegExp(rule.source), headers: rule.headers }));
const headersFor = (path) => { const h = {}; for (const rule of rules) if (rule.test.test(path)) for (const { key, value } of rule.headers) h[key.toLowerCase()] = value; return h; };

const TYPES = { '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg' };
const COMPRESSIBLE = new Set(['.js', '.css', '.json', '.svg', '.html', '.ttf', '.txt', '.webmanifest']);
const compressed = new Map();
const br = (key, body) => { if (!compressed.has(key)) compressed.set(key, brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })); return compressed.get(key); };
let stats = {};
const count = (policy, bytes) => { const e = (stats[policy] ||= { requests: 0, bytes: 0 }); e.requests++; e.bytes += bytes; };
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost'); let path; try { path = decodeURIComponent(url.pathname); } catch { path = url.pathname; }
  const send = (status, headers, body) => { res.writeHead(status, headers); res.end(req.method === 'HEAD' ? undefined : body); };
  if (path === '/__lab/stats') return send(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }, JSON.stringify(stats));
  if (path === '/__lab/reset') { stats = {}; return send(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' }, 'reset'); }
  if (DELAY) await sleep(DELAY);
  const acceptsBr = /\bbr\b/.test(String(req.headers['accept-encoding'] || ''));
  const file = resolve(dist, '.' + path);
  if (file.startsWith(dist + '/') && existsSync(file) && statSync(file).isFile()) {
    const ext = extname(file); let body = readFileSync(file); const headers = { ...headersFor(url.pathname), 'content-type': TYPES[ext] || 'application/octet-stream' };
    if (acceptsBr && COMPRESSIBLE.has(ext)) { body = br(file, body); headers['content-encoding'] = 'br'; }
    count(headers['cache-control'] || '(none)', body.length);
    return send(200, headers, body);
  }
  if (path.startsWith('/assets/') || path.startsWith('/api/')) { count('miss', 0); return send(404, { 'content-type': 'text/plain', 'cache-control': 'no-store' }, 'not found'); }
  if (DOC_DELAY) await sleep(DOC_DELAY);
  let body = template; const headers = { ...headersFor(url.pathname), 'cache-control': 'no-store', 'content-type': 'text/html; charset=utf-8' };
  if (acceptsBr) { body = br('document', body); headers['content-encoding'] = 'br'; }
  count('document', body.length);
  return send(200, headers, body);
}
const guard = (req, res) => handle(req, res).catch(() => { try { res.writeHead(500); res.end('fixture unavailable'); } catch { /* closed */ } });
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = arg('h2') ? createSecureServer({ key: readFileSync(arg('key')), cert: readFileSync(arg('cert')), allowHTTP1: true }, guard) : createServer(guard);
  server.listen(PORT, '127.0.0.1', () => console.log(`serving ${dist} on ${arg('h2') ? 'https' : 'http'}://localhost:${PORT} (delay ${DELAY}ms, document +${DOC_DELAY}ms, ${arg('h2') ? 'HTTP/2' : 'HTTP/1.1'})`));
}
