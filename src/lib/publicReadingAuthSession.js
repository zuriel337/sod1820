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

export function readingSessionOptions(storage) {
  // Separate from Legacy and limited to this tab. No marketing/device identity.
  return { persistSession: Boolean(storage), autoRefreshToken: true,
    detectSessionInUrl: false, storageKey: "sod-public-reading-account", ...(storage ? { storage } : {}) };
}
