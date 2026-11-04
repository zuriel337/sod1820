// OFFLINE harness: runs the REAL public gtag.js bytes inside jsdom with every network sink stubbed.
// Zero network I/O. Captures exactly what the real SDK would send, so it can be compared with the
// service-worker admission rules. Not live provider acceptance.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {JSDOM, VirtualConsole} = require('jsdom');
const {build} = require('esbuild');
const ROOT = process.env.SOD_ROOT || '/home/user/sod1820';
const SDK = process.env.SOD_REAL_SDK, OUT = process.env.SOD_LAB_OUT;
// Usage (no network): NODE_PATH=<repo>/node_modules SOD_REAL_SDK=<public gtag.js> SOD_LAB_OUT=<json> [SOD_RAW_OUT=<scratch json>] node real-sdk-offline-harness.cjs
// Requires: jsdom (npm i --no-save jsdom@26). The SDK file is the PUBLIC gtag.js for a fixture id; never commit its bytes.
const GA_ID = 'G-TEST12345', PAGE = process.env.SOD_PAGE || 'https://sod1820.co.il/number/1';

(async () => {
  const sdk = fs.readFileSync(SDK, 'utf8');
  const compiled = await build({stdin: {resolveDir: ROOT, contents: `import{initGA,trackPageview}from './src/lib/analytics.js';
initGA({publicReading:true,path:location.pathname});trackPageview(location.pathname,{publicReading:true});window.labReady=true;`},
    bundle: true, write: false, format: 'iife', platform: 'browser',
    define: {'import.meta.env': JSON.stringify({VITE_PUBLIC_READING_RELEASE: 'public-reading-20261101', VITE_GA_ID: GA_ID}), __SOD_2029_BUILD__: 'true', __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__: 'true'}});
  const captured = [], scripts = [];
  const vc = new VirtualConsole();
  const dom = new JSDOM('<!doctype html><html lang="he"><head><title>SOD1820</title></head><body></body></html>', {url: PAGE, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc});
  const w = dom.window;
  const rec = (via, url, method, body) => captured.push({via, url: String(url), method: method || 'GET', body: body == null ? null : (typeof body === 'string' ? body : String(body))});
  w.fetch = (u, o = {}) => { rec('fetch', u instanceof w.Request ? u.url : u, o.method, o.body); return Promise.resolve({ok: true, status: 204, text: async () => ''}); };
  const X = w.XMLHttpRequest.prototype, open = X.open, send = X.send;
  X.open = function (m, u) { this.__m = m; this.__u = u; };
  X.send = function (b) { rec('xhr', this.__u, this.__m, b); };
  w.navigator.sendBeacon = (u, d) => { rec('beacon', u, 'POST', d); return true; };
  Object.defineProperty(w.HTMLImageElement.prototype, 'src', {set(v) { rec('img', v, 'GET', null); }, get() { return ''; }});
  const origAppend = w.Node.prototype.appendChild;
  w.Node.prototype.appendChild = function (n) { if (n && n.tagName === 'SCRIPT' && n.src) { scripts.push(n.src.replace(/\?.*/, '?…')); return n; } return origAppend.call(this, n); };
  w.eval(compiled.outputFiles[0].text);           // app: initGA + trackPageview (queues dataLayer, appends gtag script tag -> intercepted)
  w.eval(sdk);                                    // REAL gtag.js now consumes the dataLayer
  await new Promise(r => setTimeout(r, 4000));
  w.document.dispatchEvent(new w.Event('visibilitychange'));
  Object.defineProperty(w.document, 'visibilityState', {value: 'hidden', configurable: true});
  w.document.dispatchEvent(new w.Event('visibilitychange')); w.dispatchEvent(new w.Event('pagehide'));
  await new Promise(r => setTimeout(r, 1500));

  const analyze = c => {
    let u; try { u = new URL(c.url, PAGE); } catch { return {raw: c.url.slice(0, 120)}; }
    const q = Object.fromEntries(u.searchParams);
    const bodyLines = c.body ? c.body.split(/\r?\n/) : [];
    return {__url: c.url, via: c.via, method: c.method, origin: u.origin, path: u.pathname, queryKeys: Object.keys(q).sort(),
      en: q.en, dl: q.dl, dt: q.dt, dr: q.dr, dp: q.dp, tid: q.tid, v: q.v,
      bodyLength: c.body ? c.body.length : 0, bodyHasNewline: /[\r\n]/.test(c.body || ''), bodyEventCount: bodyLines.filter(Boolean).length,
      bodyEn: bodyLines.map(l => (/(?:^|&)en=([^&]*)/.exec(l) || [])[1]).filter(Boolean),
      forbiddenKeysSeen: [...Object.keys(q), ...bodyLines.flatMap(l => [...new URLSearchParams(l).keys()])].filter(k => /^(?:uid|user_id|uip|up\.|upn\.|ep\.|epn\.)/.test(k))};
  };
  const all = captured.map(analyze);
  const collects = all.filter(a => /google-analytics\.com|analytics\.google\.com|doubleclick|google\.com/.test(a.origin || ''));
  const report = {
    scope: 'OFFLINE jsdom harness; REAL public gtag.js bytes; ALL network sinks stubbed; zero network I/O; NOT live provider acceptance',
    sdk: {bytes: Buffer.byteLength(sdk), sha256: crypto.createHash('sha256').update(sdk).digest('hex'), measurementIdUsed: GA_ID + ' (fixture)', providerCredentialsUsed: false},
    page: PAGE, appLabReady: !!w.labReady, scriptTagsAppendedBySdkOrApp: scripts,
    capturedRequestCount: captured.length,
    originsRequested: [...new Set(all.map(a => a.origin))],
    collectRequests: collects,
  };
  if (process.env.SOD_RAW_OUT) fs.writeFileSync(process.env.SOD_RAW_OUT, JSON.stringify({collectRequests: collects}, null, 2) + '\n'); // local scratch only, never commit
  for (const c of report.collectRequests) delete c.__url;
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
