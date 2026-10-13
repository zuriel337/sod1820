// Supabase's injected legacy-named variables may contain modern opaque API keys.
// Preserve an explicit caller JWT; only synthesize Bearer auth for legacy keys.
export function supabaseServiceHeaders(apiKey, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("apikey", apiKey);
  const modernKey = apiKey.startsWith("sb_secret_") || apiKey.startsWith("sb_publishable_");
  const authorizationToken = (headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (modernKey && authorizationToken === apiKey) {
    headers.delete("authorization");
  }
  if (!modernKey && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${apiKey}`);
  }
  return Object.fromEntries(headers);
}
