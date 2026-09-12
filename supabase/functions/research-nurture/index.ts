// research-nurture — research funnel nurture cron.
// Public unsubscribe remains token-bound; scheduled execution uses the existing service-to-service FB_ADMIN_KEY header.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("NEWSLETTER_FROM") ?? "סוד 1820 <news@sod1820.co.il>";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("CHAT_MODEL") ?? "claude-haiku-4-5";
const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const SITE = "https://sod1820.co.il";
const MAX_NURTURES = 3;
const BATCH = 15;

const SYSTEM = "אתה פרשן עברי באתר גימטריה ותורה. ניתוח קצר ומכובד בעברית. חוקי-ברזל: אל תחשב גימטריה — השתמש רק בעובדות שסופקו; הפרד עובדה מפרשנות; בלי נבואות/תאריכים עתידיים; עברית בלבד, בלי Markdown.";
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } }); }
function html(body: string) { return new Response(`<!doctype html><html lang=he dir=rtl><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#0c0818;color:#f0e9d6;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center"><div style="max-width:420px;padding:30px">${body}</div></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } }); }

function factsFromItems(items: any[]): string {
  return (items || []).map((e) => {
    if (e?.type === "number") return `• מספר ${e.title}${e.meaning ? ` — ${e.meaning}` : ""}`;
    if (e?.type === "phrase") return `• ביטוי «${e.title}»${e.value != null ? ` = ${e.value}` : ""}`;
    return `• ${e?.title ?? ""}`;
  }).filter(Boolean).join("\n");
}
async function aiInsight(items: any[]): Promise<string | null> {
  try {
    if (!ANTHROPIC_KEY) return null;
    const facts = factsFromItems(items);
    if (!facts) return null;
    const user = `אוסף-המחקר של החוקר (עובדות מהמנוע — השתמש רק באלה):\n${facts}\n\nמצא את החוטים האמיתיים המחברים את הפריטים — ערכים משותפים, קשר תמטי, התכנסות — והצע כיוון-המשך. עד 5 משפטים, בכנות אם אין קשר אמיתי.`;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, system: SYSTEM, messages: [{ role: "user", content: user }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return (d?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim() || null;
  } catch { return null; }
}
function emailHtml(insight: string, items: any[], unsubUrl: string): string {
  const chips = (items || []).slice(0, 12).map((e) => `<span style="display:inline-block;background:#f3ecd8;border:1px solid #d9c489;border-radius:999px;padding:3px 11px;margin:3px;font-size:14px;color:#5b4718">${e?.title ?? ""}</span>`).join("");
  return `<div dir="rtl" style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1b1420;line-height:1.9;font-size:16px"><div style="text-align:center;font-size:13px;letter-spacing:2px;color:#b8860b;font-weight:bold">סוד 1820 · מרכז המחקר</div><h2 style="text-align:center;color:#7a5e12;font-size:22px;margin:6px 0 14px">תובנה טרייה על תיק-המחקר שלך ✨</h2><div style="text-align:center;margin:0 0 16px">${chips}</div><div style="background:#faf6ec;border:1px solid #e6d9b8;border-radius:12px;padding:16px 18px;white-space:pre-line">${insight}</div><div style="text-align:center;margin:24px 0 6px"><a href="${SITE}/research?src=nurture">המשך המחקר שלך ←</a></div><hr><div style="font-size:12px;color:#999;text-align:center">קיבלת מייל זה כי שמרת תיק-מחקר ב-<b>סוד 1820</b>.<br><a href="${unsubUrl}" style="color:#999">להסרה מהמעקב</a></div></div>`;
}
async function sendEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
  if (!RESEND_KEY) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html: htmlBody }),
  });
  return r.ok;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // Public unsubscribe is a separate capability and remains bound to a high-entropy per-lead token.
  const unsubTok = url.searchParams.get("unsub");
  if (unsubTok) {
    await admin.from("research_leads").update({ unsub: true }).eq("unsub_token", unsubTok);
    return html("<h2>הוסרת מהמעקב ✓</h2><p>לא נשלח לך יותר מעקב-מחקר. תודה!</p>");
  }

  if (!ADMIN_KEY) return json({ error: "not_configured" }, 503);
  if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return json({ error: "forbidden" }, 403);
  if (!SERVICE_KEY || !SUPABASE_URL) return json({ error: "not_configured" }, 503);

  const test = url.searchParams.get("test");
  let q = admin.from("research_leads").select("id,email,items,nurture_count,unsub_token")
    .eq("converted", false).eq("unsub", false).lt("nurture_count", MAX_NURTURES);
  if (test) q = q.eq("email", test).limit(1);
  else q = q.or("and(last_nurtured_at.is.null,created_at.lt." + new Date(Date.now() - 3 * 864e5).toISOString() + "),last_nurtured_at.lt." + new Date(Date.now() - 4 * 864e5).toISOString()).order("created_at", { ascending: true }).limit(BATCH);
  const { data: leads, error: qErr } = await q;
  if (qErr) return json({ error: "query", detail: qErr.message }, 500);

  let sent = 0, skipped = 0;
  const errs: string[] = [];
  for (const lead of (leads || [])) {
    try {
      const items = Array.isArray(lead.items) ? lead.items : [];
      const insight = await aiInsight(items);
      if (!insight) { skipped++; errs.push("no_insight"); continue; }
      const unsubUrl = `${SUPABASE_URL}/functions/v1/research-nurture?unsub=${lead.unsub_token}`;
      const ok = await sendEmail(lead.email, "תובנת-AI טרייה על המחקר שלך · סוד 1820", emailHtml(insight, items, unsubUrl));
      if (ok) {
        await admin.from("research_leads").update({ nurture_count: (lead.nurture_count || 0) + 1, last_nurtured_at: new Date().toISOString(), status: "nurtured" }).eq("id", lead.id);
        sent++;
      } else { skipped++; errs.push("send_failed"); }
    } catch (error) { skipped++; errs.push(String(error).slice(0, 60)); }
  }
  return json({ ok: true, candidates: (leads || []).length, sent, skipped, errs: errs.slice(0, 5) });
});
