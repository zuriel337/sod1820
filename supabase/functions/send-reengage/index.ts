// send-reengage — tracked, segmented, resumable re-engagement sender.
// EXTEND_EXISTING. Admin JWT only. No body bypass / hardcoded secret.
// Body: { subject, html, source, campaign, batch=40, dry_run, from? }
// Per recipient: fresh per-send token, nl-track open/click, newsletter_sends row.
// Resumable by UNIQUE(campaign,email). No legacy mail is sent by deployment itself.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SECRET = Deno.env.get("NEWSLETTER_SECRET") ?? SERVICE_KEY;
const DEFAULT_FROM = Deno.env.get("NEWSLETTER_FROM") ?? "סוד 1820 <news@sod1820.co.il>";
const SITE = "https://sod1820.co.il";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: CORS });

const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(email: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function unsubMachine(email: string) { return `${SUPABASE_URL}/functions/v1/newsletter-unsubscribe?e=${b64url(email)}&t=${await hmac(email)}`; }
async function unsubSite(email: string) { return `${SITE}/unsubscribe?e=${b64url(email)}&t=${await hmac(email)}`; }

function trackedBodyHtml(html: string, token: string, campaign: string) {
  const rendered = html.replaceAll("{{NLID}}", token).replaceAll("{{CAMPAIGN}}", encodeURIComponent(campaign));
  return rendered.replace(/href=(['"])(.*?)\1/gi, (full, quote, rawHref) => {
    try {
      if (!rawHref || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("#")) return full;
      const target = new URL(rawHref, SITE);
      const h = target.hostname.toLowerCase();
      if (h !== "sod1820.co.il" && h !== "www.sod1820.co.il") return full;
      target.searchParams.set("src", "nl");
      target.searchParams.set("nlid", token);
      const click = `${SUPABASE_URL}/functions/v1/nl-track?m=click&t=${encodeURIComponent(token)}&c=${encodeURIComponent(campaign)}&u=${encodeURIComponent(target.toString())}`;
      return `href=${quote}${click}${quote}`;
    } catch { return full; }
  });
}

function wrap(html: string, unsub: string, openPixel: string) {
  return `<div style="margin:0;padding:0;background:#f4f1ea;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px;border-collapse:collapse;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border-collapse:collapse;box-shadow:0 4px 22px rgba(20,10,40,.12);">
  <tr><td style="background:#17102b;padding:26px 24px 18px;text-align:center;">
    <img src="https://sod1820.co.il/logo.png" width="94" alt="סוד 1820" style="display:block;margin:0 auto 8px;width:94px;height:auto;border:0;" />
    <div dir="rtl" style="color:#e7c96b;font-family:Georgia,serif;font-size:12.5px;letter-spacing:5px;">ס ו ד · <span dir="ltr" style="unicode-bidi:isolate;">1820</span></div>
  </td></tr>
  <tr><td style="height:4px;background:linear-gradient(90deg,#8a6d1f,#e7c96b,#8a6d1f);font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td dir="rtl" style="padding:30px 32px 8px;font-family:Georgia,serif;color:#1b1420;line-height:1.9;font-size:16px;text-align:right;">${html}</td></tr>
  <tr><td style="padding:8px 32px 28px;">
    <div style="border-top:1px solid #ece7dc;margin:18px 0 14px;font-size:0;line-height:0;">&nbsp;</div>
    <div dir="rtl" style="font-family:Georgia,serif;font-size:12.5px;color:#8a8580;text-align:center;line-height:1.9;">
      <a href="https://sod1820.co.il" style="color:#9a7b1e;text-decoration:none;font-weight:bold;">sod1820.co.il</a> · כל הרמזים במקום אחד<br />
      קיבלת מייל זה כי נרשמת בעבר לעדכוני <b style="color:#6b6660;">סוד 1820</b>.<br />
      <a href="${unsub}" style="color:#a8a29a;">להסרה מרשימת התפוצה</a>
    </div>
  </td></tr>
</table></td></tr></table>
<img src="${openPixel}" width="1" height="1" alt="" style="display:none;border:0;" />
</div>`;
}

async function sendOne(from: string, to: string, subject: string, html: string, unsubM: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, headers: { "List-Unsubscribe": `<${unsubM}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }),
  });
  if (r.ok) return { ok: true, error: null };
  let error = `resend_${r.status}`;
  try { error += `:${(await r.text()).slice(0, 160)}`; } catch { /* noop */ }
  return { ok: false, error };
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
    const source = String(body.source || "").slice(0, 60);
    const campaign = String(body.campaign || "").slice(0, 80);
    const from = String(body.from || DEFAULT_FROM).slice(0, 120);
    const batch = Math.min(Math.max(parseInt(String(body.batch ?? "40"), 10) || 40, 1), 45);
    const dryRun = !!body.dry_run;
    if (!source || !campaign) return json({ error: "missing_source_or_campaign" }, 400);

    const { data: subs } = await admin.from("subscribers").select("email,source").eq("source", source);
    const all = (subs || []).filter((s: { email: string }) => s.email);
    const { data: done } = await admin.from("newsletter_sends").select("email").eq("campaign", campaign).not("sent_at", "is", null);
    const doneSet = new Set((done || []).map((d: { email: string }) => (d.email || "").toLowerCase()));
    const pending = all.filter((s: { email: string }) => !doneSet.has(s.email.toLowerCase()));

    if (dryRun) return json({ segment_total: all.length, already_delivered: doneSet.size, remaining: pending.length, batch });
    if (!subject || !html) return json({ error: "missing_subject_or_body" }, 400);
    if (!RESEND_KEY) return json({ error: "not_configured" });

    const toSend = pending.slice(0, batch);
    let sent = 0, failed = 0;
    for (const s of toSend) {
      const perToken = crypto.randomUUID();
      const openPixel = `${SUPABASE_URL}/functions/v1/nl-track?e=open&t=${encodeURIComponent(perToken)}&c=${encodeURIComponent(campaign)}`;
      const rendered = wrap(trackedBodyHtml(html, perToken, campaign), await unsubSite(s.email), openPixel);

      const { error: rowErr } = await admin.from("newsletter_sends").upsert({
        campaign, email: s.email, source: s.source, token: perToken,
        status: "queued", queued_at: new Date().toISOString(), sent_at: null, failed_at: null, error: null,
      }, { onConflict: "campaign,email" });
      if (rowErr) { failed++; continue; }

      let result: { ok: boolean; error: string | null };
      try { result = await sendOne(from, s.email, subject, rendered, await unsubMachine(s.email)); }
      catch (e) { result = { ok: false, error: String(e).slice(0, 150) }; }

      if (result.ok) {
        sent++;
        await admin.from("newsletter_sends").update({ status: "sent", sent_at: new Date().toISOString(), failed_at: null, error: null }).eq("campaign", campaign).eq("email", s.email);
      } else {
        failed++;
        await admin.from("newsletter_sends").update({ status: "failed", failed_at: new Date().toISOString(), error: result.error }).eq("campaign", campaign).eq("email", s.email);
      }
    }

    // Aggregate batch record for Growth/ops visibility; newsletter_sends remains recipient truth.
    await admin.from("newsletter_campaigns").insert({
      subject, segment_source: source, recipients: toSend.length, sent, failed,
      status: failed && !sent ? "failed" : "sent", sent_by: uid,
    });

    return json({ sent, failed, batch: toSend.length, remaining: pending.length - toSend.length, segment_total: all.length, campaign });
  } catch (e) {
    return json({ error: String(e).slice(0, 200) }, 500);
  }
});