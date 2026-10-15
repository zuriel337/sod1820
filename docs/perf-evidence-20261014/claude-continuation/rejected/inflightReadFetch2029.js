// Concurrent identical public reads share ONE request. This is not a cache: the entry is removed
// the moment response headers arrive, so any later read goes to the network and sees fresh data.
// Only GET/HEAD with a default cache policy are shared; the key carries the method, URL and every
// header (apikey, Authorization, Accept-Profile, Prefer, Range...), so a signed-in read can never
// share a response with an anonymous one. Each caller keeps its own abort semantics: the shared
// request is aborted only when every caller that holds it has aborted.
const SHAREABLE = new Set(["GET", "HEAD"]);

function keyOf(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
  const method = String(init.method || input?.method || "GET").toUpperCase();
  if (!url || !SHAREABLE.has(method) || init.body != null || init.cache || init.credentials || init.keepalive) return null;
  if (typeof input === "object" && !(input instanceof URL) && (input.cache && input.cache !== "default")) return null;
  const headers = [...new Headers(init.headers || input?.headers).entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `${method} ${url} ${JSON.stringify(headers)}`;
}

export function createInflightReadFetch2029({ baseFetch = (...args) => fetch(...args) } = {}) {
  const inflight = new Map();
  return (input, init = {}) => {
    const key = keyOf(input, init || {});
    const signal = init?.signal || input?.signal;
    if (!key) return baseFetch(input, init);
    if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
    let entry = inflight.get(key);
    if (!entry) {
      const controller = new AbortController();
      const { signal: _ignored, ...rest } = init || {};
      entry = { controller, holders: 0, promise: null };
      entry.promise = Promise.resolve(baseFetch(input instanceof URL || typeof input === "string" ? input : input.url, { ...rest, signal: controller.signal }))
        .finally(() => { if (inflight.get(key) === entry) inflight.delete(key); });
      entry.promise.catch(() => {});
      inflight.set(key, entry);
    }
    entry.holders += 1;
    const held = entry;
    return new Promise((resolve, reject) => {
      let done = false;
      const release = () => { held.holders -= 1; if (held.holders <= 0) { if (inflight.get(key) === held) inflight.delete(key); held.controller.abort(); } };
      const onAbort = () => { if (done) return; done = true; release(); reject(new DOMException("Aborted", "AbortError")); };
      signal?.addEventListener("abort", onAbort, { once: true });
      held.promise.then((response) => {
        if (done) return;
        done = true; signal?.removeEventListener("abort", onAbort);
        held.holders -= 1;
        resolve(response.clone());
      }, (error) => {
        if (done) return;
        done = true; signal?.removeEventListener("abort", onAbort);
        held.holders -= 1;
        reject(error);
      });
    });
  };
}
