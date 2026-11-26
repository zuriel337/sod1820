// S-62, stage 1 (staged branch, not applied): the admitted-number decision of a /number/<n> document, answered from memory when a function
// instance is being walked by a crawl, and exactly as today (one read of is_number_indexable) when it is not.
//
// Why: is_number_indexable(p) is `select exists(select 1 from sitemap_numbers() where value = p)`, so every call computes the whole admitted set.
// Measured 26.11.2026 as the anonymous role: 612 ms and 66,851 buffers per call (46 ms as the table owner, because the public word floor policy is
// not evaluated per row), 1.0 s wall time at the edge, and about half of all Supabase time of the number and phrase documents during a crawl.
// The set is 1,273 numbers; one full read costs the same as one call.
//
// Rules (they keep the decision, the addresses and the freshness the same):
//  - The decision source is unchanged: the set is read from the same public function (sitemap_numbers), by the same anonymous key, and a number
//    is "indexable" only when it is in that set. Nothing is calculated or recreated here.
//  - Never a partial set. PostgREST returns at most 1,000 rows per request, so the set is read in pages with an exact total; a set whose pages do
//    not add up to that total, a failed page or an unexpected answer is thrown away and the caller reads the one number as before.
//  - Quiet traffic is exactly today's behaviour. The set is only read once an instance has asked BURST_LOOKUPS times within BURST_WINDOW_MS (a crawl);
//    below that, and while the set is being read, the caller makes its single read. So low traffic never pays for the set.
//  - Freshness: used as it is for FRESH; between FRESH and STALE it is used once more while one background read replaces it; past STALE it is never
//    used. The same bound as the words of a number page (first-words.js), so a number that stops being admitted leaves every document within STALE.
//  - A request never waits for the set: it is read in the background (waitUntil keeps it alive after the response).
export const ADMITTED_NUMBERS = Object.freeze({
  freshMs: 5 * 60 * 1000, staleMs: 10 * 60 * 1000,
  burstWindowMs: 5 * 60 * 1000, burstLookups: 3,
  retryAfterFailureMs: 60 * 1000,
  pageSize: 1000, maxPages: 20,
});

let kept = null;      // { values: Set<number>, at: number }
let reading = null;   // the one background read in flight
let lookups = [];     // times of recent lookups on this instance
let failedAt = -Infinity; // a failed read is not retried for retryAfterFailureMs (a crawl must never multiply a failing read)

export function _resetAdmittedNumbersForTests() { kept = null; reading = null; lookups = []; failedAt = -Infinity; }

function keepAlive(promise) {
  try { globalThis[Symbol.for("@vercel/request-context")]?.get?.()?.waitUntil?.(promise); } catch { /* no request context: plain process */ }
  return promise;
}

const range = header => {
  const match = /^(?:(\d+)-(\d+)|\*)\/(\d+)$/.exec(String(header || "").trim());   // "0-999/1273", or "*/0" for an empty set
  return match ? { total: Number(match[3]) } : null;
};

// The whole admitted set as rows {value, priority, lastmod} ordered by value, or an error. Pages of pageSize with an exact total taken from the first
// page; the pages must add up to that total and carry no value twice. The same read serves the sitemap (S-63) and the decision above, so both see the
// same complete set. attempts > 1 reads again when the set changed between two pages (the pages then do not add up); it never returns a partial set.
export async function readAdmittedNumberRows2029({ supabaseUrl, headers, fetchImpl = globalThis.fetch, timeoutMs = 15000, attempts = 1 } = {}) {
  if (typeof fetchImpl !== "function" || !supabaseUrl) throw new Error("admitted_numbers_unavailable");
  let last;
  for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
    try { return await readOnce({ supabaseUrl, headers, fetchImpl, timeoutMs }); } catch (error) {
      last = error;
      if (error?.message !== "admitted_numbers_incomplete") break;   // only a set that changed under the pages is read again
    }
  }
  throw last;
}

async function readOnce({ supabaseUrl, headers, fetchImpl, timeoutMs }) {
  const byValue = new Map();
  let total = null, got = 0;
  for (let page = 0; page < ADMITTED_NUMBERS.maxPages; page += 1) {
    const offset = page * ADMITTED_NUMBERS.pageSize;
    const response = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/sitemap_numbers?offset=${offset}&limit=${ADMITTED_NUMBERS.pageSize}`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json", ...(page === 0 ? { Prefer: "count=exact" } : {}) },
      body: "{}", signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error("admitted_numbers_unavailable");
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("admitted_numbers_invalid");
    if (page === 0) {
      total = range(response.headers.get("content-range"))?.total;
      if (!Number.isSafeInteger(total)) throw new Error("admitted_numbers_total_unknown");
    }
    for (const row of rows) {
      const value = Number(row?.value);
      if (!Number.isSafeInteger(value)) throw new Error("admitted_numbers_invalid");
      if (byValue.has(value)) throw new Error("admitted_numbers_incomplete");   // a value twice means the pages overlapped: the set moved
      byValue.set(value, { value, priority: row.priority, lastmod: row.lastmod });
    }
    got += rows.length;
    if (got >= total) break;
    if (!rows.length) throw new Error("admitted_numbers_incomplete");
  }
  if (got !== total || byValue.size !== total) throw new Error("admitted_numbers_incomplete");
  return [...byValue.values()].sort((a, b) => a.value - b.value);
}

export async function readAdmittedNumbers2029(options = {}) {
  return new Set((await readAdmittedNumberRows2029(options)).map(row => row.value));
}

function refresh(options, now) {
  if (reading) return reading;
  if (now() - failedAt < ADMITTED_NUMBERS.retryAfterFailureMs) return Promise.reject(new Error("admitted_numbers_backoff"));
  const pending = readAdmittedNumbers2029(options).then(values => { kept = { values, at: now() }; return values; },
    error => { failedAt = now(); throw error; }).finally(() => { reading = null; });
  reading = pending;
  keepAlive(pending.catch(() => null));
  return pending;
}

// perKey: the existing single read (is_number_indexable), returning a boolean or throwing as it does today.
export async function numberIndexable2029(value, { perKey, supabaseUrl, headers, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const t = now();
  lookups = lookups.filter(at => t - at < ADMITTED_NUMBERS.burstWindowMs);
  lookups.push(t);
  const age = kept ? t - kept.at : Infinity;
  if (kept && age < ADMITTED_NUMBERS.freshMs) return kept.values.has(value);
  if (kept && age < ADMITTED_NUMBERS.staleMs) {
    refresh({ supabaseUrl, headers, fetchImpl }, now).catch(() => null);
    return kept.values.has(value);
  }
  if (lookups.length >= ADMITTED_NUMBERS.burstLookups) refresh({ supabaseUrl, headers, fetchImpl }, now).catch(() => null);
  return perKey();
}
