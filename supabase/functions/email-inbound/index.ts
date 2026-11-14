// email-inbound — canonical Resend email.received webhook -> inbound_emails admin inbox.
// G0 security: verify Resend/Svix signature over the RAW body. No URL/static shared secret.
// The signing secret is read from RESEND_WEBHOOK_SECRET when configured, otherwise retrieved/cached
// from the authenticated Resend Webhooks API using the already-existing RESEND_API_KEY.
import { createClient } from "jsr:@supabase/supabase-js@2";

// MAIL_INTAKE_ZION_20261105: held-only intake of approved senders. OFF unless this Edge secret is exactly "true".
// With the flag off nothing below runs and no new module is even loaded (dynamic imports live inside admitHeldMail).
// Whatever happens here, the private inbox store below is never blocked or rolled back.
const MAIL_INTAKE_ENABLED = (Deno.env.get("MAIL_INTAKE_ZION_ENABLED") || "").trim() === "true";

const RESEND_KEY = (Deno.env.get("RESEND_READ_KEY") || Deno.env.get("RESEND_API_KEY") || "").trim();
const WEBHOOK_ID = "d31ce68e-5f2f-481e-af12-6ac0256005c9"; // resource id, not a secret
const EXPLICIT_WEBHOOK_SECRET = (Deno.env.get("RESEND_WEBHOOK_SECRET") || "").trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let signingSecretCache = EXPLICIT_WEBHOOK_SECRET;

const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
function stripHtml(h: string): string {
  return (h || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function parseFrom(raw: string): { name: string; email: string } {
  const s = (raw || "").trim();
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  const em = s.match(/[^\s<>@]+@[^\s<>@]+/);
  return { name: "", email: em ? em[0].toLowerCase() : s.toLowerCase() };
}
async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return "in_" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 28);
}
async function getSigningSecret(): Promise<string> {
  if (signingSecretCache) return signingSecretCache;
  if (!RESEND_KEY) return "";
  try {
    const r = await fetch(`https://api.resend.com/webhooks/${WEBHOOK_ID}`, { headers: { Authorization: `Bearer ${RESEND_KEY}` } });
    if (!r.ok) return "";
    const d = await r.json();
    const secret = String(d?.signing_secret || "").trim();
    if (secret.startsWith("whsec_")) signingSecretCache = secret;
  } catch { /* fail closed below */ }
  return signingSecretCache;
}
function b64Bytes(s: string): Uint8Array {
  const raw = atob(s);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verifyWebhook(rawBody: string, req: Request): Promise<boolean> {
  const id = req.headers.get("svix-id") || "";
  const ts = req.headers.get("svix-timestamp") || "";
  const sig = req.headers.get("svix-signature") || "";
  const epoch = Number(ts);
  if (!id || !Number.isFinite(epoch) || !sig) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - epoch) > 300) return false;
  const secret = await getSigningSecret();
  if (!secret.startsWith("whsec_")) return false;
  try {
    const keyBytes = b64Bytes(secret.slice("whsec_".length));
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signed = `${id}.${ts}.${rawBody}`;
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed)));
    let expected = "";
    for (const byte of mac) expected += String.fromCharCode(byte);
    expected = btoa(expected);
    return sig.split(/\s+/).some((part) => {
      const [version, value] = part.split(",", 2);
      return version === "v1" && !!value && constantTimeEqual(value, expected);
    });
  } catch { return false; }
}

// Returns a short status token; never the mail content. The RPC is the authoritative dedupe + held-shape check.
async function admitHeldMail(inboxId: number, emailId: string, receipt: any): Promise<string> {
  const { planMailIntake } = await import("../_shared/mailIntake.mjs");
  const { exactMailbox } = await import("../_shared/sourceEmail.mjs");
  const mailbox = exactMailbox(receipt?.from);
  if (!mailbox) return "skip:sender_unparseable";
  const { data: rows, error: apErr } = await sb.from("mail_source_approvals")
    .select("mailbox_lc, author_key, author_display, contributor_id, active").eq("mailbox_lc", mailbox).eq("active", true);
  if (apErr) throw new Error("approvals_read_failed");
  if (!rows?.length) return "skip:sender_not_approved"; // unknown senders never reach the contributor lookup
  const approvals = rows.map((r: any) => ({ email: r.mailbox_lc, active: r.active, author_key: r.author_key, author_display: r.author_display, contributor_id: r.contributor_id }));
  const esc = mailbox.replace(/[\\%_]/g, "\\$&");
  const { data: matches, error: cErr } = await sb.from("contributors").select("id").ilike("email", esc);
  if (cErr) throw new Error("contributors_read_failed");
  const plan = await planMailIntake({
    email: receipt, providerContext: { provider: "resend", providerId: emailId },
    receivedAt: new Date().toISOString(), approvals, contributorMatches: matches || [],
  });
  if (plan.action !== "hold") return `skip:${plan.reason}`;
  const { data: res, error: rpcErr } = await sb.rpc("admit_mail_source_held_v1", {
    p_inbound_email_id: inboxId, p_update: plan.update, p_proof: plan.mail_proof,
  });
  if (rpcErr) throw new Error("admit_rpc_failed");
  return res?.ok === true ? (res.dup ? "held:dup" : "held") : `skip:${res?.error || "rpc_refused"}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return j({ ok: false, error: "method_not_allowed" }, 405);
  if (!RESEND_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) return j({ ok: false, error: "not_configured" }, 503);

  const rawBody = await req.text();
  if (!(await verifyWebhook(rawBody, req))) return j({ ok: false, error: "invalid_webhook" }, 400);

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return j({ ok: false, error: "invalid_json" }, 400); }
  if (event?.type !== "email.received") return j({ ok: true, ignored: true });
  const data = event?.data || {};
  const emailId = String(data.email_id || "");
  if (!emailId) return j({ ok: false, error: "missing_email_id" }, 400);

  let from = String(data.from || ""), to = Array.isArray(data.to) ? data.to.join(", ") : String(data.to || "");
  let subject = String(data.subject || ""), text = "", html = "", msgId = String(data.message_id || emailId), inReplyTo = "";
  let receipt: any = null; // authenticated GET result, used only by the flag-gated held intake
  try {
    const rr = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, { headers: { Authorization: `Bearer ${RESEND_KEY}` } });
    if (rr.ok) {
      const f = await rr.json();
      receipt = f;
      from = f.from || from;
      to = Array.isArray(f.to) ? f.to.join(", ") : (f.to || to);
      subject = f.subject || subject;
      text = f.text || "";
      html = f.html || "";
      msgId = f.message_id || msgId;
      const hs = f.headers || {};
      if (Array.isArray(hs)) inReplyTo = String(hs.find((h: any) => String(h?.name || "").toLowerCase() === "in-reply-to")?.value || "");
      else if (hs && typeof hs === "object") inReplyTo = String(hs["in-reply-to"] || hs["In-Reply-To"] || "");
    }
  } catch { /* metadata-only fallback is still safe after signed event */ }

  const bodyText = text.trim() ? text.trim() : stripHtml(html);
  const parsed = parseFrom(from);
  const dedupKey = msgId.trim() ? msgId.trim().replace(/[<>]/g, "").slice(0, 180) : await sha(parsed.email + "|" + subject + "|" + bodyText.slice(0, 120));
  const { data: dup } = await sb.from("inbound_emails").select("id").eq("message_id", dedupKey).maybeSingle();
  if (dup) return j({ ok: true, dup: true, id: dup.id });

  // Inbox content is untrusted data only. This function stores it; it does not execute actions or feed an agent.
  const { data: row, error } = await sb.from("inbound_emails").insert({
    from_email: parsed.email || null,
    from_name: parsed.name || null,
    to_email: to || null,
    subject: subject.slice(0, 400) || null,
    body_text: bodyText.slice(0, 20000) || null,
    body_html: html.slice(0, 60000) || null,
    message_id: dedupKey,
    in_reply_to: inReplyTo.replace(/[<>]/g, "").slice(0, 180) || null,
    meta: { raw_from: from, raw_to: to, provider: "resend", verified_webhook: true },
  }).select("id").maybeSingle();
  if (error) return j({ ok: false, error: "store_failed" }, 500);

  // Held-only intake (OFF by default). Any failure is logged without content and never affects the stored inbox row.
  let intake: string | undefined;
  if (MAIL_INTAKE_ENABLED && row?.id && receipt) {
    try { intake = await admitHeldMail(row.id, emailId, receipt); }
    catch { intake = "mail_intake_failed"; console.error("mail_intake_failed"); }
  }
  return j(intake ? { ok: true, id: row?.id, intake } : { ok: true, id: row?.id });
});
