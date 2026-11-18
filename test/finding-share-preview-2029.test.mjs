// Finding share previews (ZURIEL 18.11.2026): an explicit calculator share and a focused finding on a number page get a preview that names the
// finding; a value is stated only when the server's own regular gematria agrees. Runs the REAL document handler; the network is forbidden.
import test from 'node:test';
import assert from 'node:assert/strict';
import { publicReadingDocumentHandler } from '../public-reading-deploy/api/public-document.js';

const SITE = 'https://sod1820.co.il';
const document = '<html><head><title>2029</title></head><body><div id="root"></div></body></html>';
const response = () => ({ code: null, headers: new Map(), body: '', setHeader(k, v) { this.headers.set(k.toLowerCase(), v); }, status(code) { this.code = code; return this; }, send(body) { this.body = String(body); return this; } });
const request = path => ({ method: 'GET', headers: { host: 'sod1820.co.il' }, url: path,
  query: { ...Object.fromEntries(new URL(path, SITE).searchParams), path: new URL(path, SITE).pathname } });
const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document });
async function served(path) {
  const original = globalThis.fetch;
  // Only the database is answered (empty rows, an indexable number); any other host is forbidden.
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (!u.startsWith('https://linswmnnkjxvweumprav.supabase.co/')) throw new Error('network forbidden in this test: ' + u);
    return new Response(u.includes('/rpc/') ? 'true' : '[]', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try { const res = response(); await handler(request(path), res); return res; } finally { globalThis.fetch = original; }
}
const dec = t => t.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
const title = res => dec(res.body.match(/<title>([^<]*)<\/title>/)?.[1] || '');
const ogImage = res => dec(res.body.match(/<meta property="og:image" content="([^"]*)"/)?.[1] || '');
const canonical = res => dec(res.body.match(/<link rel="canonical" href="([^"]*)"/)?.[1] || '');
const q = (p, o) => `${p}?${new URLSearchParams(o)}`;

test('calculator: an explicit share names the expression, the method and the verified result', async () => {
  const res = await served(q('/gematria', { q: 'משיח בן דוד', m: 'רגיל', v: '424', s: 'abc123' }));
  assert.match(title(res), /^משיח בן דוד = 424 · גימטריה רגילה/);
  const img = new URL(ogImage(res));
  assert.equal(img.pathname, '/api/card');
  assert.equal(img.searchParams.get('w'), 'משיח בן דוד');
  assert.equal(img.searchParams.get('n'), '424');
  assert.equal(img.searchParams.get('k'), 'calc');
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, follow');
});

test('calculator: a value the server does not compute to is never stated', async () => {
  const wrong = await served(q('/gematria', { q: 'משיח בן דוד', m: 'רגיל', v: '999', s: 'abc123' }));
  assert.doesNotMatch(title(wrong), /999/);
  assert.equal(new URL(ogImage(wrong)).searchParams.get('n'), null);
  const other = await served(q('/gematria', { q: 'משיח', m: 'אתבש', v: '1', s: 'abc123' }));
  assert.match(title(other), /^משיח · שיטה: אתבש/);
  assert.equal(new URL(ogImage(other)).searchParams.get('n'), null);
});

test('calculator: without an explicit share id the preview stays the calculator page', async () => {
  const res = await served(q('/gematria', { q: 'משיח בן דוד', m: 'רגיל', v: '424' }));
  assert.match(title(res), /מחשבון גימטריה/);
});

test('number page: a focused finding is named; "= N" only when it computes; the canonical stays the number page', async () => {
  const yes = await served(q('/number/26', { focus: 'יהוה', method: 'רגיל' }));
  assert.match(title(yes), /^יהוה = 26 · דף המספר/);
  assert.equal(canonical(yes), `${SITE}/number/26`);
  assert.equal(new URL(ogImage(yes)).searchParams.get('k'), 'number');
  const no = await served(q('/number/27', { focus: 'יהוה' }));
  assert.match(title(no), /^יהוה · דף המספר 27/);
  assert.equal(new URL(ogImage(no)).searchParams.get('n'), null);
  const page = await served('/number/26');
  assert.doesNotMatch(title(page), /יהוה/, 'the bare page keeps its own preview');
});

// ── The pieces the sharer sees and sends (pure) ──
test('finding share: the card, the words and the "what will be sent" list name the same finding; nothing else is listed', async () => {
  const { build } = await import('esbuild');
  const { fileURLToPath } = await import('node:url');
  const { outputFiles } = await build({ entryPoints: [fileURLToPath(new URL('../src/lib/share.js', import.meta.url))], bundle: true, format: 'esm',
    platform: 'browser', write: false, logLevel: 'silent', define: { 'import.meta.env': '{}' } });
  const m = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
  const card = new URL(m.findingCardUrl({ kind: 'calc', expression: 'משיח בן דוד', value: 424, method: 'גימטריה רגילה' }));
  assert.deepEqual(Object.fromEntries(card.searchParams), { w: 'משיח בן דוד', n: '424', sub: 'גימטריה רגילה', k: 'calc' });
  assert.equal(m.findingShareMessage({ kind: 'calc', expression: 'משיח בן דוד', value: 424, method: 'גימטריה רגילה' }), 'משיח בן דוד = 424 בגימטריה רגילה. מה מסתתר בשם שלך?');
  assert.equal(m.findingShareMessage({ kind: 'number', expression: 'יהוה', value: 26, method: 'רגיל', number: 26 }), 'יהוה = 26 ברגיל · דף המספר 26. איזה פסוק שווה למספר שלך?');
  const rows = m.findingDisclosure({ kind: 'number', expression: 'יהוה', value: 26, method: 'רגיל', number: 26,
    url: 'https://sod1820.co.il/number/26?focus=%D7%99%D7%94%D7%95%D7%94&method=%D7%A8%D7%92%D7%99%D7%9C' });
  assert.deepEqual(rows.map(([k]) => k), ['ביטוי', 'שיטה', 'תוצאה', 'מספר', 'קישור']);
  assert.equal(rows.at(-1)[1], 'sod1820.co.il/number/26?focus=יהוה&method=רגיל', 'the link is shown readable');
  assert.doesNotMatch(JSON.stringify(rows), /rid=|token|@/, 'no device id, token or account detail in what is listed');
  assert.match(m.FINDING_NOT_SENT, /לא נשלח/);
  assert.doesNotMatch(JSON.stringify(m.FINDING_HOOK), /יודע עליך/, 'no "what the number knows about you"');
});

test("speed law: the finding-share button carries no share helpers; the sheet loads on press, with a live status meanwhile", async () => {
  const { readFileSync } = await import("node:fs");
  const button = readFileSync(new URL("../src/components/experience2029/FindingShare2029.jsx", import.meta.url), "utf8");
  const sheet = readFileSync(new URL("../src/components/experience2029/FindingShareSheet2029.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(button, /lib\/share\.js/, "the button module does not import the share helpers (they would join the number page's opening graph)");
  assert.match(button, /React\.lazy\(\(\) => import\("\.\/FindingShareSheet2029\.jsx"\)\)/);
  assert.match(button, /aria-busy="true"[\s\S]*?<p role="status">פותח את השיתוף…<\/p>/, "operation visibility: a status while the sheet loads");
  assert.match(sheet, /from "\.\.\/\.\.\/lib\/share\.js"/);
  assert.match(sheet, /aria-label="מה יישלח"/, "the sheet still lists exactly what will be sent");
  assert.match(sheet, /closest\("\.sod29-root"\) \|\| document\.body/, "rendered into the frame root, above the bottom bar");
});

test("an invitation to share sits right where a calculation ends (ZURIEL 18.11.2026): one line, the existing share section", async () => {
  const { readFileSync } = await import("node:fs");
  for (const page of ["Calculator2029Page.jsx", "CalculatorPro2029Page.jsx"]) {
    const src = readFileSync(new URL(`../src/pages/${page}`, import.meta.url), "utf8");
    assert.match(src, /<span>מצאתם משהו מעניין\? שתפו את הגילוי<\/span>/, page);
  }
});
