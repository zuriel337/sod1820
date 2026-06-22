// meta-capi — Conversions API (CAPI) של Meta בצד-שרת.
// למה: הפיקסל בדפדפן מאבד ~30-40% מהאירועים (חוסמי פרסומות, iOS, רענונים). CAPI שולח
// את האירועים מהשרת ישר ל-Meta → קליטה כמעט מלאה → אופטימיזציה וקהלים מדויקים יותר.
// דדופ: האתר שולח event_id זהה גם לפיקסל-בדפדפן וגם לכאן — Meta מאחדת אוטומטית.
// אבטחה ופרטיות: PII (מייל/טלפון/מזהה) מגובב SHA-256 לפני שליחה (תקן Meta).
// no-op בטוח: בלי הסודות מחזיר 200 עם skipped (לא שובר את האתר).
//
// סודות נדרשים (Supabase → Edge Functions → Secrets):
//   META_PIXEL_ID      = 2069480399945823   (הפיקסל "פרסום 2", תחת קול הגאולה שרותי מידע)
//   META_CAPI_TOKEN    = טוקן ה-Conversions API (Dataset → Settings → Generate access token)
// אופציונלי: META_GRAPH_VERSION (v21.0) · META_TEST_EVENT_CODE (לבדיקה ב-Events Manager)

const PIXEL_ID   = Deno.env.get("META_PIXEL_ID") || "";
const CAPI_TOKEN = Deno.env.get("META_CAPI_TOKEN") || "";
const GRAPH      = Deno.env.get("META_GRAPH_VERSION") || "v21.0";
const TEST_CODE  = Deno.env.get("META_TEST_EVENT_CODE") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
}

// גיבוב SHA-256 (Meta דורש lowercase+trim לפני גיבוב).
async function sha256(v: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v.trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  // no-op בטוח כשעוד אין סודות (אפשר לפרוס עכשיו, להדליק עם הטוקן).
  if (!PIXEL_ID || !CAPI_TOKEN) return json({ ok: false, skipped: "missing secrets" }, 200);

  try {
    const body = await req.json().catch(() => ({}));
    const {
      event_name, event_id, event_source_url,
      email, phone, external_id, fbp, fbc,
      custom_data = {}, action_source = "website",
    } = body as Record<string, any>;
    if (!event_name) return json({ error: "event_name required" }, 400);

    // user_data — ככל שיש יותר אותות, ההתאמה מדויקת יותר.
    const user_data: Record<string, unknown> = {
      client_ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      client_user_agent: req.headers.get("user-agent") || undefined,
      fbp: fbp || undefined,
      fbc: fbc || undefined,
    };
    if (email)       user_data.em = [await sha256(String(email))];
    if (phone)       user_data.ph = [await sha256(String(phone).replace(/[^\d]/g, ""))];
    if (external_id) user_data.external_id = [await sha256(String(external_id))];

    const event = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: event_id || crypto.randomUUID(), // דדופ מול הפיקסל בדפדפן
      event_source_url: event_source_url || undefined,
      action_source,
      user_data,
      custom_data,
    };

    const payload: Record<string, unknown> = { data: [event] };
    if (TEST_CODE) payload.test_event_code = TEST_CODE;

    const r = await fetch(`https://graph.facebook.com/${GRAPH}/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) return json({ ok: false, error: d?.error?.message || `meta ${r.status}` }, 200);
    return json({ ok: true, events_received: d.events_received ?? 1, fbtrace_id: d.fbtrace_id });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
