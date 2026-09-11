// email-inbound — inbound mailbox webhook -> inbound_emails (admin inbox).
// Provider-agnostic: Resend email.received or JSON/form-data forwarders.
// G0 hardening: EMAIL_INBOUND_SECRET is mandatory; no source-code fallback exists.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = (Deno.env.get("EMAIL_INBOUND_SECRET") || "").trim();
const RESEND_KEY = Deno.env.get("RESEND_READ_KEY") ?? Deno.env.get("RESEND_API_KEY") ?? "";
const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function stripHtml(h: string): string {
  return (h || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function parseFrom(raw: string): { name: string; email: string } {
  const s = (raw || "").trim();
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  const em = s.match(/[^\s<>@]+@[^\s<>@]+/);
  return { name: "", email: em ? em[0].toLowerCase() : s.toLowerCase() };
}
function fromHeaders(headers: unknown, key: string): string {
  if (!headers) return "";
  if (Array.isArray(headers)) {
    const h = headers.find((x) => String(x?.name || "").toLowerCase() === key.toLowerCase());
    return h ? String(h.value || "") : "";
  }
  if (typeof headers === "object") {
    const o = headers as Record<string, string>;
    for (const k of Object.keys(o)) if (k.toLowerCase() === key.toLowerCase()) return String(o[k] || "");
    return "";
  }
  const re = new RegExp("^" + key + "\\s*:\\s*(.+)$", "im");
  const m = String(headers).match(re);
  return m ? m[1].trim() : "";
}
async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return "in_" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 28);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return j({ ok: false, error: "method_not_allowed" }, 405);
  if (!SECRET) return j({ ok: false, error: "not_configured" }, 503);
  const u = new URL(req.url);
  if (u.searchParams.get("s") !== SECRET) return j({ ok: false, error: "forbidden" }, 403);

  let from = "", to = "", subject = "", text = "", html = "", msgId = "", inReplyTo = "";
  let headers: unknown = "";
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const b = await req.json();
      const d = b?.data ?? b;
      const emailId = d?.email_id || "";
      const isResend = (b?.type === "email.received" || !!emailId) && !d?.text && !d?.html;
      if (isResend && emailId && RESEND_KEY) {
        const rr = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          headers: { Authorization: `Bearer ${RESEND_KEY}` },
        });
        if (rr.ok) {
          const f = await rr.json();
          from = f.from || d.from || "";
          to = Array.isArray(f.to) ? f.to.join(", ") : (f.to || "");
          subject = f.subject || d.subject || "";
          text = f.text || "";
          html = f.html || "";
          headers = f.headers ?? "";
          msgId = f.message_id || emailId;
          inReplyTo = fromHeaders(f.headers, "In-Reply-To");
        } else {
          from = d.from || "";
          to = Array.isArray(d.to) ? d.to.join(", ") : (d.to || "");
          subject = d.subject || "";
          msgId = emailId;
          text = rr.status === 401 || rr.status === 403
            ? "(גוף המייל לא נמשך — דרוש מפתח Resend Full-access ב-RESEND_READ_KEY)"
            : "(גוף המייל לא נמשך — שגיאת API " + rr.status + ")";
        }
      } else {
        from = d.from || d.From || "";
        to = Array.isArray(d.to) ? d.to.join(", ") : (d.to || d.To || "");
        subject = d.subject || d.Subject || "";
        text = d.text || d.plain || d.body_text || "";
        html = d.html || d.body_html || "";
        msgId = d["message-id"] || d.messageId || d.message_id || d.email_id || "";
        inReplyTo = d["in-reply-to"] || d.in_reply_to || d.inReplyTo || "";
        headers = d.headers ?? "";
      }
    } else {
      const f = await req.formData();
      from = String(f.get("from") || "");
      to = String(f.get("to") || "");
      subject = String(f.get("subject") || "");
      text = String(f.get("text") || "");
      html = String(f.get("html") || "");
      headers = String(f.get("headers") || "");
      msgId = String(f.get("message-id") || "") || fromHeaders(headers, "Message-ID") || fromHeaders(headers, "Message-Id");
      inReplyTo = String(f.get("in-reply-to") || "") || fromHeaders(headers, "In-Reply-To");
    }
  } catch (error) {
    return j({ ok: false, error: "parse: " + String(error).slice(0, 120) }, 400);
  }

  const bodyText = text.trim() ? text.trim() : stripHtml(html);
  if (!from && !subject && !bodyText) return j({ ok: false, error: "empty" }, 400);

  const parsed = parseFrom(from);
  const dedupKey = (msgId && String(msgId).trim())
    ? String(msgId).trim().replace(/[<>]/g, "").slice(0, 180)
    : await sha(parsed.email + "|" + subject + "|" + bodyText.slice(0, 120));

  const { data: dup } = await sb.from("inbound_emails").select("id").eq("message_id", dedupKey).maybeSingle();
  if (dup) return j({ ok: true, dup: true, id: dup.id });

  const { data: row, error } = await sb.from("inbound_emails").insert({
    from_email: parsed.email || null,
    from_name: parsed.name || null,
    to_email: to || null,
    subject: (subject || "").slice(0, 400) || null,
    body_text: bodyText.slice(0, 20000) || null,
    body_html: (html || "").slice(0, 60000) || null,
    message_id: dedupKey,
    in_reply_to: String(inReplyTo || "").replace(/[<>]/g, "").slice(0, 180) || null,
    meta: { raw_from: from, raw_to: to },
  }).select("id").maybeSingle();

  if (error) return j({ ok: false, error: String(error.message || error).slice(0, 160) }, 500);
  return j({ ok: true, id: row?.id });
});
