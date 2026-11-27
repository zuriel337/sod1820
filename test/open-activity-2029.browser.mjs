import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
// Real Chromium acceptance for the cumulative open-activity section on /stats: synthetic data only, no network, no live URL.
const playwright = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const chromium = playwright.chromium || playwright.default.chromium;
const dir = mkdtempSync(join(tmpdir(), 'sod-open-activity-'));
const shots = process.env.OPEN_ACTIVITY_SCREENSHOTS || join(dir, 'screenshots'); mkdirSync(shots, { recursive: true });
const source = `
import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';
import Section from './src/components/experience2029/OpenActivity2029.jsx';
import './src/pages/stats2029.css';
createRoot(document.getElementById('root')).render(<MemoryRouter><main className="stats29" dir="rtl" style={{maxWidth:1100,margin:'auto',padding:12,color:'#f6eddc'}}><h1>סטטיסטיקה</h1><Section/></main></MemoryRouter>);
`;
const numbers = Array.from({ length: 60 }, (_, i) => ({ href: '/number/' + (100 + i), n: 100 + i, opens: i === 3 ? 2 : 1, tier: 'seen' }));
const fixture = {
  version: 1, state: 'measured', window: 'week', from: '2026-11-20', to: '2026-11-26',
  families: {
    number: { items: 63, opens: 75, list: [{ href: '/number/1820', n: 1820, opens: 14, tier: 'popular' }, ...numbers] },
    post: { items: 3, opens: 20, list: [{ href: '/post/a', title: 'פוסט פופולרי', opens: 12, tier: 'popular' }, { href: '/post/b', title: 'פוסט שנפתח פעם אחת', opens: 1, tier: 'seen' }, { href: '/post/c', title: 'עוד פוסט', opens: 1, tier: 'seen' }] },
    topic: { items: 1, opens: 1, list: [{ href: '/tag/תג-א', label: 'תג א', opens: 1, tier: 'seen' }] },
    video: { items: 1, opens: 1, list: [{ href: '/video/0123456789abcdef0123456789abcdef', opens: 1, tier: 'seen' }] },
  },
  unknown: { post: { items: 40, opens: 60 } }, machines: { served: 1234 }, not_measured_by_item: ['topic_card'],
};
await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, outfile: join(dir, 'app.js'), format: 'esm',
  loader: { '.woff2': 'file', '.woff': 'file', '.ttf': 'file', '.svg': 'file', '.png': 'file', '.webp': 'file' },
  plugins: [{ name: 'offline', setup(b) {
    b.onLoad({ filter: /\/supabase\.js$/ }, () => ({ contents: 'export const supabase={rpc:async(name,args)=>{window.calls.push([name,args.p_window]);await new Promise(r=>setTimeout(r,60));if(window.__fail)return{data:null,error:{code:"PGRST202"}};if(window.__insufficient||args.p_window==="day")return{data:{version:1,state:"insufficient",window:args.p_window,families:{}},error:null};return{data:window.__fixture,error:null}}};' }));
  } }] });
writeFileSync(join(dir, 'index.html'), '<!doctype html><html lang="he" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body style="margin:0;background:#17130f"><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
const server = createServer((req, res) => { try { const p = req.url === '/' ? 'index.html' : req.url.slice(1); res.setHeader('content-type', p.endsWith('.js') ? 'application/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html'); res.end(readFileSync(join(dir, p))); } catch { res.statusCode = 404; res.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : { args: ['--no-sandbox'] });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(f => { window.calls = []; window.__fixture = f; }, fixture);
    await page.route('**/*', r => r.request().url().startsWith(origin) ? r.continue() : r.abort());
    await page.goto(origin);
    await page.getByRole('heading', { name: /פעילות מצטברת/ }).waitFor();
    await page.getByText('נפתחו, גם פעם אחת').first().waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
    // Activity and popularity are separate lists with their own captions.
    assert.equal(await page.getByText('פופולריים: נפתחו 10 פעמים לפחות מ־5 ביקורים לפחות').count(), 2);
    // Dense rows: a one-open chip is as wide as its text, never a full-width row.
    const chip = await page.locator('.stats29-open-chips li').nth(5).boundingBox(); const wrap = await page.locator('.stats29-open-chips').nth(1).boundingBox();
    assert.ok(chip.width < wrap.width / 2, 'a chip does not stretch across the row'); assert.ok(chip.height <= 64, 'a chip stays thin');
    // "Show more": 24 at first, then 24 more.
    const count = () => page.locator('.stats29-open-family').first().locator('ul.stats29-open-chips li').count();
    assert.equal(await count(), 24); await page.getByRole('button', { name: /פתח עוד \(36\)/ }).click(); assert.equal(await count(), 48);
    await page.getByRole('button', { name: /פתח עוד \(12\)/ }).click(); assert.equal(await count(), 60);
    assert.equal(await page.getByRole('button', { name: /פתח עוד/ }).count(), 0, 'no button when everything is shown');
    assert.equal(await page.getByText('ועוד 2 פריטים שנפתחו ואינם ברשימה').count(), 1, 'items beyond the server cap are a count');
    assert.equal(await page.getByText('לא סווגו כאנושיים: 60 פתיחות').count(), 1); assert.equal(await page.getByText(/1,234 דפים הוגשו לסורקים/).count(), 1);
    assert.equal(await page.getByText(/כרטיסי נושא עדיין אינם נמדדים לפי פריט/).count(), 1);
    // A window with too little activity draws a sentence, not a list.
    await page.getByRole('button', { name: 'יממה', exact: true }).click(); await page.getByText(/אין מספיק פעילות/).waitFor();
    assert.equal(await page.locator('.stats29-open-family').count(), 0);
    await page.getByRole('button', { name: 'חודש', exact: true }).click(); await page.getByText('נפתחו, גם פעם אחת').first().waitFor();
    assert.deepEqual(await page.evaluate(() => window.calls), [['research_open_activity_2029', 'week'], ['research_open_activity_2029', 'day'], ['research_open_activity_2029', 'month']]);
    await page.screenshot({ path: join(shots, 'open-activity-' + width + '.png'), fullPage: true });
    assert.deepEqual(errors, []); await page.close(); console.log('PASS browser', width, 'tiers/dense/show-more/insufficient/windows');
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.addInitScript(() => { window.calls = []; window.__fail = true; });
  await page.route('**/*', r => r.request().url().startsWith(origin) ? r.continue() : r.abort());
  await page.goto(origin); await page.getByRole('heading', { name: 'סטטיסטיקה' }).waitFor(); await page.waitForTimeout(400);
  assert.equal(await page.locator('[data-stats-open-activity]').count(), 0, 'a reader that is not applied draws no block at all');
  console.log('PASS browser unavailable reader draws nothing');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
