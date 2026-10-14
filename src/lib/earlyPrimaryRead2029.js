// A one-shot anonymous entry-route response handoff, never a general response cache.
export function startPrimaryReads2029({ route, urls, anonKey, host = window }) {
  try {
    // Do not run ahead of auth. Unknown/blocked storage is conservative: normal reader wins.
    if (host.localStorage.getItem('sb-linswmnnkjxvweumprav-auth-token')) return;
    const slots = new Map();
    host.__sodPrimaryReads2029 = slots;
    for (const url of urls) {
      const entry = { route, created: Date.now(), accept: 'application/json', profile: 'public' };
      entry.promise = host.fetch(url, { method: 'GET', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: entry.accept, 'Accept-Profile': entry.profile } });
      entry.promise.catch(() => {});
      slots.set(url, entry);
    }
    host.setTimeout(() => { slots.clear(); }, 15000);
  } catch { /* Public-read optimization must never prevent normal boot. */ }
}
export function createEarlyReadFetch2029({ anonKey, baseFetch = (...args) => fetch(...args), host = typeof window === 'undefined' ? null : window } = {}) {
  return async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    const method = String(init.method || input?.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers || input?.headers);
    const hit = host?.__sodPrimaryReads2029?.get(url);
    if (!hit || method !== 'GET' || headers.get('apikey') !== anonKey || headers.get('authorization') !== `Bearer ${anonKey}`
      || headers.has('prefer') || headers.has('range') || headers.has('content-profile')
      || (headers.get('accept') || 'application/json') !== hit.accept || (headers.get('accept-profile') || 'public') !== hit.profile
      || host.location.pathname !== hit.route || Date.now() - hit.created > 15000) return baseFetch(input, init);
    const signal = init.signal || input?.signal;
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    let onAbort;
    try {
      const response = await (signal ? Promise.race([hit.promise, new Promise((_, reject) => {
        onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
        signal.addEventListener('abort', onAbort, { once: true });
      })]) : hit.promise);
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (!response.ok) return baseFetch(input, init);
      return response.clone();
    } catch (error) {
      if (signal?.aborted) throw error;
      return baseFetch(input, init);
    } finally {
      if (onAbort) signal.removeEventListener('abort', onAbort);
      // Concurrent initial consumers may clone the same pending response. Later reads fetch fresh.
      if (host.__sodPrimaryReads2029?.get(url) === hit) host.__sodPrimaryReads2029.delete(url);
    }
  };
}
