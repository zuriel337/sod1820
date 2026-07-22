// 🎓 newsletter-signup — קליטת הרשמה לניוזלטר. v6: + מצב-JSON (?format=json) + CORS + קליטת ref + זיכוי-הפניה.
// verify_jwt=false בכוונה: טופס HTML טהור לא שולח כותרות; הפונקציה מאמתת קלט וכותבת רק ל-subscribers.
// כשמוזמן חדש נרשם (201) עם ref=uid → award_referral מזכה את המזמין +100 (דדופ שרת לפי מייל-מוזמן).

const SITE = "https://sod1820.co.il";
const DEFAULT_BACK = "/%D7%94%D7%A7%D7%95%D7%93-%D7%91%D7%A9%D7%9D-%D7%A2%D7%9E%D7%95%D7%A1-%D7%92%D7%95%D7%90%D7%98%D7%94";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

const safeBack = (raw: string) => {
  const p = (raw || "").trim();
  if (!p.startsWith("/") || p.startsWith("//") || p.length > 300 || /[\s<>"']/.test(p)) return SITE + DEFAULT_BACK;
  return SITE + encodeURI(p);
};

const page = (title: string, body: string, back: string, emoji = "✅") =>
  new Response(`<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · סוד 1820</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 90% at 50% 0%,#1a1030,#0d0a16 55%,#080610);font-family:'Segoe UI',Arial,sans-serif;color:#ded5c2;text-align:center;padding:20px;">
<div style="max-width:420px;background:linear-gradient(170deg,#141021,#0b0814);border:1px solid rgba(232,200,74,.4);border-radius:22px;padding:40px 28px;box-shadow:0 30px 90px rgba(0,0,0,.7);">
<div style="font-size:44px;">${emoji}</div>
<h1 style="color:#f0dc9a;font-size:24px;margin:12px 0;">${title}</h1>
<p style="line-height:2;font-size:15px;color:#cfc6b5;">${body}</p>
<a href="${back}" style="display:inline-block;margin-top:14px;background:linear-gradient(135deg,#e8c84a,#c9a52e);color:#241a02;text-decoration:none;font-weight:800;border-radius:999px;padding:12px 30px;">← חזרה לאתר</a>
</div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", ...CORS } });

const jsonRes = (status: string, ok: boolean) =>
  new Response(JSON.stringify({ ok, status }), { status: ok ? 200 : 400, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const urlObj = new URL(req.url);
  const wantJson = urlObj.searchParams.get("format") === "json" || (req.headers.get("accept") || "").includes("application/json");
  let back = SITE + DEFAULT_BACK;
  try {
    let email = "", source = "gematria-lesson-1", ref = "";
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("json")) {
      const j = await req.json();
      email = String(j.email || ""); source = String(j.source || source); back = safeBack(String(j.back || "")); ref = String(j.ref || "");
    } else {
      const fd = await req.formData();
      email = String(fd.get("email") || ""); source = String(fd.get("source") || source); back = safeBack(String(fd.get("back") || "")); ref = String(fd.get("ref") || "");
    }
    email = email.trim().toLowerCase();
    ref = ref.trim();
    if (ref) source = (source + "|ref:" + ref).slice(0, 120);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) || email.length > 120) {
      return wantJson ? jsonRes("invalid", false) : page("המייל לא נקלט", "כתובת המייל לא נראית תקינה — נסו שוב.", back, "✋");
    }
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const res = await fetch(`${url}/rest/v1/subscribers`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ email, source: source.slice(0, 120) }),
    });
    if (res.status === 201) {
      // 🎁 זיכוי-הפניה: מזמין תקין (uuid) → +100 קרדיטים (דדופ לפי מייל-מוזמן ב-RPC)
      if (/^[0-9a-fA-F-]{36}$/.test(ref)) {
        try {
          await fetch(`${url}/rest/v1/rpc/award_referral`, {
            method: "POST",
            headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
            body: JSON.stringify({ p_inviter: ref, p_invitee_email: email }),
          });
        } catch { /* זיכוי לא קריטי — אל תפיל את ההרשמה */ }
      }
      return wantJson ? jsonRes("new", true) : page("נרשמתם! 🎓", "נרשמתם לעדכוני סוד 1820 — הרמז הבא בדרך.", back, "🎓");
    }
    const txt = await res.text();
    if (res.status === 409 || /duplicate|unique/i.test(txt)) {
      return wantJson ? jsonRes("exists", true) : page("אתם כבר איתנו! 🎓", "המייל הזה כבר רשום.", back, "🎓");
    }
    return wantJson ? jsonRes("error", false) : page("משהו השתבש", `נסו שוב בעוד רגע. [${res.status}]`, back, "⚠️");
  } catch (e) {
    return wantJson ? jsonRes("error", false) : page("משהו השתבש", `נסו שוב בעוד רגע. [${String(e).slice(0, 80).replace(/</g, "")}]`, back, "⚠️");
  }
});
