// 🚫 newsletter-unsubscribe — לינק הסרה חד-לחיצה מהמיילים (List-Unsubscribe).
// מאמת HMAC על הכתובת (מונע הסרת אחרים) ומכבה active=false ב-subscribers.
// ציבורי (verify_jwt=false) — נלחץ מתוך המייל בלי התחברות. תומך GET ו-POST.
//
// ⚠️ Supabase דורס HTML מפונקציות על דומיין *.supabase.co ל-text/plain + sandbox (אנטי-פישינג),
// לכן עמוד-ה-HTML כאן נראה כטקסט גולמי. הפתרון: העמוד האנושי מוגש מהאתר (/unsubscribe ב-Vercel)
// שקורא לפונקציה במצב-JSON (?format=json). מצב-HTML נשמר לתאימות-אחורה + one-click POST.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SECRET = Deno.env.get("NEWSLETTER_SECRET") ?? SERVICE_KEY;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function hmac(email: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlDecode = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

// עיבוד ההסרה — מחזיר תוצאה אחידה, בלי לחשוף פרטים במקרה כשל.
async function process(e: string, t: string): Promise<{ ok: boolean; email: string; reason?: string }> {
  let email = "";
  try { email = b64urlDecode(e).trim().toLowerCase(); } catch { return { ok: false, email: "", reason: "bad_link" }; }
  if (!email || t !== await hmac(email)) return { ok: false, email: "", reason: "bad_link" };
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from("subscribers").update({ active: false }).eq("email", email);
  } catch { /* גם אם נכשל — לא חושפים */ }
  return { ok: true, email };
}

const page = (title: string, body: string, emoji = "✅") =>
  new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · סוד 1820</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 90% at 50% 0%,#1a1030,#0d0a16 55%,#080610);font-family:Georgia,serif;color:#ded5c2;text-align:center;padding:20px;">
<div style="max-width:420px;background:linear-gradient(170deg,#141021,#0b0814);border:1px solid rgba(232,200,74,.4);border-radius:22px;padding:40px 28px;box-shadow:0 30px 90px rgba(0,0,0,.7);">
<div style="font-size:44px;">${emoji}</div>
<h1 style="color:#f0dc9a;font-size:23px;margin:12px 0;">${title}</h1>
<p style="line-height:2;font-size:15px;color:#cfc6b5;">${body}</p>
<a href="https://sod1820.co.il" style="display:inline-block;margin-top:14px;background:linear-gradient(135deg,#e8c84a,#c9a52e);color:#241a02;text-decoration:none;font-weight:800;border-radius:999px;padding:12px 30px;">← לאתר</a>
</div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", ...CORS } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const e = url.searchParams.get("e") || "";
  const t = url.searchParams.get("t") || "";
  const asJson = url.searchParams.get("format") === "json" || (req.headers.get("accept") || "").includes("application/json");

  const r = await process(e, t);

  // מצב-JSON — לעמוד ההסרה של האתר (/unsubscribe ב-Vercel), שמרנדר עמוד נקי בעברית.
  if (asJson) {
    return new Response(JSON.stringify(r), { status: r.ok ? 200 : 400, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });
  }

  // מצב-HTML — תאימות-אחורה למיילים ישנים + one-click POST (מוצג כטקסט על דומיין supabase, אך פועל).
  if (!r.ok) return page("קישור לא תקין", "הקישור אינו תקין או פג תוקפו.", "✋");
  return page("הוסרת מרשימת התפוצה", `הכתובת <b dir="ltr">${r.email}</b> לא תקבל עוד עדכונים. תמיד אפשר לחזור ולהירשם.`, "👋");
});
