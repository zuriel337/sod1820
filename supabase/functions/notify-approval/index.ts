// 🔔 notify-approval — מייל לגולש שהחידוש שלו אושר, עם כפתור «המיקום» (איפה לראות אותו).
// אדמין-בלבד: מאמת JWT + role='admin' ב-users (כמו send-newsletter). שולח דרך Resend.
// קלט: { email, name?, title?, link } — link = נתיב יחסי (‎/research?…) או URL מלא.
// בלי RESEND_API_KEY → מחזיר not_configured (ההתראה באתר עדיין נשמרה ע"י approve_chiddush).

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: CORS });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("NOTIFY_FROM") ?? Deno.env.get("NEWSLETTER_FROM") ?? "סוד 1820 <news@sod1820.co.il>";
const SITE = (Deno.env.get("SITE_URL") ?? "https://sod1820.co.il").replace(/\/$/, "");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function fullUrl(link: string) {
  if (/^https?:\/\//i.test(link)) return link;
  return SITE + (link.startsWith("/") ? link : "/" + link);
}

function emailHtml(name: string, title: string, url: string) {
  const hi = name ? `שלום ${esc(name)},` : "שלום,";
  return `<div dir="rtl" style="font-family:'Heebo',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0a04;border-radius:16px;overflow:hidden;border:1px solid #3a2c0a;">
  <div style="background:linear-gradient(135deg,#1c1405,#0a0700);padding:26px 24px 20px;text-align:center;">
    <div style="font-size:40px;line-height:1;margin-bottom:8px;">✨</div>
    <div style="color:#f0d879;font-size:22px;font-weight:800;">החידוש שלך אושר!</div>
  </div>
  <div style="padding:22px 24px 8px;color:#e8e2d4;font-size:15.5px;line-height:1.9;">
    <p style="margin:0 0 12px;">${hi}</p>
    <p style="margin:0 0 12px;">שמחנו לקבל את החידוש שלך${title ? ` — <b style="color:#f0d879;">«${esc(title)}»</b>` : ""}. הוא עבר את הבדיקה ופורסם במדור <b style="color:#f0d879;">«חידושי גולשים»</b> באתר, לצד שמך. 🙏</p>
    <p style="margin:0 0 20px;">לחצו כדי לראות אותו במיקום שלו:</p>
    <div style="text-align:center;margin:6px 0 22px;">
      <a href="${esc(url)}" style="display:inline-block;background:linear-gradient(135deg,#e9c84a,#9a7818);color:#1a0e00;font-weight:800;font-size:15px;text-decoration:none;padding:13px 30px;border-radius:999px;">📖 לצפייה בחידוש שלי ←</a>
    </div>
    <p style="margin:0 0 4px;color:#9a927f;font-size:12.5px;">אם הכפתור לא עובד, העתיקו את הקישור:<br><a href="${esc(url)}" style="color:#c9a84a;word-break:break-all;">${esc(url)}</a></p>
  </div>
  <div style="border-top:1px solid #2a2008;margin:14px 20px 0;padding:14px 4px;text-align:center;color:#8a8270;font-size:12px;line-height:1.8;">
    בברכה,<br><b style="color:#c9a84a;">צוות סוד 1820</b> · <a href="${SITE}" style="color:#8a8270;">sod1820.co.il</a>
  </div>
</div>`;
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
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim().slice(0, 80);
    const title = String(body.title || "").trim().slice(0, 160);
    const link = String(body.link || "").trim();
    if (!email || !link) return json({ error: "missing_email_or_link" }, 400);
    if (!RESEND_KEY) return json({ ok: false, error: "not_configured", hint: "חסר RESEND_API_KEY" });

    const url = fullUrl(link);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM, to: email,
        subject: "✨ החידוש שלך אושר — סוד 1820",
        html: emailHtml(name, title, url),
      }),
    });
    if (!r.ok) return json({ ok: false, error: "resend_failed", status: r.status, detail: (await r.text()).slice(0, 300) }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 200) }, 500);
  }
});
