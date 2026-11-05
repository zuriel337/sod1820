// account-link-confirm — second step of the consent-based account link. NOT DEPLOYED until ZURIEL approves.
// Inputs: Authorization = the SECONDARY (old) account's session token; body { offerId, nonce, primaryAccessToken } where the primary token
// was obtained by the person completing an OTP sign-in to the PRIMARY account's email in a separate, non-persisted client.
// Both tokens are verified by Supabase Auth (getUser), the pair must match the stored offer, the nonce is single-use/10 minutes.
// Nothing here changes auth.users, sessions, credentials, billing, credits or notifications.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CORS = {
  "access-control-allow-origin": "https://sod1820.co.il",
  "access-control-allow-headers": "authorization, content-type, apikey, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "vary": "origin",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return reply({ status: "rejected" }, 405);
  // Every failure answers the same generic body: no account enumeration, no hint which proof failed.
  const reject = () => reply({ status: "rejected" }, 400);
  try {
    const secondaryToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const body = await req.json().catch(() => null);
    const offerId = String(body?.offerId || ""), nonce = String(body?.nonce || ""), primaryToken = String(body?.primaryAccessToken || "");
    if (!secondaryToken || !primaryToken || !UUID.test(offerId) || nonce.length < 32 || nonce.length > 128 || secondaryToken === primaryToken) return reject();
    const verify = async (token: string) => {
      const client = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data, error } = await client.auth.getUser(token);
      return error ? null : data.user?.id ?? null;
    };
    const [secondary, primary] = await Promise.all([verify(secondaryToken), verify(primaryToken)]);
    if (!secondary || !primary || secondary === primary) return reject();
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc("account_link_confirm_v1", { p_offer: offerId, p_secondary: secondary, p_primary: primary, p_nonce: nonce });
    if (error || (data !== "verified" && data !== "already_verified")) return reject();
    return reply({ status: data });
  } catch { return reject(); }
});
