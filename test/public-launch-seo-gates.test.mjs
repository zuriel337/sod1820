import test from 'node:test';
import assert from 'node:assert/strict';
import ogHandler from '../api/og.js';
import sitemapHandler from '../api/sitemap-public.js';

const SITE = 'https://sod1820.co.il';
const pathsByFlag = {
  lock_world: ['/world', '/topic/public-subject', '/researcher/private-corpus'],
  lock_books: ['/books', '/book', '/book/source', '/books/source'],
  lock_life_journey: ['/journey', '/journey-beta', '/מסע', '/2029/journey'],
  lock_number: ['/number', '/number/1237', '/number/ביטוי', '/numbers', '/numbers/1237', '/2029/number', '/2029/number/1237'],
  lock_heichal: ['/heichal', '/היכל'],
  lock_raziel_site: ['/raziel', '/2029/raziel'],
};
const gatedPaths = Object.values(pathsByFlag).flat();
const strictPaths = Object.entries(pathsByFlag).filter(([key]) => key !== 'lock_world').flatMap(([, paths]) => paths);
const existingWorldPaths = pathsByFlag.lock_world;
const publicPaths = ['/post/public', '/code', '/gematria', '/bookcase', '/numbered'];
const retiredPaths = ['/forum', '/forum/thread', '/community/chat'];
const xml = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  + [...gatedPaths, ...publicPaths, ...retiredPaths].map(path => `<url><loc>${SITE}${encodeURI(path)}</loc><lastmod>2026-10-13</lastmod></url>`).join('')
  + '</urlset>';

function response() {
  return {
    headers: new Map(), body: '', code: null,
    setHeader(key, value) { this.headers.set(key.toLowerCase(), value); },
    status(code) { this.code = code; return this; },
    send(body) { this.body = String(body); return this; },
  };
}

async function invoke(handler, fetchImpl, query = {}) {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    return fetchImpl(String(url), options);
  };
  try {
    const res = response();
    await handler({ query }, res);
    return { ...res, calls };
  } finally { globalThis.fetch = previous; }
}

const flagResponse = rows => ({ ok: true, json: async () => rows });
const launchRows = (enabled, mode = 'all') => Object.keys(pathsByFlag).map(key => ({ key, enabled, mode }));
const sitemapFetch = flagRead => async url => url === `${SITE}/api/sitemap`
  ? { ok: true, text: async () => xml }
  : flagRead(url);

function assertLocs(result, present, absent) {
  assert.equal(result.code, 200);
  for (const path of present) assert.ok(result.body.includes(`<loc>${SITE}${encodeURI(path)}</loc>`), `missing public URL ${path}`);
  for (const path of absent) assert.ok(!result.body.includes(`<loc>${SITE}${encodeURI(path)}</loc>`), `closed URL leaked ${path}`);
}

test('sitemap preserves default-open World when flags are missing while unfinished launch gates stay closed', async () => {
  const result = await invoke(sitemapHandler, sitemapFetch(async () => flagResponse([])));
  assertLocs(result, [...publicPaths, ...existingWorldPaths], [...strictPaths, ...retiredPaths]);
  const flagReads = result.calls.filter(url => url.includes('/site_flags?'));
  assert.equal(flagReads.length, 1, 'availability must be read in one batch');
  for (const key of Object.keys(pathsByFlag)) assert.ok(flagReads[0].includes(key));
  assert.equal(result.headers.get('cache-control'), 'public, max-age=300, s-maxage=300');
});

for (const mode of ['all', 'anon']) {
  test(`sitemap enabled/${mode} excludes all gated URL families and aliases`, async () => {
    const result = await invoke(sitemapHandler, sitemapFetch(async () => flagResponse([
      ...launchRows(true, mode), { key: 'lock_convergence_tree', enabled: true, mode },
    ])));
    assertLocs(result, publicPaths, [...gatedPaths, ...retiredPaths, '/numbers']);
  });
}

test('sitemap explicitly open flags preserve canonical URLs and never revive the retired forum', async () => {
  const result = await invoke(sitemapHandler, sitemapFetch(async () => flagResponse([
    ...launchRows(false), { key: 'lock_convergence_tree', enabled: false, mode: 'all' },
  ])));
  assertLocs(result, [...publicPaths, ...gatedPaths, '/numbers'], retiredPaths);
});

test('legacy numbers aliases require Number and convergence admission while convergence missing-row default is preserved', async () => {
  for (const convergenceRow of [null, { key: 'lock_convergence_tree', enabled: false, mode: 'all' }, { key: 'lock_convergence_tree', enabled: true, mode: 'anon' }]) {
    const rows = [...launchRows(false), ...(convergenceRow ? [convergenceRow] : [])];
    const result = await invoke(sitemapHandler, sitemapFetch(async () => flagResponse(rows)));
    const aliases = ['/numbers', '/numbers/1237'];
    assertLocs(result, [...publicPaths, '/number'], convergenceRow?.enabled ? aliases : []);
    if (!convergenceRow?.enabled) assertLocs(result, aliases, []);
  }
  for (const numberRow of [null, { key: 'lock_number', enabled: true, mode: 'all' }]) {
    const rows = launchRows(false).filter(row => row.key !== 'lock_number');
    if (numberRow) rows.push(numberRow);
    rows.push({ key: 'lock_convergence_tree', enabled: false, mode: 'all' });
    const result = await invoke(sitemapHandler, sitemapFetch(async () => flagResponse(rows)));
    assertLocs(result, publicPaths, pathsByFlag.lock_number);
  }
});

test('sitemap failed availability reads preserve World and exclude unfinished launch gates without caching', async () => {
  for (const flagRead of [async () => ({ ok: false }), async () => { throw new Error('network'); }, async () => flagResponse({ enabled: false })]) {
    const result = await invoke(sitemapHandler, sitemapFetch(flagRead));
    assertLocs(result, [...publicPaths, ...existingWorldPaths], [...strictPaths, ...retiredPaths, '/numbers']);
    assert.equal(result.headers.get('cache-control'), 'no-store');
  }
});

test('sitemap malformed or contradictory launch rows cannot open a capability', async () => {
  for (const badRows of [
    [{ key: 'lock_number', enabled: 'false', mode: 'all' }],
    [{ key: 'lock_number', enabled: false, mode: 'unknown' }],
    [{ key: 'lock_number', enabled: false }],
    [{ key: 'lock_number', enabled: false, mode: 'all' }, { key: 'lock_number', enabled: true, mode: 'all' }],
  ]) {
    const result = await invoke(sitemapHandler, sitemapFetch(async () => flagResponse(badRows)));
    assertLocs(result, [...publicPaths, ...existingWorldPaths], [...strictPaths, ...retiredPaths]);
  }
});

test('an unavailable upstream sitemap returns 502 without caching', async () => {
  const result = await invoke(sitemapHandler, async url => url === `${SITE}/api/sitemap` ? { ok: false } : flagResponse([]));
  assert.equal(result.code, 502);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('explicit World closure and all unfinished launch gates suppress crawler content reads', async () => {
  for (const [key, paths] of Object.entries(pathsByFlag)) {
    for (const path of paths) {
      const states = key === 'lock_world'
        ? [[{ key, enabled: true, mode: 'all' }], [{ key, enabled: true, mode: 'anon' }], [{ key, enabled: true }]]
        : [[], [{ key, enabled: true, mode: 'all' }], [{ key, enabled: true, mode: 'anon' }], [{ key, enabled: 'false', mode: 'all' }], [{ key, enabled: false, mode: 'bad' }]];
      for (const rows of states) {
        const result = await invoke(ogHandler, async url => {
          assert.ok(url.includes('/site_flags?'), `closed page queried data: ${url}`);
          return flagResponse(rows);
        }, { path: encodeURI(path), crawler: 'search' });
        assert.equal(result.code, 200);
        assert.equal(result.headers.get('x-robots-tag'), 'noindex, follow', `${path} must be noindex`);
        assert.match(result.body, /<meta name="robots" content="noindex, follow"\/>/);
        assert.doesNotMatch(result.body, /application\/ld\+json|DiscussionForumPosting/);
        assert.equal(result.calls.length, 1, 'content fetch must not follow a closed gate');
      }
    }
  }
});

test('unfinished launch crawler gates stay closed on network/non-array failures and are not cached', async () => {
  for (const flagRead of [async () => ({ ok: false }), async () => { throw new Error('network'); }, async () => flagResponse({ enabled: false })]) {
    const result = await invoke(ogHandler, flagRead, { path: '/book/unavailable', crawler: 'search' });
    assert.equal(result.headers.get('x-robots-tag'), 'noindex, follow');
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.equal(result.calls.length, 1);
  }
});

test('World and topic crawler metadata preserve existing public data on missing or failed flag reads', async () => {
  for (const flagRead of [
    async () => flagResponse([]),
    async () => ({ ok: false }),
    async () => { throw new Error('network'); },
    async () => flagResponse({ unavailable: true }),
    async () => flagResponse([{ key: 'lock_world', enabled: false, mode: 'all' }]),
  ]) {
    for (const path of ['/world', '/topic/public', '/researcher/internal']) {
      const result = await invoke(ogHandler, async url => {
        if (url.includes('/site_flags?')) return flagRead(url);
        assert.equal(path, '/topic/public', 'World and researcher must not add content readers');
        assert.ok(url.includes('/topic_cards_public?'));
        return flagResponse([{ title: 'נושא ציבורי קיים', subtitle: 'מקור קיים', highlight_numbers: [1237], image_ids: [] }]);
      }, { path, crawler: 'search' });
      assert.equal(result.headers.get('x-robots-tag'), path.startsWith('/researcher/') ? 'noindex, nofollow' : 'index, follow');
      if (path === '/topic/public') {
        assert.match(result.body, /נושא ציבורי קיים/);
        assert.match(result.body, /"@type":"WebPage"/);
        assert.match(result.body, /"@type":"BreadcrumbList"/);
        assert.equal(result.calls.length, 2, 'existing topic projection is retained');
      } else {
        assert.equal(result.calls.length, 1);
      }
    }
  }
});

test('legacy numbers crawler aliases stay closed when convergence is closed even if Number is explicitly open', async () => {
  for (const path of ['/numbers', '/numbers/1237']) {
    const result = await invoke(ogHandler, async url => {
      assert.ok(url.includes('/site_flags?'));
      assert.ok(url.includes('lock_number') && url.includes('lock_convergence_tree'), 'both aliases must resolve in one batch');
      return flagResponse([{ key: 'lock_number', enabled: false, mode: 'all' }, { key: 'lock_convergence_tree', enabled: true, mode: 'anon' }]);
    }, { path, crawler: 'search' });
    assert.equal(result.headers.get('x-robots-tag'), 'noindex, follow');
    assert.equal(result.calls.length, 1);
  }
});

test('explicitly open World and topic flags preserve topic identity and structured data', async () => {
  const result = await invoke(ogHandler, async url => {
    if (url.includes('/site_flags?')) return flagResponse([{ key: 'lock_world', enabled: false, mode: 'all' }]);
    assert.ok(url.includes('/topic_cards_public?'));
    return flagResponse([{ title: 'נושא ציבורי', subtitle: 'מקור מאושר', highlight_numbers: [1237], image_ids: [] }]);
  }, { path: '/topic/public', crawler: 'search' });
  assert.equal(result.headers.get('x-robots-tag'), 'index, follow');
  assert.match(result.body, /נושא ציבורי/);
  assert.match(result.body, /"@type":"WebPage"/);
  assert.match(result.body, /"@type":"BreadcrumbList"/);
  assert.equal(result.calls.length, 2);
});

test('explicitly open static gates retain their public titles, including encoded journey and heichal aliases', async () => {
  for (const [path, key, title] of [
    ['/world', 'lock_world', 'העולם'],
    ['/books', 'lock_books', 'ספרים ומקורות'],
    ['/book', 'lock_books', 'ספרים ומקורות'],
    ['/journey', 'lock_life_journey', 'המסע'],
    ['/journey-beta', 'lock_life_journey', 'המסע'],
    ['/מסע', 'lock_life_journey', 'המסע'],
    ['/2029/journey', 'lock_life_journey', 'המסע'],
    ['/heichal', 'lock_heichal', 'היכל'],
    ['/היכל', 'lock_heichal', 'היכל'],
  ]) {
    const result = await invoke(ogHandler, async url => {
      assert.ok(url.includes('/site_flags?'), `static page unexpectedly queried data: ${url}`);
      return flagResponse([{ key, enabled: false, mode: 'all' }]);
    }, { path: encodeURI(path), crawler: 'search' });
    assert.equal(result.headers.get('x-robots-tag'), 'index, follow');
    assert.ok(result.body.includes(`<title>${title}`));
    assert.equal(result.calls.length, 1);
  }
});

test('explicitly open book and legacy number flags preserve their existing identity reads', async () => {
  for (const [path, key, source, rows, title] of [
    ['/book/public', 'lock_books', '/nodes?', [{ label: 'ספר ציבורי', description: 'מקור', metadata: {} }], 'ספר ציבורי'],
    ['/books/public', 'lock_books', '/nodes?', [{ label: 'ספר ציבורי', description: 'מקור', metadata: {} }], 'ספר ציבורי'],
    ['/number/1237', 'lock_number', '/number_anchors?', [{ fact: 'עוגן ציבורי', hint: 'רמז' }], 'עוגן ציבורי'],
  ]) {
    const result = await invoke(ogHandler, async url => {
      if (url.includes('/site_flags?')) return flagResponse([{ key, enabled: false, mode: 'all' }]);
      assert.ok(url.includes(source));
      return flagResponse(rows);
    }, { path, crawler: 'search' });
    assert.equal(result.headers.get('x-robots-tag'), 'index, follow');
    assert.ok(result.body.includes(title));
    assert.equal(result.calls.length, 2);
  }
});

test('forum and transitional chat are noindex with a canonical chat link and no database lookup', async () => {
  for (const path of ['/forum', '/forum/thread', '/forum/דיון', '/community/chat']) {
    const result = await invoke(ogHandler, async () => { throw new Error('retired forum/chat must not read old discussions'); }, { path: encodeURI(path), crawler: 'search' });
    assert.equal(result.headers.get('x-robots-tag'), 'noindex, follow');
    assert.match(result.body, /canonical" href="https:\/\/sod1820\.co\.il\/community\/chat"/);
    assert.match(result.body, /href="https:\/\/sod1820\.co\.il\/community\/chat"/);
    assert.doesNotMatch(result.body, /DiscussionForumPosting|\/archive\//);
    assert.equal(result.calls.length, 0);
  }
});

test('public Post metadata remains independent of launch gates and retains Article structured data', async () => {
  const result = await invoke(ogHandler, async url => {
    assert.ok(url.includes('/posts?slug=eq.public-post'), `post made unrelated request: ${url}`);
    return flagResponse([{ title: 'פוסט ציבורי', excerpt: 'תיאור', content: '<p>תוכן</p>', author: 'SOD1820', date: '2026-10-13T08:00:00Z' }]);
  }, { path: '/post/public-post', crawler: 'search' });
  assert.equal(result.headers.get('x-robots-tag'), 'index, follow');
  assert.match(result.body, /"@type":"Article"/);
  assert.equal(result.calls.length, 1);
});
