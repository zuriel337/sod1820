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

export function googleOAuthRequest({ origin, returnTo = '/', integratedPreview = false }) {
  const site = new URL(origin);
  if (!['https:', 'http:'].includes(site.protocol) || site.origin !== origin) {
    throw new Error('OAUTH_ORIGIN_INVALID');
  }
  // Preview redirects are not yet verified in Supabase. Never silently fall
  // back to the production site or start a sign-up from an unverified preview.
  if (integratedPreview || site.hostname.endsWith('.vercel.app')) {
    const error = new Error('OAUTH_PREVIEW_UNVERIFIED');
    error.code = 'OAUTH_PREVIEW_UNVERIFIED';
    throw error;
  }
  return { provider: 'google', options: { redirectTo: origin + safeOAuthReturnPath(returnTo) } };
}
