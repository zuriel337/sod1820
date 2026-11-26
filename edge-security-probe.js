// Edge security probe layer (PROPOSAL IN BRANCH, decision 337, 26.11.2026). Pure helpers: no I/O of their own.
//
// Why it exists: the Legacy site answered scanner probes (wp-admin, .env, xmlrpc.php, ...) with a serverless function
// (api/honeypot.js) that wrote public.security_log through the RPC log_security. The 2029 public root has neither the function
// nor its rewrites, so security_log stopped on 4.11.2026 and check_security_spike kept reporting "succeeded" while blind.
// This module restores the same signal in the EXISTING edge middleware (middleware-core.js), without a function invocation,
// without a new table, and without touching a healthy browsing request:
//   * PREVENTION  - an exact, short list of paths no 2029 page can have is answered 403 at the edge, before any database read.
//   * RECORDING   - the existing RPC log_security (country, path, user agent, coarse address), fire-and-forget (waitUntil),
//                   capped per instance so a scan cannot flood the database.
//   * ALERTING ON SILENCE - a scheduled canary (scripts/post-deploy-canary.mjs) sends one synthetic probe with PROBE_CANARY_UA;
//                   check_security_spike (SQL proposal 20261126160000) alerts when no canary row arrived for 13 hours.
// WAF custom rules are NOT part of this (a Vercel setting; separate approval). Nothing here is a Human proof or a country policy.

export const PROBE_CANARY_UA = 'sod1820-security-canary/1';
export const PROBE_CANARY_PATH = '/wp-admin/sod-security-canary';

// Paths that cannot belong to this site. Deliberately NOT listed: /wp-content/* (S-56 redirects old media from that prefix to the
// stored copy) and /admin/* (not a 2029 route, but an old public address the owner may still use; decide separately).
const PROBE_PATTERNS = [
  /^\/wp-(?:admin|includes)(?:\/|$)/i,
  /^\/wp-(?:login|cron|config)\.php$/i,
  /^\/xmlrpc\.php$/i,
  /^\/(?:.*\/)?\.(?:env|git|aws|ssh|vscode)(?:[./]|$)/i,
  /^\/(?:.*\/)?\.ds_store$/i,
  /^\/phpmyadmin(?:\/|$)/i,
  /^\/pma(?:\/|$)/i,
  /^\/vendor\//i,
  /^\/cgi-bin\//i,
  /^\/server-status$/i,
  /^\/actuator(?:\/|$)/i,
  /\.php$/i,
];

export function isSecurityProbe(pathname) {
  if (typeof pathname !== 'string' || pathname === '' || pathname === '/') return false;
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch { /* a malformed escape is judged as written */ }
  return PROBE_PATTERNS.some((re) => re.test(p));
}

export function isProbeCanary(userAgent) {
  return typeof userAgent === 'string' && userAgent.startsWith('sod1820-security-canary');
}

// IPv4 -> /24, IPv6 -> first 3 groups (/48). Enough for geography and spike grouping, not a person. The Legacy honeypot stored the
// full address; storing less is the conservative choice and is listed as a decision for ZURIEL (PART3-DECISION-337.md).
export function coarseAddress(value) {
  const raw = String(value || '').split(',')[0].trim();
  if (!raw) return '';
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(raw)) return raw.split('.').slice(0, 3).join('.') + '.0/24';
  if (raw.includes(':')) return raw.split(':').slice(0, 3).join(':') + '::/48';
  return '';
}

export const PROBE_LOG_PER_MINUTE = 20;

// A per-instance admission window: at most `limit` probe rows per minute per instance. The 403 itself is never rate-limited.
export function createProbeAdmission({ limit = PROBE_LOG_PER_MINUTE, windowMs = 60_000, now = () => Date.now() } = {}) {
  let start = 0; let count = 0;
  return function admit() {
    const t = now();
    if (t - start >= windowMs) { start = t; count = 0; }
    if (count >= limit) return false;
    count += 1;
    return true;
  };
}

export function probeLogBody({ country, pathname, userAgent, forwardedFor }) {
  const canary = isProbeCanary(userAgent);
  return {
    p_country: String(country || 'XX').slice(0, 2),
    p_path: String(pathname || '').slice(0, 300),
    p_ua: String(userAgent || '').slice(0, 300),
    p_ip: canary ? '' : coarseAddress(forwardedFor),
  };
}

export function probeDeniedResponse() {
  return new Response('Access denied', {
    status: 403,
    headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-sod-probe': 'denied' },
  });
}
