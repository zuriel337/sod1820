import http from 'node:http';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/workspace/perf-execution-scratch/tools/node_modules/');
const { chromium } = require('playwright');
const srv = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/plain'); res.end('calibration'); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({ executablePath: '/home/agent/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const rows = [];
try {
  for (const rtt of [0, 150, 300]) {
    const c = await browser.newContext(); const p = await c.newPage();
    await p.route('**/*', route => route.request().resourceType() === 'document'
      ? route.fulfill({ body: '<body>Calibration</body>', contentType: 'text/html' })
      : route.request().url().startsWith(origin) ? route.continue()
      : route.fulfill({ body: '{}', contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } }));
    const d = await c.newCDPSession(p); await d.send('Network.enable');
    await d.send('Network.emulateNetworkConditions', { offline: false, latency: rtt, downloadThroughput: -1, uploadThroughput: -1 });
    await p.goto(origin);
    const samples = await p.evaluate(async () => {
      const samples = [];
      for (let i = 0; i < 5; i++) for (const transport of ['continued', 'fulfilled']) {
        const start = performance.now();
        await fetch(transport === 'continued' ? `/data?i=${i}` : `https://fixture.invalid/data?i=${i}`);
        samples.push({ transport, ms: performance.now() - start });
      } return samples;
    });
    rows.push({ rtt, samples }); await c.close();
  }
} finally { await browser.close(); srv.close(); }
fs.writeFileSync('docs/perf-causal-evidence-20261014/calibration.json', JSON.stringify({ purpose: 'Prove which requests CDP latency actually affects', rows }, null, 2) + '\n');
for (const row of rows) for (const transport of ['continued', 'fulfilled']) console.log(row.rtt, transport, row.samples.filter(s => s.transport === transport).map(s => s.ms));
