import { SITE_URL } from "./seo.js";

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

export function readingSessionOptions(storage, location = globalThis.location, { productionArtifact = false, canonicalStorage } = {}) {
  // Only the dormant final artifact at the exact canonical HTTPS origin may
  // reuse Legacy's SDK-owned storage. Nothing is copied, merged or removed.
  const canonical = productionArtifact === true && location?.origin === SITE_URL;
  let selected = storage;
  if (canonical) {
    try { selected = canonicalStorage || globalThis.localStorage; }
    catch { selected = undefined; } // Storage denied: memory-only, no tab fallback.
  }
  return { persistSession: Boolean(selected), autoRefreshToken: true,
    flowType: "pkce", detectSessionInUrl: location?.pathname === "/auth/callback",
    experimental: { appendPkceFlowIdToRedirects: false },
    // Omitting storageKey deliberately keeps the SDK's existing project key.
    ...(canonical ? {} : { storageKey: "sod-public-reading-account" }),
    ...(selected ? { storage: selected } : {}) };
}
