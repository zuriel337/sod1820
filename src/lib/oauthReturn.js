// OAuth return destinations are local paths, never caller-supplied origins.
export function safeOAuthReturnPath(returnTo) {
  if (typeof returnTo !== 'string' || !returnTo.startsWith('/') ||
      returnTo.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(returnTo)) return '/';
  try {
    const decoded = decodeURIComponent(returnTo);
    if (decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) return '/';
    const base = 'https://oauth-return.invalid';
    const url = new URL(returnTo, base);
    if (url.origin !== base || url.pathname.startsWith('//')) return '/';
    // Fragments may contain auth tokens; they are not part of a return target.
    return url.pathname + url.search;
  } catch { return '/'; }
}

export function providerOAuthRequest({ provider = 'google', origin, returnTo = '/', integratedPreview = false, verifiedPreviewOrigins } = {}) {
  if (typeof provider !== 'string' || !/^[a-z][a-z0-9_]*$/.test(provider) || ['email', 'phone', 'anonymous'].includes(provider)) throw new Error('invalid_oauth_provider');
  const site = new URL(origin);
  if (!['https:', 'http:'].includes(site.protocol) || site.origin !== origin) {
    throw new Error('OAUTH_ORIGIN_INVALID');
  }
  // Preview redirects are not yet verified in Supabase. Never silently fall
  // back to the production site or start a sign-up from an unverified preview.
  let verified = verifiedPreviewOrigins;
  if (verified === undefined) {
    try { verified = JSON.parse(import.meta.env?.VITE_AUTH_VERIFIED_PREVIEW_ORIGINS || '[]'); } catch { verified = []; }
  }
  const verifiedOrigin = site.protocol === 'https:' && Array.isArray(verified) && verified.some(value => value === site.origin);
  if ((integratedPreview || site.hostname.endsWith('.vercel.app')) && !verifiedOrigin) {
    const error = new Error('OAUTH_PREVIEW_UNVERIFIED');
    error.code = 'OAUTH_PREVIEW_UNVERIFIED';
    throw error;
  }
  return { provider, options: { redirectTo: origin + safeOAuthReturnPath(returnTo), ...(provider === 'facebook' ? { scopes: 'email public_profile' } : {}) } };
}

export function googleOAuthRequest(args) { return providerOAuthRequest({ ...args, provider: 'google' }); }
