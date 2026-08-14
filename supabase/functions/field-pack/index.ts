// field-pack — 🔒 שכבת-שרת דקה, אדמין-בלבד, מעל מנוע-הגימטריה הקנוני public.fn_gematria_pack.
//
// עיקרון-על (gematria_engine_law): הפונקציה הזו *לא* מחשבת גימטריה ולא מעתיקה לוגיקה. היא:
//   (1) מזהה את הקורא מה-JWT · (2) מוודאת role='admin' בצד-שרת (כמו wa_admin_reply) ·
//   (3) קוראת ל-fn_gematria_pack עם service_role · (4) מחזירה את הפלט **במלואו וללא שינוי**.
// ⛔ אין ragil-fallback, אין slice/filter/mapping שמגביל שיטות — הפלט עובר verbatim.
//    ⇒ אם המנוע יחזיר מחר 21 שיטות במקום 13, ה-wrapper יחזיר 21. חוזה שלא נשבר עם גדילת מספר-השיטות.
//
// למה Edge ולא RPC/GRANT: fn_gematria_pack מורשה ל-service_role בלבד (anon/authenticated=false).
//   ה-Edge מחזיק את SERVICE_ROLE_KEY ⇒ אין migration ואין GRANT חדש ל-public/anon. (אומת חי 14.8.2026.)
//
// ⚙️ deploy config: verify_jwt=true (gateway מאמת JWT). גם כאן מאמתים role בצד-שרת (defense-in-depth).
// 🔓 CORS חייב לכלול x-client-info + x-supabase-api-version (אחרת preflight של supabase-js נכשל בשקט).
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

  // 1) זיהוי הקורא מה-JWT שלו.
  const authz = req.headers.get("Authorization") || "";
  const hasBearer = authz.toLowerCase().startsWith("bearer ");
  let uid = "";
  if (hasBearer) {
    try {
      const ures = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON, Authorization: authz } });
      if (ures.ok) uid = (await ures.json())?.id || "";
    } catch { uid = ""; }
  }

  // 2) שליפת role (service_role עוקף RLS) — רק אם יש uid.
  let role = "";
  if (uid) {
    try {
      const rres = await fetch(`${SB_URL}/rest/v1/users?id=eq.${uid}&select=role`, { headers: svcHeaders() });
      if (rres.ok) { const rows = await rres.json(); role = Array.isArray(rows) && rows[0] ? (rows[0].role || "") : ""; }
    } catch { role = ""; }
  }

  // 3) החלטת-גישה טהורה (unauth→401 · non-admin→403 · admin→allow).
  const gate = decideAccess({ hasBearer, uid, role });
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  // 4) subject.
  let subject = "";
  try { const body = await req.json(); subject = String((body?.subject ?? body?.text ?? "")).slice(0, 500).trim(); }
  catch { return json({ error: "bad_request" }, 400); }
  if (!subject) return json({ error: "empty_subject" }, 400);

  // 5) קריאה למנוע הקנוני היחיד (service_role) → החזרת הפלט **verbatim**.
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/fn_gematria_pack`, {
      method: "POST", headers: svcHeaders(), body: JSON.stringify({ p_subject: subject }),
    });
    if (!r.ok) return json({ error: "engine_error", detail: (await r.text()).slice(0, 200) }, 502);
    const pack = await r.json(); // jsonb מלא — methods/cross/convergence/verses/sources/decompose/metadata
    return json(pack); // ⛔ verbatim — ללא slice/filter/mapping/ragil-fallback. כל השיטות עוברות.
  } catch (e) {
    return json({ error: "engine_unreachable", detail: String(e).slice(0, 200) }, 502);
  }
});
