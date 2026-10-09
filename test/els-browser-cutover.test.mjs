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
import { ELS_GOLDENS } from './fixtures/els-runtime-goldens.mjs';

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
window.__log=[];window.__mode='ok';window.__reject=null;window.__oraclePending=0;window.__holdOracleTerm=null;window.__heldOracle=[];
const f=document.getElementById('t');
addEventListener('message',async e=>{const d=e.data;if(!d||d.source!=='tzofen')return;
  window.__log.push(d);
  if(d.type==='ready'){f.contentWindow.postMessage({source:'sod-host',type:'tier',tier:'admin'},location.origin);return;}
  if(d.type==='engine-request'){
    window.__oraclePending++;
    const r=await fetch('/oracle',{method:'POST',body:JSON.stringify({mode:window.__mode,reject:window.__reject,op:d.op,payload:d.payload})}).then(x=>x.json());
    if(d.payload?.term===window.__holdOracleTerm)await new Promise(release=>window.__heldOracle.push({term:d.payload.term,release}));
    f.contentWindow.postMessage(Object.assign({source:'sod-host',type:'engine-result',requestId:d.requestId},r),location.origin);
    window.__oraclePending--;
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

async function withHarness(fn, { mode = 'ok', onboarded = true, hiddenBridge = false, tier = 'admin', native2029 = false } = {}) {
  const calls = [];
  const srv = createServer((req, res) => {
    if (req.url === '/oracle' && req.method === 'POST') {
      let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
        const m = JSON.parse(b); calls.push(m);
        const out = m.mode === 'down' ? { ok: false, error: 'bridge_error' } : m.op === 'verify_batch' ? oracleVerify(m.payload, m.reject) : { ok: false, error: 'unsupported' };
        res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(out));
      }); return;
    }
    if (req.url.startsWith('/attacker.html')) { res.setHeader('content-type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset=utf-8><body>attacker</body>'); return; }
    if (req.url.startsWith('/tzofen.html')) { res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(tool); return; }
    const harness = HARNESS.replace("window.__mode='ok'", "window.__mode=" + JSON.stringify(mode))
      .replace("tier:'admin'", 'tier:' + JSON.stringify(tier))
      .replace('/tzofen.html?embed=1', '/tzofen.html?embed=1' + (hiddenBridge ? '&bridge=hidden' : '') + (native2029 ? '&experience=2029' : ''));
    res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(harness);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true,
      ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
    const page = await browser.newPage();
    if (onboarded) await page.addInitScript(() => { try { localStorage.setItem('tzofen_onboarded_v1', '1'); } catch { /* noop */ } });
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${srv.address().port}/`);
    const frame = page.frameLocator('#t');
    await frame.locator('#q').waitFor({ timeout: 60000 });
    await page.waitForFunction(() => window.__log.some((m) => m.type === 'ready'), null, { timeout: 60000 });
    await fn({ page, frame, calls, errors });
    assert.deepEqual(errors, [], 'no uncaught page errors');
  } finally { await browser?.close(); srv.close(); }
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
    assert.ok(all.every((m) => m.status !== 'ok'), 'no governed ok state while unverified: ' + JSON.stringify(all.map(m => ({ term: m.term, status: m.status, verification: m.verification?.state }))));
    const cand = all.filter((m) => m.status === 'candidate').pop();
    assert.equal(cand.verification.negative_authority, false);
    assert.equal(cand.axis, undefined); assert.equal(cand.matrix, undefined);
    const leaked = await page.evaluate(() => window.__log.filter((m) => m.type === 'search' && m.skip > 0).length);
    assert.equal(leaked, 0, 'search log never carries an unverified skip');
  }, { mode: 'down' });
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
    const state = await latestState(page);
    assert.equal(save.searchWindow.ctxR, state.ui.ctxR, 'saved window retains the canonical row bound');
    assert.equal(save.searchWindow.windowColumns, 80, 'legacy saved window retains its column bound');
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
    assert.equal(st.search.crossRadius, 18, 'the classic simple cross keeps its original radius');
    // every governed finding id must replay MATCH against the independent oracle
    for (const w of st.findings) for (const id of w.shown) {
      const [skip, dir, start] = id.split('_').map(Number);
      assert.equal(oracleVerify({ scope: 'torah', corpus_id: '0b022e8eef6f9c16', term: w.t, candidates: [{ skip, dir, start }] }).result.verified.length, 1, `${w.t} ${id}`);
    }
    const request = { kind: 'cross', axis: 'משיח', term: 'גאולה', scope: 'torah' };
    const atRadius = async (radius) => {
      await nativeSend(page, { type: 'native-search', request: { ...request, ...(radius === undefined ? {} : { radius }) } });
      await page.waitForFunction(expected => {
        const current = window.__log.filter(m => m.type === 'state').at(-1);
        return current?.status === 'ok' && current.search?.mode === 'cross-simple' && current.search.crossRadius === expected &&
          current.findings?.some(word => word.hits?.some(hit => hit.shown && hit.verified && hit.axisDistance <= expected));
      }, radius ?? 18);
      const current = await latestState(page);
      const meetingHits = current.findings.flatMap(word => word.hits.filter(hit => hit.shown && hit.verified));
      assert.ok(meetingHits.some(hit => hit.axisDistance <= (radius ?? 18)), 'the selected meeting has a verified finding inside the requested radius');
      return current;
    };
    const strict = await atRadius(2), relaxed = await atRadius(20);
    assert.ok(relaxed.search.zones >= strict.search.zones, 'relaxing the radius cannot remove meeting zones');
    const defaultRadius = await atRadius();
    assert.equal(defaultRadius.search.zones, st.search.zones, 'native default matches classic meeting count');
    assert.deepEqual(defaultRadius.axis, st.axis, 'native default chooses the same classic axis');
    for (const radius of [1, 21, 2.5, '3', null]) {
      await nativeSend(page, { type: 'native-search', request: { ...request, radius } });
    }
    await nativeSend(page, { type: 'request-lens', lens: 'line-context', target: { hitId: defaultRadius.axis.hitId, nativeSeq: 820 } });
    await page.waitForFunction(() => window.__log.some(m => m.target?.nativeSeq === 820));
    const rejected = await latestState(page);
    assert.deepEqual(rejected.axis, defaultRadius.axis, 'invalid radii preserve the selected axis');
    assert.deepEqual(rejected.geometry, defaultRadius.geometry);
    assert.equal(rejected.search.crossRadius, 18, 'out-of-range and noninteger radii are ignored');
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

// ── render truth semantics (G3 amend): only a canonical MATCH gets the normal «נמצא» result UI ──
const outText = (frame) => frame.locator('#out').innerText();
const foundHead = (frame) => frame.locator('#out .rhead .found').count();

test('browser render: MATCH -> normal «נמצא» result UI', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame }) => {
    await search(frame, 'משיח');
    await waitState(page, (m) => m.term === 'משיח' && m.status === 'ok' && m.verification.state === 'MATCH');
    assert.equal(await foundHead(frame), 1, 'normal result header shown for a governed MATCH');
    assert.match(await outText(frame), /נמצא/);
  });
});

test('browser render: LOCAL_NO_HIT is explicitly partial/local and never a definitive negative or «נמצא»', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame }) => {
    await search(frame, 'זזזזז');
    await waitState(page, (m) => m.status === 'empty' && m.termRaw === 'זזזזז');
    const txt = await outText(frame);
    assert.match(txt, /סריקה מקומית חלקית/);
    assert.match(txt, /אינה הוכחת-היעדר/);
    assert.doesNotMatch(txt, /לא נמצא «זזזזז» כדילוג/, 'no definitive-negative copy');
    assert.equal(await foundHead(frame), 0);
  });
});

test('browser render: verifier failure -> candidate/unverified UI (no «נמצא», no governed header)', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame }) => {
    await page.evaluate(() => { window.__mode = 'down'; window.__log.length = 0; });
    await search(frame, 'משיח');
    await waitState(page, (m) => m.term === 'משיח' && m.status === 'candidate');
    const txt = await outText(frame);
    assert.match(txt, /מועמדים בלבד — לא אומתו/);
    assert.equal(await foundHead(frame), 0, 'normal נמצא header must not render for unverified candidates');
    assert.equal(await frame.locator('#out .occbtn').count(), 0);
  });
});

test('browser trust: same-origin non-parent cannot spoof sod-host tier or load commands', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame }) => {
    await search(frame, 'משיח');
    await waitState(page, (m) => m.term === 'משיח' && m.status === 'ok' && m.verification.state === 'MATCH');
    const before = await frame.locator('#q').inputValue();
    await page.evaluate(() => {
      const a = document.createElement('iframe');
      a.id = 'attacker';
      a.src = '/attacker.html';
      document.body.appendChild(a);
    });
    await page.waitForFunction(() => {
      const a = document.getElementById('attacker');
      return !!a && !!a.contentWindow && a.contentDocument?.readyState === 'complete';
    });
    const attacker = page.frames().find((x) => x.url().endsWith('/attacker.html'));
    assert.ok(attacker, 'same-origin attacker frame exists');
    await attacker.evaluate(() => {
      const target = parent.document.getElementById('t').contentWindow;
      target.postMessage({ source: 'sod-host', type: 'tier', tier: 'anon' }, parent.location.origin);
      target.postMessage({
        source: 'sod-host',
        type: 'load-matrix',
        item: { term: 'זזזזז', skip: 2, dir: 1, start: 0, scope: 'torah' },
      }, parent.location.origin);
    });
    await page.waitForTimeout(500);
    assert.equal(await frame.locator('#q').inputValue(), before, 'non-parent load command ignored');
    const st = (await states(page)).filter((m) => m.term === 'משיח' && m.status === 'ok').pop();
    assert.equal(st.verification.state, 'MATCH', 'governed state unchanged by spoof');
  });
});


const nativeSend = (page, message) => page.evaluate((d) => {
  document.querySelector('#t').contentWindow.postMessage({ source: 'sod-host', ...d }, location.origin);
}, message);
const latestState = async (page) => (await states(page)).at(-1);
const operations = (page) => page.evaluate(() => window.__log.filter(message => message.type === 'operation'));
const waitOperation = (page, kind, requestId, status) => page.waitForFunction(([kind, requestId, status]) =>
  window.__log.some(message => message.type === 'operation' && message.kind === kind && message.requestId === requestId && message.status === status),
  [kind, requestId, status], { timeout: 60000 });
const waitSettledMatrix = (page) => page.waitForFunction(() => {
  const current = window.__log.filter(message => message.type === 'state').at(-1);
  return current?.status === 'ok' && window.__oraclePending === 0 &&
    (current.findings || []).every(word => (word.hits || []).every(hit => !hit.shown || hit.verified));
}, null, { timeout: 60000 });

// Independent geometry oracle: shortest row/column distance from an occurrence to the main axis.
function mainAxisDistance(state, word, hitId) {
  const [skip, dir, start] = hitId.split('_').map(Number), width = state.geometry.S;
  const [mainSkip, mainDir, mainStart] = state.axis.hitId.split('_').map(Number);
  let closest = Infinity;
  for (let character = 0; character < word.length; character++) {
    const index = start + dir * skip * character;
    assert.equal(letters[index], word[character], 'secondary coordinate replays the independent canonical stream');
    for (let mainCharacter = 0; mainCharacter < state.length; mainCharacter++) {
      const anchor = mainStart + mainDir * mainSkip * mainCharacter;
      const horizontal = Math.abs(index % width - anchor % width);
      closest = Math.min(closest, Math.abs(Math.floor(index / width) - Math.floor(anchor / width)) + Math.min(horizontal, width - horizontal));
    }
  }
  return closest;
}

function assertHeatMatchesEffectiveHits(state) {
  const { geometry, matrix } = state, raw = new Map();
  const sources = [];
  const addOccurrence = (word, hitId) => {
    const [skip, dir, start] = hitId.split('_').map(Number);
    for (let character = 0; character < word.length; character++) sources.push(start + dir * skip * character);
  };
  if (!state.ui.hideMain) addOccurrence(state.term, state.axis.hitId);
  for (const word of state.findings) for (const hit of word.hits.filter(hit => hit.verified && hit.shown)) addOccurrence(word.t, hit.hitId);
  for (let row = geometry.r0; row <= geometry.r1; row++) for (let column = geometry.c0; column < geometry.c0 + geometry.cw; column++) {
    const index = row * geometry.S + column;
    if (index < 0 || index >= state.corpusLetters) continue;
    let density = 0;
    for (const source of sources) {
      const dr = row - Math.floor(source / geometry.S), dc = column - source % geometry.S;
      if (Math.abs(dr) <= 2 && Math.abs(dc) <= 2) density += 1 / (1 + dr ** 2 + dc ** 2);
    }
    if (density > 0) raw.set(index, density);
  }
  const maximum = Math.max(...raw.values()), actual = new Map(matrix.heat.cells.map(cell => [cell.i, cell.strength]));
  assert.equal(actual.size, raw.size, 'heat covers exactly the neighborhoods of effective governed occurrences');
  for (const [index, density] of raw) assert.ok(Math.abs(actual.get(index) - density / maximum) < 1e-12, `effective heat at ${index}`);
}

function assertMarksMatchEffectiveHits(state) {
  const positions = new Set(), { geometry } = state;
  const addHit = (word, hitId) => {
    const [skip, dir, start] = hitId.split('_').map(Number);
    for (let character = 0; character < word.length; character++) {
      const index = start + dir * skip * character;
      assert.equal(letters[index], word[character]);
      const row = Math.floor(index / geometry.S), column = index % geometry.S;
      if (row >= geometry.r0 && row <= geometry.r1 && column >= geometry.c0 && column < geometry.c0 + geometry.cw) positions.add(index);
    }
  };
  if (!state.ui.hideMain) addHit(state.term, state.axis.hitId);
  for (const word of state.findings) for (const hit of word.hits.filter(hit => hit.shown && hit.verified)) addHit(word.t, hit.hitId);
  assert.deepEqual([...new Set(state.matrix.marks.map(mark => mark.i))].sort((a, b) => a - b), [...positions].sort((a, b) => a - b), 'matrix marks contain exactly the effective verified occurrences');
}

test('browser: a fresh hidden native first search runs without a persisted onboarding acknowledgement and preserves anonymous gates', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    await page.waitForFunction(() => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.tier === 'anon' && current.status === 'ok' && window.__oraclePending === 0;
    });
    const hostUrl = page.url(), toolUrl = page.frames().find(f => f.url().includes('/tzofen.html')).url();
    assert.equal(await page.evaluate(() => localStorage.getItem('tzofen_onboarded_v1')), null);
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term: 'משיח', scope: 'torah' } });
    await page.waitForFunction(() => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.term === 'משיח' && current.status === 'ok' && current.verification?.state === 'MATCH' && window.__oraclePending === 0;
    });
    const searched = await latestState(page), beforeCalls = calls.length;
    assert.equal(searched.tier, 'anon');
    assert.ok(calls.some(call => call.op === 'verify_batch' && call.payload.term === 'משיח'), 'first native search reaches the canonical verifier');
    assert.equal(await frame.locator('#onbov').count(), 0, 'the hidden runtime never opens its invisible onboarding modal');
    assert.equal(await page.evaluate(() => window.__log.filter(m => m.type === 'onboarding-required').length), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('tzofen_onboarded_v1')), null, 'hidden onboarding remains a runtime-only exception');
    for (const [reason, request] of [
      ['cross', { kind: 'cross', axis: 'משיח', term: 'גאולה', scope: 'torah' }],
      ['tanakh', { kind: 'regular', term: 'משיח', scope: 'tanakh' }],
      ['limit', { kind: 'regular', term: 'ירושלים', scope: 'torah' }],
    ]) {
      if (reason === 'limit') await page.evaluate(() => localStorage.setItem('tzofen_free_v1', '5'));
      await nativeSend(page, { type: 'native-search', request });
      await page.waitForFunction(expected => window.__log.some(m => m.type === 'gate' && m.reason === expected), reason);
      assert.deepEqual(await latestState(page), searched, `${reason} gate preserves the verified workspace`);
      assert.equal(calls.length, beforeCalls, `${reason} gate performs no search or verification`);
    }
    assert.equal(page.url(), hostUrl);
    assert.equal(page.frames().find(f => f.url().includes('/tzofen.html')).url(), toolUrl);
    assert.equal(await page.locator('iframe').count(), 1, 'native requests retain one engine iframe');
    assert.equal(await page.evaluate(() => localStorage.getItem('tzofen_onboarded_v1')), null);
  }, { onboarded: false, hiddenBridge: true, tier: 'anon' });
});

test('browser: visible first-visit onboarding still blocks the requested search until acknowledged', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    await page.waitForFunction(() => window.__log.some(m => m.type === 'state' && m.status === 'ok') && window.__oraclePending === 0);
    const beforeCalls = calls.length;
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term: 'משיח', scope: 'torah' } });
    await page.waitForFunction(() => window.__log.some(m => m.type === 'onboarding-required'));
    assert.equal(await frame.locator('#onbov').isVisible(), true, 'visible embedding retains its existing first-visit guide');
    assert.equal(await page.evaluate(() => localStorage.getItem('tzofen_onboarded_v1')), null);
    assert.equal(calls.length, beforeCalls, 'onboarding blocks new search I/O');
    await frame.locator('.onb-go').click();
    assert.equal(await frame.locator('#onbov').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('tzofen_onboarded_v1')), '1');
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term: 'משיח', scope: 'torah' } });
    await page.waitForFunction(() => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.term === 'משיח' && current.status === 'ok' && current.verification?.state === 'MATCH';
    });
    assert.ok(calls.some(call => call.op === 'verify_batch' && call.payload.term === 'משיח'));
  }, { onboarded: false });
});

test('browser: anonymous 2029 searches remain open beyond the legacy allowance without changing identity or its counter', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    await waitSettledMatrix(page);
    const hostUrl = page.url(), mountedUrl = page.frames().find(candidate => candidate.url().includes('/tzofen.html')).url();
    assert.equal(new URL(mountedUrl).searchParams.get('experience'), '2029');
    await page.evaluate(() => localStorage.setItem('tzofen_free_v1', '9'));
    const assertAnonymous = async (state) => {
      assert.equal(state.tier, 'anon');
      assert.equal(state.admin, false, '2029 access never impersonates an administrator');
      assert.equal(state.verification.state, 'MATCH');
      assert.equal(await page.evaluate(() => localStorage.getItem('tzofen_free_v1')), '9', '2029 leaves the existing legacy demo counter intact');
      const [skip, dir, start] = state.axis.hitId.split('_').map(Number);
      assert.equal(oracleVerify({ scope: state.scope, corpus_id: state.verification.corpus_id, term: state.term, candidates: [{ skip, dir, start }] }).result.verified.length, 1);
    };
    for (const [index, term] of ['תורה', 'אליהו', 'משיח', 'ירושלים'].entries()) {
      await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term, scope: 'torah', seq: 210 + index } });
      await page.waitForFunction(expected => {
        const current = window.__log.filter(message => message.type === 'state').at(-1);
        return current?.termRaw === expected && current.status === 'ok' && current.search?.mode === 'regular' && window.__oraclePending === 0;
      }, term);
      await assertAnonymous(await latestState(page));
    }
    const crossCalls = calls.length;
    await nativeSend(page, { type: 'native-search', request: { kind: 'cross', axis: 'משיח', term: 'גאולה', scope: 'torah', radius: 18, seq: 220 } });
    await page.waitForFunction(() => {
      const current = window.__log.filter(message => message.type === 'state').at(-1);
      return current?.status === 'ok' && current.search?.mode === 'cross-simple' &&
        current.findings?.some(word => word.hits.some(hit => hit.shown && hit.verified)) && window.__oraclePending === 0;
    });
    await assertAnonymous(await latestState(page));
    const crossTerms = new Set(calls.slice(crossCalls).map(call => call.payload.term));
    assert.ok(crossTerms.has('משיח') && crossTerms.has('גאולה'), 'anonymous cross still verifies both axes');
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term: 'תורהקדשה', scope: 'tanakh', seq: 221 } });
    await page.waitForFunction(() => {
      const current = window.__log.filter(message => message.type === 'state').at(-1);
      return current?.scope === 'tanakh' && current.term === 'תורהקדשה' && current.status === 'ok' && window.__oraclePending === 0;
    }, null, { timeout: 120000 });
    await assertAnonymous(await latestState(page));
    assert.ok(calls.some(call => call.payload.scope === 'tanakh' && call.payload.term === 'תורהקדשה'), 'Tanakh remains governed by its canonical corpus verifier');
    assert.equal(await page.evaluate(() => window.__log.some(message => message.type === 'gate')), false, '2029 search access emits no legacy registration gate');
    assert.equal(await frame.locator('#onbov').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('tzofen_onboarded_v1')), null);
    assert.equal(page.url(), hostUrl);
    assert.equal(page.frames().find(candidate => candidate.url().includes('/tzofen.html')).url(), mountedUrl);
    assert.equal(await page.locator('iframe').count(), 1);
  }, { onboarded: false, hiddenBridge: true, tier: 'anon', native2029: true });
});

test('browser: native search operations correlate progress, canonical completion, verifier failure and partial empty results', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  await withHarness(async ({ page }) => {
    await waitSettledMatrix(page);
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term: 'משיח', scope: 'torah', seq: 301 } });
    await waitOperation(page, 'search', 301, 'done');
    let current = await latestState(page);
    assert.equal(current.term, 'משיח');
    assert.equal(current.verification.state, 'MATCH');
    const completed = (await operations(page)).filter(operation => operation.kind === 'search' && operation.requestId === 301);
    assert.equal(completed[0].status, 'searching');
    assert.ok(completed.some(operation => operation.status === 'verifying'), 'verification progress precedes a canonical completion');
    assert.deepEqual(completed.filter(operation => ['done', 'error', 'empty'].includes(operation.status)).map(operation => operation.status), ['done']);
    await page.evaluate(() => { window.__mode = 'down'; });
    await nativeSend(page, { type: 'native-search', requestId: 302, request: { kind: 'regular', term: 'אליהו', scope: 'torah' } });
    await waitOperation(page, 'search', 302, 'error');
    current = await latestState(page);
    assert.equal(current.term, 'אליהו');
    assert.equal(current.status, 'candidate');
    assert.equal(current.verification.negative_authority, false);
    assert.ok(!current.axis && !current.matrix, 'a verifier failure exposes no governed coordinates');
    await page.evaluate(() => { window.__mode = 'ok'; });
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term: 'זזזזז', scope: 'torah', seq: 303 } });
    await waitOperation(page, 'search', 303, 'empty');
    current = await latestState(page);
    assert.equal(current.termRaw, 'זזזזז');
    assert.equal(current.status, 'empty');
    assert.equal(current.verification.state, 'LOCAL_NO_HIT');
    assert.equal(current.verification.negative_authority, false, 'empty operation is still only a partial local result');
    for (const [requestId, status] of [[302, 'error'], [303, 'empty']]) {
      const terminal = (await operations(page)).filter(operation => operation.kind === 'search' && operation.requestId === requestId && ['done', 'error', 'empty'].includes(operation.status));
      assert.deepEqual(terminal.map(operation => operation.status), [status]);
    }
    await page.evaluate(() => { window.__holdOracleTerm = 'תורה'; });
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term: 'תורה', scope: 'torah', seq: 304 } });
    await waitOperation(page, 'search', 304, 'verifying');
    await page.waitForFunction(() => window.__heldOracle.some(request => request.term === 'תורה'));
    const boundary = await page.evaluate(() => window.__log.length);
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term: 'אליהו', scope: 'torah', seq: 305 } });
    await waitOperation(page, 'search', 304, 'cancelled');
    await waitOperation(page, 'search', 305, 'done');
    await page.evaluate(() => {
      window.__holdOracleTerm = null;
      for (const request of window.__heldOracle.splice(0)) request.release();
    });
    await page.waitForFunction(() => window.__oraclePending === 0);
    const afterReplacement = await page.evaluate(index => window.__log.slice(index), boundary);
    assert.equal(afterReplacement.some(message => message.type === 'operation' && message.kind === 'search' && message.requestId === 304 && ['done', 'error', 'empty'].includes(message.status)), false, 'superseded main search cannot emit a late completion');
    current = await latestState(page);
    assert.equal(current.term, 'אליהו');
    assert.equal(current.verification.state, 'MATCH', 'late oracle response cannot replace the latest verified search');
  }, { hiddenBridge: true, native2029: true });
});

test('browser: findings operation completion follows canonical verification and an older request cannot complete a newer edit', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    await search(frame, 'משיח');
    await waitState(page, state => state.term === 'משיח' && state.status === 'ok');
    await waitSettledMatrix(page);
    await page.evaluate(() => { window.__holdOracleTerm = 'אל'; });
    await nativeSend(page, { type: 'update-findings', requestId: 401, findings: [{ t: 'אל', color: '#123456' }] });
    await waitOperation(page, 'findings', 401, 'verifying');
    await page.waitForFunction(() => window.__heldOracle.some(request => request.term === 'אל'));
    assert.equal((await operations(page)).some(operation => operation.kind === 'findings' && operation.requestId === 401 && ['done', 'error'].includes(operation.status)), false, 'pending canonical response cannot be reported as completed');
    const boundary = await page.evaluate(() => window.__log.length);
    await nativeSend(page, { type: 'update-findings', requestId: 402, findings: [{ t: 'אל', color: '#654321' }, { t: 'את', color: '#fedcba' }] });
    await waitOperation(page, 'findings', 401, 'cancelled');
    await waitOperation(page, 'findings', 402, 'searching');
    await page.evaluate(() => {
      window.__holdOracleTerm = null;
      for (const request of window.__heldOracle.splice(0)) request.release();
    });
    await waitOperation(page, 'findings', 402, 'done');
    await waitSettledMatrix(page);
    const current = await latestState(page);
    assert.deepEqual(current.findings.map(word => [word.t, word.color]), [['אל', '#654321'], ['את', '#fedcba']], 'latest edit owns the resulting finding list and colors');
    assert.ok(current.findings[0].hits.some(hit => hit.verified && hit.shown), 'completion waits for displayed eligible occurrences to be verified');
    const messagesAfterNewEdit = await page.evaluate(index => window.__log.slice(index), boundary);
    assert.equal(messagesAfterNewEdit.some(message => message.type === 'operation' && message.kind === 'findings' && message.requestId === 401 && ['done', 'error'].includes(message.status)), false, 'superseded operation emits no late terminal completion');
    const progress = (await operations(page)).filter(operation => operation.kind === 'findings' && operation.requestId === 402);
    assert.equal(progress[0].status, 'searching');
    assert.ok(progress.some(operation => operation.status === 'verifying'));
    assert.deepEqual(progress.filter(operation => ['done', 'error'].includes(operation.status)).map(operation => operation.status), ['done']);
    const additional = current.findings[0].hits.find(hit => !hit.selected && !hit.verified);
    assert.ok(additional, 'an unverified extra occurrence is available after the correlated update completes');
    const completedCalls = calls.length, completedEvents = await page.evaluate(() => window.__log.length);
    await nativeSend(page, { type: 'native-finding-control', term: 'אל', action: 'toggle-hit',
      axisHitId: current.axis.hitId, candidateIndex: additional.candidateIndex, revision: additional.revision });
    await page.waitForFunction(index => {
      const state = window.__log.filter(message => message.type === 'state').at(-1);
      return state?.findings?.[0]?.hits.some(hit => hit.candidateIndex === index && hit.selected && hit.shown && hit.verified) && window.__oraclePending === 0;
    }, additional.candidateIndex);
    assert.ok(calls.length > completedCalls, 'later explicit selection really invokes canonical verification');
    assert.equal(await page.evaluate(index => window.__log.slice(index).some(message => message.type === 'operation' && message.kind === 'findings' && message.requestId === 402), completedEvents), false, 'later candidate verification cannot reopen the completed operation');
    assert.equal((await operations(page)).filter(operation => operation.kind === 'findings' && operation.requestId === 402).at(-1).status, 'done');
    await page.evaluate(() => { window.__mode = 'down'; });
    await nativeSend(page, { type: 'update-findings', requestId: 403, findings: [{ t: 'אל', color: '#123456' }] });
    await waitOperation(page, 'findings', 403, 'error');
    const failed = await latestState(page);
    assert.ok(failed.findings[0].hits.some(hit => hit.selected && !hit.verified), 'failed selected occurrences remain opaque candidates');
    assert.ok(failed.findings[0].hits.every(hit => !hit.verified && hit.hitId === null && hit.axisDistance === null));
    assert.equal(failed.matrix.marks.some(mark => mark.color === '#123456'), false, 'failed verification adds no governed finding marks');
  }, { hiddenBridge: true, native2029: true });
});

test('browser: loading an exact matrix cancels pending native search and same-axis finding operations without late completion', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  await withHarness(async ({ page }) => {
    await waitSettledMatrix(page);
    const golden = ELS_GOLDENS.find(fixture => fixture.id === 'torah-50-fwd');
    const expectedHitId = `${golden.skip}_${golden.dir}_${golden.start}`;
    for (const [kind, requestId] of [['search', 501], ['findings', 502]]) {
      if (kind === 'findings') {
        assert.equal((await latestState(page)).axis.hitId, expectedHitId, 'finding cancellation starts on the same exact axis that will be reloaded');
        await nativeSend(page, { type: 'native-control', action: 'finding-count', value: 15 });
        await page.waitForFunction(() => window.__log.filter(message => message.type === 'state').at(-1)?.ui?.showN === 15);
      }
      const term = kind === 'search' ? 'משיח' : 'אל';
      await page.evaluate(word => { window.__holdOracleTerm = word; }, term);
      await nativeSend(page, kind === 'search'
        ? { type: 'native-search', request: { kind: 'regular', term, scope: 'torah', seq: requestId } }
        : { type: 'update-findings', requestId, findings: [{ t: term, color: '#123456' }] });
      await waitOperation(page, kind, requestId, 'verifying');
      await page.waitForFunction(word => window.__heldOracle.some(request => request.term === word), term);
      await nativeSend(page, { type: 'load-matrix', item: golden });
      await waitOperation(page, kind, requestId, 'cancelled');
      await page.waitForFunction(hitId => {
        const current = window.__log.filter(message => message.type === 'state').at(-1);
        return current?.status === 'ok' && current.axis?.hitId === hitId && current.findings?.length === 0 &&
          window.__oraclePending === window.__heldOracle.length && window.__heldOracle.length > 0;
      }, expectedHitId);
      const loaded = await latestState(page), cancellationBoundary = await page.evaluate(() => window.__log.length);
      assert.equal(loaded.term, golden.term);
      assert.equal(loaded.verification.state, 'MATCH');
      await page.evaluate(() => {
        window.__holdOracleTerm = null;
        for (const request of window.__heldOracle.splice(0)) request.release();
      });
      await page.waitForFunction(() => window.__oraclePending === 0);
      await waitSettledMatrix(page);
      assert.deepEqual(await latestState(page), loaded, `${kind}: late oracle results preserve the exact loaded workspace`);
      const laterMessages = await page.evaluate(index => window.__log.slice(index), cancellationBoundary);
      assert.equal(laterMessages.some(message => message.type === 'operation' && message.kind === kind && message.requestId === requestId), false, `${kind}: cancelled operation emits no later progress or completion`);
      const progress = (await operations(page)).filter(operation => operation.kind === kind && operation.requestId === requestId);
      assert.equal(progress[0].status, 'searching');
      assert.ok(progress.some(operation => operation.status === 'verifying'));
      assert.deepEqual(progress.filter(operation => ['done', 'error', 'empty', 'cancelled'].includes(operation.status)).map(operation => operation.status), ['cancelled']);
    }
  }, { hiddenBridge: true, native2029: true });
});

test('browser: a rejected newer search cancels pending verification without relabeling or replacing the original matrix', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    const golden = ELS_GOLDENS.find(fixture => fixture.id === 'torah-50-fwd');
    await nativeSend(page, { type: 'load-matrix', item: golden });
    await page.waitForFunction(id => {
      const current = window.__log.filter(message => message.type === 'state').at(-1);
      return current?.status === 'ok' && current.provenance?.editId === id && window.__oraclePending === 0;
    }, golden.id);
    const before = await latestState(page);
    const beforeGlyphs = await frame.locator('.mc[data-i] .l').allTextContents();
    await page.evaluate(() => { window.__holdOracleTerm = 'משיח'; });
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term: 'משיח', scope: 'torah', seq: 601 } });
    await waitOperation(page, 'search', 601, 'verifying');
    await page.waitForFunction(() => window.__heldOracle.some(request => request.term === 'משיח'));
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term: 'ab', scope: 'torah', seq: 602 } });
    await waitOperation(page, 'search', 601, 'cancelled');
    await waitOperation(page, 'search', 602, 'error');
    const rejectedAt = await page.evaluate(() => window.__log.length);
    assert.equal(calls.some(call => call.payload.term === 'ab'), false, 'non-Hebrew input is rejected before canonical verification');
    await page.evaluate(() => {
      window.__holdOracleTerm = null;
      for (const request of window.__heldOracle.splice(0)) request.release();
    });
    await page.waitForFunction(() => window.__oraclePending === 0);
    assert.deepEqual(await latestState(page), before, 'late verification cannot replace the previous exact matrix');
    assert.deepEqual(await frame.locator('.mc[data-i] .l').allTextContents(), beforeGlyphs, 'the canonical matrix DOM keeps its original letters');
    // Force fresh snapshots after cancellation: an old draft must not become the saved workspace label.
    await nativeSend(page, { type: 'native-control', action: 'heat-toggle' });
    await page.waitForFunction(() => window.__log.filter(message => message.type === 'state').at(-1)?.ui?.heat === true);
    await nativeSend(page, { type: 'native-control', action: 'heat-toggle' });
    await page.waitForFunction(() => window.__log.filter(message => message.type === 'state').at(-1)?.ui?.heat === false);
    const refreshed = await latestState(page);
    assert.equal(refreshed.termRaw, before.termRaw, 'a cancelled pending term cannot relabel the original workspace on its next state emission');
    assert.deepEqual(refreshed, before, 'presentation controls preserve original term, axis, rows and research identity after rejection');
    const laterMessages = await page.evaluate(index => window.__log.slice(index), rejectedAt);
    assert.equal(laterMessages.some(message => message.type === 'operation' && message.kind === 'search' && message.requestId === 601), false, 'the cancelled search emits no later progress or terminal status');
    const progress = await operations(page);
    assert.deepEqual(progress.filter(operation => operation.kind === 'search' && operation.requestId === 601 && ['done', 'error', 'empty', 'cancelled'].includes(operation.status)).map(operation => operation.status), ['cancelled']);
    assert.deepEqual(progress.filter(operation => operation.kind === 'search' && operation.requestId === 602).map(operation => operation.status), ['searching', 'error']);
  }, { hiddenBridge: true, native2029: true });
});

test('browser: native finding radius filters marks, heat and scan targets without losing selections or verifying again', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  await withHarness(async ({ page, calls }) => {
    const golden = ELS_GOLDENS.find(fixture => fixture.id === 'torah-50-fwd');
    await nativeSend(page, { type: 'load-matrix', item: golden });
    await page.waitForFunction(id => {
      const current = window.__log.filter(message => message.type === 'state').at(-1);
      return current?.status === 'ok' && current.provenance?.editId === id;
    }, golden.id);
    await nativeSend(page, { type: 'update-findings', findings: [{ t: 'אל', color: '#123456' }, { t: 'את', color: '#654321' }] });
    await page.waitForFunction(() => window.__log.filter(message => message.type === 'state').at(-1)?.findings?.length === 2);
    await nativeSend(page, { type: 'native-control', action: 'finding-count', value: 15 });
    await page.waitForFunction(() => {
      const current = window.__log.filter(message => message.type === 'state').at(-1);
      return current?.ui?.showN === 15 && current.findings?.[0]?.hits.some(hit => hit.shown && hit.verified) && window.__oraclePending === 0;
    });
    await waitSettledMatrix(page);
    const initial = await latestState(page), word = initial.findings[0];
    const defaultHit = word.hits.find(hit => hit.selected && hit.verified && hit.candidateIndex < 15);
    const extra = word.hits.find(hit => !hit.selected && hit.candidateIndex >= 15);
    assert.ok(defaultHit && extra, 'fixture provides both a selected default and an additional eligible occurrence');
    await nativeSend(page, { type: 'native-finding-control', term: word.t, action: 'toggle-hit', hitId: defaultHit.hitId });
    await page.waitForFunction(id => window.__log.filter(message => message.type === 'state').at(-1)?.findings?.[0]?.hits.some(hit => hit.hitId === id && !hit.selected), defaultHit.hitId);
    await nativeSend(page, { type: 'native-finding-control', term: word.t, action: 'toggle-hit', hitId: extra.hitId,
      axisHitId: initial.axis.hitId, candidateIndex: extra.candidateIndex, revision: extra.revision });
    await page.waitForFunction(index => {
      const current = window.__log.filter(message => message.type === 'state').at(-1);
      return current?.findings?.[0]?.hits.some(hit => hit.candidateIndex === index && hit.selected && hit.shown && hit.verified) && window.__oraclePending === 0;
    }, extra.candidateIndex);
    await nativeSend(page, { type: 'native-control', action: 'heat-toggle' });
    await page.waitForFunction(() => window.__log.filter(message => message.type === 'state').at(-1)?.ui?.heat === true);
    await waitSettledMatrix(page);
    const before = await latestState(page), beforeCalls = calls.length;
    assert.equal(before.ui.findingRadius, null, 'unrestricted radius is the default');
    const selected = before.findings.map(finding => ({ t: finding.t, hits: finding.hits.map(hit => ({ candidateIndex: hit.candidateIndex, selected: hit.selected, hitId: hit.hitId })) }));
    const selectedExtra = before.findings[0].hits.find(hit => hit.candidateIndex === extra.candidateIndex);
    assert.ok(selectedExtra.shown && selectedExtra.verified);
    for (const finding of before.findings) for (const hit of finding.hits.filter(hit => hit.verified)) {
      assert.equal(hit.axisDistance, mainAxisDistance(before, finding.t, hit.hitId));
      assert.equal(hit.withinRadius, true);
    }
    assert.ok(before.findings[0].hits.filter(hit => hit.verified).every(hit => hit.axisDistance > 0), 'the main word תורה shares no letters with אל, so every אל occurrence is outside radius zero');
    assertMarksMatchEffectiveHits(before);
    assertHeatMatchesEffectiveHits(before);
    await nativeSend(page, { type: 'native-control', action: 'finding-radius', value: 0 });
    await page.waitForFunction(() => window.__log.filter(message => message.type === 'state').at(-1)?.ui?.findingRadius === 0);
    const filtered = await latestState(page);
    assert.deepEqual(filtered.axis, before.axis);
    assert.deepEqual(filtered.geometry, before.geometry);
    assert.deepEqual(filtered.matrix.rows, before.matrix.rows);
    assert.equal(filtered.ui.showN, before.ui.showN);
    assert.deepEqual(filtered.findings.map(finding => ({ t: finding.t, hits: finding.hits.map(hit => ({ candidateIndex: hit.candidateIndex, selected: hit.selected, hitId: hit.hitId })) })), selected, 'filtering preserves pre-radius manual/default selection and candidate identity');
    for (const finding of filtered.findings) for (const hit of finding.hits) {
      assert.equal(typeof hit.withinRadius, 'boolean');
      if (hit.verified) assert.equal(hit.withinRadius, mainAxisDistance(filtered, finding.t, hit.hitId) === 0);
      else assert.equal(hit.withinRadius, false, 'active radius never makes an unverified candidate eligible');
      assert.equal(hit.shown, hit.selected && hit.withinRadius, 'shown is the effective selection after filtering');
    }
    assert.deepEqual(filtered.findings[0].shown, [], 'all distant אל occurrences are effectively hidden');
    assert.equal(filtered.matrix.marks.some(mark => mark.color === '#123456'), false, 'far finding colors disappear from matrix marks');
    assert.deepEqual(filtered.matrix.marks.filter(mark => mark.type === 'main'), before.matrix.marks.filter(mark => mark.type === 'main'));
    assertMarksMatchEffectiveHits(filtered);
    assertHeatMatchesEffectiveHits(filtered);
    assert.notDeepEqual(filtered.matrix.heat, before.matrix.heat, 'removing distant marks also changes the heat layer');
    await nativeSend(page, { type: 'request-lens', lens: 'line-context', target: { term: 'אל', hitId: selectedExtra.hitId, scan: true, nativeSeq: 610 } });
    await page.waitForFunction(() => window.__log.some(message => message.target?.nativeSeq === 610));
    const hiddenScan = await page.evaluate(() => window.__log.find(message => message.target?.nativeSeq === 610));
    assert.equal(hiddenScan.ok, false, 'a filtered secondary occurrence cannot become a scan target');
    assert.ok(!hiddenScan.cells && !hiddenScan.scan);
    for (const count of [1, 15]) {
      await nativeSend(page, { type: 'native-control', action: 'finding-count', value: count });
      await page.waitForFunction(expected => window.__log.filter(message => message.type === 'state').at(-1)?.ui?.showN === expected, count);
      const changed = await latestState(page), selectedWord = changed.findings[0];
      assert.equal(selectedWord.hits.find(hit => hit.hitId === defaultHit.hitId).selected, false, 'explicitly hidden default stays hidden when count changes');
      assert.equal(selectedWord.hits.find(hit => hit.hitId === selectedExtra.hitId).selected, true, 'explicitly added hit survives count changes under the filter');
      assert.ok(selectedWord.hits.every(hit => !hit.shown));
    }
    const afterCounts = await latestState(page);
    for (const value of [-1, 101, 1.5, '3', false, {}, undefined]) await nativeSend(page, { type: 'native-control', action: 'finding-radius', value });
    await nativeSend(page, { type: 'request-lens', lens: 'line-context', target: { hitId: before.axis.hitId, nativeSeq: 611 } });
    await page.waitForFunction(() => window.__log.some(message => message.target?.nativeSeq === 611));
    assert.deepEqual(await latestState(page), afterCounts, 'invalid radius values leave the entire research state unchanged');
    await nativeSend(page, { type: 'native-control', action: 'finding-radius', value: null });
    await page.waitForFunction(() => window.__log.filter(message => message.type === 'state').at(-1)?.ui?.findingRadius === null);
    assert.deepEqual(await latestState(page), before, 'clearing the filter restores exact hits, colors, marks, heat, count and manual choices');
    await nativeSend(page, { type: 'native-control', action: 'finding-radius', value: 100 });
    await page.waitForFunction(() => window.__log.filter(message => message.type === 'state').at(-1)?.ui?.findingRadius === 100);
    const widest = await latestState(page);
    for (const finding of widest.findings) for (const hit of finding.hits) {
      if (hit.verified) assert.equal(hit.withinRadius, mainAxisDistance(widest, finding.t, hit.hitId) <= 100);
      else assert.equal(hit.withinRadius, false, 'even the widest active radius rejects opaque candidates');
    }
    assert.deepEqual(widest.axis, before.axis);
    assert.deepEqual(widest.geometry, before.geometry);
    await nativeSend(page, { type: 'native-control', action: 'finding-radius', value: null });
    await page.waitForFunction(() => window.__log.filter(message => message.type === 'state').at(-1)?.ui?.findingRadius === null);
    await nativeSend(page, { type: 'request-lens', lens: 'line-context', target: { term: 'אל', hitId: selectedExtra.hitId, scan: true, nativeSeq: 612 } });
    await page.waitForFunction(() => window.__log.some(message => message.target?.nativeSeq === 612));
    const restoredScan = await page.evaluate(() => window.__log.find(message => message.target?.nativeSeq === 612));
    assert.equal(restoredScan.ok, true, 'cleared filter restores the same selected scan target');
    assert.equal(restoredScan.hitId, selectedExtra.hitId);
    assert.deepEqual(await latestState(page), before);
    assert.equal(calls.length, beforeCalls, 'radius, count restoration and line scans perform no verifier I/O for existing verified selections');
  }, { hiddenBridge: true, native2029: true });
});

test('browser: native and classic niqqud use aligned Torah marks without changing selection, findings, geometry or verifier I/O', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  const niqqud = readFileSync(join(root, 'tools/els/data/niqqud-compact.txt'), 'utf8').split('|');
  assert.equal(niqqud.length, TORAH_LEN, 'compact marks align one-to-one with canonical Torah letters');
  await withHarness(async ({ page, frame, calls }) => {
    const golden = ELS_GOLDENS.find(g => g.id === 'torah-50-fwd');
    await nativeSend(page, { type: 'load-matrix', item: golden });
    await page.waitForFunction(id => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.status === 'ok' && current.provenance?.editId === id && window.__oraclePending === 0;
    }, golden.id);
    await nativeSend(page, { type: 'update-findings', findings: [{ t: 'אל', color: '#5465ff' }] });
    await page.waitForFunction(() => window.__log.filter(m => m.type === 'state').at(-1)?.findings?.[0]?.hits?.length > 0 && window.__oraclePending === 0);
    const initial = await latestState(page);
    if (!initial.findings[0].hits.some(hit => hit.shown && hit.verified)) {
      const candidate = initial.findings[0].hits.find(hit => !hit.shown);
      assert.ok(candidate, 'an additional ELS finding is available beside the plain-text defaults');
      await nativeSend(page, { type: 'native-finding-control', term: 'אל', action: 'toggle-hit',
        axisHitId: initial.axis.hitId, candidateIndex: candidate.candidateIndex, revision: candidate.revision });
    }
    await page.waitForFunction(() => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.findings?.[0]?.hits?.some(hit => hit.shown && hit.verified) &&
        current.findings.every(word => word.hits.every(hit => !hit.shown || hit.verified)) && window.__oraclePending === 0;
    });
    await frame.locator('.selbtn').click();
    for (const index of golden.positions.slice(0, 2)) await frame.locator(`.mc[data-i="${index}"]`).click();
    // A presentation state emission captures the existing manual selection before the toggle.
    await nativeSend(page, { type: 'native-control', action: 'axis-visibility' });
    await nativeSend(page, { type: 'native-control', action: 'axis-visibility' });
    await page.waitForFunction(() => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.ui?.selCells?.length === 2 && !current.ui.hideMain && window.__oraclePending === 0;
    });
    const before = await latestState(page), beforeCalls = calls.length;
    assert.deepEqual(before.ui.selCells, golden.positions.slice(0, 2));
    assert.ok(!before.matrix.niqqud && !before.matrix.lenses.includes('niqqud'));
    const withoutNiqqud = state => {
      const matrix = { ...state.matrix, lenses: state.matrix.lenses.filter(lens => lens !== 'niqqud') };
      delete matrix.niqqud;
      return { ...state, ui: { ...state.ui, niqqud: false }, matrix };
    };
    const scroll = () => page.evaluate(() => {
      const w = document.querySelector('#t').contentWindow, box = w.document.querySelector('.matrix-box');
      return { hostX: scrollX, hostY: scrollY, toolX: w.scrollX, toolY: w.scrollY, matrixX: box?.scrollLeft, matrixY: box?.scrollTop };
    });
    const beforeScroll = await scroll();
    await nativeSend(page, { type: 'native-control', action: 'niqqud-toggle' });
    await page.waitForFunction(() => window.__log.filter(m => m.type === 'state').at(-1)?.ui?.niqqud === true);
    const marked = await latestState(page), expected = [];
    assert.equal(marked.matrix.niqqud.source, 'torah_compact');
    for (let row = before.geometry.r0; row <= before.geometry.r1; row++) for (let column = before.geometry.c0; column < before.geometry.c0 + before.geometry.cw; column++) {
      const i = row * before.geometry.S + column;
      if (i >= 0 && i < TORAH_LEN && niqqud[i]) expected.push({ i, marks: niqqud[i] });
    }
    assert.ok(expected.length > 0, 'fixture displays pointed Torah letters');
    assert.deepEqual(marked.matrix.niqqud.cells, expected, 'every projected mark comes from its aligned canonical Torah index');
    assert.deepEqual(withoutNiqqud(marked), before, 'display marks preserve all canonical research and selected cells');
    assert.deepEqual(await scroll(), beforeScroll, 'native toggle preserves host, tool and matrix scroll');
    assert.equal(calls.length, beforeCalls, 'niqqud performs no verifier or search requests');
    for (const { i, marks } of expected.slice(0, 3)) assert.equal(await frame.locator(`.mc[data-i="${i}"] .l`).textContent(), letters[i] + marks, 'classic glyph is updated from the same marks');
    await frame.locator('#nqbtn').click();
    await page.waitForFunction(() => window.__log.filter(m => m.type === 'state').at(-1)?.ui?.niqqud === false);
    assert.deepEqual(await latestState(page), before, 'classic toggle removes the optional marks and restores the exact state');
    assert.equal(calls.length, beforeCalls, 'classic toggle also avoids verification I/O');

    // Choose an actual governed Tanakh search result; a capped discovery need not retain an arbitrary known hit.
    const term = 'משיח';
    await nativeSend(page, { type: 'native-search', request: { kind: 'regular', term, scope: 'tanakh' } });
    await page.waitForFunction(expectedTerm => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.status === 'ok' && current.scope === 'tanakh' && current.term === expectedTerm && window.__oraclePending === 0;
    }, term);
    const corpusId = '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b';
    const outside = calls.filter(call => call.op === 'verify_batch' && call.payload.scope === 'tanakh' && call.payload.term === term)
      .flatMap(call => call.payload.candidates)
      .find(hit => Math.min(hit.start, hit.start + hit.dir * hit.skip * (term.length - 1)) - 10 * hit.skip >= TORAH_LEN &&
        oracleVerify({ scope: 'tanakh', corpus_id: corpusId, term, candidates: [hit] }).result.verified.length === 1);
    assert.ok(outside, 'the verified Tanakh search contains an occurrence safely beyond Torah coverage');
    await nativeSend(page, { type: 'load-matrix', item: { id: 'niqqud-outside-torah', term, scope: 'tanakh', ...outside } });
    await page.waitForFunction(hitId => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.status === 'ok' && current.axis?.hitId === hitId && current.provenance?.editId === 'niqqud-outside-torah' && window.__oraclePending === 0;
    }, `${outside.skip}_${outside.dir}_${outside.start}`);
    const tanakhBefore = await latestState(page), tanakhCalls = calls.length;
    assert.ok(tanakhBefore.geometry.r0 * tanakhBefore.geometry.S + tanakhBefore.geometry.c0 >= TORAH_LEN, 'fixture window is outside compact Torah coverage');
    await nativeSend(page, { type: 'native-control', action: 'niqqud-toggle' });
    await page.waitForFunction(() => window.__log.filter(m => m.type === 'state').at(-1)?.ui?.niqqud === true);
    const tanakhMarked = await latestState(page);
    assert.deepEqual(tanakhMarked.matrix.niqqud, { source: 'torah_compact', cells: [] }, 'Tanakh-only letters never reuse Torah marks');
    assert.deepEqual(withoutNiqqud(tanakhMarked), tanakhBefore);
    assert.equal(calls.length, tanakhCalls);
  });
});

test('browser: optional native heat reflects verified display density, excludes candidates and preserves research state without I/O', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    const golden = ELS_GOLDENS.find(g => g.id === 'torah-50-fwd');
    await nativeSend(page, { type: 'load-matrix', item: golden });
    await page.waitForFunction(id => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.status === 'ok' && current.provenance?.editId === id;
    }, golden.id);
    const before = await latestState(page), beforeCalls = calls.length;
    assert.ok(!before.matrix.heat && !before.matrix.lenses.includes('heat'), 'heat is absent until requested');
    const withoutHeat = state => {
      const matrix = { ...state.matrix, lenses: state.matrix.lenses.filter(lens => lens !== 'heat') };
      delete matrix.heat;
      return { ...state, ui: { ...state.ui, heat: false }, matrix };
    };
    await nativeSend(page, { type: 'native-control', action: 'heat-toggle' });
    await page.waitForFunction(() => window.__log.filter(m => m.type === 'state').at(-1)?.ui?.heat === true);
    const heated = await latestState(page);
    assert.equal(heated.matrix.heat.source, 'display_density');
    assert.equal(heated.matrix.heat.radius, 2);
    assert.ok(heated.matrix.lenses.includes('heat'));
    assert.deepEqual(withoutHeat(heated), before, 'heat changes no occurrence, finding, selection, mark or research window');
    assert.equal(calls.length, beforeCalls, 'heat performs no search or verifier I/O');

    // Independent display oracle: inspect every visible cell against verified canonical marks.
    // Row/column distance does not wrap; weights are clipped at the transmitted window boundary.
    const geometry = before.geometry, raw = new Map();
    for (let row = geometry.r0; row <= geometry.r1; row++) for (let column = geometry.c0; column < geometry.c0 + geometry.cw; column++) {
      const index = row * geometry.S + column;
      if (index >= before.corpusLetters) continue;
      let density = 0;
      for (const mark of before.matrix.marks) {
        const vertical = row - Math.floor(mark.i / geometry.S), horizontal = column - mark.i % geometry.S;
        if (Math.abs(vertical) <= 2 && Math.abs(horizontal) <= 2) density += 1 / (1 + vertical ** 2 + horizontal ** 2);
      }
      if (density > 0) raw.set(index, density);
    }
    const maximum = Math.max(...raw.values()), actual = new Map(heated.matrix.heat.cells.map(cell => [cell.i, cell.strength]));
    assert.equal(actual.size, raw.size, 'only cells touched by verified density are transmitted');
    assert.equal(heated.matrix.heat.cells.length, actual.size, 'density cells have unique canonical indexes');
    for (const [index, density] of raw) assert.ok(Math.abs(actual.get(index) - density / maximum) < 1e-12, `density at corpus index ${index}`);
    assert.ok(heated.matrix.heat.cells.every(cell => cell.i >= 0 && cell.i < before.corpusLetters && cell.strength > 0 && cell.strength <= 1));
    assert.ok(heated.matrix.heat.cells.some(cell => Math.floor(cell.i / geometry.S) === geometry.r0), 'the fixture exercises top-edge clipping');

    await page.evaluate(() => { window.__mode = 'down'; });
    await nativeSend(page, { type: 'update-findings', findings: [{ t: 'אל', color: '#5465ff' }] });
    await page.waitForFunction(() => window.__log.filter(m => m.type === 'state').at(-1)?.findings?.[0]?.hits?.length > 0);
    const candidateState = await latestState(page), candidate = candidateState.findings[0].hits.find(hit => !hit.shown) || candidateState.findings[0].hits[0];
    if (!candidate.shown) await nativeSend(page, { type: 'native-finding-control', term: 'אל', action: 'toggle-hit',
      axisHitId: candidateState.axis.hitId, candidateIndex: candidate.candidateIndex, revision: candidate.revision });
    await page.waitForFunction(index => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.findings?.[0]?.hits?.some(hit => hit.candidateIndex === index && hit.shown && !hit.verified) &&
        window.__log.some(message => message.type === 'engine-request' && message.payload?.term === 'אל') && window.__oraclePending === 0;
    }, candidate.candidateIndex);
    const withCandidate = await latestState(page), candidateCalls = calls.length;
    assert.ok(withCandidate.findings[0].candidateShown > 0, 'an unverified finding is selected');
    assert.ok(withCandidate.findings[0].hits.every(hit => !hit.verified && hit.hitId === null && hit.axisDistance === null));
    assert.deepEqual(withCandidate.matrix.marks, heated.matrix.marks, 'candidates add no governed marks');
    assert.deepEqual(withCandidate.matrix.heat, heated.matrix.heat, 'candidates add no density');
    await nativeSend(page, { type: 'native-control', action: 'heat-toggle' });
    await page.waitForFunction(() => window.__log.filter(m => m.type === 'state').at(-1)?.ui?.heat === false);
    const cooled = await latestState(page);
    assert.ok(!cooled.matrix.heat && !cooled.matrix.lenses.includes('heat'), 'turning heat off removes the payload');
    assert.deepEqual(withoutHeat(cooled), withoutHeat(withCandidate));
    assert.equal(calls.length, candidateCalls, 'turning heat off does not reverify a candidate');
    await frame.locator('.heatbtn').click();
    await page.waitForFunction(() => window.__log.filter(m => m.type === 'state').at(-1)?.ui?.heat === true);
    assert.deepEqual((await latestState(page)).matrix.heat, heated.matrix.heat, 'the classic heat action emits the same native density state');
    assert.equal(calls.length, candidateCalls, 'the classic heat toggle also has no verifier I/O');
  });
});

test('browser: axis word scan reads the canonical line, matches literal corpus text and preserves research state', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    const golden = ELS_GOLDENS.find(g => g.id === 'torah-kedosha-10065-fwd');
    await nativeSend(page, { type: 'load-matrix', item: golden });
    await waitState(page, (m) => m.status === 'ok' && m.provenance?.editId === 'torah-kedosha-10065-fwd');
    const before = await latestState(page), beforeCalls = calls.length;
    await nativeSend(page, { type: 'request-lens', lens: 'line-context', target: { hitId: before.axis.hitId, scan: true, nativeSeq: 721 } });
    await page.waitForFunction(() => window.__log.some(m => m.lens === 'line-context' && m.target?.nativeSeq === 721));
    const line = await page.evaluate(() => window.__log.find(m => m.lens === 'line-context' && m.target?.nativeSeq === 721));
    assert.equal(line.ok, true);
    assert.equal(line.scan.status, 'CANDIDATE');
    assert.equal(line.scan.source, 'legacy_els_dict');
    assert.ok(line.cells.length <= before.length + 160);
    const step = before.axis.direction === 'back' ? -before.axis.skip : before.axis.skip;
    for (let i = 0; i < line.cells.length; i++) {
      assert.equal(line.cells[i].letter, letters[line.cells[i].i]);
      if (i) assert.equal(line.cells[i].i - line.cells[i - 1].i, step);
    }
    const sequence = line.cells.map(c => c.letter).join('');
    const dictionary = JSON.parse(readFileSync(join(root, 'tools/els/els-code.template.html'), 'utf8').match(/const DICT=(\[[^;]+\]);/)[1]);
    const normalized = (word) => word.replace(/[^א-ת]/g, '').replace(/[ךםןףץ]/g, c => ({ ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' })[c]);
    const expected = [...new Set(dictionary.map(normalized))].filter(term => term.length >= 3 && term !== golden.term && sequence.includes(term));
    assert.deepEqual(line.scan.words.map(w => w.term), expected);
    assert.ok(line.scan.words.length > 0, 'real axis has inspectable dictionary words');
    for (const word of line.scan.words) {
      for (const match of word.matches) {
        assert.equal(sequence.slice(match.at, match.at + match.length), word.term);
        assert.equal(match.length, word.term.length);
      }
      assert.ok(!('hitId' in word) && !('verified' in word), 'lexical candidates never become verified findings');
    }
    assert.equal(calls.length, beforeCalls, 'line scan makes no new search/verifier requests');
    assert.deepEqual(await latestState(page), before, 'inspection preserves axis, findings, selection and geometry');
    await nativeSend(page, { type: 'request-lens', lens: 'line-context', target: { hitId: 'stale-axis', scan: true, nativeSeq: 722 } });
    await page.waitForFunction(() => window.__log.some(m => m.target?.nativeSeq === 722));
    const stale = await page.evaluate(() => window.__log.find(m => m.target?.nativeSeq === 722));
    assert.equal(stale.ok, false);
    assert.ok(!stale.scan && !stale.cells, 'stale axis cannot leak a line or words');
  });
});

test('browser: native color and reorder preserve selected hits, axis and geometry without verification I/O; line lens is bounded', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
  await withHarness(async ({ page, frame, calls }) => {
    await search(frame, 'משיח');
    await waitState(page, (m) => m.status === 'ok' && m.term === 'משיח');
    await nativeSend(page, { type: 'update-findings', findings: [{ t: 'אל', color: '#123456' }, { t: 'את', color: '#654321' }] });
    await page.waitForFunction(() => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.findings?.length === 2 && current.findings[0].hits?.some(hit => hit.verified && hit.shown);
    });
    const initial = await latestState(page), finding = initial.findings[0], hit = finding.hits.find(h => h.shown && h.verified);
    assert.ok(hit, 'verified shown hit available');
    assert.ok(initial.findings.every(w => w.hits.every(h => h.verified ? h.skip >= 2 : h.skip === null && h.hitId === null && h.axisDistance === null && h.clusterDistance === null)), 'unverified candidates carry no coordinates or distances');
    const [axisSkip, axisDir, axisStart] = initial.axis.hitId.split('_').map(Number);
    const axisPositions = Array.from({ length: initial.length }, (_, i) => axisStart + axisDir * axisSkip * i);
    for (const word of initial.findings) for (const occurrence of word.hits.filter(h => h.verified)) {
      const [skip, dir, start] = occurrence.hitId.split('_').map(Number);
      let expectedDistance = Infinity;
      for (let i = 0; i < word.t.length; i++) for (const anchor of axisPositions) {
        const position = start + dir * skip * i;
        const rows = Math.abs(Math.floor(position / axisSkip) - Math.floor(anchor / axisSkip));
        const columns = Math.abs(position % axisSkip - anchor % axisSkip);
        expectedDistance = Math.min(expectedDistance, rows + Math.min(columns, axisSkip - columns));
      }
      assert.equal(occurrence.axisDistance, expectedDistance, 'main-axis distance agrees with canonical coordinates');
      assert.ok(Number.isInteger(occurrence.clusterDistance) && occurrence.clusterDistance >= 0);
      assert.ok(occurrence.clusterDistance <= occurrence.axisDistance, 'cluster includes the main axis');
    }
    const additional = finding.hits.find(candidate => !candidate.shown);
    assert.ok(additional, 'a further secondary occurrence is available');
    await nativeSend(page, { type: 'native-finding-control', term: finding.t, action: 'toggle-hit', hitId: additional.hitId,
      axisHitId: initial.axis.hitId, candidateIndex: additional.candidateIndex, revision: additional.revision });
    await page.waitForFunction(index => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.findings?.[0]?.hits?.some(candidate => candidate.candidateIndex === index && candidate.shown && candidate.verified);
    }, additional.candidateIndex);
    await nativeSend(page, { type: 'native-finding-control', term: finding.t, action: 'toggle-hit', hitId: hit.hitId });
    await page.waitForFunction(id => {const s=window.__log.filter(m=>m.type==='state').at(-1);return s?.findings?.[0]?.hits?.some(h=>h.hitId===id&&!h.shown);}, hit.hitId);
    const selected = await latestState(page);
    await nativeSend(page, { type: 'native-control', action: 'zoom-in' });
    await waitState(page, (m) => m.ui?.zoom > 1);
    // Canonical zoom rebuilds its legacy matrix; settle that before measuring list-only edits.
    await page.waitForFunction(() => window.__log.filter(m => m.type === 'state').at(-1)?.findings?.every(word => word.hits?.every(candidate => !candidate.shown || candidate.verified)));
    const before = await latestState(page), beforeCalls = calls.length;
    await nativeSend(page, { type: 'update-findings', findings: before.findings.map((w, i) => ({ t: w.t, color: i ? w.color : '#abcdef' })) });
    await waitState(page, (m) => m.findings?.[0]?.color === '#abcdef');
    await nativeSend(page, { type: 'native-finding-control', term: finding.t, action: 'move-down' });
    await waitState(page, (m) => m.findings?.[1]?.color === '#abcdef');
    const after = await latestState(page);
    assert.deepEqual(after.findings[1].shown, selected.findings[0].shown, 'hidden choice survives color and reorder');
    assert.deepEqual(after.axis, before.axis);
    assert.deepEqual(after.geometry, before.geometry);
    assert.equal(after.ui.zoom, before.ui.zoom);
    assert.equal(calls.length, beforeCalls, 'color and order do not verify or search again');
    await nativeSend(page, { type: 'request-lens', lens: 'line-context', target: { hitId: after.axis.hitId, nativeSeq: 987 } });
    await page.waitForFunction(() => window.__log.some(m => m.lens === 'line-context' && m.target?.nativeSeq === 987));
    const lens = await page.evaluate(() => window.__log.find(m => m.lens === 'line-context' && m.target?.nativeSeq === 987));
    assert.equal(lens.ok, true);
    assert.ok(lens.cells.length <= 160 + after.length);
    assert.ok(lens.cells.every(c => c.i >= 0 && c.i < TORAH_LEN && c.letter === letters[c.i]));
    assert.equal(lens.cells.filter(c => c.main).map(c => c.letter).join(''), 'משיח');
    assert.equal(calls.length, beforeCalls, 'line lens is a read-only projection');
    const secondary = after.findings[1], secondaryHit = secondary.hits.find(h => h.shown && h.verified);
    assert.ok(secondaryHit, 'a displayed secondary axis is available for scanning');
    await nativeSend(page, { type: 'request-lens', lens: 'line-context', target: { term: secondary.t, hitId: secondaryHit.hitId, scan: true, nativeSeq: 989 } });
    await page.waitForFunction(() => window.__log.some(m => m.target?.nativeSeq === 989));
    const secondaryLine = await page.evaluate(() => window.__log.find(m => m.target?.nativeSeq === 989));
    assert.equal(secondaryLine.ok, true);
    assert.equal(secondaryLine.hitId, secondaryHit.hitId);
    assert.equal(secondaryLine.cells.filter(c => c.main).map(c => c.letter).join(''), secondary.t);
    const secondarySequence = secondaryLine.cells.map(c => c.letter).join('');
    const [secondarySkip, secondaryDir] = secondaryHit.hitId.split('_').map(Number);
    for (let i = 0; i < secondaryLine.cells.length; i++) {
      assert.equal(secondaryLine.cells[i].letter, letters[secondaryLine.cells[i].i]);
      if (i) assert.equal(secondaryLine.cells[i].i - secondaryLine.cells[i - 1].i, secondarySkip * secondaryDir);
    }
    const dictionary = JSON.parse(readFileSync(join(root, 'tools/els/els-code.template.html'), 'utf8').match(/const DICT=(\[[^;]+\]);/)[1]);
    const normalized = word => word.replace(/[^א-ת]/g, '').replace(/[ךםןףץ]/g, c => ({ ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' })[c]);
    const expectedWords = [...new Set(dictionary.map(normalized))].filter(term => term.length >= 3 && term !== secondary.t && secondarySequence.includes(term));
    assert.deepEqual(secondaryLine.scan.words.map(w => w.term), expectedWords, 'secondary scan uses the same literal dictionary');
    for (const word of secondaryLine.scan.words) for (const match of word.matches) {
      assert.equal(secondarySequence.slice(match.at, match.at + match.length), word.term);
    }
    await nativeSend(page, { type: 'request-lens', lens: 'line-context', target: { term: secondary.t, hitId: hit.hitId, scan: true, nativeSeq: 990 } });
    await page.waitForFunction(() => window.__log.some(m => m.target?.nativeSeq === 990));
    const hiddenLine = await page.evaluate(() => window.__log.find(m => m.target?.nativeSeq === 990));
    assert.equal(hiddenLine.ok, false, 'hidden secondary occurrence is rejected instead of falling back to another hit');
    assert.ok(!hiddenLine.cells && !hiddenLine.scan);
    assert.deepEqual(await latestState(page), after, 'secondary scans preserve exact research state');
    assert.equal(calls.length, beforeCalls, 'secondary scans make no search or verification requests');
    await nativeSend(page, { type: 'request-lens', lens: 'verse-context', target: { hitId: after.axis.hitId, nativeSeq: 988 } });
    await page.waitForFunction(() => window.__log.some(m => m.lens === 'verse-context' && m.target?.nativeSeq === 988));
    const source = await page.evaluate(() => window.__log.find(m => m.lens === 'verse-context' && m.target?.nativeSeq === 988));
    assert.equal(source.ok, true);
    assert.ok(source.verses.length > 0);
    for (const ref of [source.span.fromRef, source.span.toRef, ...source.verses.map(v => v.ref)]) {
      assert.match(ref, /[א-ת׳״]+, [א-ת׳״]+$/u, 'chapter and verse use shared readable separation');
      assert.ok(!ref.includes(':') && !ref.includes('"'));
    }
    // Canonical dialog and save event, acknowledged by the test host only; no live database writes.
    await nativeSend(page, { type: 'native-action', action: 'save' });
    await frame.locator('.sh-desc').fill('בדיקת שימור צבעים ובחירת מופעים במטריצה');
    await frame.locator('.sh-save').click();
    await page.waitForFunction(() => window.__log.some(m => m.type === 'save'));
    const saved = await page.evaluate(() => window.__log.find(m => m.type === 'save'));
    assert.equal(saved.term, 'משיח');
    assert.ok(JSON.stringify(saved).includes('#abcdef'), 'canonical save carries edited colors');
    await page.evaluate(() => { window.__log = window.__log.filter(m => m.type !== 'state'); });
    await nativeSend(page, { type: 'load-matrix', item: {
      term: saved.term, scope: saved.scope, skip: saved.skip, start: saved.start,
      dir: saved.direction === 'back' ? -1 : 1, words: saved.findings, hideMain: saved.hideMain,
    } });
    await page.waitForFunction(() => {
      const current = window.__log.filter(m => m.type === 'state').at(-1);
      return current?.status === 'ok' && current.findings?.[1]?.color === '#abcdef' && current.findings[1].shown.length > 0 &&
        current.findings.every(word => word.hits.every(candidate => !candidate.shown || candidate.verified));
    });
    const restored = await latestState(page);
    assert.deepEqual(restored.axis, after.axis, 'reopen uses the exact saved axis');
    assert.deepEqual(restored.findings.map(w => [w.t, w.color, w.shown]), after.findings.map(w => [w.t, w.color, w.shown]), 'reopen preserves colors, order and verified selection');
  });
});

test('browser: native finding can show three verified occurrences then hide exactly one; stale candidate handles are rejected', { skip: !canRun && 'Playwright/Chromium unavailable', timeout: 180000 }, async () => {
  await withHarness(async ({page, frame}) => {
    await search(frame, 'משיח');
    await waitState(page, m=>m.status==='ok' && m.term==='משיח');
    await nativeSend(page,{type:'update-findings',findings:[{t:'אל',color:'#5465ff'}]});
    await page.waitForFunction(() => {
      const current = window.__log.filter(message => message.type === 'state').at(-1);
      return current?.term === 'משיח' && current.findings?.length === 1 && current.findings[0].t === 'אל' &&
        current.findings[0].color === '#5465ff' && current.findings[0].hits?.some(hit => hit.verified && hit.shown);
    });
    let current=await latestState(page);
    for(let n=0;n<3 && current.findings[0].shown.length<3;n++) {
      const candidate=current.findings[0].hits.find(h=>!h.shown);
      assert.ok(candidate,'additional occurrence available');
      await nativeSend(page,{type:'native-finding-control',term:'אל',action:'toggle-hit',hitId:candidate.hitId,axisHitId:current.axis.hitId,candidateIndex:candidate.candidateIndex,revision:candidate.revision});
      await page.waitForFunction(index=>{const s=window.__log.filter(m=>m.type==='state').at(-1);return s?.findings?.[0]?.hits?.some(h=>h.candidateIndex===index&&h.shown&&h.verified);},candidate.candidateIndex,{timeout:5000}).catch(async error=>{throw new Error(JSON.stringify({candidate,latest:(await latestState(page)).findings}),{cause:error});});
      current=await latestState(page);
    }
    const shown=current.findings[0].shown;
    assert.equal(shown.length,3);
    await nativeSend(page,{type:'native-finding-control',term:'אל',action:'toggle-hit',hitId:shown[1]});
    await page.waitForFunction(()=>window.__log.filter(m=>m.type==='state').at(-1)?.findings?.[0]?.shown?.length===2);
    const hidden=await latestState(page);
    assert.deepEqual(hidden.findings[0].shown,[shown[0],shown[2]],'only selected occurrence hidden');
    for (const count of [1, 4, 2]) {
      await nativeSend(page,{type:'native-control',action:'finding-count',value:count});
      await page.waitForFunction(expected=>window.__log.filter(m=>m.type==='state').at(-1)?.ui?.showN===expected,count);
      await page.waitForFunction(id=>window.__log.filter(m=>m.type==='state').at(-1)?.findings?.[0]?.shown?.includes(id),shown[2]);
      await page.waitForFunction(()=>window.__log.filter(m=>m.type==='state').at(-1)?.findings?.[0]?.hits?.every(h=>!h.shown||h.verified));
      const changed=await latestState(page);
      assert.deepEqual(changed.axis,hidden.axis,'count changes preserve the main axis');
      assert.deepEqual(changed.geometry,hidden.geometry,'count changes preserve the research window');
      assert.ok(!changed.findings[0].shown.includes(shown[1]),'an explicitly hidden occurrence stays hidden');
      assert.ok(changed.findings[0].shown.includes(shown[2]),'an explicitly added occurrence stays shown');
    }
    await page.waitForFunction(()=>window.__log.filter(m=>m.type==='state').at(-1)?.findings?.[0]?.shown?.length===2);
    const restoredCount=await latestState(page);
    assert.deepEqual(restoredCount.findings[0].shown,hidden.findings[0].shown,'restoring the count restores the exact selected occurrences');
    for (const value of [0,16,1.5,'3',null]) await nativeSend(page,{type:'native-control',action:'finding-count',value});
    await nativeSend(page,{type:'request-lens',lens:'line-context',target:{hitId:hidden.axis.hitId,nativeSeq:320}});
    await page.waitForFunction(()=>window.__log.some(m=>m.target?.nativeSeq===320));
    assert.deepEqual(await latestState(page),restoredCount,'invalid count values do not mutate engine state');
    const remaining=hidden.findings[0].hits.find(h=>!h.shown);
    await nativeSend(page,{type:'native-finding-control',term:'אל',action:'toggle-hit',axisHitId:hidden.axis.hitId,candidateIndex:remaining.candidateIndex,revision:remaining.revision+1});
    await nativeSend(page,{type:'request-lens',lens:'line-context',target:{hitId:hidden.axis.hitId,nativeSeq:321}});
    await page.waitForFunction(()=>window.__log.some(m=>m.lens==='line-context'&&m.target?.nativeSeq===321));
    assert.deepEqual((await latestState(page)).findings[0].shown,hidden.findings[0].shown,'stale handle leaves selection intact');
  });
});

test('browser: saved literal source selection restores separately from verified ELS ids', {skip:!canRun&&'Playwright/Chromium unavailable',timeout:120000},async()=>{
  await withHarness(async({page,frame})=>{
    await nativeSend(page,{type:'native-search',request:{kind:'cross',axis:'משיח טבת עשירי',term:'ישלח מלאכו',scope:'torah',windowSize:'small',seq:901}});
    await waitState(page,m=>m.term==='משיחטבתעשירי'&&m.matrix?.sourceMarks?.length===9);
    await frame.locator('.save-act, .save').first().click();
    await frame.locator('.sh-desc').fill('בדיקת שמירת רצף המקור ישלח מלאכו עם הציר משיח טבת עשירי');
    await frame.locator('.sh-save').click();
    await page.waitForFunction(()=>window.__log.some(m=>m.type==='save'));
    const saved=await page.evaluate(()=>window.__log.find(m=>m.type==='save'));
    assert.deepEqual(saved.findings[0].sh,[]);
    assert.deepEqual(saved.findings[0].sourceShown,['1_1_29729']);
    await nativeSend(page,{type:'load-matrix',item:{...saved,words:saved.findings,id:'source-roundtrip',dir:saved.direction==='back'?-1:1}});
    await waitState(page,m=>m.provenance?.editId==='source-roundtrip'&&m.matrix?.sourceMarks?.length===9);
    const restored=await latestState(page);
    assert.equal(restored.geometry.cw,40);assert.equal(restored.ui.ctxR,2);
    assert.deepEqual(restored.findings[0].shown,[]);
    assert.equal(restored.findings[0].sourceHits[0].hitId,'1_1_29729');
    assert.equal(restored.findings[0].sourceHits[0].shown,true);
  },{native2029:true});
});
