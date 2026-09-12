// notify-reply-email — user-facing reply email sender.
// G0: no static/query fallback; service calls require existing FB_ADMIN_KEY header.
const SITE = "https://sod1820.co.il";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("NOTIFY_FROM") ?? Deno.env.get("NEWSLETTER_FROM") ?? "סוד 1820 <news@sod1820.co.il>";
const ADMIN_KEY = Deno.env.get("FB_ADMIN_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DEFAULT_MAX = 100;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fb-admin-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: CORS });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fullUrl = (link: string) => !link ? SITE : (/^https?:\/\//i.test(link) ? link : SITE + (link.startsWith("/") ? link : "/" + link));

function emailHtml(title: string, body: string, url: string) {
  return `<div dir="rtl" style="font-family:'Heebo',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0a04;border-radius:16px;border:1px solid #3a2c0a"><div style="padding:26px 24px;text-align:center"><div style="font-size:40px">💬</div><div style="color:#f0d879;font-size:22px;font-weight:800">${esc(title || "תגובה חדשה")}</div></div><div style="padding:0 24px 24px;color:#e8e2d4;line-height:1.9"><p>${esc(body || "")}</p><p style="text-align:center"><a href="${esc(url)}" style="color:#f0d879;font-weight:800">💬 לצפייה בשרשור ←</a></p></div></div>`;
}
async function resendSend(email: string, title: string, body: string, url: string) {
  if (!RESEND_KEY) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: email, subject: title || "💬 תגובה חדשה בסוד 1820", html: emailHtml(title, body, url) }),
  });
  return r.ok;
}
type NotifRow = { id: string; email: string; title: string; body: string; link: string; channels_sent: string[] };

async function claimAndSend(row: NotifRow) {
  const next = [...new Set([...(row.channels_sent || []), "email"])];
  const patch = await fetch(`${SUPABASE_URL}/rest/v1/user_notifications?id=eq.${row.id}&channels_sent=not.cs.%7Bemail%7D`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", prefer: "return=representation" },
    body: JSON.stringify({ channels_sent: next }),
  });
  const updated = patch.ok ? await patch.json() : [];
  if (!Array.isArray(updated) || !updated.length) return "dup";
  if (await resendSend(row.email, row.title, row.body, fullUrl(row.link))) return "sent";
  await fetch(`${SUPABASE_URL}/rest/v1/user_notifications?id=eq.${row.id}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ channels_sent: row.channels_sent || [] }),
  }).catch(() => {});
  return "send_failed";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!ADMIN_KEY) return json({ error: "not_configured" }, 503);
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return json({ error: "forbidden" }, 403);
  if (!RESEND_KEY || !SUPABASE_URL || !SERVICE_KEY) return json({ error: "not_configured" }, 503);
  try {
    const u = new URL(req.url);
    const maxN = Math.min(200, Math.max(1, parseInt(u.searchParams.get("max") || "") || DEFAULT_MAX));
    const dry = u.searchParams.get("dry") === "1";
    const r = await fetch(`${SUPABASE_URL}/rest/v1/user_notifications?kind=eq.reply&email=not.is.null&channels_sent=not.cs.%7Bemail%7D&select=id,email,title,body,link,channels_sent&order=created_at.asc&limit=500`, {
      headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
    });
    const rows: NotifRow[] = r.ok ? await r.json() : [];
    if (!r.ok) return json({ error: "query_failed" }, 502);
    if (dry) return json({ ok: true, dry_run: true, would_send: rows.length });
    const counts = { sent: 0, dup: 0, send_failed: 0 };
    for (const row of rows.slice(0, maxN)) {
      const result = await claimAndSend(row);
      counts[result as keyof typeof counts]++;
    }
    return json({ ok: true, targets: rows.length, ...counts });
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 200) }, 500);
  }
});
