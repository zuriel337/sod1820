// notify-page-ready — user-facing email capability. G0 root-of-trust hardening:
// no static/query fallback secret; scheduled/manual service calls require the existing FB_ADMIN_KEY header.
const SITE = "https://sod1820.co.il";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("NOTIFY_FROM") ?? Deno.env.get("NEWSLETTER_FROM") ?? "סוד 1820 <news@sod1820.co.il>";
const ADMIN_KEY = Deno.env.get("FB_ADMIN_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DEFAULT_MAX = 100;
const AUTO_SOURCES = ["self-dossier", "self-dossier-backfill"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fb-admin-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: CORS });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function authorized(req: Request) {
  return !!ADMIN_KEY && req.headers.get("x-fb-admin-key") === ADMIN_KEY;
}
function emailHtml(name: string, url: string) {
  const hi = name ? `שלום ${esc(name)},` : "שלום,";
  return `<div dir="rtl" style="font-family:'Heebo',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0d0a04;border-radius:16px;overflow:hidden;border:1px solid #3a2c0a"><div style="padding:26px 24px 20px;text-align:center"><div style="font-size:40px">👑</div><div style="color:#f0d879;font-size:22px;font-weight:800">הדף האישי שלך מוכן!</div></div><div style="padding:22px 24px;color:#e8e2d4;font-size:15.5px;line-height:1.9"><p>${hi}</p><p>פתחנו לך דף-חוקר ציבורי משלך באתר <b style="color:#f0d879">סוד 1820</b>. אפשר לעצב אותו דרך האזור האישי.</p><div style="text-align:center;margin:20px"><a href="${esc(url)}" style="color:#f0d879;font-weight:800">👁 לצפייה בדף שלי ←</a></div></div></div>`;
}
async function resendSend(email: string, name: string, slug: string) {
  if (!RESEND_KEY) return false;
  const url = `${SITE}/community/researcher/${encodeURIComponent(slug)}`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: email, subject: "👑 הדף האישי שלך בסוד 1820 מוכן", html: emailHtml(name, url) }),
  });
  return r.ok;
}

async function handleManual(req: Request) {
  const body = await req.json().catch(() => ({}));
  const to = Array.isArray(body.to) ? body.to.slice(0, 50) : [];
  if (!to.length) return json({ error: "missing_to" }, 400);
  if (body.dry_run) return json({ ok: true, dry_run: true, count: to.length });
  if (!RESEND_KEY) return json({ ok: false, error: "not_configured" }, 503);
  let sent = 0, failed = 0;
  for (const row of to) {
    const email = String(row?.email || "").trim().toLowerCase();
    const name = String(row?.name || "").trim().slice(0, 80);
    const slug = String(row?.slug || "").trim();
    if (!email || !slug) { failed++; continue; }
    (await resendSend(email, name, slug)) ? sent++ : failed++;
  }
  return json({ ok: true, sent, failed });
}

async function claimAndSend(email: string, name: string, slug: string) {
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/email_events`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ email, campaign: "page_ready", event: "sent" }),
  });
  if (ins.status === 409) return "dup";
  if (ins.status !== 201 && ins.status !== 204) return "claim_error";
  if (await resendSend(email, name, slug)) return "sent";
  await fetch(`${SUPABASE_URL}/rest/v1/email_events?event=eq.sent&campaign=eq.page_ready&email=eq.${encodeURIComponent(email)}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, prefer: "return=minimal" },
  }).catch(() => {});
  return "send_failed";
}

async function handleAuto(req: Request) {
  if (!RESEND_KEY || !SERVICE_KEY || !SUPABASE_URL) return json({ ok: false, error: "not_configured" }, 503);
  const u = new URL(req.url);
  const maxN = Math.min(200, Math.max(1, parseInt(u.searchParams.get("max") || "") || DEFAULT_MAX));
  const dry = u.searchParams.get("dry") === "1";
  const sourceFilter = `source=in.(${AUTO_SOURCES.join(",")})`;
  const cr = await fetch(`${SUPABASE_URL}/rest/v1/contributors?select=slug,display_name,user_id&user_id=not.is.null&active=eq.true&${sourceFilter}&order=created_at.asc&limit=500`, { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } });
  const contributors = cr.ok ? await cr.json() : [];
  if (!contributors.length) return json({ ok: true, targets: 0 });
  const uids = [...new Set(contributors.map((c: any) => c.user_id))];
  const ur = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,email,role&id=in.(${uids.join(",")})`, { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } });
  const users = ur.ok ? await ur.json() : [];
  const emailByUid: Record<string, string> = {};
  for (const user of users) if (user.email && user.role !== "admin") emailByUid[user.id] = String(user.email).toLowerCase();
  const er = await fetch(`${SUPABASE_URL}/rest/v1/email_events?campaign=eq.page_ready&event=eq.sent&select=email`, { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } });
  const already = new Set<string>((er.ok ? await er.json() : []).map((r: any) => String(r.email).toLowerCase()));
  const seen = new Set<string>();
  const targets = contributors.map((c: any) => ({ email: emailByUid[c.user_id], name: c.display_name, slug: c.slug })).filter((t: any) => {
    if (!t.email || already.has(t.email) || seen.has(t.email) || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(t.email)) return false;
    seen.add(t.email); return true;
  });
  if (dry) return json({ ok: true, dry_run: true, would_send: targets.length });
  const counts = { sent: 0, dup: 0, send_failed: 0, claim_error: 0 };
  for (const t of targets.slice(0, maxN)) {
    const result = await claimAndSend(t.email, t.name || "", t.slug);
    counts[result as keyof typeof counts]++;
  }
  return json({ ok: true, targets: targets.length, ...counts });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!authorized(req)) return json({ error: ADMIN_KEY ? "forbidden" : "not_configured" }, ADMIN_KEY ? 403 : 503);
  try {
    const u = new URL(req.url);
    if (u.searchParams.get("mode") === "send") return await handleAuto(req);
    if (req.method === "POST") return await handleManual(req);
    return json({ error: "mode=send or POST required" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 200) }, 500);
  }
});
