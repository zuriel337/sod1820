-- G3 Community Core — PR #636 final-challenge blocker: DB-level OpenWeb message provenance
-- idempotency (BRANCH-ONLY, NOT APPLIED LIVE).
-- Assignment work_log.id=a5b4b457-d6ec-420a-97a4-30b49e0720bf, task_key=
-- G3_COMMUNITY_CORE_PR636_FINAL_BLOCKERS_FIX_V1, release_authorization_state=
-- BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_OPENWEB_TOUCH_NO_MERGE_NO_DEPLOY_NO_CUTOVER.
--
-- Do NOT run this migration against the live project (linswmnnkjxvweumprav) from this branch.
-- It is committed for review/Phase-3 human gate only.
--
-- EXTEND_EXISTING: adds a safety net on top of the existing `contribution_links` provenance
-- table (research_contribution_law content baseline) rather than a new source-message table or
-- column. resolveImportState()/skipDuplicate() in scripts/g3-community-foundation-runtime/
-- opsAdapter.mjs already treat a pre-existing `contribution_links` row
-- (target_type='openweb_message', relation_type='derived_from', target_id=<source message id>)
-- as "already imported" and skip it, but that is an application-level, read-before-write check:
-- two concurrent import batches (or a retried batch racing a still-in-flight one) can both pass
-- that check for the same source message before either has written its link row, and both then
-- insert a duplicate `research_contributions` row for the exact same OpenWeb message. This
-- partial unique index makes that outcome a database-level constraint violation instead of a
-- silently duplicated authored item — the application-layer replay guard remains the fast path,
-- this index is the last line of defense for the race it cannot close.
--
-- Scoped to exactly the one (target_type, relation_type) pair PR #636's OpenWeb import uses
-- (`OPENWEB_SOURCE_TARGET_TYPE` / 'derived_from' in planner.mjs), via a partial index, so it
-- never constrains any other contribution_links relation_type/target_type combination (e.g.
-- 'openweb_user'/'authored_by_external' identity links, or unrelated graph-privacy links).
create unique index if not exists cl_openweb_message_derived_from_uniq
  on public.contribution_links (target_type, target_id, relation_type)
  where target_type = 'openweb_message' and relation_type = 'derived_from';

comment on index public.cl_openweb_message_derived_from_uniq is
  'G3 Community Core PR #636 — DB-level replay guard: a given OpenWeb source message id may be '
  'linked via contribution_links(target_type=openweb_message, relation_type=derived_from) at '
  'most once. Backs the ON CONFLICT-safe resolution in '
  'scripts/g3-community-foundation-runtime/opsAdapter.mjs createSupabaseOps().insertContribution. '
  'BRANCH-ONLY, not applied live.';
