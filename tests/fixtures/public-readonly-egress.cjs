const inventory = require('../../docs/reviews/public-foundation-20261101/evidence/rpc-read-inventory.json');
const { request: apiRequest } = require('@playwright/test');

const CANONICAL_API = 'https://linswmnnkjxvweumprav.supabase.co';
const CANONICAL_STORAGE = 'https://linswmnnkjxvweumprav.storage.supabase.co';
// Same reviewed public read inventory used by the native acceptance guard.
// lang_links_list is deliberately absent: its VOLATILE SECURITY DEFINER
// signature can expose visitor drafts. This test never forwards it live.
const READ_RPCS = Object.freeze([...new Set([
  ...inventory.functions.filter(row => row.provolatile !== 'v' && row.proname !== 'lang_links_list').map(row => row.proname),
  'convergence_meter', 'is_number_indexable', 'is_phrase_indexable', 'writer_public_contributions_page_v1',
])]);
const reads = new Set(READ_RPCS);
const proxyContexts = new WeakMap();

function allowsPublicRead(url, method, baseUrl, resourceType = 'other') {
  const target = new URL(url), local = new URL(baseUrl);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(local.hostname)) throw new Error('acceptance_requires_loopback_origin');
  if (target.username || target.password || target.pathname.includes('//')) return false;
  if (target.origin === CANONICAL_API) {
    if (target.pathname.includes('%') && !target.pathname.startsWith('/storage/v1/')) return false;
    if (target.pathname.startsWith('/rest/v1/rpc/')) {
      const rpc = /^\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)$/.exec(target.pathname)?.[1];
      return reads.has(rpc) && ['GET', 'HEAD', 'OPTIONS', 'POST'].includes(method);
    }
    if (target.pathname.startsWith('/rest/v1/')) return ['GET', 'HEAD', 'OPTIONS'].includes(method);
    if (['/auth/v1/user', '/auth/v1/settings'].includes(target.pathname)) return ['GET', 'HEAD', 'OPTIONS'].includes(method);
    return /^\/storage\/v1\/(?:object\/public|render\/image\/public)\//.test(target.pathname) && ['GET', 'HEAD', 'OPTIONS'].includes(method);
  }
  if (target.origin === CANONICAL_STORAGE) return /^\/storage\/v1\/(?:object\/public|render\/image\/public)\//.test(target.pathname) && ['GET', 'HEAD', 'OPTIONS'].includes(method);
  // Loopback documents/assets and ordinary third-party media/font reads only.
  // Same-origin proxies and arbitrary external services get no POST exception.
  return ['GET', 'HEAD'].includes(method) && ['http:', 'https:'].includes(target.protocol)
    && (target.origin === local.origin || ['image', 'media', 'font', 'stylesheet', 'script', 'document'].includes(resourceType));
}

async function installPublicReadOnlyEgress(context, { baseUrl } = {}) {
  // Validate the local test target before installing any routing.
  allowsPublicRead(baseUrl, 'GET', baseUrl);
  const receipt = { allowedReads: 0, denied: [] };
  // Leave Chromium's loopback requests direct. Only already-approved external
  // reads use the inherited session proxy, when one exists; CI without it keeps
  // ordinary direct routing. Never print or persist the proxy configuration.
  const proxyAddress = process.env.HTTPS_PROXY || process.env.https_proxy;
  const proxy = proxyAddress ? await apiRequest.newContext({ proxy: { server: proxyAddress }, timeout: 30_000 }) : null;
  if (proxy) proxyContexts.set(context, proxy);
  const localOrigin = new URL(baseUrl).origin;
  await context.route('**/*', async route => {
    const request = route.request();
    if (allowsPublicRead(request.url(), request.method(), baseUrl, request.resourceType())) {
      receipt.allowedReads++;
      if (proxy && new URL(request.url()).origin !== localOrigin) {
        try {
          // Return redirects to the browser so each destination passes the same
          // allowlist, rather than letting APIRequest follow them unreviewed.
          const response = await proxy.fetch(request, { maxRedirects: 0 });
          return route.fulfill({ response });
        } catch { return route.abort('failed'); }
      }
      return route.fallback();
    }
    // Record neither request args/query nor headers, identity or response data.
    if (receipt.denied.length < 200) receipt.denied.push({ method: request.method(), path: new URL(request.url()).pathname });
    return route.fulfill({ status: 403, contentType: 'application/json',
      headers: { 'cache-control': 'no-store', 'x-sod-test-readonly-egress': 'denied-before-network' },
      body: JSON.stringify({ error: 'public_readonly_acceptance_denied' }) });
  });
  // No realtime command channel is needed by these document/UI cases. Do not
  // connect to a server, then try to inspect its first write after the fact.
  await context.routeWebSocket(/.*/, socket => socket.close({ code: 1008, reason: 'public_readonly_acceptance' }));
  await context.addInitScript(() => { navigator.sendBeacon = () => false; });
  return receipt;
}

async function disposePublicReadOnlyEgress(context) {
  const proxy = proxyContexts.get(context);
  proxyContexts.delete(context);
  await proxy?.dispose();
}

async function installSyntheticPublicLanguageFixture(page) {
  const receipt = { served: 0 };
  // Explicit synthetic rendering evidence, handled before the context's live
  // network deny path. The independent guard still denies this RPC completely.
  await page.route(`${CANONICAL_API}/rest/v1/rpc/lang_links_list*`, async route => {
    const request = route.request(), url = new URL(request.url());
    let body;
    try { body = request.postDataJSON(); } catch { return route.fallback(); }
    if (url.pathname !== '/rest/v1/rpc/lang_links_list' || url.search || request.method() !== 'POST'
      || !body || Array.isArray(body) || Object.keys(body).join(',') !== 'p_visitor' || body.p_visitor !== null) return route.fallback();
    receipt.served++;
    const rows = ['Messiah', 'мессия'].map((word, index) => ({
      id: `synthetic-public-language-${index}`, hebrew: 'משיח', foreign_word: word,
      lang: index ? 'ru' : 'en', relationship_type: 'synthetic acceptance fixture', status: 'approved', human_verified: true,
    }));
    return route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'cache-control': 'no-store', 'x-sod-test-language-source': 'synthetic-public-only' }, body: JSON.stringify(rows) });
  });
  return receipt;
}

module.exports = { READ_RPCS, allowsPublicRead, installPublicReadOnlyEgress, disposePublicReadOnlyEgress, installSyntheticPublicLanguageFixture };
