// A 2029 route may ask for the same canonical site_flags snapshot in two waves:
// the shell/runtime switches first, then a lazy route's lock consumers. Share one
// successful snapshot only inside the current browser navigation. Legacy callers
// keep their existing in-flight-only behavior.

export function siteFlagsNavigationIdentity2029(browser = typeof window === "undefined" ? null : window) {
  if (!browser) return "server";
  const location = browser.location || {};
  const state = browser.history?.state;
  const historyKey = typeof state?.key === "string" ? state.key : "";
  return JSON.stringify([
    historyKey,
    location.pathname || "",
    location.search || "",
    location.hash || "",
  ]);
}

export function createSiteFlagsReadScope2029({
  reuseResolved = false,
  getNavigationIdentity = siteFlagsNavigationIdentity2029,
} = {}) {
  let revision = 0;
  let record = null;
  const invalidationListeners = new Set();
  const canReuseResolved = () => typeof reuseResolved === "function" ? !!reuseResolved() : !!reuseResolved;
  const currentScope = () => `${revision}:${getNavigationIdentity()}`;

  const invalidate = () => {
    revision += 1;
    record = null;
    for (const listener of invalidationListeners) {
      try { listener(currentScope()); } catch { /* invalidation must not break auth/navigation */ }
    }
  };

  const subscribeInvalidation = (listener) => {
    invalidationListeners.add(listener);
    return () => invalidationListeners.delete(listener);
  };

  const read = async (fetcher, { fresh = false } = {}) => {
    if (fresh) invalidate();
    const scope = currentScope();
    if (record?.scope === scope) {
      if (record.status === "pending") return record.promise;
      if (record.status === "resolved" && canReuseResolved()) return record.value;
    }

    let promise;
    let fetched;
    try { fetched = fetcher(); } catch (error) { fetched = Promise.reject(error); }
    promise = Promise.resolve(fetched).then(
      (value) => {
        if (record?.promise === promise) {
          record = canReuseResolved()
            ? { scope, status: "resolved", value }
            : null;
        }
        return value;
      },
      (error) => {
        if (record?.promise === promise) record = null;
        throw error;
      },
    );
    record = { scope, status: "pending", promise };
    return promise;
  };

  return { read, invalidate, currentScope, subscribeInvalidation };
}

export function createSiteFlagsReader2029({
  client,
  reuseResolved = false,
  getNavigationIdentity = siteFlagsNavigationIdentity2029,
} = {}) {
  const scope = createSiteFlagsReadScope2029({ reuseResolved, getNavigationIdentity });

  const read = async ({ fresh = false } = {}) => {
    if (!client) return {};
    try {
      return await scope.read(async () => {
        const { data, error } = await client.from("site_flags").select("key,enabled,message,mode");
        if (error) throw error;
        const map = {};
        for (const row of (data || [])) map[row.key] = row;
        return map;
      }, { fresh });
    } catch {
      // Existing access semantics are preserved: required launch gates fail
      // closed when their row is absent; optional locks retain their resolver.
      return {};
    }
  };

  return {
    read,
    invalidate: scope.invalidate,
    currentScope: scope.currentScope,
    subscribeInvalidation: scope.subscribeInvalidation,
  };
}
