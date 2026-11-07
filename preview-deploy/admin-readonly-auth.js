// Transport admission only. Supabase verifies credentials/JWT; the existing
// same-user role reader grants access. Existing review builds retain their
// password-only default. "existing" additionally admits OTP without signup;
// true is the prepared full-account policy, not selected by the current build.
// accountAccess === true (the public-reading Worker) additionally admits exactly the password-account operations below. Each has
// one method, no query string and a closed body schema, so no link can be requested (no redirect_to, no token_hash), no profile
// data can be injected (user metadata stays empty), and nothing can touch a user other than the bearer's own password:
//   POST /auth/v1/signup   e-mail + password (8..72) + PKCE challenge          (create an account; confirmation is a code)
//   POST /auth/v1/resend   type "signup" only                                  (a fresh confirmation code)
//   POST /auth/v1/recover  e-mail + PKCE challenge                              (a password-reset code)
//   POST /auth/v1/verify   type email | signup | recovery, 6..10 digit token    (confirm / recover by code, never by link)
//   PUT  /auth/v1/user     {password} only, bearer required                     (set the new password)
// This function is stringified into the service worker: it must stay self-contained (no module-level references).
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
    const forward = () => fetch(new Request(req,{cache:'no-store',credentials:'omit',redirect:'error'}));
    const security = value => value === undefined || value && !Array.isArray(value) && typeof value === 'object'
      && Object.keys(value).every(key => key === 'captcha_token') && (value.captcha_token === undefined || typeof value.captcha_token === 'string');
    const email = value => typeof value === 'string' && value.length <= 320 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
    // Transport sanity bounds only: Supabase Auth owns the real password policy (minimum length, strength, breached-password check).
    const password = value => typeof value === 'string' && value.length >= 8 && value.length <= 72;
    const challenge = value => /^[A-Za-z0-9_-]{43}$/.test(value.code_challenge || '') && value.code_challenge_method === 's256';
    const only = (value, keys) => Object.keys(value).every(key => keys.includes(key));
    if (req.method === 'GET' && !url.search && (url.pathname === '/auth/v1/settings' || url.pathname === '/auth/v1/user' && bearer)) return forward();
    if (req.method === 'PUT') {
      // The single admitted write on a user: the signed-in person sets a new password (right after a verified recovery code).
      // The SDK sends null PKCE fields with a password-only update; anything else (e-mail, phone, metadata, nonce, a challenge) is refused.
      if (accountAccess !== true || url.pathname !== '/auth/v1/user' || url.search || !bearer) return deny();
      const rawUpdate = await req.clone().text();
      if (rawUpdate.length > 1024) return deny();
      const update = JSON.parse(rawUpdate);
      return update && !Array.isArray(update) && typeof update === 'object' && only(update, ['password','code_challenge','code_challenge_method'])
        && password(update.password) && (update.code_challenge === undefined || update.code_challenge === null)
        && (update.code_challenge_method === undefined || update.code_challenge_method === null) ? forward() : deny();
    }
    if (req.method !== 'POST') return deny();
    if (url.pathname === '/auth/v1/logout') return bearer && url.searchParams.size === 1 && url.searchParams.get('scope') === 'local' && !(await req.clone().text()) ? forward() : deny();
    const raw = await req.clone().text();
    if (raw.length > 8192) return deny();
    const body = JSON.parse(raw);
    if (!body || Array.isArray(body) || typeof body !== 'object') return deny();
    if (accountAccess && !url.search && url.pathname === '/auth/v1/otp') {
      if (Object.keys(body).some(key => !['email','data','create_user','gotrue_meta_security','code_challenge','code_challenge_method'].includes(key))
        || !email(body.email) || typeof body.create_user !== 'boolean' || accountAccess !== true && body.create_user !== false
        || !body.data || Array.isArray(body.data) || typeof body.data !== 'object' || Object.keys(body.data).length
        || !security(body.gotrue_meta_security) || !/^[A-Za-z0-9_-]{43}$/.test(body.code_challenge || '') || body.code_challenge_method !== 's256') return deny();
      return forward();
    }
    if (accountAccess && !url.search && url.pathname === '/auth/v1/verify') {
      return only(body, ['email','token','type','gotrue_meta_security']) && email(body.email)
        && /^[0-9]{6,10}$/.test(body.token || '') && (body.type === 'email' || accountAccess === true && (body.type === 'signup' || body.type === 'recovery'))
        && security(body.gotrue_meta_security) ? forward() : deny();
    }
    if (accountAccess === true && !url.search && url.pathname === '/auth/v1/signup') {
      // User metadata ("data") feeds profile creation; it must stay empty so a request can never carry a role, a name or a consent.
      return only(body, ['email','password','data','gotrue_meta_security','code_challenge','code_challenge_method'])
        && email(body.email) && password(body.password) && body.data && !Array.isArray(body.data) && typeof body.data === 'object' && !Object.keys(body.data).length
        && security(body.gotrue_meta_security) && challenge(body) ? forward() : deny();
    }
    if (accountAccess === true && !url.search && url.pathname === '/auth/v1/resend') {
      return only(body, ['email','type','gotrue_meta_security','code_challenge','code_challenge_method'])
        && email(body.email) && body.type === 'signup' && security(body.gotrue_meta_security) && challenge(body) ? forward() : deny();
    }
    if (accountAccess === true && !url.search && url.pathname === '/auth/v1/recover') {
      return only(body, ['email','gotrue_meta_security','code_challenge','code_challenge_method'])
        && email(body.email) && security(body.gotrue_meta_security) && challenge(body) ? forward() : deny();
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
