// field-pack — admin-only thin server layer over public.fn_gematria_pack. No gematria compute here.
import { decideAccess } from "./gate.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const svcHeaders = () => ({ apikey: SB_SVC, Authorization: `Bearer ${SB_SVC}`, "Content-Type": "application/json" });
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SB_URL || !SB_SVC || !SB_ANON) return json({ error: "not_configured" }, 503);

  const authz = req.headers.get("Authorization") || "";
  const hasBearer = authz.toLowerCase().startsWith("bearer ");
  let uid = "";
  if (hasBearer) {
    try {
      const ures = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON, Authorization: authz } });
      if (ures.ok) uid = (await ures.json())?.id || "";
    } catch { uid = ""; }
  }

  let role = "";
  if (uid) {
    try {
      const rres = await fetch(`${SB_URL}/rest/v1/users?id=eq.${uid}&select=role`, { headers: svcHeaders() });
      if (rres.ok) { const rows = await rres.json(); role = Array.isArray(rows) && rows[0] ? (rows[0].role || "") : ""; }
    } catch { role = ""; }
  }

  const gate = decideAccess({ hasBearer, uid, role });
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  let subject = "";
  try { const body = await req.json(); subject = String((body?.subject ?? body?.text ?? "")).slice(0, 500).trim(); }
  catch { return json({ error: "bad_request" }, 400); }
  if (!subject) return json({ error: "empty_subject" }, 400);

  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/fn_gematria_pack`, {
      method: "POST", headers: svcHeaders(), body: JSON.stringify({ p_subject: subject }),
    });
    if (!r.ok) return json({ error: "engine_error", detail: (await r.text()).slice(0, 200) }, 502);
    const pack = await r.json();
    return json(pack);
  } catch (e) {
    return json({ error: "engine_unreachable", detail: String(e).slice(0, 200) }, 502);
  }
});
