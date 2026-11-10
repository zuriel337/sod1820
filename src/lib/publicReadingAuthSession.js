import { SITE_URL } from "./seo.js";
import { createResilientAuthStorage, registerAuthStorage } from "./authStorage.js";

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
  // The SDK always gets a storage that cannot throw (src/lib/authStorage.js): the primary store as before, then this tab's
  // sessionStorage, then memory. A full or blocked localStorage no longer stops a sign-in; it only reduces how long it lasts.
  const primary = canonical ? () => canonicalStorage || globalThis.localStorage : () => storage;
  const resilient = registerAuthStorage(createResilientAuthStorage({ primary, secondary: () => globalThis.sessionStorage }));
  // With no usable store at all the SDK keeps its own memory-only session, exactly as before; with any usable store it uses the resilient one.
  // Each store is probed on its own: a blocked localStorage throws on access and must not hide a working sessionStorage.
  const available = get => { try { return Boolean(get()); } catch { return false; } };
  const usable = available(primary) || available(() => globalThis.sessionStorage);
  return { persistSession: usable, autoRefreshToken: true,
    flowType: "pkce", detectSessionInUrl: location?.pathname === "/auth/callback",
    experimental: { appendPkceFlowIdToRedirects: false },
    // Omitting storageKey deliberately keeps the SDK's existing project key.
    ...(canonical ? {} : { storageKey: "sod-public-reading-account" }),
    storage: resilient };
}
