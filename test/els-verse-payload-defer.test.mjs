import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
const templatePath = join(root, 'tools/els/els-code.template.html');
const generatedPath = join(root, 'public/tzofen.html');
const sourcePath = join(root, 'tools/els/data/tk-vtext.txt');
const letters = readFileSync(join(root, 'tools/els/data/tk-letters.txt'), 'utf8');
const TORAH_LEN = 304805;

const sha256 = value => createHash('sha256').update(value).digest('hex');
const generatedText = () => readFileSync(generatedPath, 'utf8');
const assetMetadata = html => {
  const url = html.match(/const VERSE_TEXT_ASSET="([^"]+)"/i)?.[1];
  const sourceSha = html.match(/VERSE_TEXT_SHA256="([0-9a-f]{64})"/i)?.[1];
  const sourceBytes = Number(html.match(/VERSE_TEXT_BYTES=(\d+)/i)?.[1]);
  assert.ok(url && sourceSha && Number.isSafeInteger(sourceBytes), 'generated engine declares the verse display asset contract');
  return { url, sourceSha, sourceBytes, path: join(root, 'public', url.replace(/^\/+/, '')) };
};

test('generator emits a deterministic content-addressed display payload with exact source bytes', () => {
  const source = readFileSync(sourcePath);
  const beforeHtml = readFileSync(generatedPath);
  const beforeMeta = assetMetadata(beforeHtml.toString('utf8'));
  const beforeAsset = readFileSync(beforeMeta.path);

  for (let pass = 0; pass < 2; pass++) {
    const result = spawnSync('python3', ['tools/els/build.py'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }

  const afterHtml = readFileSync(generatedPath);
  const afterMeta = assetMetadata(afterHtml.toString('utf8'));
  const afterAsset = readFileSync(afterMeta.path);
  assert.ok(afterHtml.equals(beforeHtml), 'tzofen.html is byte-deterministic across rebuilds');
  assert.ok(afterAsset.equals(beforeAsset), 'verse display asset is byte-deterministic across rebuilds');
  assert.equal(afterMeta.url, `/els-data/tk-vtext.${sha256(source).slice(0, 16)}.gzdata`);
  assert.equal(afterMeta.sourceSha, sha256(source));
  assert.equal(afterMeta.sourceBytes, source.length);
  assert.ok(gunzipSync(afterAsset).equals(source), 'decompressed asset equals tk-vtext.txt byte-for-byte');
  assert.equal(afterAsset.readUInt32LE(4), 0, 'gzip mtime is zero');
  assert.ok(!afterMeta.url.startsWith('http'), 'asset stays on the current origin');
  assert.match(afterMeta.url, /\.gzdata$/, 'custom binary suffix does not ask the server to apply Content-Encoding');

  const html = afterHtml.toString('utf8');
  assert.doesNotMatch(html, /id="verse-text"|__VERSE_TEXT_/);
  assert.doesNotMatch(html, /_idle\(\(\)=>\{ensureVerseText\(\);\}\)/, 'no mount/idle verse-text preload remains');
  assert.match(html, /if\(_vtextPending\)return _vtextPending/);
  assert.match(html, /finally\(\(\)=>\{if\(!VTEXT\)_vtextPending=null;\}\)/, 'failed loads release the shared promise for retry');
  assert.match(readFileSync(templatePath, 'utf8'), /cache:attempt\?"reload":"default"/);
});

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  for (const candidate of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return req(candidate); } catch { /* try the next known installation */ }
  }
  return null;
}

const playwright = loadPlaywright();
const chromiumPath = process.env.CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : null);
const canRunBrowser = Boolean(playwright && chromiumPath);

test('CI: deferred verse payload browser acceptance must not be skipped when required', () => {
  if (process.env.ELS_REQUIRE_EXECUTABLE) {
    assert.ok(canRunBrowser, 'ELS_REQUIRE_EXECUTABLE=1 requires Playwright and Chromium');
  }
});

const HARNESS = `<!doctype html><meta charset=utf-8><body><iframe id=t src="/tzofen.html?embed=1&bridge=hidden&experience=2029" style="width:1200px;height:900px"></iframe><script>
window.__log=[];const frame=document.getElementById('t');
addEventListener('message',async event=>{const message=event.data;if(!message||message.source!=='tzofen'||event.source!==frame.contentWindow)return;
 window.__log.push(message);
 if(message.type==='ready')frame.contentWindow.postMessage({source:'sod-host',type:'tier',tier:'admin'},location.origin);
 if(message.type==='engine-request'){
  const reply=await fetch('/oracle',{method:'POST',body:JSON.stringify({op:message.op,payload:message.payload})}).then(response=>response.json());
  frame.contentWindow.postMessage({source:'sod-host',type:'engine-result',requestId:message.requestId,...reply},location.origin);
 }
});
</script>`;

function verifyBatch(payload) {
  const limit = payload.scope === 'tanakh' ? letters.length : TORAH_LEN;
  const corpusId = payload.scope === 'tanakh'
    ? '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b'
    : '0b022e8eef6f9c16';
  if (payload.corpus_id !== corpusId) return { ok: true, result: { status: 'CORPUS_MISMATCH' } };
  const term = payload.term.replace(/[^א-ת]/g, '');
  const verified = [];
  for (const candidate of payload.candidates) {
    let matches = Number.isInteger(candidate.skip) && candidate.skip >= 2 && [1, -1].includes(candidate.dir) && Number.isInteger(candidate.start);
    for (let index = 0; matches && index < term.length; index++) {
      const corpusIndex = candidate.start + candidate.dir * candidate.skip * index;
      if (corpusIndex < 0 || corpusIndex >= limit || letters[corpusIndex] !== term[index]) matches = false;
    }
    if (matches) verified.push({ skip: candidate.skip, dir: candidate.dir, start: candidate.start });
  }
  return { ok: true, result: { status: 'OK', corpus_id: corpusId, verified }, trace_id: `verse-payload-${verified.length}` };
}

async function withBrowser(assetReplies, run, { assetDelayMs = 0 } = {}) {
  const tool = readFileSync(generatedPath);
  const metadata = assetMetadata(tool.toString('utf8'));
  const asset = readFileSync(metadata.path);
  const wrongAsset = gzipSync(Buffer.from('טקסט פסוק שאינו המקור הקנוני\n', 'utf8'), { level: 9, mtime: 0 });
  const assetRequests = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://loopback.test');
    if (url.pathname === metadata.url) {
      const reply = assetReplies[Math.min(assetRequests.length, assetReplies.length - 1)] || 'success';
      assetRequests.push(url.pathname + url.search);
      const finish = () => {
        if (reply === '404') { response.statusCode = 404; response.end('missing'); return; }
        response.setHeader('content-type', 'application/octet-stream');
        response.end(reply === 'corrupt' ? wrongAsset : asset);
      };
      if (assetDelayMs) setTimeout(finish, assetDelayMs); else finish();
      return;
    }
    if (url.pathname === '/oracle' && request.method === 'POST') {
      let body = '';
      request.on('data', chunk => { body += chunk; });
      request.on('end', () => {
        const message = JSON.parse(body);
        const result = message.op === 'verify_batch' ? verifyBatch(message.payload) : { ok: false, error: 'unsupported_test_operation' };
        response.setHeader('content-type', 'application/json'); response.end(JSON.stringify(result));
      });
      return;
    }
    if (url.pathname === '/tzofen.html') {
      response.setHeader('content-type', 'text/html; charset=utf-8'); response.end(tool); return;
    }
    response.setHeader('content-type', 'text/html; charset=utf-8'); response.end(HARNESS);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true, executablePath: chromiumPath });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error)));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const frame = page.frameLocator('#t');
    await frame.locator('#q').waitFor({ timeout: 60000 });
    await page.waitForFunction(() => window.__log.some(message => message.type === 'ready'), null, { timeout: 60000 });
    await run({ page, frame, assetRequests, sourceRows: readFileSync(sourcePath, 'utf8').split('\n') });
    assert.deepEqual(pageErrors, [], 'no uncaught browser errors');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

async function search(page, frame) {
  await frame.locator('#q').fill('משיח');
  await frame.locator('#go').click();
  await page.waitForFunction(() => window.__log.some(message => message.type === 'state' && message.term === 'משיח' && message.status === 'ok'), null, { timeout: 120000 });
  return page.evaluate(() => window.__log.filter(message => message.type === 'state' && message.term === 'משיח' && message.status === 'ok').at(-1));
}

async function requestSourceLenses(page, state, sequence) {
  const index = state.matrix.marks.find(mark => mark.type === 'main')?.i;
  assert.ok(Number.isInteger(index), 'verified matrix exposes a visible main letter');
  await page.evaluate(({ hitId, index: letterIndex, sequence: seq }) => {
    const target = document.getElementById('t').contentWindow;
    target.postMessage({ source: 'sod-host', type: 'request-lens', lens: 'verse-context', target: { hitId, nativeSeq: seq } }, location.origin);
    target.postMessage({ source: 'sod-host', type: 'request-lens', lens: 'letter-context', target: { i: letterIndex, nativeSeq: seq + 1 } }, location.origin);
  }, { hitId: state.axis.hitId, index, sequence });
}

test('browser: mount, idle and regular search make zero display-payload requests; source actions share one',
  { skip: !canRunBrowser && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
    await withBrowser(['success'], async ({ page, frame, assetRequests, sourceRows }) => {
      await page.waitForTimeout(1200);
      assert.equal(assetRequests.length, 0, 'mount and idle do not request verse display text');
      const state = await search(page, frame);
      assert.equal(assetRequests.length, 0, 'regular ELS search does not request verse display text');

      await requestSourceLenses(page, state, 100);
      await page.waitForFunction(() => [100, 101].every(seq => window.__log.some(message => message.type === 'lens' && message.target?.nativeSeq === seq)), null, { timeout: 60000 });
      assert.equal(assetRequests.length, 1, 'concurrent source actions share one in-flight request');
      const lenses = await page.evaluate(() => window.__log.filter(message => message.type === 'lens' && [100, 101].includes(message.target?.nativeSeq)));
      assert.ok(lenses.every(lens => lens.ok), JSON.stringify(lenses));
      const verseLens = lenses.find(lens => lens.lens === 'verse-context');
      const letterLens = lenses.find(lens => lens.lens === 'letter-context');
      assert.ok(verseLens.verses.every(verse => verse.text === sourceRows[verse.verseIndex]), 'verse lens returns exact canonical source rows');
      assert.equal(letterLens.verse.text, sourceRows[letterLens.location.verseIndex], 'letter lens returns the exact canonical source row');

      await page.evaluate(hitId => document.getElementById('t').contentWindow.postMessage({
        source: 'sod-host', type: 'request-lens', lens: 'verse-context', target: { hitId, nativeSeq: 102 },
      }, location.origin), state.axis.hitId);
      await page.waitForFunction(() => window.__log.some(message => message.type === 'lens' && message.target?.nativeSeq === 102));
      assert.equal(assetRequests.length, 1, 'loaded display text is reused without a second request');
    }, { assetDelayMs: 150 });
  });

test('browser: missing and corrupt payloads fail closed for display, then a later action retries successfully',
  { skip: !canRunBrowser && 'Playwright/Chromium unavailable', timeout: 300000 }, async () => {
    await withBrowser(['404', 'corrupt', 'success'], async ({ page, frame, assetRequests, sourceRows }) => {
      const state = await search(page, frame);
      assert.equal(assetRequests.length, 0);
      for (const sequence of [200, 202]) {
        await page.evaluate(({ hitId, sequence: seq }) => document.getElementById('t').contentWindow.postMessage({
          source: 'sod-host', type: 'request-lens', lens: 'verse-context', target: { hitId, nativeSeq: seq },
        }, location.origin), { hitId: state.axis.hitId, sequence });
        await page.waitForFunction(seq => window.__log.some(message => message.type === 'lens' && message.target?.nativeSeq === seq), sequence, { timeout: 60000 });
        const failed = await page.evaluate(seq => window.__log.find(message => message.type === 'lens' && message.target?.nativeSeq === seq), sequence);
        assert.equal(failed.ok, false, 'display request fails closed');
        assert.equal(failed.verses, undefined, 'failed display never invents verse content');
        const current = await page.evaluate(() => window.__log.filter(message => message.type === 'state' && message.status === 'ok').at(-1));
        assert.equal(current.axis.hitId, state.axis.hitId, 'display failure does not alter the ELS result');
      }
      assert.deepEqual(assetRequests, [assetRequests[0].replace(/\?.*$/, ''), `${assetRequests[0].replace(/\?.*$/, '')}?retry=1`]);

      await page.evaluate(hitId => document.getElementById('t').contentWindow.postMessage({
        source: 'sod-host', type: 'request-lens', lens: 'verse-context', target: { hitId, nativeSeq: 204 },
      }, location.origin), state.axis.hitId);
      await page.waitForFunction(() => window.__log.some(message => message.type === 'lens' && message.target?.nativeSeq === 204), null, { timeout: 60000 });
      const recovered = await page.evaluate(() => window.__log.find(message => message.type === 'lens' && message.target?.nativeSeq === 204));
      assert.equal(recovered.ok, true);
      assert.ok(recovered.verses.every(verse => verse.text === sourceRows[verse.verseIndex]), 'retry restores exact canonical display text');
      assert.equal(assetRequests.length, 3);
      assert.match(assetRequests[2], /\?retry=2$/);
    });
  });
