// Same canonical number rows, alternative execution plan. No result/auth cache or new engine.
const optimizedRpc = "fn_number_lookup_2029_page";
const wrapped = new WeakSet();
// Page-load memory (module scope = one document): once the additive RPC answered PGRST202 it is not requested again,
// so a missing function costs one extra request per page load, not one per search. A refresh starts empty; installing the
// function therefore takes effect on the next page load. Only "function not found" is remembered, never any other error.
let optimizedRpcMissing = false;
export function resetNumberLookupTransportMemory() { optimizedRpcMissing = false; }
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
    if (!optimized || optimizedRpcMissing) return rpc(name, args);
    let result;
    try { result = await rpc(optimizedRpc, args); }
    catch (error) {
      if (error?.code === "PGRST202") { optimizedRpcMissing = true; return rpc(name, args); }
      throw error;
    }
    // Deployment order fallback only. Permission, timeout and SQL errors are not hidden or retried.
    if (result?.error?.code === "PGRST202") { optimizedRpcMissing = true; return rpc(name, args); }
    return result;
  };
  wrapped.add(transport);
  return transport;
}
