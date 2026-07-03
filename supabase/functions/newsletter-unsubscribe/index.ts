// 🚫 newsletter-unsubscribe — לינק הסרה חד-לחיצה מהמיילים (List-Unsubscribe).
// מאמת HMAC על הכתובת (מונע הסרת אחרים) ומכבה active=false ב-subscribers.
// ציבורי (verify_jwt=false) — נלחץ מתוך המייל בלי התחברות. תומך GET ו-POST.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SECRET = Deno.env.get("NEWSLETTER_SECRET") ?? SERVICE_KEY;

async function hmac(email: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlDecode = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

const page = (title: string, body: string, emoji = "✅") =>
  new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · סוד 1820</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 90% at 50% 0%,#1a1030,#0d0a16 55%,#080610);font-family:Georgia,serif;color:#ded5c2;text-align:center;padding:20px;">
<div style="max-width:420px;background:linear-gradient(170deg,#141021,#0b0814);border:1px solid rgba(232,200,74,.4);border-radius:22px;padding:40px 28px;box-shadow:0 30px 90px rgba(0,0,0,.7);">
<div style="font-size:44px;">${emoji}</div>
<h1 style="color:#f0dc9a;font-size:23px;margin:12px 0;">${title}</h1>
<p style="line-height:2;font-size:15px;color:#cfc6b5;">${body}</p>
<a href="https://sod1820.co.il" style="display:inline-block;margin-top:14px;background:linear-gradient(135deg,#e8c84a,#c9a52e);color:#241a02;text-decoration:none;font-weight:800;border-radius:999px;padding:12px 30px;">← לאתר</a>
</div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const e = url.searchParams.get("e") || "";
  const t = url.searchParams.get("t") || "";
  let email = "";
  try { email = b64urlDecode(e).trim().toLowerCase(); } catch { return page("קישור לא תקין", "לא הצלחנו לזהות את הכתובת.", "✋"); }
  if (!email || t !== await hmac(email)) return page("קישור לא תקין", "הקישור אינו תקין או פג תוקפו.", "✋");
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from("subscribers").update({ active: false }).eq("email", email);
  } catch { /* גם אם נכשל — לא חושפים */ }
  return page("הוסרת מרשימת התפוצה", `הכתובת <b dir="ltr">${email}</b> לא תקבל עוד עדכונים. תמיד אפשר לחזור ולהירשם.`, "👋");
});
