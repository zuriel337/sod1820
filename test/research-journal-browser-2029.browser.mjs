// Real Chromium, real timers, real localStorage/sessionStorage, real pagehide, real crash (CDP Page.crash), real window.open session cloning
// (a duplicated tab), against the REAL researchSyncRuntime (bundled), talking to a fixture server that is idempotent by batch id and
// compare-and-set on the revision like production. The browser-level counterpart of src/lib/research/researchJournalRuntime.test.js.
//   node --test test/research-journal-browser-2029.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { applyResearchOps, emptyResearchState } from '../src/lib/research/researchSyncState.js';

const req = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = req(name); break; } catch { /* optional tooling */ } }
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const skip = !pw && 'playwright is unavailable';
const sleep = ms => new Promise(done => setTimeout(done, ms));
const browserEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/proxy/i.test(key)));

async function fixture() {
  const bundle = (await build({ entryPoints: [resolve(import.meta.dirname, 'helpers/researchJournalHarness.entry.mjs')], bundle: true, format: 'iife', write: false, platform: 'browser', logLevel: 'silent' })).outputFiles[0].text;
  const state = { ...emptyResearchState(), revision: 0 }, receipts = new Map(), calls = []; let online = true;
  const server = createServer(async (rq, rs) => {
    const chunks = []; for await (const c of rq) chunks.push(c); const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    const send = (code, data, type = 'application/json') => { rs.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); rs.end(typeof data === 'string' ? data : JSON.stringify(data)); };
    const snap = () => { const { revision, ...rest } = state; return { ...rest, revision }; };
    if (rq.url === '/') return send(200, `<!doctype html><meta charset=utf-8><title>harness</title><script src="/bundle.js"></script>`, 'text/html');
    if (rq.url === '/bundle.js') return send(200, bundle, 'application/javascript');
    if (rq.url === '/srv/read') { if (!online) return send(503, 'offline'); return send(200, snap()); }
    if (rq.url === '/srv/write') {
      if (!online) return send(503, 'offline');
      calls.push(body.batchId);
      const receipt = receipts.get(body.batchId); if (receipt) return send(200, { ok: true, batch_id: body.batchId, applied_revision: receipt, snapshot: snap(), replayed: true });
      if (body.expectedRevision !== state.revision) return send(409, 'RESEARCH_SYNC_CONFLICT');
      Object.assign(state, applyResearchOps(state, body.ops), { revision: state.revision + 1 }); receipts.set(body.batchId, state.revision);
      return send(200, { ok: true, batch_id: body.batchId, applied_revision: state.revision, snapshot: snap() });
    }
    if (rq.url === '/ctl/online') { online = body.on === true; return send(200, {}); }
    return send(404, 'not found');
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return { origin: `http://127.0.0.1:${server.address().port}`, state, calls, setOnline: async (browserPage, on) => { await browserPage.evaluate(on => fetch('/ctl/online', { method: 'POST', body: JSON.stringify({ on }) }), on); },
    saved: () => state.saved.map(e => e.id ?? e.entity_ref).sort(), close: () => new Promise(done => server.close(done)) };
}
async function withBrowser(body) {
  const fx = await fixture();
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'], env: browserEnv });
  try { const context = await browser.newContext(); await body({ fx, browser, context }); } finally { await browser.close(); await fx.close(); }
}
const open = async (context, fx, options) => { const page = await context.newPage(); await page.goto(fx.origin + '/'); await page.evaluate(o => window.H.mount(o), options); await page.waitForTimeout(150); return page; };
const run = (name, fn) => test(name, { skip, timeout: 120000 }, () => withBrowser(fn));

run('REAL BROWSER, duplicated tab: two tabs keep distinct durable journals through real heartbeats; reload adopts instead of copying', async ({ fx, context }) => {
  const a = await open(context, fx); await fx.setOnline(a, false);   // hydrated once (revision known), then the network goes away
  await a.evaluate(() => window.H.write('a1'));
  const [b] = await Promise.all([context.waitForEvent('page'), a.evaluate(() => window.open(location.href))]);   // Chromium clones sessionStorage into the new tab, like "Duplicate tab"
  await b.waitForLoadState(); await b.evaluate(() => window.H.mount({})); await b.waitForTimeout(150);
  if (process.env.DEBUG_JOURNAL) console.log('DBG', JSON.stringify(await b.evaluate(() => ({ session: window.H.sessionPointer(), journals: window.H.journals(), status: window.H.status(), queue: window.H.queue(), batches: window.H.batches(), recovery: window.H.recoveryJournals() }))), JSON.stringify(await a.evaluate(() => ({ session: window.H.sessionPointer(), status: window.H.status() }))));
  assert.deepEqual(await b.evaluate(() => window.H.queue()), ['a1'], 'the duplicate restored the original tab\'s pending work');
  await b.evaluate(() => window.H.write('b1'));
  assert.deepEqual(await a.evaluate(() => window.H.queue()), ['a1'], 'the original tab is unaffected');
  await a.waitForTimeout(1200);   // several real heartbeats (250 ms); the lease TTL is 1500 ms
  const journals = await a.evaluate(() => window.H.journals());
  const aJournal = journals.find(j => j.ids.join() === 'a1'), bJournal = journals.find(j => j.ids.join() === 'a1,b1');
  assert.ok(aJournal && bJournal && aJournal.key !== bJournal.key, `distinct durable journals: ${JSON.stringify(journals.map(j => [j.ids, j.owner?.slice?.(0, 4)]))}`);
  assert.notEqual(aJournal.owner, bJournal.owner);
  // reload each tab 12 times: one journal each, no growth
  for (let i = 0; i < 12; i++) { await a.reload(); await a.evaluate(() => window.H.mount({})); await b.reload(); await b.evaluate(() => window.H.mount({})); }
  await a.waitForTimeout(300);
  const after = await a.evaluate(() => window.H.journals());
  if (process.env.DEBUG_JOURNAL) console.log('AFTER', JSON.stringify(after), JSON.stringify(await a.evaluate(() => ({ s: window.H.sessionPointer(), q: window.H.queue(), st: window.H.status() }))), JSON.stringify(await b.evaluate(() => ({ s: window.H.sessionPointer(), q: window.H.queue(), st: window.H.status() }))));
  assert.ok(after.length <= 2, `at most the two tabs' journals after 24 reloads, got ${after.length}`);
  assert.deepEqual((await a.evaluate(() => window.H.queue())).sort(), ['a1']); assert.deepEqual((await b.evaluate(() => window.H.queue())).sort(), ['a1', 'b1']);
});

run('REAL BROWSER, passive history on every load stays bounded; pagehide releases the lease', async ({ fx, context }) => {
  const page = await open(context, fx); await fx.setOnline(page, false);
  await page.evaluate(() => window.H.write('keep'));
  for (let i = 0; i < 80; i++) { await page.evaluate(i => window.H.passive(`h${i}`), i); await page.reload(); await page.evaluate(() => window.H.mount({})); }
  const journals = await page.evaluate(() => window.H.journals());
  assert.equal(journals.length, 1, 'one journal after 80 loads');
  assert.ok(journals[0].batches <= 51, `bounded queue (${journals[0].batches} batches)`);
  assert.ok((await page.evaluate(() => window.H.queue())).includes('keep'), 'the real research action is still there');
  const probe = await context.newPage(); await probe.goto(fx.origin + '/');
  await page.close();   // real pagehide
  await probe.waitForTimeout(300);
  const released = await probe.evaluate(() => window.H.journals());
  assert.equal(released.length, 1); assert.equal(released[0].released, true, 'closing the page released the lease');
});

run('REAL BROWSER, crash + restore + resumed sync: nothing unsynced is lost, journals do not multiply, the server ends complete', async ({ fx, context }) => {
  const doomed = await open(context, fx); await fx.setOnline(doomed, false);
  await doomed.evaluate(() => { window.H.write('w1'); window.H.write('w2'); window.H.passive('seen'); });
  const sessionBefore = await doomed.evaluate(() => window.H.sessionPointer());
  const cdp = await context.newCDPSession(doomed), crashed = new Promise(done => doomed.once('crash', done));
  cdp.send('Page.crash').catch(() => {});   // renderer dies: no pagehide, lease stays held
  await Promise.race([crashed, sleep(5000)]); await sleep(300);
  const witness = await context.newPage(); await witness.goto(fx.origin + '/');
  const afterCrash = await witness.evaluate(() => window.H.journals());
  assert.equal(afterCrash.length, 1); assert.notEqual(afterCrash[0].released, true, 'a crash does not release the lease');
  // the browser restores the tab: new page with the crashed tab's sessionStorage, still inside the lease TTL -> must COPY, not take over
  const restoredEarly = await context.newPage(); await restoredEarly.goto(fx.origin + '/'); await restoredEarly.evaluate(s => window.H.setSession(s), sessionBefore);
  await restoredEarly.evaluate(() => window.H.mount({})); await restoredEarly.waitForTimeout(150);
  assert.deepEqual((await restoredEarly.evaluate(() => window.H.queue())).sort(), ['seen', 'w1', 'w2']);
  await restoredEarly.evaluate(() => window.H.write('w3'));
  const mid = await witness.evaluate(() => window.H.journals());
  assert.ok(mid.some(j => j.ids.includes('w3')) && mid.some(j => j.ids.join() === 'w1,w2,seen'), `crashed journal kept intact, restored tab owns a distinct one: ${JSON.stringify(mid.map(j => j.ids))}`);
  // after the TTL passes the crashed journal is a free, redundant copy: a new load collapses it
  await restoredEarly.close(); await sleep(1800);
  const late = await context.newPage(); await late.goto(fx.origin + '/'); await late.evaluate(() => window.H.mount({})); await late.waitForTimeout(200);
  const settled = await late.evaluate(() => window.H.journals());
  assert.ok(settled.length <= 2, `journals do not multiply (${settled.length})`);
  const all = new Set(settled.flatMap(j => j.ids)); for (const id of ['w1', 'w2', 'w3']) assert.ok(all.has(id), `${id} is still durable`);
  // sync resumes: server back online, the person recovers what is left and confirms
  await fx.setOnline(late, true);
  const recovered = await late.evaluate(() => window.H.recoverAll());
  if (process.env.DEBUG_JOURNAL) console.log('RECOVER', recovered, JSON.stringify(await late.evaluate(() => ({ j: window.H.journals(), q: window.H.queue(), st: window.H.status(), rec: window.H.recoveryJournals() }))), JSON.stringify(fx.saved()));
  assert.equal(recovered, true);
  await late.evaluate(() => window.H.sync()); await late.waitForTimeout(300);
  assert.deepEqual(fx.saved(), ['w1', 'w2', 'w3'], 'the server holds every research action exactly once');
  assert.equal((await late.evaluate(() => window.H.journals())).length, 0, 'nothing left to recover');
});

run('REAL BROWSER, offline work survives and syncs exactly once when connectivity returns, across two tabs', async ({ fx, context }) => {
  const a = await open(context, fx, { delay: 300 }); await fx.setOnline(a, false);
  const [b] = await Promise.all([context.waitForEvent('page'), a.evaluate(() => window.open(location.href))]);
  await b.waitForLoadState(); await b.evaluate(() => window.H.mount({ delay: 300 }));
  await a.evaluate(() => { window.H.write('x1'); window.H.write('x2'); }); await b.evaluate(() => { window.H.write('y1'); });
  await a.reload(); await a.evaluate(() => window.H.mount({ delay: 300 })); await b.reload(); await b.evaluate(() => window.H.mount({ delay: 300 }));
  await fx.setOnline(a, true);
  await a.evaluate(() => window.H.sync()); await b.evaluate(() => window.H.sync()); await a.evaluate(() => window.H.sync());
  await a.waitForTimeout(500);
  assert.deepEqual(fx.saved(), ['x1', 'x2', 'y1'], 'every action arrived, once');
  assert.equal(new Set(fx.calls).size >= 1, true);
});
