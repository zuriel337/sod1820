// mailIntake — pure decision layer: one received email -> at most one HELD channel_updates row + one mail-proof row.
// Task MAIL_INTAKE_ZION_20261105. Builds on the ported sourceEmail.mjs (draft PR #1089 provenance).
//
// Contract (ZURIEL decisions, 2026-11-05):
//  * No IO, no model calls, no actions. Everything in `email` is untrusted source data.
//  * Admission needs ALL of: provider=resend, exact sender mailbox on the server-owned approvals list (active),
//    exactly one contributor identity for that mailbox, and Resend-native DKIM+DMARC pass (From-aligned).
//  * Result is HELD only: status 'private' (cu_public_read exposes status='live' only), group_source_intake_public=false.
//    This layer never publishes, canonicalizes, or marks anything verified.
//  * Original text is the sender's own words only. Quoted older messages are omitted from the row (the untouched
//    original stays in inbound_emails) and are never credited to the latest sender. No AI text is produced here.
//  * Thread links come only from In-Reply-To/References headers. A missing parent is recorded as 'parent_missing'.
import { normalizeReceivedEmail, providerSenderProof, exactMailbox, opaqueId } from './sourceEmail.mjs';

export const MAIL_INTAKE_VERSION = 'mail-intake-zion-v1';
export const MAIL_INTAKE_CHANNEL = 'torat-haremez';
export const MAIL_INTAKE_MAX_TEXT = 20000;

const skip = (reason, extra = {}) => ({ action: 'skip', reason, ...extra });

/**
 * @param {object} input
 * @param {object} input.email            Resend GET /emails/receiving/:id object (incl. `authentication`)
 * @param {{provider:string, providerId:string}} input.providerContext
 * @param {string} [input.receivedAt]
 * @param {Array<{email:string, active:boolean, author_key:string, author_display:string, contributor_id:string}>} input.approvals
 * @param {Array<{id:string}>} input.contributorMatches   contributors whose email equals the sender mailbox
 * @param {Set<string>} [input.knownExtIds]               channel_updates.ext_msg_id already present
 * @param {Set<string>} [input.knownMessageIds]           mail proof message_id already present
 * @param {Set<string>} [input.knownParentExtIds]         ext_msg_id of mail updates that can be thread parents
 */
export async function planMailIntake(input) {
  const { email, providerContext, receivedAt, approvals, contributorMatches } = input;
  const knownExtIds = input.knownExtIds || new Set();
  const knownMessageIds = input.knownMessageIds || new Set();
  const knownParentExtIds = input.knownParentExtIds || new Set();

  if (providerContext?.provider !== 'resend' || !providerContext?.providerId) return skip('provider_not_supported');
  const mailbox = exactMailbox(email?.from);
  if (!mailbox) return skip('sender_unparseable');

  // Server-owned approval list only. To/Cc membership, display name and body text never admit a sender.
  const approved = (Array.isArray(approvals) ? approvals : []).filter(a => a.email === mailbox && a.active === true);
  if (approved.length === 0) return skip('sender_not_approved');
  if (approved.length > 1) return skip('ambiguous_identity');
  const approval = approved[0];
  if (!approval.contributor_id || !approval.author_key || !approval.author_display) return skip('approval_incomplete');

  // One mailbox must resolve to exactly the approved contributor. Two accounts sharing a mailbox stay unverified.
  const matches = Array.isArray(contributorMatches) ? contributorMatches : [];
  if (matches.length !== 1 || matches[0].id !== approval.contributor_id) return skip('ambiguous_identity');

  const proof = providerSenderProof(email, providerContext);
  if (!proof) return skip('no_sender_proof');

  const n = await normalizeReceivedEmail(email, { ...providerContext, receivedAt });
  if (n.text_state !== 'available') return skip('no_text', { text_state: n.text_state });
  if (!n.message_id) return skip('no_message_id');
  if (knownExtIds.has(n.id) || knownMessageIds.has(n.message_id)) return skip('duplicate', { ext_msg_id: n.id });

  const truncated = n.full_text.length > MAIL_INTAKE_MAX_TEXT;
  const text = truncated ? n.full_text.slice(0, MAIL_INTAKE_MAX_TEXT) : n.full_text;

  let threadState = 'root';
  if (n.parent_id) threadState = knownParentExtIds.has(n.parent_id) ? 'parent_present' : 'parent_missing';
  const threadKey = n.reference_ids[0] || n.parent_id || n.id;

  return {
    action: 'hold',
    reason: 'approved_sender_native_proof',
    update: {
      channel: MAIL_INTAKE_CHANNEL,
      text,
      credit: approval.author_display,
      contributor_id: approval.contributor_id,
      source: 'email',
      status: 'private',
      priority: 50,
      ext_msg_id: n.id,
      group_source_intake_public: false,
      created_at: n.source_published_at || n.arrival_at || null,
    },
    mail_proof: {
      message_id: n.message_id,
      parent_ext_msg_id: n.parent_id,
      parent_basis: n.parent_basis,
      thread_key: threadKey,
      thread_state: threadState,
      identity_contributor_id: approval.contributor_id,
      identity_basis: 'verified_email_unique',
      provider: proof.provider,
      provider_id: proof.provider_id,
      dkim: proof.dkim,
      dmarc: proof.dmarc,
      // Only a hash of the sender mailbox is stored in the proof; the address stays in the private inbox.
      sender_mailbox_sha256: await opaqueId(mailbox),
      original_text_sha256: await opaqueId(String(email.text || '')),
      text_kind: 'original_cleaned',
      quoted_omitted: n.quoted_omitted,
      text_truncated: truncated,
      sanitizer_version: n.sanitizer_version,
      image_refs: n.images.length,
      intake_version: MAIL_INTAKE_VERSION,
    },
  };
}
