// ✉️ send-newsletter — שליחת דיוור לרשימת התפוצה (subscribers) דרך Resend.
// אדמין-בלבד: מאמת את ה-JWT של הקורא ובודק role='admin' ב-users. שולח רק ל-active=true.
// מצבים:
//   dry_run=true   → מחזיר { count } (ספירת נמענים בפילוח) בלי לשלוח — לתצוגה מקדימה.
//   test_email=... → שולח עותק בודד לכתובת (בדיקה) עם הקידומת [בדיקה].
//   אחרת           → שולח לכל הפילוח, מתעד ל-newsletter_campaigns.
// כל מייל מקבל פוטר עם לינק הסרה (HMAC) + כותרות List-Unsubscribe (deliverability).
// בלי RESEND_API_KEY → מחזיר not_configured (הפונקציה מוכנה, מחכה למפתח).

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: CORS });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("NEWSLETTER_FROM") ?? "סוד 1820 <news@sod1820.co.il>";
const SECRET = Deno.env.get("NEWSLETTER_SECRET") ?? SERVICE_KEY;

const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(email: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function unsubUrl(email: string) {
  return `${SUPABASE_URL}/functions/v1/newsletter-unsubscribe?e=${b64url(email)}&t=${await hmac(email)}`;
}
// 📧 תבנית-דיוור קבועה (השלד לכל גיליון) — כותרת ממותגת עם הלוגו + פס-זהב, אזור-תוכן,
// ופוטר עם הסרה. האדמין ממלא רק את התוכן (${html}); המעטפת מוזרקת אוטומטית לכל מייל.
// email-safe: table-based, inline styles, לוגו כ-URL מוחלט (logo_integrity_law — לא לחתוך).
function wrap(html: string, unsub: string) {
  return `<div style="margin:0;padding:0;background:#f4f1ea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px;border-collapse:collapse;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border-collapse:collapse;box-shadow:0 4px 22px rgba(20,10,40,.12);">
  <tr><td style="background:#17102b;padding:26px 24px 18px;text-align:center;">
    <img src="https://sod1820.co.il/logo.png" width="94" alt="סוד 1820 — כי לה' המלוכה" style="display:block;margin:0 auto 8px;width:94px;height:auto;border:0;" />
    <div style="color:#e7c96b;font-family:Georgia,'Times New Roman',serif;font-size:12.5px;letter-spacing:4px;">ס ו ד · 1 8 2 0</div>
  </td></tr>
  <tr><td style="height:4px;background:linear-gradient(90deg,#8a6d1f,#e7c96b,#8a6d1f);font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td dir="rtl" style="padding:30px 32px 8px;font-family:Georgia,'Times New Roman',serif;color:#1b1420;line-height:1.9;font-size:16px;text-align:right;">
${html}
  </td></tr>
  <tr><td style="padding:8px 32px 28px;">
    <div style="border-top:1px solid #ece7dc;margin:18px 0 14px;font-size:0;line-height:0;">&nbsp;</div>
    <div dir="rtl" style="font-family:Georgia,serif;font-size:12.5px;color:#8a8580;text-align:center;line-height:1.9;">
      <a href="https://sod1820.co.il" style="color:#9a7b1e;text-decoration:none;font-weight:bold;">sod1820.co.il</a> · כל הרמזים במקום אחד<br />
      קיבלת מייל זה כי נרשמת לעדכוני <b style="color:#6b6660;">סוד 1820</b>.<br />
      <a href="${unsub}" style="color:#a8a29a;">להסרה מרשימת התפוצה</a>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</div>`;
}
async function sendOne(to: string, subject: string, html: string) {
  const unsub = await unsubUrl(to);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM, to, subject, html: wrap(html, unsub),
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  return r.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // אימות אדמין: מזהה מה-JWT → role='admin' ב-users
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: ures } = await admin.auth.getUser(token);
    const uid = ures?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await admin.from("users").select("role").eq("id", uid).maybeSingle();
    if (prof?.role !== "admin") return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const subject = String(body.subject || "").slice(0, 200);
    const html = String(body.html || "");
    const source = body.source ? String(body.source).slice(0, 60) : null;   // null = כל הפעילים
    const testEmail = body.test_email ? String(body.test_email).trim().toLowerCase() : null;
    const dryRun = !!body.dry_run;

    // פילוח: תמיד active=true, מקור אופציונלי
    let q = admin.from("subscribers").select("email").eq("active", true);
    if (source) q = q.eq("source", source);
    const { data: subs } = await q;
    const emails = [...new Set((subs || []).map((r: { email: string }) => (r.email || "").trim().toLowerCase()).filter(Boolean))];

    if (dryRun) return json({ count: emails.length });
    if (!subject || !html) return json({ error: "missing_subject_or_body" }, 400);
    if (!RESEND_KEY) return json({ error: "not_configured", hint: "חסר RESEND_API_KEY — הוסיפו אותו ב-Secrets" });

    // מצב בדיקה — רק לכתובת אחת
    if (testEmail) {
      const ok = await sendOne(testEmail, `[בדיקה] ${subject}`, html);
      return json({ test: true, ok });
    }

    // שליחה אמיתית (רציף; ל-Batch גדול נשדרג בעתיד)
    let sent = 0, failed = 0;
    for (const e of emails) {
      try { (await sendOne(e, subject, html)) ? sent++ : failed++; } catch { failed++; }
    }
    await admin.from("newsletter_campaigns").insert({
      subject, segment_source: source, recipients: emails.length, sent, failed,
      status: failed && !sent ? "failed" : "sent", sent_by: uid,
    });
    return json({ sent, failed, recipients: emails.length });
  } catch (e) {
    return json({ error: String(e).slice(0, 200) }, 500);
  }
});
