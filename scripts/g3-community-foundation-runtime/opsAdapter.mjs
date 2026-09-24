// G3 Community Core — PR #636 Phase 3 concrete Supabase ops adapter (branch-only, wiring only).
// task_key=G3_COMMUNITY_CORE_PR636_PHASE3_OPS_ADAPTER_V1. See
// docs/g3-community-core-pr636-phase3-ops-adapter-branch-notes.md.
//
// This module wires executor.mjs's `ops` contract (insertContribution, skipDuplicate,
// linkParent, resolveExistingParentId) to the existing canonical tables — research_contributions,
// contribution_links, contributors, visitor_identity. No new table/store. It never opens a real
// connection itself: every function here takes a caller-supplied `client` (a supabase-js-shaped
// query builder — `.from(table).select()/.insert()/.update()/.upsert()`), so a real Phase 3 run
// wires a real service_role client and these tests wire an in-memory fake. This file itself never
// calls a canonical Supabase write API — it only *defines* what such a call would look like.
//
// Idempotency contract: an already-imported openweb_message is resolved via `contribution_links`
// (target_type=OPENWEB_SOURCE_TARGET_TYPE), never by re-inserting and never by a separate
// checkpoint store — the batch state (`resolveImportState`) and per-op replay guard
// (`skipDuplicate`) both read the same provenance rows a real write would have produced.
import { OPENWEB_SOURCE_TARGET_TYPE, OPENWEB_USER_TARGET_TYPE, planImport } from './planner.mjs';
import { runImport } from './executor.mjs';

const CONTRIBUTOR_PLACEHOLDER_PREFIX = 'planned-contributor:openweb-user:';

// Postgres unique_violation. Only code the DB-level provenance guard
// (cl_openweb_message_derived_from_uniq, see the PR #636 final-blockers migration) is expected
// to raise; every other error still throws.
const UNIQUE_VIOLATION = '23505';

function assertNoError(context, error) {
  if (error) throw new Error(`${context}: ${error.message || String(error)}`);
}

// Shared by skipDuplicate/resolveExistingParentId (the pre-write replay guard) and
// insertContribution's post-conflict resolution (the DB-level race guard) — both answer the same
// question, "which contribution, if any, already carries this exact OpenWeb source message?".
async function resolveContributionIdByOpenwebMessage(client, context, sourceMessageId) {
  const { data, error } = await client
    .from('contribution_links')
    .select('from_contribution_id')
    .eq('target_type', OPENWEB_SOURCE_TARGET_TYPE)
    .eq('target_id', sourceMessageId)
    .limit(1)
    .maybeSingle();
  assertNoError(context, error);
  return data ? data.from_contribution_id : null;
}

// A stable, non-PII slug derived from the source-native id only — never from email/display_name,
// so two distinct openweb_user_ids can never collide and a slug never leaks a real identity.
function slugForOpenwebUser(openwebUserId) {
  return `openweb-${String(openwebUserId)}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 64);
}

// ---- Preflight / dry-run state resolution (read-only, never writes) ------------------------
//
// Builds exactly the `state` shape planImport(messages, state) expects, derived entirely from
// existing provenance. Safe to call speculatively — including as the entire "preflight" mode the
// assignment asks for, since it performs every read/resolution planImport needs with zero writes.
export async function resolveImportState(client, messages) {
  // A reply's parent may live in an earlier, already-committed batch and not appear in `messages`
  // at all — its `parent_message_id` must still be checked against contribution_links, or
  // cross-batch linking (planImport's `existing-via:` reference) can never fire.
  const messageIds = new Set();
  for (const m of messages || []) {
    if (m.message_id) messageIds.add(m.message_id);
    if (m.parent_message_id) messageIds.add(m.parent_message_id);
  }
  const openwebUserIds = [...new Set((messages || []).map((m) => m.author_openweb_user_id).filter(Boolean))];

  const importedMessageIds = new Set();
  if (messageIds.size > 0) {
    const { data, error } = await client
      .from('contribution_links')
      .select('target_id')
      .eq('target_type', OPENWEB_SOURCE_TARGET_TYPE)
      .in('target_id', [...messageIds]);
    assertNoError('resolveImportState:contribution_links(message)', error);
    for (const row of data || []) importedMessageIds.add(row.target_id);
  }

  const contributorsByOpenwebUserId = new Map();
  const linkedOpenwebUserIds = new Map();
  if (openwebUserIds.length > 0) {
    const { data: links, error: linksError } = await client
      .from('contribution_links')
      .select('target_id, from_contribution_id')
      .eq('target_type', OPENWEB_USER_TARGET_TYPE)
      .in('target_id', openwebUserIds);
    assertNoError('resolveImportState:contribution_links(user)', linksError);

    const contributionIds = [...new Set((links || []).map((l) => l.from_contribution_id))];
    let contributionsById = new Map();
    if (contributionIds.length > 0) {
      const { data: contributions, error: contribError } = await client
        .from('research_contributions')
        .select('id, author_user_id, author_contributor_id')
        .in('id', contributionIds);
      assertNoError('resolveImportState:research_contributions', contribError);
      contributionsById = new Map((contributions || []).map((c) => [c.id, c]));
    }

    const contributorIds = [...new Set(
      [...contributionsById.values()].map((c) => c.author_contributor_id).filter(Boolean)
    )];
    let contributorsById = new Map();
    if (contributorIds.length > 0) {
      const { data: contributors, error: contributorsError } = await client
        .from('contributors')
        .select('id, dossier_settings')
        .in('id', contributorIds);
      assertNoError('resolveImportState:contributors', contributorsError);
      contributorsById = new Map((contributors || []).map((c) => [c.id, c]));
    }

    for (const link of links || []) {
      const contribution = contributionsById.get(link.from_contribution_id);
      if (!contribution) continue;
      if (contribution.author_user_id) {
        // A prior session already ran contributors_claim_legacy for this exact source identity —
        // replay that Human-Gate-adjacent decision, never re-derive or second-guess it here.
        linkedOpenwebUserIds.set(link.target_id, contribution.author_user_id);
      } else if (contribution.author_contributor_id && !contributorsByOpenwebUserId.has(link.target_id)) {
        const contributor = contributorsById.get(contribution.author_contributor_id);
        contributorsByOpenwebUserId.set(link.target_id, {
          id: contribution.author_contributor_id,
          dossier_settings: contributor ? contributor.dossier_settings : null,
        });
      }
    }
  }

  return { importedMessageIds, linkedOpenwebUserIds, contributorsByOpenwebUserId };
}

// Read-only preflight: resolves state, plans, but performs no writes at all — identical to
// `runImport(messages, state, {execute:false})`, offered here so a caller never has to construct
// `state` by hand to preview a batch.
export async function preflightImport(client, messages) {
  const state = await resolveImportState(client, messages);
  return { state, plan: planImport(messages, state) };
}

// ---- Real ops implementation (executor.mjs's `ops` contract) -------------------------------
//
// Returned functions are only ever invoked by executor.mjs's `runImport(..., {execute:true, ...})`
// — never called directly by this module, and never called at all unless a caller passes
// execute:true + the exact confirmation phrase + this adapter, per executor.mjs's own triple gate.
export function createSupabaseOps(client) {
  return {
    async insertContribution(op) {
      let author_contributor_id = op.contribution.author_contributor_id;

      // planImport only ever proposes a *new* contributor when it hands this op a placeholder id
      // of its own minting; a real, already-resolved uuid (state.contributorsByOpenwebUserId) must
      // never be re-inserted here.
      const isNewContributor =
        op.contributor_op && author_contributor_id === op.contributor_op.id &&
        String(author_contributor_id).startsWith(CONTRIBUTOR_PLACEHOLDER_PREFIX);

      if (isNewContributor) {
        const openwebUserId = op.identity_link ? op.identity_link.target_id : author_contributor_id;
        const { data, error } = await client
          .from('contributors')
          .insert({
            slug: slugForOpenwebUser(openwebUserId),
            display_name: op.contributor_op.display_name || 'OpenWeb Contributor',
            kind: 'external',
            email: op.contributor_op.email,
            source: op.contributor_op.source,
            // Already forced private by planImport; never widened here.
            dossier_settings: op.contributor_op.dossier_settings,
          })
          .select('id')
          .single();
        assertNoError('insertContribution:contributors', error);
        author_contributor_id = data.id;
      }

      if (op.visitor_identity_op) {
        const { error } = await client.from('visitor_identity').upsert(
          {
            visitor: op.visitor_identity_op.visitor,
            email: op.visitor_identity_op.email,
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'visitor' }
        );
        assertNoError('insertContribution:visitor_identity', error);
      }

      // op.contribution.id is planImport's own in-batch placeholder (e.g. `planned:<message_id>`),
      // never a real row id — the live table generates its own uuid, so it must never be passed
      // through to the insert (a real Postgres uuid column would reject the placeholder outright).
      const { id: _plannedId, ...contributionFields } = op.contribution;
      const { data: contribution, error: contribError } = await client
        .from('research_contributions')
        .insert({ ...contributionFields, author_contributor_id, parent_id: null })
        .select('id')
        .single();
      assertNoError('insertContribution:research_contributions', contribError);

      // contribution_links is public-readable (live_facts) — provenance_link's note comes
      // straight from planImport (url/moderation/parent_message_id/representation_payload_missing)
      // and identity_link's target_id is the opaque source-native openweb_user_id; neither ever
      // carries email/PII, and this adapter never adds any.
      if (op.provenance_link) {
        const { error } = await client.from('contribution_links').insert({
          from_contribution_id: contribution.id,
          target_type: op.provenance_link.target_type,
          target_id: op.provenance_link.target_id,
          relation_type: op.provenance_link.relation_type,
          note: op.provenance_link.note,
        });
        if (
          error &&
          error.code === UNIQUE_VIOLATION &&
          op.provenance_link.target_type === OPENWEB_SOURCE_TARGET_TYPE
        ) {
          // Lost a race: some other writer's contribution_links row for this exact source
          // message committed between our pre-write resolveImportState()/skipDuplicate() check
          // and this insert, and cl_openweb_message_derived_from_uniq (partial unique index,
          // see the PR #636 final-blockers migration) just caught the duplicate this adapter
          // was about to create. Back out the research_contributions row this call already
          // inserted — never leave an orphaned, unlinked duplicate authored item behind — and
          // resolve to whichever contribution actually won the race, exactly like skipDuplicate.
          const { error: rollbackError } = await client
            .from('research_contributions')
            .delete()
            .eq('id', contribution.id);
          assertNoError('insertContribution:rollback(research_contributions)', rollbackError);
          const existingId = await resolveContributionIdByOpenwebMessage(
            client,
            'insertContribution:resolveAfterConflict',
            op.provenance_link.target_id
          );
          return { id: existingId, skipped: true };
        }
        assertNoError('insertContribution:contribution_links(provenance)', error);
      }

      if (op.identity_link) {
        const { error } = await client.from('contribution_links').insert({
          from_contribution_id: contribution.id,
          target_type: op.identity_link.target_type,
          target_id: op.identity_link.target_id,
          relation_type: op.identity_link.relation_type,
        });
        assertNoError('insertContribution:contribution_links(identity)', error);
      }

      return { id: contribution.id };
    },

    async skipDuplicate(op) {
      // Replaying an already-imported message_id resolves and returns the existing contribution
      // rather than inserting a duplicate — never a second research_contributions row.
      const existingId = await resolveContributionIdByOpenwebMessage(
        client,
        'skipDuplicate:contribution_links',
        op.message_id
      );
      return { skipped: true, existing_contribution_id: existingId };
    },

    async linkParent({ contribution_id, parent_id }) {
      const { error } = await client
        .from('research_contributions')
        .update({ parent_id })
        .eq('id', contribution_id);
      assertNoError('linkParent:research_contributions', error);
      return { linked: true };
    },

    async resolveExistingParentId(parentMessageId) {
      return resolveContributionIdByOpenwebMessage(
        client,
        'resolveExistingParentId:contribution_links',
        parentMessageId
      );
    },
  };
}

// ---- Cross-batch dependency-safe ordering ----------------------------------------------------
//
// `runBoundedImport` used to slice `messages` into batches in raw input order. `planImport`
// (planner.mjs) already resolves a parent within one batch order-independently, but it can only
// see the batch it's given — a parent that lands in a *later* batch than its child has not been
// imported yet at the moment the child's batch runs, so `parent_id` resolves to `null` and,
// because no later batch ever revisits an earlier batch's rows, stays `null` forever. Real-corpus
// rehearsal (task_key=G3_COMMUNITY_CORE_PR636_CROSS_BATCH_PARENT_ORDER_V1) found this would drop
// 9,583 of 32,116 present parent refs at the default batchSize=500 — not because those parents
// are missing, but purely because of raw CSV order relative to the batch boundary.
//
// This reorders `messages` (pure — only output position changes; every row's own fields,
// including `created_at`, are passed through untouched, so import execution order stays purely
// operational and never rewrites chronology) so every parent that is present in `messages` is
// placed no later than its child, via a stable topological sort: Kahn's algorithm, always
// expanding the ready row with the smallest original index next, so the fix moves only the rows
// that actually need moving and leaves everything else in its original relative order. A parent
// referenced by `parent_message_id` that does not appear anywhere in `messages` is not an
// ordering concern at all — that dependency is resolved (or, if genuinely absent, left `null`)
// by `resolveImportState`/`planImport` against already-committed `contribution_links`, exactly as
// before. A cyclic or otherwise unsatisfiable dependency (including a row whose
// `parent_message_id` is its own `message_id`) fails closed — it throws rather than silently
// dropping the link or guessing an order.
class MinIndexHeap {
  constructor() {
    this._heap = [];
  }
  get size() {
    return this._heap.length;
  }
  push(index) {
    const heap = this._heap;
    heap.push(index);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent] <= heap[i]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  }
  pop() {
    const heap = this._heap;
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < heap.length && heap[left] < heap[smallest]) smallest = left;
        if (right < heap.length && heap[right] < heap[smallest]) smallest = right;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return top;
  }
}

export function orderMessagesForBoundedImport(messages) {
  const n = messages.length;

  // Only the first occurrence of a given message_id can ever become the real inserted row
  // (planImport's own within-batch dedup mirrors this) — later duplicate rows depend on nothing
  // and nothing depends on them.
  const idToFirstIndex = new Map();
  for (let i = 0; i < n; i++) {
    const id = messages[i].message_id;
    if (id != null && !idToFirstIndex.has(id)) idToFirstIndex.set(id, i);
  }

  const childrenOf = new Map(); // parent row index -> dependent row indices
  const indegree = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const parentId = messages[i].parent_message_id;
    if (parentId == null) continue;
    const parentIndex = idToFirstIndex.get(parentId);
    if (parentIndex === undefined) continue; // parent not present in this message set at all
    if (!childrenOf.has(parentIndex)) childrenOf.set(parentIndex, []);
    childrenOf.get(parentIndex).push(i);
    indegree[i] += 1;
  }

  const ready = new MinIndexHeap();
  for (let i = 0; i < n; i++) if (indegree[i] === 0) ready.push(i);

  const orderedIndices = [];
  while (ready.size > 0) {
    const i = ready.pop();
    orderedIndices.push(i);
    for (const child of childrenOf.get(i) || []) {
      indegree[child] -= 1;
      if (indegree[child] === 0) ready.push(child);
    }
  }

  if (orderedIndices.length !== n) {
    const placed = new Set(orderedIndices);
    const unresolved = [];
    for (let i = 0; i < n; i++) if (!placed.has(i)) unresolved.push(messages[i].message_id);
    throw new Error(
      `orderMessagesForBoundedImport: invalid dependency graph — cyclic or unsatisfiable ` +
        `parent_message_id reference(s) among message_id(s): ${unresolved.join(', ')}`
    );
  }

  return orderedIndices.map((i) => messages[i]);
}

// ---- Bounded, resumable batch execution ------------------------------------------------------
//
// Transactional-execution design for a future authorized run: 41,080 rows in one DB transaction
// is unsafe/too large, so this splits into fixed-size batches and, crucially, never invents a
// separate checkpoint store — `resolveImportState` re-derives "already imported" from
// `contribution_links` before *every* batch, including the first retry of a batch that partially
// completed. That makes resuming after a crash, a timeout, or an explicit stop identical to
// running from scratch: rows already committed are seen as duplicates and skipped; rows never
// committed are (re)planned and (re)inserted. A batch that finishes with any `linkFailures` halts
// the run before starting the next batch — the caller must reconcile those links (they are
// captured in `batches[i].linkFailures`) before resuming forward; this function is safe to call
// again afterward with the same `messages` array, from the beginning, with no other bookkeeping.
//
// Before batching, `messages` is passed through `orderMessagesForBoundedImport` so a parent that
// appears later in raw input order is never split into a later batch than its child (see that
// function's header) — batch *contents* still follow this dependency-safe order, only the split
// points move; nothing about a row's own stored data changes.
export async function runBoundedImport(client, messages, { batchSize = 500, execute = false, confirm = null } = {}) {
  const ops = execute ? createSupabaseOps(client) : null;
  const orderedMessages = orderMessagesForBoundedImport(messages);
  const batches = [];
  for (let i = 0; i < orderedMessages.length; i += batchSize) batches.push(orderedMessages.slice(i, i + batchSize));

  const batchResults = [];
  for (const batch of batches) {
    const state = await resolveImportState(client, batch);
    const result = await runImport(batch, state, { execute, confirm, ops });
    batchResults.push(result);
    if (execute && result.linkFailures && result.linkFailures.length > 0) {
      break;
    }
  }

  return {
    batches: batchResults,
    completed: batchResults.length === batches.length && batchResults.every((b) => !execute || b.completed),
  };
}
