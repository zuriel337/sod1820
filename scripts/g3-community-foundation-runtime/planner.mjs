// G3 Community Foundation Runtime v1 — branch-only, dry-run only.
// Owner: research_contribution_law v9 (content) + research_intake_foundation_contract_law v13
// + identity_architecture_law v1 + graph_privacy_foundation_law v1 + truth_axes_foundation_law v3.
// See docs/g3-community-foundation-runtime-v1-branch-notes.md for the DRIFT note on
// research_contribution_law's compaction status and the full schema crosswalk.
//
// This module only *plans* database operations from OpenWeb-shaped fixture messages.
// It never opens a DB connection and never writes anything — callers decide, in a later,
// separately-authorized phase, whether/how to execute a plan against a real database.

export const OPENWEB_SOURCE_TARGET_TYPE = 'openweb_message';

const REPLY_INTENT = 'תגובה';
const REPLY_STATE = 'discussion';
const DEFAULT_STATE = 'idea';

// Every research_contributions row with a non-null parent_id is, without exception, a
// plain reply/comment (intent='תגובה', research_state='discussion') in the live app today
// (src/lib/contributions.js, src/lib/seo.js thread/SEO logic depends on this). Breaking
// that invariant on import would corrupt thread counts and DiscussionForumPosting markup,
// so a reply's intent/state is forced, never classified.
function classifyIntent(body) {
  const text = String(body || '');
  if (/\?\s*$/.test(text.trim())) return 'שאלה';
  if (/https?:\/\//.test(text)) return 'מקור';
  return REPLY_INTENT;
}

function mapModerationToStatus(moderationState) {
  if (moderationState === 'deleted') return 'hidden';
  if (moderationState === 'hidden') return 'hidden';
  // Published/pending legacy content still lands pending: an importer is automation, never
  // ZURIEL, and automation must not write a decision_ledger-equivalent approval on his behalf.
  return 'pending';
}

function privateDossierSettings(existing) {
  return { ...(existing || {}), visibility: 'private' };
}

// state: {
//   importedMessageIds: Set<string>            already-linked openweb_message ids (replay guard)
//   usersByVerifiedEmail: Map<email, userId>    simulated auth.users verified-email index
//   contributorsByEmail: Map<email, {id, dossier_settings}>  simulated existing contributors
// }
export function planImport(messages, state) {
  const importedMessageIds = new Set(state.importedMessageIds || []);
  const usersByVerifiedEmail = state.usersByVerifiedEmail || new Map();
  const contributorsByEmail = new Map(state.contributorsByEmail || []);
  const messageIdToPlannedContributionId = new Map();
  const newContributorsByEmail = new Map();
  const ops = [];

  for (const msg of messages) {
    if (importedMessageIds.has(msg.message_id)) {
      ops.push({ op: 'skip_duplicate', message_id: msg.message_id });
      continue;
    }
    if (messageIdToPlannedContributionId.has(msg.message_id)) {
      // Same batch, same message_id twice — still a duplicate, never a second insert.
      ops.push({ op: 'skip_duplicate', message_id: msg.message_id });
      continue;
    }

    const isReply = Boolean(msg.parent_message_id);
    const intent = isReply ? REPLY_INTENT : classifyIntent(msg.body);
    const research_state = isReply ? REPLY_STATE : DEFAULT_STATE;
    const status = mapModerationToStatus(msg.moderation_state);

    let identity;
    const email = msg.author_email || null;
    if (email && msg.author_email_verified && usersByVerifiedEmail.has(email)) {
      identity = { kind: 'linked_user', author_user_id: usersByVerifiedEmail.get(email), author_contributor_id: null };
    } else {
      // Without an email there is no stable identity signal at all: each such message
      // must plan its own contributor rather than being silently merged with any other
      // no-email author (an empty string/null key must never double as "same person").
      const existingContributor = email ? contributorsByEmail.get(email) || newContributorsByEmail.get(email) : null;
      if (existingContributor) {
        identity = { kind: 'legacy_contributor', author_user_id: null, author_contributor_id: existingContributor.id, contributor_op: null };
      } else {
        // NEVER auto-create an auth.users row from an export email — only a soft,
        // private contributors row that can later be claimed on registration. The id
        // is a stable, non-PII placeholder key — the email itself lives only in the
        // contributor row's own `email` field, never in an identifier.
        const plannedId = `planned-contributor:${email ? `msg:${msg.message_id}` : `no-email:${msg.message_id}`}`;
        const contributor = {
          id: plannedId,
          email: email || null,
          display_name: msg.author_display_name || null,
          source: 'openweb_import',
          dossier_settings: privateDossierSettings(null),
        };
        if (email) newContributorsByEmail.set(email, contributor);
        identity = { kind: 'legacy_contributor', author_user_id: null, author_contributor_id: plannedId, contributor_op: contributor };
      }
    }

    const contributionId = `planned:${msg.message_id}`;
    messageIdToPlannedContributionId.set(msg.message_id, contributionId);

    let parent_id = null;
    if (isReply) {
      parent_id =
        messageIdToPlannedContributionId.get(msg.parent_message_id) ||
        (importedMessageIds.has(msg.parent_message_id) ? `existing-via:${msg.parent_message_id}` : null);
    }

    ops.push({
      op: 'insert_contribution',
      message_id: msg.message_id,
      contribution: {
        id: contributionId,
        intent,
        origin: 'openweb',
        research_state,
        status,
        parent_id,
        author_user_id: identity.author_user_id,
        author_contributor_id: identity.author_contributor_id,
        author_name: identity.kind === 'linked_user' ? null : msg.author_display_name || null,
        body: msg.body,
        reactions: { likes: msg.likes || 0, dislikes: msg.dislikes || 0 },
        created_at: msg.created_at,
      },
      contributor_op: identity.contributor_op || null,
      provenance_link: {
        from_contribution_id: contributionId,
        target_type: OPENWEB_SOURCE_TARGET_TYPE,
        target_id: msg.message_id,
        relation_type: 'derived_from',
        note: JSON.stringify({
          url: msg.url,
          url_kind: msg.url_kind,
          original_moderation_state: msg.moderation_state,
          parent_message_id: msg.parent_message_id || null,
        }),
      },
    });
  }

  return ops;
}
