// Transport admission only. Supabase verifies credentials/JWT; the existing
// same-user role reader grants access. Existing review builds retain their
// password-only default. "existing" additionally admits OTP without signup;
// true is the full-account policy: sign-in by code, PKCE, password recovery (request and
// choosing the new password) for the account whose e-mailed link was verified.
export function interceptPublicReadingAdminAuth(event, authOrigin, { accountAccess = false, clientOrigin = "" } = {}) {
  const req = event.request, url = new URL(req.url);
  if (url.origin !== authOrigin || !url.pathname.startsWith('/auth/v1/')) return false;
  // OAuth is browser navigation, not an opaque fetch/proxy. The server still
  // validates configured providers and allowed redirect URLs. Only our exact
  // callback may be requested; the verifier stays in the initiating tab.
  const callback = value => {
    try {
      const target = new URL(value);
      return Boolean(clientOrigin) && target.origin === clientOrigin && target.pathname === '/auth/callback' && !target.hash && !target.search;
    } catch { return false; }
  };
  if (accountAccess === true && req.method === 'GET' && req.mode === 'navigate' && url.pathname === '/auth/v1/authorize'
    && [...url.searchParams.keys()].every((key, index, keys) => keys.indexOf(key) === index && ['provider','redirect_to','scopes','code_challenge','code_challenge_method'].includes(key))
    && /^[a-z][a-z0-9_]*$/.test(url.searchParams.get('provider') || '') && callback(url.searchParams.get('redirect_to'))
    && /^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code_challenge') || '') && url.searchParams.get('code_challenge_method') === 's256'
    && (!url.searchParams.has('scopes') || url.searchParams.get('provider') === 'facebook' && url.searchParams.get('scopes') === 'email public_profile')) return true;
  event.respondWith((async () => {
    const deny = () => new Response(JSON.stringify({error:'public_reading_auth_denied'}), {status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    const bearer = /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(req.headers.get('Authorization') || '');
    // An admitted request that cannot reach Auth is a network failure, reported as such (503): it must not look like a policy denial (403),
    // or the page would blame a stale worker. Nothing here admits anything new.
    const forward = async () => {
      try { return await fetch(new Request(req,{cache:'no-store',credentials:'omit',redirect:'error'})); }
      catch { return new Response(JSON.stringify({error:'public_reading_auth_unreachable'}), {status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}); }
    };
    if (req.method === 'GET' && !url.search && (url.pathname === '/auth/v1/settings' || url.pathname === '/auth/v1/user' && bearer)) return forward();
    // Choosing a new password after a verified recovery: the signed-in Auth session sends PUT /auth/v1/user with the password and
    // nothing else (the SDK adds two null PKCE fields). The worker admits only that exact body, bounded to the password length
    // Auth accepts, and only after Auth itself has confirmed the bearer token belongs to a live session. The update is applied by
    // Auth to the token's own account; no other attribute (email, phone, role, data) can travel on this request.
    if (req.method === 'PUT' && accountAccess === true && url.pathname === '/auth/v1/user') {
      if (!bearer || url.search || !req.headers.get('apikey')) return deny();
      const text = await req.clone().text();
      if (text.length > 1024) return deny();
      const update = JSON.parse(text);
      const nothing = value => value === null || value === undefined;
      if (!update || Array.isArray(update) || typeof update !== 'object' || typeof update.password !== 'string'
        || Object.keys(update).some(key => !['password','code_challenge','code_challenge_method'].includes(key))
        || !nothing(update.code_challenge) || !nothing(update.code_challenge_method)) return deny();
      const bytes = encodeURIComponent(update.password).replace(/%[0-9A-F]{2}/g, 'x').length;
      // Auth owns the minimum-strength policy and answers it in words the page shows; the worker bounds only the size.
      if (bytes < 1 || bytes > 72) return deny();
      let session;
      try { session = await fetch(new Request(url.origin + '/auth/v1/user', { method: 'GET', headers: { Authorization: req.headers.get('Authorization'), apikey: req.headers.get('apikey') }, cache: 'no-store', credentials: 'omit', redirect: 'error' })); }
      catch { return new Response(JSON.stringify({error:'public_reading_auth_unreachable'}), {status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}); }
      if (!session.ok) return session;   // expired or invalid session: Auth's own answer reaches the page and is classified there
      const account = await session.json();
      if (!account || typeof account.id !== 'string' || !account.id) return deny();
      return forward();
    }
    if (req.method !== 'POST') return deny();
    if (url.pathname === '/auth/v1/logout') return bearer && url.searchParams.size === 1 && url.searchParams.get('scope') === 'local' && !(await req.clone().text()) ? forward() : deny();
    const raw = await req.clone().text();
    if (raw.length > 8192) return deny();
    const body = JSON.parse(raw);
    if (!body || Array.isArray(body) || typeof body !== 'object') return deny();
    const security = value => value === undefined || value && !Array.isArray(value) && typeof value === 'object'
      && Object.keys(value).every(key => key === 'captcha_token') && (value.captcha_token === undefined || typeof value.captcha_token === 'string');
    const email = value => typeof value === 'string' && value.length <= 320 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
    // The code request may carry exactly one query parameter: redirect_to, and only our exact /auth/callback. The server still
    // validates it against its redirect allow-list; any other parameter or destination is denied (the PR #1285 failure mode).
    const onlyCallbackRedirect = url.searchParams.size === 1 && url.searchParams.getAll('redirect_to').length === 1 && callback(url.searchParams.get('redirect_to'));
    if (accountAccess && (!url.search || onlyCallbackRedirect) && url.pathname === '/auth/v1/otp') {
      if (Object.keys(body).some(key => !['email','data','create_user','gotrue_meta_security','code_challenge','code_challenge_method'].includes(key))
        || !email(body.email) || typeof body.create_user !== 'boolean' || accountAccess !== true && body.create_user !== false
        || !body.data || Array.isArray(body.data) || typeof body.data !== 'object' || Object.keys(body.data).length
        || !security(body.gotrue_meta_security) || !/^[A-Za-z0-9_-]{43}$/.test(body.code_challenge || '') || body.code_challenge_method !== 's256') return deny();
      return forward();
    }
    // Password recovery request (resetPasswordForEmail with PKCE): the e-mailed link returns to the exact /auth/callback and is
    // exchanged for a session with the verifier kept in the requesting tab. A request without that exact destination is denied,
    // because Auth would otherwise fall back to the site root, where nothing completes the recovery.
    if (accountAccess === true && url.pathname === '/auth/v1/recover') {
      return onlyCallbackRedirect && Object.keys(body).every(key => ['email','gotrue_meta_security','code_challenge','code_challenge_method'].includes(key))
        && email(body.email) && security(body.gotrue_meta_security)
        && /^[A-Za-z0-9_-]{43}$/.test(body.code_challenge || '') && body.code_challenge_method === 's256' ? forward() : deny();
    }
    if (accountAccess && !url.search && url.pathname === '/auth/v1/verify') {
      return Object.keys(body).every(key => ['email','token','type','gotrue_meta_security'].includes(key)) && email(body.email)
        && /^[0-9]{6,10}$/.test(body.token || '') && ['email', 'signup'].includes(body.type) && security(body.gotrue_meta_security) ? forward() : deny();
    }
    if (url.pathname !== '/auth/v1/token' || url.searchParams.size !== 1) return deny();
    const grant = url.searchParams.get('grant_type');
    if (accountAccess === true && grant === 'pkce') return Object.keys(body).sort().join(',') === 'auth_code,code_verifier'
      && typeof body.auth_code === 'string' && /^[A-Za-z0-9_.-]{1,2048}$/.test(body.auth_code)
      && typeof body.code_verifier === 'string' && /^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier) ? forward() : deny();
    if (!['password','refresh_token'].includes(grant)) return deny();
    if (grant === 'refresh_token') return Object.keys(body).join(',') === 'refresh_token' && typeof body.refresh_token === 'string' && body.refresh_token.length > 0 ? forward() : deny();
    if (Object.keys(body).some(key => !['email','password','gotrue_meta_security'].includes(key)) || typeof body.email !== 'string' || !body.email.includes('@') || typeof body.password !== 'string' || !body.password) return deny();
    if (body.gotrue_meta_security !== undefined && (!body.gotrue_meta_security || Array.isArray(body.gotrue_meta_security) || typeof body.gotrue_meta_security !== 'object' || Object.keys(body.gotrue_meta_security).some(key => key !== 'captcha_token'))) return deny();
    return forward();
  })().catch(() => new Response(JSON.stringify({error:'public_reading_auth_denied'}),{status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})));
  return true;
}
