// ✉️ send-newsletter — שליחת דיוור לרשימת התפוצה (subscribers) דרך Resend.
// אדמין-בלבד: מאמת את ה-JWT של הקורא ובודק role='admin' ב-users. שולח רק ל-active=true.
// מצבים:
//   dry_run=true   → מחזיר { count } (ספירת נמענים בפילוח) בלי לשלוח — לתצוגה מקדימה.
//   test_email=... → שולח עותק בודד לכתובת (בדיקה) עם הקידומת [בדיקה].
//   אחרת           → שולח עד 45 נמענים בכל הרצה, מתעד aggregate ב-newsletter_campaigns
//                     + per-recipient ב-newsletter_sends (sent/open/click).
// PRODUCT_TRAFFIC_FORWARD_ATTRIBUTION_CLOSURE_V1 (Human-Gate ZURIEL 2026-09-07):
// future broadcasts מקבלים per-send token אישי, src=nl+nlid על קישורי SOD1820,
// ו-tracking דרך ה-endpoint הקנוני הקיים nl-track. אין endpoint/store חדש ואין backfill.

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
const SITE = "https://sod1820.co.il";
const MAX_PER_RUN = 45;

const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(email: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function unsubUrl(email: string) {
  return `${SUPABASE_URL}/functions/v1/newsletter-unsubscribe?e=${b64url(email)}&t=${await hmac(email)}`;
}
async function siteUnsubUrl(email: string) {
  return `${SITE}/unsubscribe?e=${b64url(email)}&t=${await hmac(email)}`;
}

function trackedBodyHtml(html: string, token: string, campaign: string) {
  return html.replace(/href=(['"])(.*?)\1/gi, (full, quote, rawHref) => {
    try {
      if (!rawHref || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("#")) return full;
      const target = new URL(rawHref, SITE);
      const host = target.hostname.toLowerCase();
      if (host !== "sod1820.co.il" && host !== "www.sod1820.co.il") return full;
      target.searchParams.set("src", "nl");
      target.searchParams.set("nlid", token);
      const click = `${SUPABASE_URL}/functions/v1/nl-track?m=click&t=${encodeURIComponent(token)}&c=${encodeURIComponent(campaign)}&u=${encodeURIComponent(target.toString())}`;
      return `href=${quote}${click}${quote}`;
    } catch {
      return full;
    }
  });
}

function wrap(html: string, unsub: string, openPixel: string) {
  return `<div style="margin:0;padding:0;background:#f4f1ea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px;border-collapse:collapse;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border-collapse:collapse;box-shadow:0 4px 22px rgba(20,10,40,.12);">
  <tr><td style="background:#17102b;padding:26px 24px 18px;text-align:center;">
    <img src="https://sod1820.co.il/logo.png" width="94" alt="סוד 1820 — כי לה' המלוכה" style="display:block;margin:0 auto 8px;width:94px;height:auto;border:0;" />
    <div dir="rtl" style="color:#e7c96b;font-family:Georgia,'Times New Roman',serif;font-size:12.5px;letter-spacing:5px;">ס ו ד · <span dir="ltr" style="unicode-bidi:isolate;">1820</span></div>
  </td></tr>
  <tr><td style="height:4px;background:linear-gradient(90deg,#8a6d1f,#e7c96b,#8a6d1f);font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td dir="rtl" style="padding:30px 32px 8px;font-family:Georgia,'Times New Roman',serif;color:#1b1420;line-height:1.9;font-size:16px;text-align:right;">${html}</td></tr>
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
<img src="${openPixel}" width="1" height="1" alt="" style="display:none!important;width:1px;height:1px;border:0;" />
</div>`;
}

async function sendOne(to: string, subject: string, html: string, token: string | null, campaign: string | null) {
  const unsub = await unsubUrl(to);
  const unsubSite = await siteUnsubUrl(to);
  const bodyHtml = token && campaign ? trackedBodyHtml(html, token, campaign) : html;
  const openPixel = token && campaign
    ? `${SUPABASE_URL}/functions/v1/nl-track?e=open&t=${encodeURIComponent(token)}&c=${encodeURIComponent(campaign)}`
    : `${SUPABASE_URL}/functions/v1/email-open?c=newsletter&e=${b64url(to)}`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM, to, subject, html: wrap(bodyHtml, unsubSite, openPixel),
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  if (r.ok) return { ok: true, error: null };
  let err = `resend_${r.status}`;
  try { err = `${err}:${(await r.text()).slice(0, 160)}`; } catch { /* noop */ }
  return { ok: false, error: err };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: ures } = await admin.auth.getUser(token);
    const uid = ures?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await admin.from("users").select("role").eq("id", uid).maybeSingle();
    if (prof?.role !== "admin") return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const subject = String(body.subject || "").slice(0, 200);
    const html = String(body.html || "");
    const source = body.source ? String(body.source).slice(0, 60) : null;
    const testEmail = body.test_email ? String(body.test_email).trim().toLowerCase() : null;
    const dryRun = !!body.dry_run;

    let q = admin.from("subscribers").select("email").eq("active", true);
    if (source) q = q.eq("source", source);
    const { data: subs } = await q;
    const allEmails = [...new Set((subs || []).map((r: { email: string }) => (r.email || "").trim().toLowerCase()).filter(Boolean))];

    if (dryRun) return json({ count: allEmails.length, max_per_run: MAX_PER_RUN });
    if (!subject || !html) return json({ error: "missing_subject_or_body" }, 400);
    if (!RESEND_KEY) return json({ error: "not_configured" });

    if (testEmail) {
      const result = await sendOne(testEmail, `[בדיקה] ${subject}`, html, null, null);
      return json({ test: true, ok: result.ok, error: result.error });
    }

    const emails = allEmails.slice(0, MAX_PER_RUN);
    const remaining = Math.max(0, allEmails.length - emails.length);
    const { data: campaign, error: campaignErr } = await admin.from("newsletter_campaigns").insert({
      subject, segment_source: source, recipients: emails.length, sent: 0, failed: 0,
      status: "sending", sent_by: uid,
    }).select("id").single();
    if (campaignErr || !campaign?.id) return json({ error: "campaign_log_failed" }, 500);
    const campaignKey = String(campaign.id);

    let sent = 0, failed = 0;
    for (const e of emails) {
      const perToken = crypto.randomUUID();
      const { data: sendRow, error: rowErr } = await admin.from("newsletter_sends").insert({
        campaign: campaignKey, email: e, source, token: perToken, status: "queued",
      }).select("id").single();
      if (rowErr || !sendRow?.id) { failed++; continue; }

      try {
        const result = await sendOne(e, subject, html, perToken, campaignKey);
        if (result.ok) {
          sent++;
          await admin.from("newsletter_sends").update({ status: "sent", sent_at: new Date().toISOString(), error: null }).eq("id", sendRow.id);
        } else {
          failed++;
          await admin.from("newsletter_sends").update({ status: "failed", failed_at: new Date().toISOString(), error: result.error }).eq("id", sendRow.id);
        }
      } catch (err) {
        failed++;
        await admin.from("newsletter_sends").update({ status: "failed", failed_at: new Date().toISOString(), error: String(err).slice(0, 200) }).eq("id", sendRow.id);
      }
    }

    await admin.from("newsletter_campaigns").update({ sent, failed, status: failed && !sent ? "failed" : "sent" }).eq("id", campaign.id);
    return json({ campaign_id: campaign.id, sent, failed, recipients: emails.length, remaining, max_per_run: MAX_PER_RUN, per_recipient_tracking: true });
  } catch (e) {
    return json({ error: String(e).slice(0, 200) }, 500);
  }
});