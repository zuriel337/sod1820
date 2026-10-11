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
  for (const line of lines) {
    // Conservative quote/signature boundaries. Keep the untouched original privately.
    if (/^\s*(?:On .+wrote:|בתאריך .+(?:כתב|כתבה)|ב[-־].+(?:כתב|כתבה):|[-_]{2,}\s*(?:Original Message|Forwarded message|הודעה מקורית)|--\s*$)/i.test(line)) {
      quoted = true; break;
    }
    if (/^\s*>/.test(line)) { quoted = true; continue; }
    if (/^\s*(?:From|To|Cc|Bcc|Reply-To|Date|Sent|מאת|אל|עותק|נשלח):/i.test(line)) continue;
    output.push(line);
  }
  const text = output.join('\n')
    .replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[דוא״ל]')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, '[קישור]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[מספר]')
    .replace(/\n{3,}/g, '\n\n').trim();
  return { text, quoted_omitted: quoted };
}

export async function normalizeReceivedEmail(email, { provider = 'resend', providerId, receivedAt } = {}) {
  if (!['resend', 'gmail'].includes(provider) || !providerId) throw new Error('missing_provider_identity');
  const rawText = String(email.text || '');
  const rawHtml = String(email.html || '');
  // Reject oversize input explicitly; do not truncate a source silently.
  if (new TextEncoder().encode(rawText + rawHtml).byteLength > 2_000_000) throw new Error('source_too_large');
  const id = messageId(email.message_id || header(email.headers, 'message-id'));
  const parent = messageId(header(email.headers, 'in-reply-to'));
  const refs = (header(email.headers, 'references').match(/<[^<>]+>/g) || []).map(messageId).filter(Boolean);
  const stableId = `mail_${await opaqueId(id || `${provider}:${providerId}`)}`;
  const clean = cleanSourceText(rawText);
  // HTML-only mail remains preserved, but must not be regex-converted into public source text.
  const at = Date.parse(header(email.headers, 'date'));
  const attachments = Array.isArray(email.attachments) ? email.attachments : [];
  return {
    id: stableId,
    message_id: id,
    parent_id: parent ? `mail_${await opaqueId(parent)}` : null,
    reference_ids: await Promise.all(refs.map(async ref => `mail_${await opaqueId(ref)}`)),
    provider, provider_id: String(providerId),
    source_published_at: Number.isFinite(at) ? new Date(at).toISOString() : null,
    arrival_at: receivedAt,
    full_text: clean.text,
    quoted_omitted: clean.quoted_omitted,
    text_state: rawText.trim() ? 'available' : rawHtml ? 'html_only_unavailable' : 'empty',
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
  if (matches.length !== 1 || !matches[0].author_key || !matches[0].author_display) return null;
  if (email.authentication?.dmarc !== 'pass') return null;
  const { author_key, author_display, contributor_id = null } = matches[0];
  return { author_key, author_display, contributor_id };
}
