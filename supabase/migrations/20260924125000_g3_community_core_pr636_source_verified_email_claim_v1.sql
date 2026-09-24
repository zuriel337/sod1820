-- G3 Community Core — PR #636 source-verified email claim evidence (BRANCH-ONLY, NOT APPLIED LIVE).
-- work_log.id=fac0eef7-2a08-42b1-bb72-c0286e51b7af, task_key=
-- G3_COMMUNITY_CORE_PR636_SOURCE_VERIFIED_EMAIL_CLAIM_V1, release_authorization_state=
-- BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_MERGE_NO_DEPLOY_NO_CUTOVER.
--
-- Do NOT run this migration against the live project (linswmnnkjxvweumprav) from this branch.
-- It is committed for review/Phase-3 human gate only.
--
-- Closes the identity-claim evidence gap the assignment identified: unverified OpenWeb export
-- email previously flowed into contributors.email/visitor_identity.email unconditionally
-- (scripts/g3-community-foundation-runtime/planner.mjs), where it could later satisfy
-- contributors_claim_legacy's exact-email match just as easily as a genuinely source-verified
-- one. planner.mjs's sourceVerifiedEmail() now gates every email this planner emits on
-- `msg.author_email_verified === true`; this migration is the matching RPC-side enforcement for
-- the one case a pure planner mutation can't reach on its own: promoting an *already-committed*
-- contributor (from a prior batch/session) whose email is still null once a later row supplies
-- source-verified evidence for the same openweb_user_id.
--
-- EXTEND_EXISTING: adds one new optional parameter (default false, so any other caller of the
-- existing 23-arg signature is unaffected) to g3_openweb_import_message
-- (20260924103000_g3_community_core_pr636_atomic_message_import_v1.sql) and one guarded UPDATE
-- inside that same function body. No new table/store/RPC.
--
-- CREATE OR REPLACE cannot append a parameter to an existing function signature, so the prior
-- 23-arg overload is dropped first and recreated here with p_promote_contributor_email appended.
drop function if exists public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text
);

create or replace function public.g3_openweb_import_message(
  p_create_contributor boolean,
  p_contributor_slug text,
  p_contributor_display_name text,
  p_contributor_email text,
  p_contributor_source text,
  p_contributor_dossier_settings jsonb,
  p_author_contributor_id uuid,
  p_author_user_id uuid,
  p_author_name text,
  p_intent text,
  p_origin text,
  p_research_state text,
  p_status text,
  p_body text,
  p_reactions jsonb,
  p_created_at timestamptz,
  p_visitor text,
  p_visitor_email text,
  p_provenance_target_id text,
  p_provenance_relation_type text,
  p_provenance_note text,
  p_identity_target_id text,
  p_identity_relation_type text,
  p_promote_contributor_email boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_contributor_id uuid := p_author_contributor_id;
  v_contribution_id uuid;
begin
  if p_provenance_target_id is null or btrim(p_provenance_target_id) = '' then
    raise exception 'g3_openweb_import_message: p_provenance_target_id is required';
  end if;

  -- Only ever inserts a *new* contributor when the caller has already resolved (in JS, from
  -- planImport's own placeholder-id convention) that no existing contributor/linked user covers
  -- this openweb_user_id — mirrors the prior isNewContributor guard in opsAdapter.mjs exactly,
  -- just moved inside the same atomic unit as everything else.
  if p_create_contributor then
    insert into public.contributors (slug, display_name, kind, email, source, dossier_settings)
    values (
      p_contributor_slug,
      coalesce(p_contributor_display_name, 'OpenWeb Contributor'),
      'external',
      p_contributor_email,
      p_contributor_source,
      coalesce(p_contributor_dossier_settings, '{}'::jsonb)
    )
    returning id into v_contributor_id;
  elsif p_promote_contributor_email and p_author_contributor_id is not null then
    -- Source-verified-email claim evidence gate (task_key=
    -- G3_COMMUNITY_CORE_PR636_SOURCE_VERIFIED_EMAIL_CLAIM_V1): planImport only ever sets
    -- p_promote_contributor_email when this openweb_user_id's contributor already exists and,
    -- per its own read of state.contributorsByOpenwebUserId, had no email on file yet. The
    -- `email is null` guard here is the DB-level backstop for that same invariant — it never
    -- overwrites/downgrades an email a prior verified row (or a manual relink) already set,
    -- even under concurrent writers, and it never touches a different contributor row.
    update public.contributors
       set email = p_contributor_email
     where id = p_author_contributor_id
       and email is null;
  end if;

  if p_visitor is not null then
    -- COALESCE on the update side, not a blind overwrite: an unverified/missing row's null
    -- p_visitor_email must never erase an email a prior source-verified row for this same
    -- visitor already stored (planner.mjs sourceVerifiedEmail already guarantees p_visitor_email
    -- itself is never an unverified email — this is the "never downgrade" half of that contract).
    insert into public.visitor_identity (visitor, email, last_seen)
    values (p_visitor, p_visitor_email, now())
    on conflict (visitor) do update
      set email = coalesce(excluded.email, public.visitor_identity.email),
          last_seen = now();
  end if;

  -- parent_id is always inserted null here — two-phase insert/link (executor.mjs) always forces
  -- it null before calling this op and applies the real, already-existing parent id afterward via
  -- a separate single-table linkParent() update, never through this function.
  insert into public.research_contributions
    (intent, origin, research_state, status, parent_id, author_user_id, author_contributor_id,
     author_name, body, reactions, created_at)
  values
    (p_intent, p_origin, p_research_state, p_status, null, p_author_user_id, v_contributor_id,
     p_author_name, p_body, coalesce(p_reactions, '{}'::jsonb), p_created_at)
  returning id into v_contribution_id;

  -- Uncaught unique_violation here (cl_openweb_message_derived_from_uniq) aborts the whole
  -- function — including the contributor/visitor_identity/research_contributions writes above —
  -- per this function's header. Never caught/resolved in SQL: the caller resolves the race.
  insert into public.contribution_links (from_contribution_id, target_type, target_id, relation_type, note)
  values (v_contribution_id, 'openweb_message', p_provenance_target_id, p_provenance_relation_type, p_provenance_note);

  if p_identity_target_id is not null then
    insert into public.contribution_links (from_contribution_id, target_type, target_id, relation_type)
    values (v_contribution_id, 'openweb_user', p_identity_target_id, p_identity_relation_type);
  end if;

  return jsonb_build_object('id', v_contribution_id, 'contributor_id', v_contributor_id);
end;
$$;

comment on function public.g3_openweb_import_message is
  'G3 Community Core PR #636 — atomic per-message OpenWeb import. Resolves/creates soft '
  'contributor if needed, upserts visitor_identity if needed, inserts research_contributions, '
  'inserts openweb_message provenance and openweb_user identity contribution_links — all in one '
  'function invocation, so a failure at any step rolls back every write this call made. Also '
  'promotes an already-existing contributor''s still-null email when a later source-verified row '
  'supplies claim evidence (p_promote_contributor_email), never overwriting a value already set. '
  'service_role-only; see scripts/g3-community-foundation-runtime/opsAdapter.mjs '
  'createSupabaseOps().insertContribution for the caller/race-resolution contract. BRANCH-ONLY, '
  'not applied live.';

revoke execute on function public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text, boolean
) from public;
revoke execute on function public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text, boolean
) from anon;
revoke execute on function public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text, boolean
) from authenticated;
grant execute on function public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text, boolean
) to service_role;
grant execute on function public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text, boolean
) to postgres;
