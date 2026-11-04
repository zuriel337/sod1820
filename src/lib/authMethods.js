import { useEffect, useState } from "react";
import { SUPABASE_URL, SUPABASE_ANON } from "./supabase.js";
import { providerOAuthRequest } from "./oauthReturn.js";

const NON_OAUTH = new Set(["email", "phone", "anonymous"]);
const LABELS = { google: "Google", facebook: "Facebook", apple: "Apple", github: "GitHub", azure: "Microsoft", twitter: "X", linkedin_oidc: "LinkedIn" };

// Supabase public settings own enabled methods; the existing OAuth owner owns
// trusted return origins. A surface never supplies its own provider allowlist.
export function configuredAuthMethods(settings, context) {
  const external = settings?.external;
  if (!external || typeof external !== "object" || Array.isArray(external)) throw new Error("auth_settings_unavailable");
  let oauthAvailable = true;
  try { providerOAuthRequest({ ...context, returnTo: "/" }); } catch { oauthAvailable = false; }
  return {
    email: external.email === true,
    oauth: Object.entries(external).filter(([id, enabled]) => enabled === true && !NON_OAUTH.has(id) && /^[a-z][a-z0-9_]*$/.test(id))
      .map(([id]) => ({ id, label: LABELS[id] || id, available: oauthAvailable })),
  };
}

export async function readAuthMethods({ fetchImpl = fetch, signal, origin = window.location.origin, integratedPreview = import.meta.env.VITE_INTEGRATED_PREVIEW === "true" } = {}) {
  const response = await fetchImpl(`${SUPABASE_URL}/auth/v1/settings`, { method: "GET", headers: { apikey: SUPABASE_ANON }, credentials: "omit", cache: "no-store", signal });
  if (!response.ok) throw new Error("auth_settings_unavailable");
  return configuredAuthMethods(await response.json(), { origin, integratedPreview });
}

export function useAuthMethods(enabled) {
  const [state, setState] = useState({ state: "loading", email: false, oauth: [] });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    setState({ state: "loading", email: false, oauth: [] });
    readAuthMethods({ signal: abort.signal }).then(methods => {
      if (!abort.signal.aborted) setState({ state: "ready", ...methods });
    }).catch(() => { if (!abort.signal.aborted) setState({ state: "unavailable", email: false, oauth: [] }); });
    return () => abort.abort();
  }, [enabled, revision]);
  return { ...state, retry: () => setRevision(value => value + 1) };
}
