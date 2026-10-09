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

async function withHarness(fn, { mode = 'ok' } = {}) {
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
    res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(HARNESS.replace("window.__mode='ok'", "window.__mode=" + JSON.stringify(mode)));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true,
      ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
    const page = await browser.newPage();
    await page.addInitScript(() => { try { localStorage.setItem('tzofen_onboarded_v1', '1'); } catch { /* noop */ } });
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
    await waitState(page,m=>m.findings?.[0]?.hits?.some(h=>h.verified));
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
