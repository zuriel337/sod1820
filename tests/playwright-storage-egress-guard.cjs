const STORAGE_ORIGIN = 'https://linswmnnkjxvweumprav.supabase.co';
const STORAGE_PUBLIC_RE = /\/storage\/v1\/(?:object\/public|render\/image\/public)\//i;
const HEAVY_MEDIA_RE = /\.(?:mp4|webm|m4v|mov|mp3|m4a|aac|ogg|wav)(?:[?#]|$)/i;
const PROTECTED_RESEARCH_RE = /^\/rest\/v1\/(research_objects|cross_method_strength)$/;

// CI/browser acceptance must validate layout and behavior, not repeatedly download
// production Storage binaries. Keep other API/data requests real, replace public
// Storage images with a tiny deterministic same-ratio SVG, and short-circuit media.
// This guard runs only inside Playwright tests; production traffic is untouched.
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#111"/><rect x="20" y="20" width="1560" height="860" fill="none" stroke="#777" stroke-width="4"/></svg>`;

async function installStorageEgressGuard(page) {
  // These tables deliberately deny anonymous reads. Browser layout tests were
  // repeating that same expected 401 tens of thousands of times against the
  // live project. Mirror only anonymous GET denials locally; authenticated
  // requests and all other API calls still reach their real destination.
  await page.route(`${STORAGE_ORIGIN}/rest/v1/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.match(PROTECTED_RESEARCH_RE)?.[1];
    const headers = request.headers();
    const bearer = String(headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!table || !['GET', 'HEAD'].includes(request.method()) || !headers.apikey || bearer !== headers.apikey) {
      return route.fallback();
    }
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      headers: { 'x-sod-test-protected-read-guard': 'expected-anon-denial' },
      body: JSON.stringify({ code: '42501', details: null, hint: null, message: `permission denied for ${table === 'cross_method_strength' ? 'view' : 'table'} ${table}` }),
    });
  });

  await page.route(`${STORAGE_ORIGIN}/storage/v1/**`, async (route) => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) return route.continue();

    const url = request.url();
    if (!STORAGE_PUBLIC_RE.test(url)) return route.continue();

    const headers = request.headers();
    const accept = String(headers.accept || '');
    const type = request.resourceType();

    if (type === 'media' || HEAVY_MEDIA_RE.test(url)) {
      return route.fulfill({
        status: 204,
        headers: {
          'cache-control': 'public, max-age=3600',
          'x-sod-test-media-guard': 'blocked-heavy-media',
        },
        body: '',
      });
    }

    if (type === 'image' || /image\//i.test(accept) || /\/render\/image\/public\//i.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'image/svg+xml; charset=utf-8',
        headers: {
          'cache-control': 'public, max-age=3600',
          'x-sod-test-media-guard': 'placeholder-image',
        },
        body: PLACEHOLDER_SVG,
      });
    }

    return route.continue();
  });
}

module.exports = { installStorageEgressGuard };
