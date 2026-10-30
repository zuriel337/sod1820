// The only route to the provider: the temporary request-locked pass-through (edge/handler.mjs). The product module builds its provider calls for api.anthropic.com with a key; here those
// calls are re-addressed to the pass-through, which holds the credential, and carry the one-time token and the platform JWT instead of a key. Nothing else leaves this process
// toward the provider, and without the three environment variables nothing is sent at all (fail closed, no mock path).
export const PROXY_URL_ENV = "ELS_PROXY_URL";
export const PROXY_TOKEN_ENV = "ELS_PROXY_TOKEN";
export const PROXY_JWT_ENV = "ELS_PROXY_JWT";
export class NoCredentialError extends Error {
  constructor() { super(`no credential: set ${PROXY_URL_ENV}, ${PROXY_TOKEN_ENV} and ${PROXY_JWT_ENV} (the temporary pass-through); nothing was sent`); this.name = "NoCredentialError"; }
}
export const hasProxy = (env = process.env) => Boolean((env[PROXY_URL_ENV] || "").trim() && (env[PROXY_TOKEN_ENV] || "").trim() && (env[PROXY_JWT_ENV] || "").trim());
export function makeProxyFetch(env = process.env, fetchImpl = fetch) {
  if (!hasProxy(env)) throw new NoCredentialError();
  const base = env[PROXY_URL_ENV].trim().replace(/\/$/, "");
  return async function proxyFetch(url, init = {}) {
    const text = String(url);
    if (!text.startsWith("https://api.anthropic.com/")) return fetchImpl(url, init);
    const { "x-api-key": _key, ...headers } = init.headers ?? {};
    return fetchImpl(`${base}${text.slice("https://api.anthropic.com".length)}`, { ...init, headers: { ...headers, authorization: `Bearer ${env[PROXY_JWT_ENV].trim()}`, "x-els-token": env[PROXY_TOKEN_ENV].trim() } });
  };
}
