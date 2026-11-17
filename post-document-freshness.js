// Post document freshness at the edge (ZURIEL 17.11.2026, POST_DOCUMENT_CDN_CACHE_EXPERIMENT_20261117). Part of the existing Routing
// Middleware (middleware-core.js), which already keeps short-lived policy reads in memory; no new service, store or detector.
//
// The rule: a kept CDN copy of a Post document may be used only while this edge instance holds a list of recently changed Posts that it read
// at most LEASE_MS ago, and only if the requested Post is not on it. A Post on the list (edited, hidden, deleted, re-addressed or published in
// the last 20 minutes; the database writes the list in the same transaction as the change) and every Post while the list is missing or old
// is built fresh by the origin, which reads the live database. 20 minutes is more than three times the longest life of a kept copy (5 minutes
// fresh + 1 minute served while refreshing), so by the time a Post leaves the list no copy made before its change can still be used.
//
// The list is read in the background (never on a reader's critical path), directly from the database's public read
// (post_document_recent_changes_v1: hashed address keys and a count only), the way this middleware already reads its other policies. It is
// read only while this instance is serving a burst — another Post request arrived within LEASE_MS — because only then can a fresh list be
// used before it is old: a quiet instance makes no extra call and builds every Post fresh, exactly as without a CDN. So after a change
// commits, every copy made before it stops being used within LEASE_MS + one read (at most fetchTimeoutMs); if the read fails, copies stop
// being used altogether (fail closed) until a read succeeds.
import { isKnownSingleSegmentRoute, isSingleSegmentRoute, postSlugVariants } from './route-legitimacy.js';

export const POST_DOCUMENT_FRESHNESS = Object.freeze({
  leaseMs: 5000,          // the oldest list this edge may trust
  refreshAfterMs: 2000,   // a list older than this is re-read in the background
  fetchTimeoutMs: 1500,
  listRpc: 'post_document_recent_changes_v1',
  bypassParam: '__sod_fresh',
  testHeader: 'x-sod-test-post-changes',
  testBranch: 'ccr-dcadb071-v1z5ol',
});

const HEX16 = /^[0-9a-f]{16}$/;
const hex = buffer => Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');

/** The address key the database stores for a slug (fn_post_document_keys): the first 16 hex digits of SHA-256 over its UTF-8 bytes. */
export async function postDocumentKey(slug) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(slug)))).slice(0, 16);
}

/** The keys a requested Post address can match: its decoded and its lower-case percent-encoded spelling (the two the metadata owner reads). */
export async function postDocumentKeysForPath(path) {
  const post = /^\/post\/([^/]+)\/?$/.exec(path || '');
  const { decoded, encodedLower } = postSlugVariants(post ? '/' + post[1] : path);
  return Promise.all([...new Set([decoded, encodedLower].filter(Boolean))].map(postDocumentKey));
}

/** A request the document function might answer from a kept Post copy: GET/HEAD, no query string, a Post-shaped address. */
export function postDocumentGateCandidate(method, url) {
  if (method !== 'GET' && method !== 'HEAD') return false;
  let parsed; try { parsed = new URL(url); } catch { return false; }
  if (parsed.search || parsed.pathname.includes('.')) return false;
  const path = parsed.pathname;
  if (/^\/post\/[^/]+\/?$/.test(path)) return true;
  return isSingleSegmentRoute(path) && !isKnownSingleSegmentRoute(path);
}

/** The same address with the reserved parameter: never a kept copy (the document function never keeps a response that carries it). */
export function postDocumentBypassUrl(url) {
  const next = new URL(url);
  next.searchParams.set(POST_DOCUMENT_FRESHNESS.bypassParam, '1');
  return next;
}

export function validPostDocumentList(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.keys) || !value.keys.every(key => typeof key === 'string' && HEX16.test(key))) return false;
  return value.all_until == null || Number.isFinite(Date.parse(value.all_until));
}

/** Protected Preview of this experiment's branch only: a tester may hand the edge a list (or declare it stale). Ignored everywhere else. */
export function previewTestList(request, env = (typeof process !== 'undefined' ? process.env : {}) || {}) {
  if (env.VERCEL_ENV !== 'preview' || env.VERCEL_GIT_COMMIT_REF !== POST_DOCUMENT_FRESHNESS.testBranch) return null;
  const raw = request.headers.get(POST_DOCUMENT_FRESHNESS.testHeader);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.stale === true) return { stale: true };
    const list = { version: 1, keys: value?.keys || [], all_until: value?.all_until ?? null };
    return validPostDocumentList(list) ? list : { stale: true };
  } catch { return { stale: true }; }
}

/**
 * The gate keeps one list per edge instance. decide() never waits for the network: it answers from the list in memory and hands back a
 * refresh to run in the background (context.waitUntil) when the list is older than refreshAfterMs or missing — but only while the previous
 * Post request on this instance came within leaseMs (a burst). A lone request makes no call: a list read for it would be old before the
 * next request arrives.
 */
export function createPostDocumentGate({ fetchList, now = () => Date.now(), leaseMs = POST_DOCUMENT_FRESHNESS.leaseMs,
  refreshAfterMs = POST_DOCUMENT_FRESHNESS.refreshAfterMs } = {}) {
  let list = null, readAt = 0, inflight = null, lastSeen = -Infinity;
  const refresh = () => inflight || (inflight = Promise.resolve()
    .then(() => fetchList())
    .then(value => { if (validPostDocumentList(value)) { list = { keys: new Set(value.keys), allUntil: Date.parse(value.all_until) || 0 }; readAt = now(); } })
    .catch(() => {})
    .finally(() => { inflight = null; }));

  async function decide(path, { testList = null } = {}) {
    if (testList) {
      if (testList.stale) return { bypass: true, reason: 'stale', refresh: null };
      const keys = new Set(testList.keys), allUntil = Date.parse(testList.all_until) || 0;
      if (allUntil > now()) return { bypass: true, reason: 'all', refresh: null };
      const own = await postDocumentKeysForPath(path);
      return own.some(key => keys.has(key)) ? { bypass: true, reason: 'changed', refresh: null } : { bypass: false, reason: 'clean', refresh: null };
    }
    const at = now(), burst = at - lastSeen <= leaseMs;
    lastSeen = at;
    const age = at - readAt;
    if (!list || age > leaseMs) return { bypass: true, reason: 'stale', refresh: burst ? refresh : null };
    const background = age > refreshAfterMs && burst ? refresh : null;
    if (list.allUntil > now()) return { bypass: true, reason: 'all', refresh: background };
    const own = await postDocumentKeysForPath(path);
    return own.some(key => list.keys.has(key)) ? { bypass: true, reason: 'changed', refresh: background }
      : { bypass: false, reason: 'clean', refresh: background };
  }
  return { decide, refresh, snapshot: () => ({ size: list ? list.keys.size : null, allUntil: list?.allUntil || 0, readAt }) };
}
