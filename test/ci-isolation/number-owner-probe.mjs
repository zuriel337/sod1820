// Deliberately swallowed requests through the exact Number beforeEach helper.
import http from 'node:http';
import { createRequire } from 'node:module';
import isolation from '../../scripts/ci-isolation/policy.cjs';
import scenario from '../../tests/number-owner-scenario.cjs';
const require = createRequire(`${process.env.PLAYWRIGHT_DIR}/node_modules/`);
const { chromium } = require('playwright');
const [kind, trap] = process.argv.slice(2);
const server = http.createServer((_, res) => res.end('<main>Number isolation control</main>'));
await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
const origin = isolation.permitLocalServer(server);
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME, args: isolation.browserArgs });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await scenario.installNumberOwnerScenario(context);
  const page = await context.newPage();
  await page.goto(origin);
  const api = 'https://linswmnnkjxvweumprav.supabase.co/rest/v1/';
  if (kind === 'replay') {
    const rows = await page.evaluate(url => fetch(url).then(r => r.json()), api + 'rpc/fn_owner_control');
    if (rows[0]?.value !== 376 || rows[0]?.phrase !== 'synthetic control') throw Error('Frozen response changed');
    const flags = await page.evaluate(url => fetch(url).then(r => r.json()), api + 'site_flags');
    if (flags.find(f => f.key === 'lock_number')?.enabled !== false) throw Error('Original Number flag scenario changed');
  } else {
    const [url, method] = kind === 'get' ? [trap + '/read', 'GET']
      : kind === 'rpc' ? [api + 'rpc/fn_unmapped_owner_probe', 'POST']
      : [trap + '/rest/v1/op_trace_roots', 'POST'];
    await page.evaluate(async ({ url, method }) => { await fetch(url, { method }).catch(() => {}); }, { url, method });
  }
  await context.close();
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
console.log('Number scenario child completed; swallowed I/O must still fail the parent');
