// Crawler eligibility of pure big-number pages (/number/NNNNN, five digits or more), kept per edge instance.
//
// Owner of the decision: public.sitemap_numbers() (the canonical Number publication/indexability gate, Human Gate 7.9.2026), read through its
// compatibility adapter public.content_big_numbers() (integer[] of the admitted values above 9999). This module adds no list and no rule of
// its own; it only decides what a crawler gets when that source cannot be relied on.
//
// ZURIEL 18.11.2026 (focused decision for the uncertain state only, not a change of the bot policy):
//   - eligible (the value is in a usable list)                → the request continues as before;
//   - not eligible (a usable list without the value)          → 403, exactly as before ("not eligible for indexing" is not "no content");
//   - unknown (the source failed, timed out or answered something unusable, and there is no copy that may be relied on)
//                                                             → a light 503 with a short Retry-After and no-store. Never a pass-through.
// Requests already refused for an independent reason (bad bot, private path, country) never reach this module.
//
// Timing, from the live source (Vercel observability, outgoing requests to rpc/content_big_numbers, 11-18.11.2026: 330 reads, all HTTP 200,
// p50 244 ms, p99 700 ms, max 786 ms; payload 25 bytes, 4 values on 18.11):
//   - routine: a copy younger than freshMs (60 min, unchanged from before) decides; the first crawler after that waits for one new read, as
//     before. So a number that becomes eligible, or stops being eligible, reaches crawlers within the hour (plus that one read);
//   - the read waits at most readTimeoutMs (1,500 ms). 800 ms would sit just above the slowest read seen in a week (786 ms) and turn ordinary
//     slow reads into 503s, since a failed read now answers 503 instead of passing; 1,500 ms is about twice that maximum;
//   - ONLY when that read fails is the last good copy used, and only while it is younger than failureCopyMaxMs (6 h). Older → 503. The copy
//     never replaces a successful read and never extends itself;
//   - after a failed read no new read starts for failureHoldMs (30 s); crawlers meanwhile get the copy (if under 6 h) or the 503 at once.
// The edge decision only admits or refuses a crawler. The page it reaches still reads the current publication state itself (api/og.js reads
// is_number_indexable for its robots tag), so a copy never bypasses the content's own publication check.
export const BIG_NUMBER_ELIGIBILITY = Object.freeze({
  freshMs: 60 * 60 * 1000,
  failureCopyMaxMs: 6 * 60 * 60 * 1000,
  readTimeoutMs: 1500,
  failureHoldMs: 30 * 1000,
  retryAfterSeconds: 120,
  maxValues: 100000,
});

export const BIG_NUMBER_MIN = 10000;

/** A usable answer is a JSON array of safe integers above 9999 (the RPC's own contract); anything else is unusable → null. */
export function parseBigNumberList(body, { maxValues = BIG_NUMBER_ELIGIBILITY.maxValues } = {}) {
  if (!Array.isArray(body) || body.length > maxValues) return null;
  const set = new Set();
  for (const v of body) {
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < BIG_NUMBER_MIN) return null;
    set.add(v);
  }
  return set;
}

/** One bounded read of the source. Resolves to a Set, or throws (HTTP error, wrong type, bad JSON, bad values, timeout). */
export async function readBigNumberList({ url, headers, fetchImpl = fetch, timeoutMs = BIG_NUMBER_ELIGIBILITY.readTimeoutMs } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('big-number eligibility read timed out')), timeoutMs);
  try {
    const r = await fetchImpl(url, { method: 'POST', headers, body: '{}', signal: ctrl.signal });
    if (!r || !r.ok) throw new Error(`big-number eligibility read HTTP ${r ? r.status : 'none'}`);
    const set = parseBigNumberList(await r.json());
    if (!set) throw new Error('big-number eligibility read: unusable answer');
    return set;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{ read: () => Promise<Set<number>>, now?: () => number, freshMs?: number, failureCopyMaxMs?: number, failureHoldMs?: number }} options
 * read() resolves to a usable Set or throws; its own time bound is readBigNumberList's timeout.
 */
export function createBigNumberEligibility({ read, now = () => Date.now(), freshMs = BIG_NUMBER_ELIGIBILITY.freshMs,
  failureCopyMaxMs = BIG_NUMBER_ELIGIBILITY.failureCopyMaxMs, failureHoldMs = BIG_NUMBER_ELIGIBILITY.failureHoldMs } = {}) {
  let list = null, readAt = 0, failedAt = -Infinity, inflight = null;
  const refresh = () => {
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const next = await read();
        if (next instanceof Set) { list = next; readAt = now(); } else failedAt = now();
      } catch { failedAt = now(); }
      finally { inflight = null; }
    })();
    return inflight;
  };
  const decide = (value, state) => ({ decision: list.has(value) ? 'eligible' : 'not_eligible', state });
  const copyUsable = () => Boolean(list) && now() - readAt < failureCopyMaxMs;
  return {
    /**
     * → { decision: "eligible" | "not_eligible" | "unknown", state }. state: "fresh" (copy under freshMs, no read) · "read" (the crawler waited
     * for a new usable copy) · "fallback" (that read failed; the last good copy, under failureCopyMaxMs, decided) · "held" (a read failed under
     * failureHoldMs ago: no new read; the copy decides if usable, else unknown) · "failed" (the read failed and no copy may be relied on).
     */
    async get(value) {
      if (list && now() - readAt < freshMs) return decide(value, 'fresh');
      if (now() - failedAt < failureHoldMs) return copyUsable() ? decide(value, 'held') : { decision: 'unknown', state: 'held' };
      await refresh();
      if (list && now() - readAt < freshMs) return decide(value, 'read');
      return copyUsable() ? decide(value, 'fallback') : { decision: 'unknown', state: 'failed' };
    },
    /** For tests and diagnostics only. */
    snapshot: () => ({ size: list ? list.size : null, readAt, failedAt, reading: Boolean(inflight) }),
  };
}

/** The light answer for the unknown state: nothing about the page, nothing cached, a short retry hint. */
export function bigNumberUnavailableResponse() {
  return new Response('Temporarily unavailable', {
    status: 503,
    headers: {
      'cache-control': 'no-store',
      'retry-after': String(BIG_NUMBER_ELIGIBILITY.retryAfterSeconds),
      'content-type': 'text/plain; charset=utf-8',
    },
  });
}
