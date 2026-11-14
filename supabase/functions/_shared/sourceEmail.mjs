// Minimal source-email helpers for the held-only mail intake (task MAIL_INTAKE_ZION_20261105).
// Derived from the pure helpers of draft PR #1089 (never merged), TRIMMED to what mailIntake.mjs actually uses:
// Resend-only; no Gmail provider, no legacy hydration, no approvals resolver, no test-id list.
// No IO. All inputs are untrusted source data: no actions, model calls, identity claims or HTML rendering.

function header(headers, name) {
  const entries = Array.isArray(headers) ? headers.map(h => [h.name, h.value]) : Object.entries(headers || {});
  return String(entries.find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] || '');
}

function messageId(value) {
  const id = String(value || '').trim().replace(/^<([^<>]+)>$/, '$1');
  if (!id || id.length > 998 || /[\s<>\x00-\x1f]/.test(id)) return null;
  return id; // Preserve punctuation and case: stripping them creates collisions.
}

export async function opaqueId(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export function exactMailbox(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(?:[^<>]*<([^<>]+)>|([^<>\s]+))$/);
  const email = (match?.[1] || match?.[2] || '').toLowerCase();
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email) ? email : null;
}

function cleanSourceText(value) {
  const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let quoted = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    // Outlook quotes begin an entire previous message, not just four removable headers.
    const outlook = /^\s*(?:From|מאת):/i.test(line) &&
      lines.slice(index + 1, index + 6).some(next => /^\s*(?:Sent|To|Date|נשלח|אל):/i.test(next));
    const wrapped = /^\s*On\s/i.test(line) &&
      lines.slice(index, index + 4).some(next => /wrote:\s*$/i.test(next));
    // Conservative quote/signature boundaries. The untouched original stays in the private inbox.
    if (outlook || wrapped || /^\s*(?:On .+wrote:|בתאריך .+(?:כתב|כתבה)|ב[-־].+(?:כתב|כתבה):|[-_]{2,}\s*(?:Original Message|Forwarded message|הודעה מקורית)|--\s*$)/i.test(line)) {
      quoted = true; break;
    }
    if (/^\s*>/.test(line)) { quoted = true; continue; }
    if (/^\s*(?:From|To|Cc|Bcc|Reply-To|Date|Sent|מאת|אל|עותק|נשלח):/i.test(line)) continue;
    output.push(line);
  }
  const text = output.join('\n')
    .replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[דוא״ל]')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, '[קישור]')
    // Numerical research, dates and value lists are not phone numbers.
    .replace(/((?:טלפון|נייד|וואטסאפ|phone|mobile|tel)\s*[:：]?\s*)\+?\d[\d ().-]{6,}\d/gi, '$1[מספר]')
    .replace(/\n{3,}/g, '\n\n').trim();
  return { text, quoted_omitted: quoted, sanitizer_version: 'mail-source-v2' };
}

export async function normalizeReceivedEmail(email, { providerId, receivedAt } = {}) {
  if (!providerId) throw new Error('missing_provider_identity');
  const rawText = String(email.text || '');
  const rawHtml = String(email.html || '');
  const oversized = new TextEncoder().encode(rawText + rawHtml).byteLength > 2_000_000;
  const id = messageId(email.message_id || header(email.headers, 'message-id'));
  const refs = (header(email.headers, 'references').match(/<[^<>]+>/g) || []).map(messageId).filter(Boolean);
  const directParent = messageId(header(email.headers, 'in-reply-to'));
  // RFC lineage can survive a missing In-Reply-To via the last References ID.
  // Never infer a conversation from Subject, display name or quoted body text.
  const parent = directParent || refs.at(-1) || null;
  const stableId = `mail_${await opaqueId(id || `resend:${providerId}`)}`;
  const clean = cleanSourceText(oversized ? '' : rawText);
  // HTML-only mail is not regex-converted into source text.
  const at = Date.parse(header(email.headers, 'date'));
  const attachments = Array.isArray(email.attachments) ? email.attachments : [];
  return {
    id: stableId,
    message_id: id,
    parent_id: parent ? `mail_${await opaqueId(parent)}` : null,
    parent_basis: directParent ? 'in_reply_to' : parent ? 'references' : null,
    reference_ids: await Promise.all(refs.map(async ref => `mail_${await opaqueId(ref)}`)),
    source_published_at: Number.isFinite(at) ? new Date(at).toISOString() : null,
    arrival_at: Number.isFinite(Date.parse(receivedAt)) ? new Date(receivedAt).toISOString() : null,
    full_text: clean.text,
    quoted_omitted: clean.quoted_omitted,
    sanitizer_version: clean.sanitizer_version,
    text_state: oversized ? 'source_too_large' : clean.text ? 'available' : rawText.trim() ? 'cleaned_empty' : rawHtml ? 'html_only_unavailable' : 'empty',
    // Immutable provider locators only; never ephemeral download URLs or attacker-controlled image src.
    images: attachments.filter(a => /^image\/(?:jpeg|png|gif|webp)$/i.test(a.content_type || a.mime_type || '') && a.id)
      .map(a => ({ id: `${stableId}:${a.id}`, provider_id: String(a.id) })),
  };
}

// Sender proof comes ONLY from the authenticated GET /emails/receiving/:id result (Resend computes dmarc/dkim at reception).
// Never derive it from headers; SPF alone is insufficient after forwarding; null/gray/fail stay closed.
export function providerSenderProof(email, { provider, providerId } = {}) {
  const mailbox = exactMailbox(email?.from);
  if (provider !== 'resend' || !providerId || email?.id !== providerId || !mailbox) return null;
  const proof = email.authentication;
  if (proof?.dmarc !== 'pass' || proof?.dkim !== 'pass') return null;
  return { provider, provider_id: providerId, dkim: 'pass', dmarc: 'pass' };
}
