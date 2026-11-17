// The edge's country policy, kept per instance (ZURIEL 17.11.2026, test branch: "תיקון שומר הסף").
//
// The owner stays public.edge_blocked_countries (enabled + mode + strict_level), read by middleware-core.js with the anonymous key; this module
// only decides WHEN a reader waits for that read. Before: an instance whose copy was older than 5 minutes read the table again (Tokyo) while
// the reader waited. On quiet edge regions that is most reads: the middleware's time to first byte on "/" was 0.77 s at p75 in fra1 and
// 0.8-1.3 s in other European and far regions on 17.11.2026, against 20-25 ms in the busy US regions (Vercel observability).
//
// Now:
//   - copy younger than freshMs (5 min, unchanged): used, as before;
//   - copy between freshMs and maxStaleMs (60 min): used at once, and ONE background read replaces it (the next requests get the new policy);
//   - no copy yet (a new instance) or an older one: the reader waits for the read as before, at most coldWaitMs (3 s); if the read fails or
//     takes longer, the last copy is used, or none (the existing rule: the country policy fails open on errors; bot and path rules still apply).
// A changed policy therefore reaches a busy instance within the same ~5 minutes as before (plus one request), and a quiet instance at the
// latest on its first request after 60 minutes, when it waits for the read again. An unusable answer never replaces a good copy.
export const COUNTRY_POLICY_TIMING = Object.freeze({ maxStaleMs: 60 * 60 * 1000, coldWaitMs: 3000, readTimeoutMs: 5000 });

/**
 * @param {{ read: () => Promise<Map|null>, freshMs: number, maxStaleMs?: number, coldWaitMs?: number, now?: () => number,
 *           wait?: (ms: number) => { promise: Promise<void>, cancel: () => void } }} options
 * read() resolves to the policy Map, or null for an unusable answer; it may throw.
 */
export function createCountryPolicyCache({ read, freshMs, maxStaleMs = COUNTRY_POLICY_TIMING.maxStaleMs, coldWaitMs = COUNTRY_POLICY_TIMING.coldWaitMs,
  now = () => Date.now(), wait = defaultWait } = {}) {
  let policy = null, readAt = 0, inflight = null;
  const refresh = () => {
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const next = await read();
        if (next instanceof Map) { policy = next; readAt = now(); }
      } catch { /* keep the last copy */ }
      finally { inflight = null; }
    })();
    return inflight;
  };
  return {
    /**
     * → { policy: Map, state }. state: "fresh" (copy under freshMs) · "refresh" (a copy under maxStaleMs, used at once, read again in the
     * background) · "waited" (no usable copy: the reader waited and got a new one) · "fallback" (the read failed or took longer than
     * coldWaitMs: the last copy, however old) · "none" (nothing read yet on this instance: no country policy, as on a read error before).
     */
    async get({ waitUntil } = {}) {
      const age = policy ? now() - readAt : Infinity;
      if (age < freshMs) return { policy, state: "fresh" };
      const pending = refresh();
      try { waitUntil?.(pending); } catch { /* no request context: the read simply continues */ }
      if (age < maxStaleMs) return { policy, state: "refresh" };
      const timer = wait(coldWaitMs);
      await Promise.race([pending, timer.promise]);
      timer.cancel();
      if (policy && now() - readAt < freshMs) return { policy, state: "waited" };
      return policy ? { policy, state: "fallback" } : { policy: new Map(), state: "none" };
    },
    /** For tests and diagnostics only. */
    snapshot: () => ({ size: policy ? policy.size : null, readAt, reading: Boolean(inflight) }),
  };
}

function defaultWait(ms) {
  let id;
  const promise = new Promise(resolve => { id = setTimeout(resolve, ms); });
  return { promise, cancel: () => clearTimeout(id) };
}
