// openweb-sso — שער ה-SSO של OpenWeb (Spot.IM) עבור sod1820.
//
// ⚠️ אין כאן חתימת JWT. OpenWeb SSO v1 = לחיצת-יד codeA/codeB (אישור Fred, OpenWeb, 10.9.2026):
//   1. הדפדפן מאזין ל-`spot-im-api-ready` → `SPOTIM.startSSO()` → מקבל codeA.
//   2. codeA נשלח לכאן יחד עם ה-JWT של המשתמש המחובר (Supabase Auth).
//   3. הפונקציה קוראת ל-
//        GET https://www.spot.im/api/sso/v1/register-user
//            ?code_a=…&access_token=…&primary_key=…&user_name=…
//      כאשר primary_key = auth.users.id — אותו publisher_primary_key שנמסר ל-OpenWeb ב-21.8.2026.
//   4. codeB חוזר לדפדפן → `SPOTIM.completeSSO(codeB)` משלים את ההתחברות.
//
// סודות:
//   OPENWEB_SSO_SHARED_SECRET — ה-access token, שמור ב-Supabase **Vault** (לא בקוד, לא ביומן).
//     נקרא דרך RPC public.openweb_sso_secret() (SECURITY DEFINER, service_role בלבד),
//     בדיוק כמו הדפוס של gsc-sync/gsc_secrets. fallback ל-Edge secret באותו שם אם הוגדר.
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — מוזרקים אוטומטית.
//
// ⚙️ הגדרות אופציונליות (Edge secrets):
//   OPENWEB_SSO_SEND_EMAIL=1  — לשלוח גם את כתובת המייל של המשתמש ל-OpenWeb.
//     **ברירת-מחדל: כבוי.** החלטת צוריאל (10.7.2026) היא לא להוציא מיילים של משתמשים
//     החוצה; ההתאמה נעשית ממילא דרך primary_key. להדליק רק בהחלטה מפורשת.
//   OPENWEB_SSO_SEND_AVATAR=1 — לשלוח image_url (avatar_url) ל-OpenWeb. ברירת-מחדל: כבוי.
//
// ⛔ verify_jwt=false בשער הפלטפורמה **בכוונה** — כדי ש-preflight (OPTIONS) לא ייחסם בשקט
//    בדפדפן (המלכודת המתועדת ב-ai_analyze_contract). האימות נעשה כאן במפורש ובאופן חזק יותר:
//    חובה Authorization: Bearer <access_token> של משתמש מחובר, ומאומת מול auth.getUser().
//    מפתח anon לבדו נדחה (אין לו sub) — כלומר אורח אינו יכול להתחזות למשתמש.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SB_URL     = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ENV_TOKEN  = Deno.env.get("OPENWEB_SSO_SHARED_SECRET") || "";
const SEND_EMAIL = /^(1|true|yes)$/i.test(Deno.env.get("OPENWEB_SSO_SEND_EMAIL") || "");
const SEND_AVATAR= /^(1|true|yes)$/i.test(Deno.env.get("OPENWEB_SSO_SEND_AVATAR") || "");

const REGISTER_URL = "https://www.spot.im/api/sso/v1/register-user";

// ⚠️ CORS — חובה x-client-info + x-supabase-api-version + apikey, אחרת הדפדפן חוסם בשקט
// (עובד ב-curl ולא בדפדפן). מלכודת מתועדת ב-ai_analyze_contract.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// שם-משתמש ייחוד-יציב ל-OpenWeb כשאין username בפרופיל. נגזר מה-uuid → יציב בין סשנים.
function fallbackUserName(userId: string): string {
  return `sod_${userId.replace(/-/g, "").slice(0, 12)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")    return json({ ok: false, error: "POST only" }, 405);
  if (!SB_URL || !SB_KEY)       return json({ ok: false, error: "supabase env missing" }, 500);

  // ── 1. codeA מהדפדפן ──
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const codeA = String(body.code_a ?? body.codeA ?? "").trim();
  if (!codeA)              return json({ ok: false, error: "code_a is required" }, 400);
  if (codeA.length > 512)  return json({ ok: false, error: "code_a is malformed" }, 400);

  // ── 2. מי המשתמש? רק משתמש מחובר ומאומת (anon key לבדו נדחה) ──
  const auth = req.headers.get("Authorization") || "";
  const jwt  = auth.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return json({ ok: false, error: "unauthorized" }, 401);

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await sb.auth.getUser(jwt);
  const authUser = userData?.user;
  if (userErr || !authUser?.id) return json({ ok: false, error: "unauthorized" }, 401);

  // ── 3. פרטי-הזהות מ-public.users (מקור-הזהות הקנוני) ──
  const { data: profile } = await sb
    .from("users")
    .select("username, display_name, avatar_url, email")
    .eq("id", authUser.id)
    .maybeSingle();

  const userName    = String(profile?.username || "").trim() || fallbackUserName(authUser.id);
  const displayName = String(profile?.display_name || "").trim() || userName;
  const email       = String(profile?.email || authUser.email || "").trim();
  const avatarUrl   = String(profile?.avatar_url || "").trim();

  // ── 4. ה-access token: Vault (קנוני) עם fallback ל-Edge secret ──
  let accessToken = ENV_TOKEN;
  if (!accessToken) {
    const { data, error } = await sb.rpc("openweb_sso_secret");
    if (error) return json({ ok: false, error: `openweb_sso_secret rpc: ${error.message}` }, 500);
    const row = Array.isArray(data) ? data[0] : data;
    accessToken = String(row?.access_token ?? row ?? "").trim();
  }
  if (!accessToken) return json({ ok: false, error: "OPENWEB_SSO_SHARED_SECRET not configured" }, 500);

  // ── 5. לחיצת-היד מול OpenWeb ──
  const u = new URL(REGISTER_URL);
  u.searchParams.set("code_a", codeA);
  u.searchParams.set("access_token", accessToken);
  u.searchParams.set("primary_key", authUser.id);   // = publisher_primary_key שנמסר ל-OpenWeb
  u.searchParams.set("user_name", userName);
  u.searchParams.set("display_name", displayName);
  if (SEND_EMAIL  && email)     u.searchParams.set("email", email);
  if (SEND_AVATAR && avatarUrl) u.searchParams.set("image_url", avatarUrl);

  let res: Response;
  try {
    res = await fetch(u.toString(), { method: "GET", headers: { Accept: "application/json" } });
  } catch (e) {
    return json({ ok: false, error: `openweb unreachable: ${e instanceof Error ? e.message : String(e)}` }, 502);
  }

  const raw = await res.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { /* לא-JSON → נטופל למטה */ }

  if (!res.ok) {
    // ⛔ בלי להחזיר את גוף-התשובה הגולמי — הוא עלול לשקף בחזרה את ה-access_token שנשלח.
    const msg = String(data?.message || data?.error || "").slice(0, 200);
    return json({ ok: false, error: `openweb register-user ${res.status}${msg ? `: ${msg}` : ""}` }, 502);
  }

  // ⚠️ register-user מחזיר 200 גם על קלט פסול — ובגוף מזהה-בקשה אקראי בן 20 תווים
  // (נבדק בפועל 10.9.2026: גם בלי פרמטרים בכלל). לכן **200 אינו הצלחה**, ואסור לקבל
  // גוף טקסט-גולמי כ-codeB — רק שדה code_b מפורש ב-JSON נחשב תשובה תקינה.
  const codeB = String(data?.code_b ?? data?.codeB ?? data?.data?.code_b ?? "").trim();
  if (!codeB) {
    // עוזר-אבחון ללוג ה-Edge: מבנה-התשובה בלבד. ⛔ בלי ה-URL (הוא נושא את ה-access_token).
    console.warn("[openweb-sso] no code_b", res.status, res.headers.get("content-type"), raw.slice(0, 120));
    const hint = String(data?.message || data?.error || raw).slice(0, 120);
    return json({ ok: false, error: `openweb did not return code_b${hint ? ` (${hint})` : ""}` }, 502);
  }

  // openweb user id — מוחזר לדפדפן לצורך אבחון; לא נשמר (אין טבלת-מיפוי, owner gate).
  const openwebUserId = String(data?.user_id ?? data?.userId ?? data?.data?.user_id ?? "") || null;

  return json({ ok: true, code_b: codeB, user_name: userName, openweb_user_id: openwebUserId });
});
