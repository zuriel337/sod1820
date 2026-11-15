// Post document speed (15.11.2026): the spellings of one post address are asked for in ONE request, not one after the other.
// Measured on the live site (read-only): every imported WordPress post (790 of 1,323 records) is stored percent-encoded in lower case, so the document
// function asked for the decoded spelling first, waited a complete iad1 -> Tokyo round trip for an empty answer, and only then asked for the stored one.
// This contract pins: both spellings in one request (whatever the state of the connection pool); the first spelling still wins when both exist; the
// answer is judged exactly as before (the filter owns matching); when that request fails the previous behaviour is kept exactly (one request per
// spelling, one after the other, each with its own failure handling) and 503/404 answers are unchanged; an address with one spelling and a `?p=` address
// make exactly one request, as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import ogHandler from '../api/og.js';
import { PUBLIC_READING_PROFILE_ID } from '../src/lib/publicReadingRelease2029.js';

const SITE = 'https://sod1820.co.il';
const SLUG_TEXT = 'תפילה-לרפואה-של-רבי-שלמה-יהודה-הינוקא';
const ENCODED_LOWER = encodeURIComponent(SLUG_TEXT).replace(/%[0-9A-F]{2}/g, match => match.toLowerCase());
const baseRow = { id: 321, wp_id: 20001, source: 'wordpress', link: null, excerpt: 'תפילה לרפואה שלמה.', content: '<p>תפילה לרפואה שלמה.</p>',
  image_url: null, date: '2020-01-01T00:00:00+00:00', modified: null, tags: [], categories: [], author: null };
const row = (slug, title, extra = {}) => ({ ...baseRow, slug, title, link: `${SITE}/${slug}/`, ...extra });

// A recording Supabase REST stand-in. `slug=eq.<v>`, `slug=in.(<v>,<w>)` and `wp_id=eq.<n>` are answered from the given rows; `in` answers in the order given
// by `inOrder` ('asked' or 'reverse'); `fail` makes a request throw; `answer` replaces the rows of every request (a fake that ignores the filter).
function supabase({ bySlug = {}, byWpId = {}, inOrder = 'asked', fail = () => false, answer = null } = {}) {
  const log = []; let inFlight = 0, maxInFlight = 0;
  const fetchImpl = async raw => {
    const url = new URL(String(raw));
    const slugFilter = url.searchParams.get('slug'), wpFilter = url.searchParams.get('wp_id');
    const entry = { kind: slugFilter?.startsWith('in.(') ? 'in' : slugFilter ? 'eq' : 'wp_id', limit: url.searchParams.get('limit'), raw: String(raw), values: [] };
    if (entry.kind === 'in') entry.values = slugFilter.slice(4, -1).split(',').map(value => value.replace(/^"|"$/g, ''));
    if (entry.kind === 'eq') entry.values = [slugFilter.slice(3)];
    if (entry.kind === 'wp_id') entry.values = [wpFilter.slice(3)];
    log.push(entry); inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      await Promise.resolve();
      if (fail(entry, log)) throw new Error('network');
      let rows = answer ?? (entry.kind === 'wp_id' ? [byWpId[entry.values[0]]] : entry.values.map(value => bySlug[value])).filter(Boolean);
      if (entry.kind === 'in' && inOrder === 'reverse') rows = [...rows].reverse();
      return { ok: true, status: 200, headers: new Headers({ 'content-range': '*/0' }), json: async () => rows, text: async () => '[]' };
    } finally { inFlight -= 1; }
  };
  return { fetchImpl, log, get maxInFlight() { return maxInFlight; } };
}

async function ask(path, stand, { query = {} } = {}) {
  const previous = globalThis.fetch;
  globalThis.fetch = stand.fetchImpl;
  const res = { headers: new Map(), code: 200, body: '', setHeader(k, v) { this.headers.set(String(k).toLowerCase(), v); }, status(c) { this.code = c; return this; }, send(b) { this.body = String(b); return this; } };
  try {
    await ogHandler({ method: 'GET', url: '/api/og?path=' + encodeURIComponent(path), headers: { host: 'sod1820.co.il', 'x-forwarded-proto': 'https' },
      publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true, publicRequestedPath: path,
      publicReadingSearch: '', query: { path, crawler: 'search', ...query } }, res);
  } finally { globalThis.fetch = previous; }
  return { status: res.code, body: res.body, title: (res.body.match(/<title>([^<]*)/) || [])[1] };
}

test('an imported WordPress post is looked up with ONE request that names both spellings', async () => {
  const stand = supabase({ bySlug: { [ENCODED_LOWER]: row(ENCODED_LOWER, 'פוסט מיובא') } });
  const result = await ask('/' + SLUG_TEXT, stand);
  assert.equal(result.status, 200);
  assert.match(result.title, /^פוסט מיובא/);
  assert.equal(stand.log.length, 1, 'one request, not one per spelling');
  assert.equal(stand.log[0].kind, 'in');
  assert.deepEqual(stand.log[0].values, [SLUG_TEXT, ENCODED_LOWER], 'the decoded spelling first, the stored one second');
  assert.equal(stand.log[0].limit, '2', 'two rows are enough to apply the preference');
  assert.equal(stand.maxInFlight, 1);
});

test('when both spellings exist the first one still wins, whatever order the database answers in', async () => {
  const bySlug = { [SLUG_TEXT]: row(SLUG_TEXT, 'הצורה המפוענחת'), [ENCODED_LOWER]: row(ENCODED_LOWER, 'הצורה המקודדת', { id: 322 }) };
  for (const inOrder of ['asked', 'reverse']) {
    const result = await ask('/' + SLUG_TEXT, supabase({ bySlug, inOrder }));
    assert.equal(result.status, 200);
    assert.match(result.title, /^הצורה המפוענחת/, inOrder);
  }
});

test('the answer is judged exactly as before: a row is accepted whatever its slug text, because the filter owns matching', async () => {
  const result = await ask('/' + SLUG_TEXT, supabase({ answer: [row('some-other-text', 'שורה שהמסנן החזיר')] }));
  assert.equal(result.status, 200);
  assert.match(result.title, /^שורה שהמסנן החזיר/);
});

test('both spellings absent is a 404 from the one request, with no per-spelling retries', async () => {
  const stand = supabase({});
  const result = await ask('/' + SLUG_TEXT, stand);
  assert.equal(result.status, 404);
  assert.equal(stand.log.length, 1);
});

test('when the one request fails the previous behaviour is kept exactly: one request per spelling, one after the other', async () => {
  // The combined request and the first spelling fail; the stored spelling answers: found, as the sequential loop did.
  const stand = supabase({ bySlug: { [ENCODED_LOWER]: row(ENCODED_LOWER, 'נמצא בצורה השנייה') },
    fail: entry => entry.kind === 'in' || (entry.kind === 'eq' && entry.values[0] === encodeURIComponent(SLUG_TEXT)) || (entry.kind === 'eq' && entry.values[0] === SLUG_TEXT) });
  const result = await ask('/' + SLUG_TEXT, stand);
  assert.equal(result.status, 200);
  assert.match(result.title, /^נמצא בצורה השנייה/);
  assert.deepEqual(stand.log.map(entry => entry.kind), ['in', 'eq', 'eq'], 'the combined request, then each spelling in turn');
  assert.equal(stand.maxInFlight, 1, 'never two at once');
  // Everything fails: retryable 503. The combined request fails and each spelling is empty: 404.
  assert.equal((await ask('/' + SLUG_TEXT, supabase({ fail: () => true }))).status, 503);
  assert.equal((await ask('/' + SLUG_TEXT, supabase({ fail: entry => entry.kind === 'in' }))).status, 404);
});

test('an address with a single spelling makes one `eq` request, as before', async () => {
  const stand = supabase({ bySlug: { 'native-post': { ...baseRow, id: 5135, wp_id: null, source: 'ai', slug: 'native-post', title: 'פוסט מודרני', link: null } } });
  const result = await ask('/post/native-post', stand);
  assert.equal(result.status, 200);
  assert.equal(stand.log.length, 1);
  assert.equal(stand.log[0].kind, 'eq');
  assert.equal(stand.log[0].limit, '1');
});

test('a WordPress ?p= address still reads the record once, by id', async () => {
  const stand = supabase({ byWpId: { 20001: row(ENCODED_LOWER, 'לפי מזהה') } });
  const result = await ask('/', stand, { query: { p: '20001' } });
  assert.equal(result.status, 200);
  assert.deepEqual(stand.log.map(entry => [entry.kind, entry.values[0], entry.limit]), [['wp_id', '20001', '1']]);
});

test('a spelling that contains a PostgREST list character is quoted inside the list', async () => {
  const stand = supabase({});
  await ask('/a,b', stand);
  assert.equal(stand.log[0].kind, 'in');
  const listed = new URL(stand.log[0].raw).searchParams.get('slug');
  assert.equal(listed, 'in.("a,b",a%2cb)');
});
