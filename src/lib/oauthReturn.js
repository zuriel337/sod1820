import { PUBLIC_READING_RELEASE } from "./publicReadingRelease2029.js";
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

export const PREVIEW_OAUTH_RETURN_KEY = 'sod2029_oauth_return';
// Keep only inert document anchors. OAuth credential/error fragments always
// stay outside the stored return destination and are removed by the callback.
export function safePreviewOAuthReturnPath(value) {
  const path = safeOAuthReturnPath(value);
  if (typeof value !== 'string') return path;
  try {
    const url = new URL(value, 'https://oauth-return.invalid');
    if (url.origin !== 'https://oauth-return.invalid' || path !== url.pathname + url.search) return path;
    const anchor = decodeURIComponent(url.hash);
    return path + (/^#[\p{L}\p{N}_:.-]{1,250}$/u.test(anchor) ? url.hash : '');
  } catch { return path; }
}
export function rememberPreviewOAuthReturn(returnTo, storage = globalThis.sessionStorage, now = Date.now()) {
  storage?.setItem(PREVIEW_OAUTH_RETURN_KEY, JSON.stringify({path:safePreviewOAuthReturnPath(returnTo),createdAt:now}));
}
export function consumePreviewOAuthReturn(storage = globalThis.sessionStorage, now = Date.now()) {
  try {
    const raw=storage?.getItem(PREVIEW_OAUTH_RETURN_KEY);storage?.removeItem(PREVIEW_OAUTH_RETURN_KEY);
    const value=JSON.parse(raw||'null');
    if(!value||!Number.isFinite(value.createdAt)||now-value.createdAt<0||now-value.createdAt>10*60*1000)return '/2029';
    const path=safePreviewOAuthReturnPath(value.path);
    const home=import.meta.env?.VITE_PUBLIC_FOUNDATION_PREVIEW === 'true' || PUBLIC_READING_RELEASE ? '/' : '/2029';
    return path==='/'||path.startsWith('/auth/callback')?home:path;
  } catch{return '/2029';}
}

export function providerOAuthRequest({ provider = 'google', origin, returnTo = '/', integratedPreview = false, verifiedPreviewOrigins, functionalPreview = import.meta.env?.VITE_FUNCTIONAL_UNIFIED_PREVIEW === 'true' || PUBLIC_READING_RELEASE } = {}) {
  if (typeof provider !== 'string' || !/^[a-z][a-z0-9_]*$/.test(provider) || ['email', 'phone', 'anonymous'].includes(provider)) throw new Error('invalid_oauth_provider');
  // Shared signup consent repair is still pending approval/application. OAuth
  // cannot guarantee an existing account, even for a known provider. Preserve
  // the prepared PKCE implementation but fail before the SDK starts a flow.
  if (PUBLIC_READING_RELEASE) {
    const error = new Error('AUTH_SIGNUP_CONSENT_PENDING');
    error.code = 'AUTH_SIGNUP_CONSENT_PENDING';
    throw error;
  }
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
  return { provider, options: { redirectTo: origin + (functionalPreview ? '/auth/callback' : safeOAuthReturnPath(returnTo)), ...(provider === 'facebook' ? { scopes: 'email public_profile' } : {}) } };
}

export function googleOAuthRequest(args) { return providerOAuthRequest({ ...args, provider: 'google' }); }
