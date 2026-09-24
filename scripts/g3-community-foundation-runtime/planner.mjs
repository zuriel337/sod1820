// G3 Community Foundation Runtime v1 — branch-only, dry-run only.
// Owner: research_contribution_law v9 (content) + research_intake_foundation_contract_law v13
// + identity_architecture_law v1 + graph_privacy_foundation_law v1 + truth_axes_foundation_law v3.
// See docs/g3-community-foundation-runtime-v1-branch-notes.md for the DRIFT note on
// research_contribution_law's compaction status and the full schema crosswalk,
// docs/g3-community-core-2029-phase2-1-integrity-fixes-branch-notes.md for the integrity
// repairs applied in Phase 2.1, and
// docs/g3-community-core-2029-phase2-2-source-fidelity-branch-notes.md for the reactions-shape
// and blank-body fixes applied in that pass (task_key=
// G3_COMMUNITY_CORE_2029_PHASE2_2_SOURCE_FIDELITY_V1), and
// docs/g3-community-core-pr636-parent-reconstruction-branch-notes.md for the order-independent
// parent resolution fix applied in this pass (task_key=
// G3_COMMUNITY_CORE_PR636_PARENT_RECONSTRUCTION_V1).
//
// This module only *plans* database operations from OpenWeb-shaped fixture messages.
// It never opens a DB connection and never writes anything — callers decide, in a later,
// separately-authorized phase, whether/how to execute a plan against a real database.

export const OPENWEB_SOURCE_TARGET_TYPE = 'openweb_message';
export const OPENWEB_USER_TARGET_TYPE = 'openweb_user';

const REPLY_INTENT = 'תגובה';
const REPLY_STATE = 'discussion';
const DEFAULT_STATE = 'idea';
// Neutral, already-canonical intent bucket (src/lib/contributions.js INTENTS) for imported,
// non-reply content. Import-time text heuristics ('?' / URL) were found (real-archive dry-run,
// task G3_COMMUNITY_CORE_2029_PHASE2_1_INTEGRITY_FIXES_V1) to silently act as semantic authority
// over one authored message — multi-label question/source/number extraction belongs exclusively
// to classificationSeam.mjs's decision_ledger candidate, never to this field.
const DEFAULT_INTENT = 'תצפית';

// Every research_contributions row with a non-null parent_id is, without exception, a
// plain reply/comment (intent='תגובה', research_state='discussion') in the live app today
// (src/lib/contributions.js, src/lib/seo.js thread/SEO logic depends on this). Breaking
// that invariant on import would corrupt thread counts and DiscussionForumPosting markup,
// so a reply's intent/state is forced, never classified.

// Source-native moderation carry-forward: OpenWeb approved/WordPress publish => historically
// visible; blocked/deleted/hidden => never surfaced; pending => pending. This is a *migration
// visibility carry-forward* of a decision the source already made publicly, reusing the
// existing rc_public_read / community_stream_projection predicate (`status = 'approved'`) so no
// new column/status value is invented — but it is NEVER a research_contribution_law canonical/
// Human-Gate publication decision. `origin: 'openweb'` (set on every row this planner produces)
// is the permanent marker that distinguishes "carried-forward historical visibility" from a
// ZURIEL Human-Gate approval; nothing in this module, classificationSeam.mjs, or the read
// projections may treat an openweb-origin 'approved' row as canonical/validated.
function mapModerationToStatus(moderationState) {
  if (moderationState === 'approved' || moderationState === 'published') return 'approved';
  if (moderationState === 'blocked' || moderationState === 'hidden' || moderationState === 'deleted') return 'hidden';
  if (moderationState === 'pending') return 'pending';
  // Unrecognized/unexpected source state: never assume public visibility.
  return 'pending';
}

// Missing source reaction counts must stay unknown, never fabricated as zero — the real archive
// has 8,934 rows with no likes/dislikes captured at all, distinct from a message that genuinely
// received zero likes/dislikes. `research_contributions.reactions` is `jsonb NOT NULL DEFAULT
// '{}'` (Phase 2.2 integrity fix, task_key=G3_COMMUNITY_CORE_2029_PHASE2_2_SOURCE_FIDELITY_V1):
// a plan that returned JS `null` here would violate that NOT NULL constraint on direct execution,
// so "neither count captured" is represented as `{}` (no likes/dislikes keys at all), never as
// top-level null and never as a fabricated `{likes:0,dislikes:0}`. A consuming Shadow Preview
// must render a numeric count only when a `likes`/`dislikes` key is actually present.
function buildReactions(msg) {
  const hasLikes = msg.likes !== undefined && msg.likes !== null;
  const hasDislikes = msg.dislikes !== undefined && msg.dislikes !== null;
  if (!hasLikes && !hasDislikes) return {};
  return { likes: hasLikes ? msg.likes : null, dislikes: hasDislikes ? msg.dislikes : null };
}

// A blank/whitespace-only source body is not trustworthy authored-empty content — the real
// OpenWeb archive has 3,329 rows with blank/missing text_content (2,912 of them source
// status=approved, 2,605 of those with nonzero reaction activity, image_url absent throughout),
// strongly indicating missing representation/media in the export rather than a genuine empty
// authored message. Phase 2.2 integrity fix (task_key=
// G3_COMMUNITY_CORE_2029_PHASE2_2_SOURCE_FIDELITY_V1).
function isBlankBody(body) {
  return body === undefined || body === null || String(body).trim() === '';
}

function privateDossierSettings(existing) {
  return { ...(existing || {}), visibility: 'private' };
}

// state: {
//   importedMessageIds: Set<string>                 already-linked openweb_message ids (replay guard)
//   linkedOpenwebUserIds: Map<openweb_user_id, uid>  source identities EXPLICITLY claimed in a prior
//                                                    session (via contributors_claim_legacy). Replaying
//                                                    a later batch for the exact same source user id may
//                                                    attribute directly — this is not a new auto-link,
//                                                    it replays a decision a human already made once.
//   contributorsByOpenwebUserId: Map<openweb_user_id, {id, dossier_settings}>
//                                                    already-planned/existing soft contributor rows,
//                                                    keyed by the OpenWeb-native user id — NEVER by
//                                                    email. Two distinct openweb_user_ids that happen to
//                                                    share one verified email remain two source
//                                                    identities and two separate rows.
// }
export function planImport(messages, state) {
  const importedMessageIds = new Set(state.importedMessageIds || []);
  const linkedOpenwebUserIds = state.linkedOpenwebUserIds || new Map();
  const contributorsByOpenwebUserId = new Map(state.contributorsByOpenwebUserId || []);
  const messageIdToPlannedContributionId = new Map();
  const newContributorsByOpenwebUserId = new Map();
  const ops = [];

  // Real-archive dry-run (task_key=G3_COMMUNITY_CORE_PR636_PARENT_RECONSTRUCTION_V1): a real
  // 41,080-row OpenWeb export is not chronologically ordered — 15,839 of 32,116 present parent
  // rows appear LATER in the file than their child. A single forward pass that only registers
  // messageIdToPlannedContributionId as it goes would silently null out every such parent_id
  // purely because of source file order, not because the parent is actually missing. So the
  // batch-wide id map (and which rows are duplicates) is fully predeclared here, BEFORE any
  // parent_id is resolved below, making resolution independent of the messages array's order.
  const isDuplicate = new Array(messages.length);
  const seenInBatch = new Set();
  for (let i = 0; i < messages.length; i++) {
    const message_id = messages[i].message_id;
    if (importedMessageIds.has(message_id) || seenInBatch.has(message_id)) {
      isDuplicate[i] = true;
      continue;
    }
    isDuplicate[i] = false;
    seenInBatch.add(message_id);
    messageIdToPlannedContributionId.set(message_id, `planned:${message_id}`);
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (isDuplicate[i]) {
      // Already imported in a prior batch, or the same batch/message_id seen earlier above —
      // either way still a duplicate, never a second insert.
      ops.push({ op: 'skip_duplicate', message_id: msg.message_id });
      continue;
    }

    const isReply = Boolean(msg.parent_message_id);
    const intent = isReply ? REPLY_INTENT : DEFAULT_INTENT;
    const research_state = isReply ? REPLY_STATE : DEFAULT_STATE;
    const status = mapModerationToStatus(msg.moderation_state);

    const openwebUserId = msg.author_openweb_user_id || null;

    let author_user_id = null;
    let author_contributor_id = null;
    let contributor_op = null;
    let visitor_identity_op = null;
    let identity_link = null;

    if (!openwebUserId) {
      // No user_id, no name, no email on the source row at all: there is no stable identity
      // signal whatsoever. This must remain a genuinely anonymous message — never a one-off
      // contributor row invented per anonymous author (13,330 such rows in the real archive).
    } else if (linkedOpenwebUserIds.has(openwebUserId)) {
      author_user_id = linkedOpenwebUserIds.get(openwebUserId);
    } else {
      const existingContributor =
        contributorsByOpenwebUserId.get(openwebUserId) || newContributorsByOpenwebUserId.get(openwebUserId);
      if (existingContributor) {
        author_contributor_id = existingContributor.id;
      } else {
        // NEVER auto-create an auth.users row from an export email — only a soft, private
        // contributor row, keyed by the source-native user id, that can later be claimed
        // (contributors_claim_legacy) once a real account's *confirmed* email matches. The id is
        // a stable, non-PII placeholder key — the email itself lives only in the contributor
        // row's own `email` field, never in an identifier, and is never used to merge two
        // distinct openweb_user_ids together.
        const plannedId = `planned-contributor:openweb-user:${openwebUserId}`;
        contributor_op = {
          id: plannedId,
          email: msg.author_email || null,
          display_name: msg.author_display_name || null,
          source: 'openweb_import',
          dossier_settings: privateDossierSettings(null),
        };
        newContributorsByOpenwebUserId.set(openwebUserId, contributor_op);
        author_contributor_id = plannedId;
      }
      // Soft identity carrier, reusing the existing `visitor_identity` table rather than a new
      // store: email here is private claim evidence only, never an import-time merge key.
      visitor_identity_op = { visitor: `openweb:${openwebUserId}`, email: msg.author_email || null };
      identity_link = { target_type: OPENWEB_USER_TARGET_TYPE, target_id: openwebUserId, relation_type: 'authored_by_external' };
    }

    // Predeclared above (full batch, before this loop resolves any parent_id) — never set here.
    const contributionId = messageIdToPlannedContributionId.get(msg.message_id);
    const bodyIsBlank = isBlankBody(msg.body);

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
        author_user_id,
        author_contributor_id,
        author_name: author_user_id ? null : msg.author_display_name || null,
        // Never invent placeholder authored text for a blank/whitespace source body: preserve
        // body=null and carry the reason in the provenance note instead. Message/provenance/
        // identity/thread/reactions/moderation all stay intact — only the authored payload is
        // absent. Source `approved` visibility is never downgraded to `hidden` merely to hide an
        // empty projection; the read-seam projections filter display, not this stored row.
        body: bodyIsBlank ? null : msg.body,
        reactions: buildReactions(msg),
        created_at: msg.created_at,
      },
      contributor_op,
      visitor_identity_op,
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
          representation_payload_missing: bodyIsBlank,
        }),
      },
      identity_link: identity_link && { from_contribution_id: contributionId, ...identity_link },
    });
  }

  return ops;
}
