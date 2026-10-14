// Same canonical number rows, alternative execution plan. No result/auth cache or new engine.
const optimizedRpc = "fn_number_lookup_2029_page";
const wrapped = new WeakSet();
const defaultReadSwitches = async () => (await import("../runtimeSwitches2029.js")).readRuntimeSwitches();

export function createNumberLookupTransport(rpc, {
  is2029 = typeof __SOD_2029_BUILD__ !== "undefined" && __SOD_2029_BUILD__,
  readSwitches = defaultReadSwitches,
} = {}) {
  if (typeof rpc !== "function" || !is2029 || wrapped.has(rpc)) return rpc;
  const transport = async (name, args) => {
    if (name !== "fn_number_lookup") return rpc(name, args);
    let optimized = false;
    try { optimized = (await readSwitches()).fx_number_lookup_page === true; } catch { /* retain baseline */ }
    if (!optimized) return rpc(name, args);
    let result;
    try { result = await rpc(optimizedRpc, args); }
    catch (error) {
      if (error?.code === "PGRST202") return rpc(name, args);
      throw error;
    }
    // Deployment order fallback only. Permission, timeout and SQL errors are not hidden or retried.
    if (result?.error?.code === "PGRST202") return rpc(name, args);
    return result;
  };
  wrapped.add(transport);
  return transport;
}
