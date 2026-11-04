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
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

async function hmac(email: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlDecode = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

// Same signed opt-out. Success requires a committed row; a replay never rewrites
// the original suppression time or any purpose/consent field.
type Result = { ok: boolean; email: string; reason?: string };
const unavailable = (): Result => ({ ok: false, email: "", reason: "temporarily_unavailable" });
const badLink = (): Result => ({ ok: false, email: "", reason: "bad_link" });
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!));
async function process(e: string, t: string): Promise<Result> {
  if (!SUPABASE_URL || !SERVICE_KEY || !SECRET) return unavailable();
  if (!/^[A-Za-z0-9_-]{1,512}={0,2}$/.test(e) || !/^[A-Za-z0-9_-]{43}$/.test(t)) return badLink();
  let email = "";
  try { email = b64urlDecode(e).trim().toLowerCase(); } catch { return badLink(); }
  if (email.length > 320 || /[\u0000-\u001f\u007f]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badLink();
  try {
    if (t !== await hmac(email)) return badLink();
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const at = new Date().toISOString();
    const changed = await admin.from("subscribers")
      .update({ active: false, unsubscribed_at: at })
      .eq("email", email).eq("active", true)
      .select("email,active,unsubscribed_at");
    if (changed.error || !Array.isArray(changed.data)) return unavailable();
    if (changed.data.length) {
      const row = changed.data[0];
      return changed.data.length === 1 && row.email === email && row.active === false
        && Date.parse(row.unsubscribed_at) === Date.parse(at) ? { ok: true, email } : unavailable();
    }
    // Zero updated rows can mean an existing opt-out, not necessarily success.
    const existing = await admin.from("subscribers").select("email,active,unsubscribed_at")
      .eq("email", email).maybeSingle();
    if (existing.error) return unavailable();
    if (!existing.data) return badLink();
    return existing.data.email === email && existing.data.active === false
      ? { ok: true, email } : unavailable();
  } catch { return unavailable(); }
}

const page = (title: string, body: string, emoji = "✅", status = 200) =>
  new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} · סוד 1820</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 90% at 50% 0%,#1a1030,#0d0a16 55%,#080610);font-family:Georgia,serif;color:#ded5c2;text-align:center;padding:20px;">
<div style="max-width:420px;background:linear-gradient(170deg,#141021,#0b0814);border:1px solid rgba(232,200,74,.4);border-radius:22px;padding:40px 28px;box-shadow:0 30px 90px rgba(0,0,0,.7);">
<div style="font-size:44px;">${emoji}</div>
<h1 style="color:#f0dc9a;font-size:23px;margin:12px 0;">${title}</h1>
<p style="line-height:2;font-size:15px;color:#cfc6b5;">${body}</p>
<a href="https://sod1820.co.il" style="display:inline-block;margin-top:14px;background:linear-gradient(135deg,#e8c84a,#c9a52e);color:#241a02;text-decoration:none;font-weight:800;border-radius:999px;padding:12px 30px;">← לאתר</a>
</div></body></html>`, { status, headers: { "content-type": "text/html; charset=utf-8", ...CORS } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const e = url.searchParams.get("e") || "";
  const t = url.searchParams.get("t") || "";
  const asJson = url.searchParams.get("format") === "json" || (req.headers.get("accept") || "").includes("application/json");

  if (!["GET", "POST"].includes(req.method)) {
    return new Response(JSON.stringify({ ok: false, email: "", reason: "method_not_allowed" }), {
      status: 405, headers: { "content-type": "application/json; charset=utf-8", Allow: "GET, POST, OPTIONS", ...CORS },
    });
  }
  const r = url.searchParams.getAll("e").length === 1 && url.searchParams.getAll("t").length === 1
    ? await process(e, t) : badLink();
  const status = r.ok ? 200 : r.reason === "temporarily_unavailable" ? 503 : 400;

  // מצב-JSON — לעמוד ההסרה של האתר (/unsubscribe ב-Vercel), שמרנדר עמוד נקי בעברית.
  if (asJson) {
    return new Response(JSON.stringify(r), { status, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });
  }

  // מצב-HTML — תאימות-אחורה למיילים ישנים + one-click POST (מוצג כטקסט על דומיין supabase, אך פועל).
  if (!r.ok) return status === 503
    ? page("הבקשה לא הושלמה", "לא התקבל אישור הסרה. אפשר לנסות שוב מאוחר יותר.", "⚠️", status)
    : page("קישור לא תקין", "הקישור אינו תקין או פג תוקפו.", "✋", status);
  return page("הוסרת מרשימת התפוצה", `הכתובת <b dir="ltr">${escapeHtml(r.email)}</b> לא תקבל עוד עדכונים. תמיד אפשר לחזור ולהירשם.`, "👋");
});
