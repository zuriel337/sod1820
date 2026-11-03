// Admission for the existing Auth session in a public-reading deployment.
// The server validates the JWT; browser session metadata never grants a role.
export async function verifyReadingSession(session, auth) {
  if (!session?.access_token || !session?.user?.id) return null;
  try {
    const { data, error } = await auth.getUser(session.access_token);
    if (error || !data?.user?.id || data.user.id !== session.user.id) return null;
    return data.user;
  } catch { return null; }
}

export function readingSessionOptions(storage, location = globalThis.location) {
  // Separate from Legacy and limited to this tab. PKCE binds the callback to
  // the initiating tab; ordinary content URLs never consume auth parameters.
  return { persistSession: Boolean(storage), autoRefreshToken: true,
    flowType: "pkce", detectSessionInUrl: location?.pathname === "/auth/callback",
    // The dashboard allowlist uses one exact callback. Extra flow query params
    // would stop matching and can send the user to the Production Site URL.
    experimental: { appendPkceFlowIdToRedirects: false },
    storageKey: "sod-public-reading-account", ...(storage ? { storage } : {}) };
}
