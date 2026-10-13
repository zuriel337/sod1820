// email-inbound — canonical Resend email.received webhook -> inbound_emails admin inbox.
// G0 security: verify Resend/Svix signature over the RAW body. No URL/static shared secret.
// The signing secret is read from RESEND_WEBHOOK_SECRET when configured, otherwise retrieved/cached
// from the authenticated Resend Webhooks API using the already-existing RESEND_API_KEY.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { normalizeReceivedEmail, resolveApprovedSender, exactMailbox, canHydrateLegacy, TECHNICAL_TEST_PROVIDER_IDS } from "../_shared/sourceEmail.mjs";

const RESEND_KEY = (Deno.env.get("RESEND_READ_KEY") || Deno.env.get("RESEND_API_KEY") || "").trim();
const WEBHOOK_ID = "d31ce68e-5f2f-481e-af12-6ac0256005c9"; // resource id, not a secret
const EXPLICIT_WEBHOOK_SECRET = (Deno.env.get("RESEND_WEBHOOK_SECRET") || "").trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let signingSecretCache = EXPLICIT_WEBHOOK_SECRET;

const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
async function attemptPublication(id: number, source: any, author: any, technicalTest: boolean) {
  if (!author || technicalTest || source.text_state !== "available" || !source.arrival_at) return "private";
  try {
    const result = await sb.rpc("admit_email_source_v1", { p_inbound_id: id });
    return result.error ? "reader_not_ready" : result.data?.state || "private";
  } catch { return "reader_not_ready"; }
}
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
  let subject = String(data.subject || ""), text = "", html = "", inReplyTo = "";
  let fetched: any;
  try {
    // Keep inline images as attachment references, not base64 repeated in every quote.
    const rr = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`, { headers: { Authorization: `Bearer ${RESEND_KEY}` } });
    // Acknowledging metadata-only rows loses bodies/attachments permanently on transient failures.
    if (!rr.ok) return j({ ok: false, error: "provider_unavailable" }, 502);
    if (rr.ok) {
      const f = await rr.json();
      fetched = f;
      from = f.from || from;
      to = Array.isArray(f.to) ? f.to.join(", ") : (f.to || to);
      subject = f.subject || subject;
      text = f.text || "";
      html = f.html || "";
      const hs = f.headers || {};
      if (Array.isArray(hs)) inReplyTo = String(hs.find((h: any) => String(h?.name || "").toLowerCase() === "in-reply-to")?.value || "");
      else if (hs && typeof hs === "object") inReplyTo = String(hs["in-reply-to"] || hs["In-Reply-To"] || "");
    }
  } catch { return j({ ok: false, error: "provider_unavailable" }, 502); }

  let source: any;
  try {
    source = await normalizeReceivedEmail(fetched, {
      provider: "resend", providerId: emailId, receivedAt: fetched.created_at || event.created_at || data.created_at || null,
    });
  } catch { return j({ ok: false, error: "invalid_source" }, 422); }
  // Canonical contributors are the single current approval home. No copied env
  // allowlist: revocation here is also enforced by the public SQL reader.
  const mailbox = exactMailbox(from);
  let approvals: any[] = [];
  if (mailbox) {
    const approved = await sb.from("contributors").select("id,slug,display_name,email,page_config")
      .eq("email", mailbox).eq("active", true).is("merged_into", null);
    if (!approved.error) approvals = (approved.data || []).filter((c: any) => c.page_config?.email_source_public === true)
      .map((c: any) => ({ email: c.email, active: true, author_key: c.slug, author_display: c.display_name, contributor_id: c.id }));
  }
  const technicalTest = TECHNICAL_TEST_PROVIDER_IDS.includes(emailId);
  const author = technicalTest ? null : resolveApprovedSender(fetched, approvals);

  const bodyText = text.trim() ? text.trim() : stripHtml(html);
  const parsed = parseFrom(from);
  const dedupKey = source.storage_key;
  const { data: dup, error: lookupError } = await sb.from("inbound_emails").select("id,from_email,meta").eq("message_id", dedupKey).maybeSingle();
  if (lookupError) return j({ ok: false, error: "lookup_failed" }, 500);
  if (dup && (dup.from_email !== mailbox || dup.meta?.provider_id !== emailId)) return j({ ok: false, error: "provider_identity_conflict" }, 409);
  if (dup?.meta?.source_email_v1) return j({ ok: true, dup: true, id: dup.id,
    publication: await attemptPublication(dup.id, source, author, technicalTest) });
  let legacy: any = null;
  if (!dup && source.message_id) {
    const old = await sb.from("inbound_emails").select("id,from_email,meta").eq("message_id", source.message_id).maybeSingle();
    if (old.error) return j({ ok: false, error: "lookup_failed" }, 500);
    if (canHydrateLegacy(old.data, mailbox, emailId)) legacy = old.data;
  }
  const existing = dup || legacy;

  // Inbox content is untrusted data only. This function stores it; it does not execute actions or feed an agent.
  const payload = {
    from_email: mailbox,
    from_name: parsed.name || null,
    to_email: to || null,
    subject: subject || null,
    body_text: source.text_state === "source_too_large" ? null : bodyText || null,
    body_html: source.text_state === "source_too_large" ? null : html || null,
    message_id: dedupKey,
    in_reply_to: inReplyTo.replace(/^<|>$/g, "") || null,
    ...(source.arrival_at && !existing ? { received_at: source.arrival_at } : {}),
    meta: { ...(existing?.meta || {}), raw_from: from, raw_to: to, provider: "resend", provider_id: emailId, verified_webhook: true,
      source_email_v1: { ...source, author, admission: author ? "approved_source_candidate" : "unresolved",
        identity_proof: author ? { provider: "resend", provider_id: emailId, dmarc: "pass", from_aligned: true } : null,
        technical_test: technicalTest, publication_state: "private", media_state: "provider_references_only" } },
  };
  // Hydrate old metadata-only rows on provider replay without resetting read/reply state.
  const write = existing ? sb.from("inbound_emails").update(payload).eq("id", existing.id)
    : sb.from("inbound_emails").insert(payload);
  const { data: row, error } = await write.select("id").maybeSingle();
  if (error?.code === "23505") {
    const replay = await sb.from("inbound_emails").select("id,from_email,meta").eq("message_id", dedupKey).maybeSingle();
    if (replay.error || replay.data?.from_email !== mailbox || replay.data?.meta?.provider_id !== emailId) return j({ ok: false, error: "dedup_conflict" }, 409);
    return j({ ok: true, dup: true, id: replay.data.id });
  }
  if (error) return j({ ok: false, error: "store_failed" }, 500);
  // The migration/reader is a separate reviewed release prerequisite. Missing RPC
  // must never lose a private delivery or fall back to the old unrestricted ingest.
  const publication = await attemptPublication(row?.id, source, author, technicalTest);
  return j({ ok: true, id: row?.id, publication });
});
