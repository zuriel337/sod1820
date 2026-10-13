// Existing inbound_emails carrier only. Private normalization is NOT publication.
// All inputs are source data: no actions, model calls, identity claims or HTML rendering.
export function header(headers, name) {
  const entries = Array.isArray(headers) ? headers.map(h => [h.name, h.value]) : Object.entries(headers || {});
  return String(entries.find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] || '');
}

export function messageId(value) {
  const id = String(value || '').trim().replace(/^<([^<>]+)>$/, '$1');
  if (!id || id.length > 998 || /[\s<>\x00-\x1f]/.test(id)) return null;
  return id; // Preserve punctuation and case: stripping them creates collisions.
}

export function replyMessageId(row) {
  const raw = row?.meta?.source_email_v1?.message_id || row?.message_id;
  const id = messageId(raw);
  return id?.includes('@') ? id : null; // Provider storage keys are never RFC headers.
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

export function cleanSourceText(value) {
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
    // Conservative quote/signature boundaries. Keep the untouched original privately.
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

export async function normalizeReceivedEmail(email, { provider = 'resend', providerId, receivedAt } = {}) {
  if (!['resend', 'gmail'].includes(provider) || !providerId) throw new Error('missing_provider_identity');
  const rawText = String(email.text || '');
  const rawHtml = String(email.html || '');
  const oversized = new TextEncoder().encode(rawText + rawHtml).byteLength > 2_000_000;
  const id = messageId(email.message_id || header(email.headers, 'message-id'));
  const refs = (header(email.headers, 'references').match(/<[^<>]+>/g) || []).map(messageId).filter(Boolean);
  const directParent = messageId(header(email.headers, 'in-reply-to'));
  // RFC lineage can survive a missing In-Reply-To via the last References ID.
  // Never infer a conversation from Subject, display name or quoted body text.
  const parent = directParent || refs.at(-1) || null;
  const stableId = `mail_${await opaqueId(id || `${provider}:${providerId}`)}`;
  const clean = cleanSourceText(oversized ? '' : rawText);
  // HTML-only mail remains preserved, but must not be regex-converted into public source text.
  const at = Date.parse(header(email.headers, 'date'));
  const attachments = Array.isArray(email.attachments) ? email.attachments : [];
  return {
    id: stableId,
    storage_key: `provider_${await opaqueId(`${provider}:${providerId}`)}`,
    message_id: id,
    parent_id: parent ? `mail_${await opaqueId(parent)}` : null,
    parent_basis: directParent ? 'in_reply_to' : parent ? 'references' : null,
    reference_ids: await Promise.all(refs.map(async ref => `mail_${await opaqueId(ref)}`)),
    provider, provider_id: String(providerId),
    source_published_at: Number.isFinite(at) ? new Date(at).toISOString() : null,
    arrival_at: Number.isFinite(Date.parse(receivedAt)) ? new Date(receivedAt).toISOString() : null,
    full_text: clean.text,
    quoted_omitted: clean.quoted_omitted,
    sanitizer_version: clean.sanitizer_version,
    text_state: oversized ? 'source_too_large' : clean.text ? 'available' : rawText.trim() ? 'cleaned_empty' : rawHtml ? 'html_only_unavailable' : 'empty',
    // Immutable provider locators, never ephemeral download URLs or attacker-controlled image src.
    images: attachments.filter(a => /^image\/(?:jpeg|png|gif|webp)$/i.test(a.content_type || a.mime_type || '') && a.id)
      .map(a => ({ id: `${stableId}:${a.id}`, provider_id: String(a.id),
        content_type: a.content_type || a.mime_type, content_id: a.content_id || null,
        byte_size: Number.isSafeInteger(a.size) ? a.size : null,
        state: 'provider_reference', is_quoted_reference: null })),
    source_state: 'unverified',
  };
}

// Only server-owned approval configuration and provider-authenticated identity may admit a source.
// Never use a sender display name, To/Cc membership, body text or client-supplied approval bit.
export function resolveApprovedSender(email, approvals) {
  const mailbox = exactMailbox(email.from);
  if (!mailbox) return null;
  const matches = Array.isArray(approvals) ? approvals.filter(a => a.email === mailbox && a.active === true) : [];
  if (matches.length !== 1 || !matches[0].author_key || !matches[0].author_display || !matches[0].contributor_id) return null;
  // Only an independently verified provider adapter may populate this proof. The live
  // Resend response has not proved this contract; headers must never supply the proof.
  const proof = email.authentication;
  if (proof?.dmarc !== 'pass' || proof?.verified_from !== mailbox || proof?.provider_authenticated !== true) return null;
  const { author_key, author_display, contributor_id = null } = matches[0];
  return { author_key, author_display, contributor_id };
}

export const TECHNICAL_TEST_PROVIDER_IDS = Object.freeze([
  '3aff2258-5acb-4c07-99d3-055c19416c0e',
  'fa5374eb-e9ac-41eb-991f-37de0c063af3',
]);

// Hash keys solve dedup independently of attacker-controlled RFC lineage. Legacy
// hydration is allowed only with positive matching provider identity and sender.
export function canHydrateLegacy(row, mailbox, providerId) {
  return row?.from_email === mailbox && row?.meta?.provider_id === providerId &&
    row?.meta?.provider === 'resend' && !row?.meta?.source_email_v1;
}
