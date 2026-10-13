// Shared reader for site_flags. Pure: the row source and clock are injected, so it is unit-testable.
//
// Contract (lock checks must never turn an unknown state into "open"):
//  - concurrent callers share one in-flight request;
//  - a SUCCESSFUL result is reused for ttlMs, then it is expired and never served again;
//  - {fresh:true} (navigation / explicit refresh) ignores a completed result, and joins an in-flight
//    request only if it started within burstMs (same render burst), so a flip that happened before
//    the call is not hidden behind an older request;
//  - a FAILED read returns {} (the pre-existing result: requireFlag consumers then fail closed),
//    clears the cache and is never stored, so the next call retries. An expired or older
//    successful result is NEVER returned in place of a failure;
//  - an older response can never overwrite a newer one.
export const SITE_FLAGS_TTL_MS = 30000;
const BURST_MS = 250;

export function createSiteFlagsReader({ fetchRows, now = Date.now, ttlMs = SITE_FLAGS_TTL_MS, burstMs = BURST_MS }) {
  let cache = null, cacheAt = 0, seq = 0, applied = 0, inflight = null, inflightAt = 0;

  function load() {
    const mine = ++seq;
    const run = async () => {
      try {
        const rows = await fetchRows();
        if (!Array.isArray(rows)) throw new Error("site_flags_unavailable");
        const map = {};
        for (const row of rows) map[row.key] = row;
        if (mine >= applied) { applied = mine; cache = map; cacheAt = now(); }
        return map;
      } catch {
        if (mine >= applied) { applied = mine; cache = null; cacheAt = 0; }
        return {};
      }
    };
    const p = run().finally(() => { if (inflight === p) inflight = null; });
    inflight = p; inflightAt = now();
    return p;
  }

  return function readSiteFlags({ fresh = false } = {}) {
    const t = now();
    if (!fresh && cache && t - cacheAt < ttlMs) return Promise.resolve(cache);
    if (inflight && (!fresh || t - inflightAt <= burstMs)) return inflight;
    return load();
  };
}
