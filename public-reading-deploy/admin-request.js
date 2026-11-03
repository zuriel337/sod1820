// Deployment admission only. This verifies the caller against the canonical
// Auth server and its own RLS-bound identity row. It never grants a DB role,
// substitutes credentials, caches a private identity or overrides endpoint policy.
// Kept self-contained so the exact same verifier is emitted into the worker.
export async function verifyReadingAdmin({ token, apiKey, signal, fetchImpl = fetch }) {
  try {
    if (signal?.aborted || typeof token !== "string" || token.length > 8192 || !apiKey
      || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
    // A negative filter avoids probing Auth for the publishable anon token.
    // Claims NEVER positively authorize; both server reads below must agree.
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(encoded));
    if (claims.role !== "authenticated" || typeof claims.sub !== "string") return null;
    const origin = "https://linswmnnkjxvweumprav.supabase.co";
    const options = { headers: { apikey: apiKey, Authorization: `Bearer ${token}` }, credentials: "omit", cache: "no-store", redirect: "error", signal };
    const auth = await fetchImpl(origin + "/auth/v1/user", options);
    if (!auth.ok || signal?.aborted) return null;
    const user = await auth.json();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user?.id || "") || user.id !== claims.sub) return null;
    const role = await fetchImpl(origin + "/rest/v1/users?select=id%2Crole&id=eq." + encodeURIComponent(user.id) + "&limit=2", options);
    if (!role.ok || signal?.aborted) return null;
    const rows = await role.json();
    return Array.isArray(rows) && rows.length === 1 && rows[0]?.id === user.id && rows[0].role === "admin" ? user.id : null;
  } catch { return null; }
}
