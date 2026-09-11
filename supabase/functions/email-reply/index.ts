// ↩️ email-reply — האדמין «משיב» למייל נכנס (inbound_emails) דרך Resend.
// אדמין-בלבד (JWT → users.role='admin'). שולח מ-From המותג, עם Reply-To, וכותרות שרשור
// (In-Reply-To/References) כדי שהתשובה תישב באותו שרשור אצל הנמען. מסמן replied_at על השורה.
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
const REPLY_TO = Deno.env.get("NEWSLETTER_REPLY_TO") ?? "zyz997@gmail.com";

function esc(s: string) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function wrap(bodyHtml: string) {
  return `<div dir="rtl" style="font-family:Georgia,'Times New Roman',serif;color:#1b1420;line-height:1.9;font-size:16px;text-align:right;max-width:600px;">
${bodyHtml}
<div style="border-top:1px solid #ece7dc;margin:20px 0 10px;"></div>
<div style="font-size:12.5px;color:#8a8580;"><a href="https://sod1820.co.il" style="color:#9a7b1e;text-decoration:none;font-weight:bold;">סוד 1820 · sod1820.co.il</a></div>
</div>`;
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

    if (!RESEND_KEY) return json({ error: "not_configured", hint: "חסר RESEND_API_KEY" });

    const body = await req.json().catch(() => ({}));
    const id = body.id;
    const bodyText = String(body.body_text || "").trim();
    if (!id) return json({ error: "missing_id" }, 400);
    if (!bodyText) return json({ error: "empty_body" }, 400);

    const { data: row } = await admin.from("inbound_emails")
      .select("id, from_email, subject, message_id, reply_count, meta").eq("id", id).maybeSingle();
    if (!row) return json({ error: "not_found" }, 404);
    if (!row.from_email) return json({ error: "no_recipient" }, 400);

    const subj = String(row.subject || "").trim();
    const reSubject = /^re:/i.test(subj) ? subj : ("Re: " + (subj || "הודעה"));
    const bodyHtml = String(body.body_html || "").trim() || ("<p>" + esc(bodyText).replace(/\n/g, "<br />") + "</p>");

    const rawMid = String(row.message_id || "");
    const isRealMid = rawMid.includes("@") && !rawMid.startsWith("in_");
    const threadHeaders: Record<string, string> = {};
    if (isRealMid) {
      const mid = `<${rawMid}>`;
      threadHeaders["In-Reply-To"] = mid;
      threadHeaders["References"] = mid;
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM, reply_to: REPLY_TO, to: row.from_email, subject: reSubject,
        html: wrap(bodyHtml), text: bodyText,
        ...(Object.keys(threadHeaders).length ? { headers: threadHeaders } : {}),
      }),
    });
    const rj = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: "send_failed", detail: rj }, 502);

    const replies = Array.isArray(row.meta?.replies) ? row.meta.replies : [];
    replies.push({ at: new Date().toISOString(), by: uid, text: bodyText.slice(0, 4000) });
    await admin.from("inbound_emails").update({
      replied_at: new Date().toISOString(),
      reply_count: (row.reply_count || 0) + 1,
      read: true,
      meta: { ...(row.meta || {}), replies },
    }).eq("id", id);

    return json({ ok: true, sent_to: row.from_email, resend_id: rj?.id });
  } catch (e) {
    return json({ error: String(e).slice(0, 200) }, 500);
  }
});
