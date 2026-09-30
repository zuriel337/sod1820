// G3 ELS adaptive batch verify — real-browser acceptance (Playwright/Chromium) for the tzofen tool.
// The harness plays the HOST (TzofenEmbed) and answers `engine-request` with an INDEPENDENT test oracle over
// the canonical tk-letters blob (test-only; it stands in for the server els_verify_batch_v1, which is proven
// against PostgreSQL in els-verify-batch.test.mjs). Skipped when Chromium/Playwright are unavailable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const letters = readFileSync(join(root, 'tools/els/data/tk-letters.txt'), 'utf8');
const TORAH_LEN = 304805;
const tool = readFileSync(join(root, 'public/tzofen.html'));

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return req(p); } catch { /* next */ }
  }
  return null;
}
const pw = loadPlaywright();
const canRun = !!pw;

test('CI: browser acceptance must not be skipped', () => { if (process.env.ELS_REQUIRE_EXECUTABLE) assert.ok(canRun, 'ELS_REQUIRE_EXECUTABLE=1 but Playwright/Chromium is missing'); });

const HARNESS = `<!doctype html><meta charset=utf-8><body><iframe id=t src="/tzofen.html?embed=1" style="width:1200px;height:900px"></iframe><script>
window.__log=[];window.__mode='ok';window.__reject=null;
const f=document.getElementById('t');
addEventListener('message',async e=>{const d=e.data;if(!d||d.source!=='tzofen')return;
  window.__log.push(d);
  if(d.type==='ready'){f.contentWindow.postMessage({source:'sod-host',type:'tier',tier:'admin'},location.origin);return;}
  if(d.type==='engine-request'){
    const r=await fetch('/oracle',{method:'POST',body:JSON.stringify({mode:window.__mode,reject:window.__reject,op:d.op,payload:d.payload})}).then(x=>x.json());
    f.contentWindow.postMessage(Object.assign({source:'sod-host',type:'engine-result',requestId:d.requestId},r),location.origin);
  }
  if(d.type==='save'){f.contentWindow.postMessage({source:'sod-host',type:'saved',ok:true,status:'published'},location.origin);}
});
</script>`;

// test-only oracle (mirrors the server contract: cap/limits enforced, per-candidate exact letter check)
function oracleVerify(p, reject) {
  const scope = p.scope, hi = scope === 'tanakh' ? letters.length : TORAH_LEN;
  const cid = scope === 'tanakh' ? '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b' : '0b022e8eef6f9c16';
  if (p.corpus_id !== cid) return { ok: true, result: { status: 'CORPUS_MISMATCH' } };
  const t = p.term.replace(/[^א-ת]/g, '');
  const seen = new Set(), verified = [];
  if (p.candidates.length > 4000 || p.candidates.length * t.length > 64000) return { ok: false, error: 'budget_exceeded' };
  p.candidates.forEach((c, i) => {
    const k = `${c.skip}/${c.dir}/${c.start}`; if (seen.has(k)) return; seen.add(k);
    if (reject && reject === k) return;
    let ok = c.skip >= 2 && (c.dir === 1 || c.dir === -1) && c.start >= 0;
    for (let j = 0; ok && j < t.length; j++) { const x = c.start + c.dir * c.skip * j; if (x < 0 || x >= hi || letters[x] !== t[j]) ok = false; }
    if (ok) verified.push({ skip: c.skip, dir: c.dir, start: c.start, input_ordinal: i });
  });
  return { ok: true, result: { status: 'OK', corpus_id: cid, verified }, trace_id: 't-' + seen.size };
}

async function withHarness(fn) {
  const calls = [];
  const srv = createServer((req, res) => {
    if (req.url === '/oracle' && req.method === 'POST') {
      let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
        const m = JSON.parse(b); calls.push(m);
        const out = m.mode === 'down' ? { ok: false, error: 'bridge_error' } : m.op === 'verify_batch' ? oracleVerify(m.payload, m.reject) : { ok: false, error: 'unsupported' };
        res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(out));
      }); return;
    }
    if (req.url.startsWith('/tzofen.html')) { res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(tool); return; }
    res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(HARNESS);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => { try { localStorage.setItem('tzofen_onboarded_v1', '1'); } catch { /* noop */ } });
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${srv.address().port}/`);
    const frame = page.frameLocator('#t');
    await frame.locator('#q').waitFor({ timeout: 60000 });
    await page.waitForFunction(() => window.__log.some((m) => m.type === 'ready'), null, { timeout: 60000 });
    await fn({ page, frame, calls, errors });
    assert.deepEqual(errors, [], 'no uncaught page errors');
  } finally { await browser.close(); srv.close(); }
}
const states = (page) => page.evaluate(() => window.__log.filter((m) => m.type === 'state'));
const waitState = (page, pred, ms = 60000) => page.waitForFunction((src) => { const p = eval('(' + src + ')'); return window.__log.some((m) => m.type === 'state' && p(m)); }, pred.toString(), { timeout: ms });
async function search(frame, term) { await frame.locator('#q').fill(term); await frame.locator('#go').click(); }

test('browser: regular Torah search → verified via canonical batch → governed state carries MATCH + provenance', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    await search(frame, 'משיח');
    await waitState(page, (m) => m.term === 'משיח' && m.status === 'ok' && m.verification && m.verification.state === 'MATCH');
    const vb = calls.filter((c) => c.op === 'verify_batch');
    assert.ok(vb.length >= 1, 'search verified through verify_batch');
    const p = vb[0].payload;
    assert.equal(p.scope, 'torah'); assert.equal(p.corpus_id, '0b022e8eef6f9c16');
    assert.equal(p.strategy.policy, 'ADAPTIVE_CAPPED_V1');
    assert.ok(['ANCHOR_FAST_V1', 'HYBRID_COVERAGE_V1'].includes(p.strategy.strategy));
    assert.ok(p.candidates.length >= 1 && p.candidates.length <= 4000);
    assert.ok(p.candidates.every((c) => c.skip >= 2 && (c.dir === 1 || c.dir === -1) && c.start >= 0));
    const st = (await states(page)).filter((m) => m.term === 'משיח' && m.status === 'ok').pop();
    assert.equal(st.verification.corpus_id, '0b022e8eef6f9c16');
    assert.ok(st.axis.hitId && st.matrix.marks.length > 0);
    // every governed axis coordinate replays against the independent oracle
    const [skip, dir, start] = st.axis.hitId.split('_').map(Number);
    assert.equal(oracleVerify({ scope: 'torah', corpus_id: '0b022e8eef6f9c16', term: 'משיח', candidates: [{ skip, dir, start }] }).result.verified.length, 1);
  });
});

test('browser: bridge unavailable → fail closed (candidate label, no ok state, no save, no skip leak)', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame }) => {
    await page.evaluate(() => { window.__mode = 'down'; window.__log.length = 0; });
    await search(frame, 'משיח');
    await waitState(page, (m) => m.term === 'משיח' && m.status === 'candidate');
    const all = await states(page);
    assert.ok(all.every((m) => m.status !== 'ok'), 'no governed ok state while unverified');
    const cand = all.filter((m) => m.status === 'candidate').pop();
    assert.equal(cand.verification.negative_authority, false);
    assert.equal(cand.axis, undefined); assert.equal(cand.matrix, undefined);
    const leaked = await page.evaluate(() => window.__log.filter((m) => m.type === 'search' && m.skip > 0).length);
    assert.equal(leaked, 0, 'search log never carries an unverified skip');
  });
});

test('browser: canonical MISMATCH is never promoted (rejected candidate absent from st.res / state)', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    await search(frame, 'משיח');
    await waitState(page, (m) => m.term === 'משיח' && m.status === 'ok');
    const first = calls.find((c) => c.op === 'verify_batch').payload.candidates.find((c) => c.skip >= 2);
    const key = `${first.skip}/${first.dir}/${first.start}`;
    await page.evaluate((k) => { window.__reject = k; window.__log.length = 0; }, key);
    await search(frame, 'ירושלים'); await search(frame, 'משיח');
    await waitState(page, (m) => m.term === 'משיח' && (m.status === 'ok' || m.status === 'candidate'));
    const st = (await states(page)).filter((m) => m.term === 'משיח' && m.status === 'ok').pop();
    if (st) assert.notEqual(st.axis.hitId, `${first.skip}_${first.dir}_${first.start}`, 'rejected coordinate is not the governed axis');
  });
});

test('browser: local no-hit is never a canonical negative', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame }) => {
    await search(frame, 'זזזזז');
    await waitState(page, (m) => m.status === 'empty' && m.termRaw === 'זזזזז');
    const s = (await states(page)).filter((m) => m.status === 'empty').pop();
    assert.equal(s.verification.negative_authority, false);
    assert.equal(s.verification.state, 'LOCAL_NO_HIT');
  });
});

test('browser: save posts only after canonical verification and carries only verified finding ids', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame }) => {
    await search(frame, 'משיח');
    await waitState(page, (m) => m.term === 'משיח' && m.status === 'ok' && m.verification.state === 'MATCH');
    await frame.locator('.save-act, .save').first().click({ timeout: 30000 }).catch(() => {});
    await frame.locator('.sh-desc').fill('בדיקת שמירה מאומתת של צופן משיח').catch(() => {});
    await frame.locator('.sh-save').click({ timeout: 10000 }).catch(() => {});
    await page.waitForFunction(() => window.__log.some((m) => m.type === 'save'), null, { timeout: 60000 });
    const save = await page.evaluate(() => window.__log.find((m) => m.type === 'save'));
    assert.equal(save.term, 'משיח'); assert.ok(save.start >= 0);
    assert.equal(oracleVerify({ scope: 'torah', corpus_id: '0b022e8eef6f9c16', term: 'משיח', candidates: [{ skip: save.skip, dir: save.direction === 'back' ? -1 : 1, start: save.start }] }).result.verified.length, 1, 'saved coordinate replays MATCH');
  });
});

test('browser: cross-simple prefetches BOTH axes through the canonical verifier; governed state stays verified', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    await frame.locator('#crosstoggle').click();
    await frame.locator('#q').fill('משיח');
    await frame.locator('#qb').fill('גאולה');
    await page.evaluate(() => { window.__log.length = 0; });
    calls.length = 0;
    await frame.locator('#go').click();
    await waitState(page, (m) => m.search && m.search.mode !== 'regular' && m.status === 'ok' && m.verification.state === 'MATCH');
    const terms = new Set(calls.filter((c) => c.op === 'verify_batch').map((c) => c.payload.term));
    assert.ok(terms.has('משיח') && terms.has('גאולה'), 'both cross axes verified server-side: ' + [...terms]);
    const st = (await states(page)).filter((m) => m.status === 'ok' && m.search.mode !== 'regular').pop();
    // every governed finding id must replay MATCH against the independent oracle
    for (const w of st.findings) for (const id of w.shown) {
      const [skip, dir, start] = id.split('_').map(Number);
      assert.equal(oracleVerify({ scope: 'torah', corpus_id: '0b022e8eef6f9c16', term: w.t, candidates: [{ skip, dir, start }] }).result.verified.length, 1, `${w.t} ${id}`);
    }
  });
});

test('browser: FORMS occurrence prefetch goes through the canonical verifier (projection only)', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    await frame.locator('#q').fill('סוד החשמל');
    await frame.locator('.coach-forms').first().waitFor({ timeout: 20000 });
    calls.length = 0;
    await frame.locator('.coach-forms').first().click();
    await frame.locator('#formsout .fo-row').first().waitFor({ timeout: 120000 });
    const vb = calls.filter((c) => c.op === 'verify_batch');
    assert.ok(vb.length >= 1, 'FORMS occurrences verified server-side');
    assert.ok(vb.every((c) => c.payload.corpus_id === '0b022e8eef6f9c16' && c.payload.scope === 'torah'));
  });
});
