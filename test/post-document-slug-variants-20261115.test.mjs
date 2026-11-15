// Post document speed (15.11.2026): the spellings of one post address are requested together, not one after another.
// Measured on the live site (read-only): every imported WordPress post (790 of 1,323 records) is stored percent-encoded in lower case, so the document
// function asked for the decoded spelling first, waited a complete iad1 -> Tokyo round trip for an empty answer, and only then asked for the stored one.
// This contract pins: the requests overlap; the first spelling still wins when both exist; a failed request still falls through to the next spelling;
// an earlier hit never leaves an unobserved rejection; an address with one spelling and a `?p=` address make exactly one request, as before.
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

// A recording Supabase REST stand-in: answers by exact slug / wp_id, optionally after a delay, and tracks how many requests are in flight at once.
function supabase({ bySlug = {}, byWpId = {}, delayMs = 0, fail = () => false } = {}) {
  const log = []; let inFlight = 0, maxInFlight = 0;
  const fetchImpl = async raw => {
    const url = new URL(String(raw));
    const slugFilter = url.searchParams.get('slug'), wpFilter = url.searchParams.get('wp_id');
    const entry = { slug: slugFilter?.replace(/^eq\./, '') ?? null, wp: wpFilter?.replace(/^eq\./, '') ?? null, startedAt: performance.now(), finishedAt: null };
    log.push(entry); inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      if (delayMs) await new Promise(resolve => setTimeout(resolve, typeof delayMs === 'function' ? delayMs(entry, log) : delayMs));
      if (fail(entry, log)) throw new Error('network');
      const found = entry.slug != null ? bySlug[entry.slug] : byWpId[entry.wp];
      return { ok: true, status: 200, headers: new Headers({ 'content-range': '*/0' }), json: async () => (found ? [found] : []), text: async () => '[]' };
    } finally { entry.finishedAt = performance.now(); inFlight -= 1; }
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

test('an imported WordPress post is requested under both spellings at once: one round trip, not two', async () => {
  const stand = supabase({ bySlug: { [ENCODED_LOWER]: row(ENCODED_LOWER, 'פוסט מיובא') }, delayMs: 60 });
  const started = performance.now();
  const result = await ask('/' + SLUG_TEXT, stand);
  const elapsed = performance.now() - started;
  assert.equal(result.status, 200);
  assert.match(result.title, /^פוסט מיובא/);
  assert.equal(stand.log.length, 2, 'exactly the two spellings are requested');
  assert.deepEqual(stand.log.map(entry => entry.slug), [SLUG_TEXT, ENCODED_LOWER], 'decoded spelling first, stored spelling second, as before');
  assert.equal(stand.maxInFlight, 2, 'both requests are in flight together');
  assert.ok(stand.log[1].startedAt < stand.log[0].finishedAt, 'the second request starts before the first one has answered');
  assert.ok(elapsed < 60 * 1.9, `one round trip of 60 ms, not two (took ${Math.round(elapsed)} ms)`);
});

test('when both spellings exist the first one still wins (same preference as the sequential reads)', async () => {
  const stand = supabase({ bySlug: {
    [SLUG_TEXT]: row(SLUG_TEXT, 'הצורה המפוענחת'),
    [ENCODED_LOWER]: row(ENCODED_LOWER, 'הצורה המקודדת', { id: 322 }),
  }, delayMs: entry => (entry.slug === SLUG_TEXT ? 40 : 5) });
  const result = await ask('/' + SLUG_TEXT, stand);
  assert.equal(result.status, 200);
  assert.match(result.title, /^הצורה המפוענחת/, 'the faster second answer must not displace the first spelling');
});

test('a failed request for one spelling falls through to the other, exactly as the sequential loop did', async () => {
  const stand = supabase({ bySlug: { [ENCODED_LOWER]: row(ENCODED_LOWER, 'נמצא בצורה השנייה') }, delayMs: 5,
    fail: entry => entry.slug === SLUG_TEXT });
  const result = await ask('/' + SLUG_TEXT, stand);
  assert.equal(result.status, 200);
  assert.match(result.title, /^נמצא בצורה השנייה/);
});

test('both requests failing is a retryable 503; both empty is a 404 (unchanged answers)', async () => {
  const failing = await ask('/' + SLUG_TEXT, supabase({ fail: () => true }));
  assert.equal(failing.status, 503);
  const missing = await ask('/' + SLUG_TEXT, supabase({}));
  assert.equal(missing.status, 404);
});

test('an earlier hit ends the read without leaving an unobserved rejection from the later request', async () => {
  const unhandled = [];
  const onUnhandled = reason => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const stand = supabase({ bySlug: { [SLUG_TEXT]: row(SLUG_TEXT, 'נמצא מיד') },
      delayMs: entry => (entry.slug === SLUG_TEXT ? 5 : 60), fail: entry => entry.slug !== SLUG_TEXT });
    const result = await ask('/' + SLUG_TEXT, stand);
    assert.equal(result.status, 200);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.deepEqual(unhandled, [], 'the late failure of the second request is observed');
  } finally { process.off('unhandledRejection', onUnhandled); }
});

test('an address with a single spelling makes one request', async () => {
  const stand = supabase({ bySlug: { 'native-post': { ...baseRow, id: 5135, wp_id: null, source: 'ai', slug: 'native-post', title: 'פוסט מודרני', link: null } } });
  const result = await ask('/post/native-post', stand);
  assert.equal(result.status, 200);
  assert.equal(stand.log.length, 1);
  assert.equal(stand.log[0].slug, 'native-post');
});

test('a WordPress ?p= address still reads the record once, by id', async () => {
  const stand = supabase({ byWpId: { 20001: row(ENCODED_LOWER, 'לפי מזהה') } });
  const result = await ask('/', stand, { query: { p: '20001' } });
  assert.equal(result.status, 200);
  assert.deepEqual(stand.log.map(entry => entry.wp), ['20001']);
  assert.equal(stand.maxInFlight, 1);
});
