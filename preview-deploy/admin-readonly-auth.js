// Transport admission only. Supabase verifies credentials/JWT; the existing
// same-user role reader grants screen access. No account creation or operations.
export function interceptPublicReadingAdminAuth(event, authOrigin) {
  const req = event.request, url = new URL(req.url);
  if (url.origin !== authOrigin || !url.pathname.startsWith('/auth/v1/')) return false;
  event.respondWith((async () => {
    const deny = () => new Response(JSON.stringify({error:'public_reading_auth_denied'}), {status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
    const bearer = /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(req.headers.get('Authorization') || '');
    const forward = () => fetch(new Request(req,{cache:'no-store',credentials:'omit',redirect:'error'}));
    if (req.method === 'GET' && !url.search && (url.pathname === '/auth/v1/settings' || url.pathname === '/auth/v1/user' && bearer)) return forward();
    if (req.method !== 'POST') return deny();
    if (url.pathname === '/auth/v1/logout') return bearer && url.searchParams.size === 1 && url.searchParams.get('scope') === 'local' && !(await req.clone().text()) ? forward() : deny();
    if (url.pathname !== '/auth/v1/token' || url.searchParams.size !== 1) return deny();
    const grant = url.searchParams.get('grant_type'), raw = await req.clone().text();
    if (raw.length > 8192 || !['password','refresh_token'].includes(grant)) return deny();
    const body = JSON.parse(raw);
    if (!body || Array.isArray(body) || typeof body !== 'object') return deny();
    if (grant === 'refresh_token') return Object.keys(body).join(',') === 'refresh_token' && typeof body.refresh_token === 'string' && body.refresh_token.length > 0 ? forward() : deny();
    if (Object.keys(body).some(key => !['email','password','gotrue_meta_security'].includes(key)) || typeof body.email !== 'string' || !body.email.includes('@') || typeof body.password !== 'string' || !body.password) return deny();
    if (body.gotrue_meta_security !== undefined && (!body.gotrue_meta_security || Array.isArray(body.gotrue_meta_security) || typeof body.gotrue_meta_security !== 'object' || Object.keys(body.gotrue_meta_security).some(key => key !== 'captcha_token'))) return deny();
    return forward();
  })().catch(() => new Response(JSON.stringify({error:'public_reading_auth_denied'}),{status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})));
  return true;
}
