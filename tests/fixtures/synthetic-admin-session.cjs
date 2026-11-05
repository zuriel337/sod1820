// TEST-ONLY synthetic admin viewer. Nothing here is a credential: the session token is a fixed dummy string, and both the
// Auth user lookup and the profile read are answered locally by Playwright routes (no request reaches Supabase).
// It only lets the client render its admin-only UI (for example the "כאן" dock button) in acceptance tests; it grants no server access.
const API = 'https://linswmnnkjxvweumprav.supabase.co';
const STORAGE_KEY = 'sb-linswmnnkjxvweumprav-auth-token';
const USER_ID = '00000000-0000-4000-8000-0000000000ad';

function syntheticAdminUser() {
  return { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'synthetic-admin@example.invalid',
    app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
}

async function installSyntheticAdmin(page) {
  const user = syntheticAdminUser();
  await page.addInitScript(({ key, user }) => {
    const session = { access_token: 'synthetic.test.token', refresh_token: 'synthetic-refresh', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
    const value = JSON.stringify(session);
    try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
    try { sessionStorage.setItem(key, value); } catch { /* storage blocked */ }
  }, { key: STORAGE_KEY, user });
  await page.route(`${API}/auth/v1/user*`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route(`${API}/rest/v1/users*`, route => {
    if (route.request().method() !== 'GET') return route.abort('blockedbyclient');
    const row = { id: USER_ID, username: 'synthetic-admin', display_name: 'Synthetic Admin', avatar_url: null, tier: 'free', role: 'admin', created_at: '2026-01-01T00:00:00Z' };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) });
  });
  // The dummy token must never reach PostgREST as a bearer (it would be rejected and break public reads): every other REST/RPC
  // read continues exactly as an anonymous visitor's, with the anon key restored as the bearer.
  await page.route(`${API}/rest/v1/**`, route => {
    const headers = route.request().headers();
    if (headers.apikey && /synthetic\.test\.token/.test(headers.authorization || '')) return route.fallback({ headers: { ...headers, authorization: `Bearer ${headers.apikey}` } });
    return route.fallback();
  });
}

module.exports = { installSyntheticAdmin, SYNTHETIC_ADMIN_ID: USER_ID };
