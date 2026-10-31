// Read-only visual evidence: the Legacy calculator component rendered in isolation (its own route is
// site-flag gated for anonymous visitors). Public reads only; non-read requests are aborted.
// Usage: OUT_DIR=/path node test/legacy-calculator-evidence.browser.mjs
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.env.OUT_DIR || '/tmp/legacy-calculator'; await mkdir(out, { recursive: true });
const fixture = `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
  import{AuthProvider}from'/src/lib/AuthContext.jsx';import ResearchProvider from'/src/lib/research/ResearchProvider.jsx';
  import Calc from'/src/components/CanonicalGematriaCalculator.jsx';
  createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,null,React.createElement(AuthProvider,null,React.createElement(ResearchProvider,null,React.createElement('div',{style:{maxWidth:1100,margin:'0 auto',padding:12}},React.createElement(Calc,{seed:'דוד'}))))));`;
const server = await createServer({ configFile: false, root: process.cwd(), logLevel: 'error', server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**/preview-deploy/**', '**/dist/**'] } },
  plugins: [react(), { name: 'legacy-calc-fixture',
    configureServer(s) { s.middlewares.use(async (req, res, next) => { if (req.url?.split('?')[0] !== '/legacy-calc/') return next();
      res.setHeader('Content-Type', 'text/html');
      res.end(await s.transformIndexHtml(req.url, '<html dir="rtl" lang="he"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@font-face{font-family:\'Assistant\';src:local(Arial)}body{margin:0;background:#0c0818;color:#f5f0e8;font-family:Assistant,Arial,sans-serif}*{box-sizing:border-box}</style><div id="root"></div><script type="module" src="/legacy-calc.jsx"></script></html>')); }); },
    resolveId(id) { if (id === '/legacy-calc.jsx') return '\0legacy-calc.jsx'; }, load(id) { if (id === '\0legacy-calc.jsx') return fixture; } }] });
await server.listen();
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(proxy ? { proxy } : {}) });
const blocked = [];
try {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'he-IL', reducedMotion: 'reduce' });
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url());
      if (u.hostname === '127.0.0.1' || ['GET', 'HEAD', 'OPTIONS'].includes(q.method())) return r.continue();
      if (/\/rest\/v1\/rpc\/(gematria|fn_|lang_|number_|posts_by|world_group|rd_is)/.test(u.pathname)) return r.continue();
      blocked.push(q.method() + ' ' + u.pathname); return r.abort(); });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/legacy-calc/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);
    await page.screenshot({ path: `${out}/legacy-${width}.png`, fullPage: false });
    console.log(width, 'errors', JSON.stringify(errors.slice(0, 2)), 'height', await page.evaluate(() => document.body.scrollHeight));
    await ctx.close();
  }
  console.log('blocked', JSON.stringify([...new Set(blocked)]));
} finally { await browser.close(); await server.close(); }
