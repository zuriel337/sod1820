// Ad-hoc, local only: what canonical does api/og.js declare for the `/post/<slug>` alias and for `/?p=<id>` of an imported WordPress post?
import path from 'node:path';
const root = path.resolve(process.argv[2]);
const { default: ogHandler } = await import(path.join(root, 'api/og.js'));
const { PUBLIC_READING_PROFILE_ID } = await import(path.join(root, 'src/lib/publicReadingRelease2029.js'));
const SITE = 'https://sod1820.co.il';
const SLUG_TEXT = 'תפילה-לרפואה-של-רבי-שלמה-יהודה-הינוקא';
const row = { id: 321, wp_id: 20001, source: 'wordpress', slug: encodeURIComponent(SLUG_TEXT).toLowerCase(), link: `${SITE}/${encodeURIComponent(SLUG_TEXT).toLowerCase()}/`,
  title: 'תפילה לרפואה', excerpt: 'x', content: '<p>x</p>', image_url: null, date: '2020-01-01T00:00:00+00:00', modified: null, tags: [], categories: [], author: null };
async function ask(p, search = '') {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = decodeURIComponent(String(url));
    const hit = /\/rest\/v1\/posts\?/.test(u) && (u.includes('slug=eq.' + decodeURIComponent(row.slug)) || u.includes('wp_id=eq.20001') || u.includes('id=eq.321'));
    return { ok: true, status: 200, headers: new Headers({ 'content-range': '*/0' }), json: async () => (hit ? [row] : []), text: async () => '[]' };
  };
  const res = { code: 200, body: '', setHeader() {}, status(c) { this.code = c; return this; }, send(b) { this.body = String(b); return this; } };
  try {
    await ogHandler({ method: 'GET', url: '/api/og?path=' + encodeURIComponent(p), headers: { host: 'sod1820.co.il', 'x-forwarded-proto': 'https' },
      publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true, publicRequestedPath: p,
      publicReadingSearch: search, query: { path: p, crawler: 'search' } }, res);
  } finally { globalThis.fetch = previous; }
  return { status: res.code, canonical: (res.body.match(/rel="canonical" href="([^"]*)/) || [])[1] };
}
const a = await ask('/post/' + row.slug.toLowerCase());
const b = await ask('/post/' + encodeURIComponent(SLUG_TEXT));
console.log(JSON.stringify({ root: path.basename(root), post_alias_lower: a, post_alias_upper: b }));
