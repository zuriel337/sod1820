-- G3 Community Core — PR #636 atomic per-message OpenWeb import (BRANCH-ONLY, NOT APPLIED LIVE).
-- Assignment work_log.id=18de5532-80fd-44ee-9985-37f79c46de25, task_key=
-- G3_COMMUNITY_CORE_PR636_ATOMIC_MESSAGE_IMPORT_V1, release_authorization_state=
-- BRANCH_ONLY_NO_LIVE_DB_NO_IMPORT_NO_MERGE_NO_DEPLOY_NO_CUTOVER.
--
-- Do NOT run this migration against the live project (linswmnnkjxvweumprav) from this branch.
-- It is committed for review/Phase-3 human gate only.
--
-- Fixes the per-message partial-commit gap identified against
-- scripts/g3-community-foundation-runtime/opsAdapter.mjs createSupabaseOps().insertContribution:
-- that function previously performed up to five separate client round-trips (contributors insert,
-- visitor_identity upsert, research_contributions insert, contribution_links provenance insert,
-- contribution_links identity insert). An arbitrary crash/error between any two of those calls left
-- an untracked orphan (an authored research_contributions row with no provenance link, or a soft
-- contributor with no contribution) that a retry could duplicate, on top of the 23505 race the
-- cl_openweb_message_derived_from_uniq partial index (PR #636 final-blockers migration) already
-- guards.
--
-- EXTEND_EXISTING: this function only writes to the four canonical tables the JS adapter already
-- wrote to one at a time (contributors, visitor_identity, research_contributions,
-- contribution_links). No new table/store/registry.
--
-- Atomicity model: every write below runs inside this single function invocation. If any statement
-- raises (including the cl_openweb_message_derived_from_uniq unique_violation on the provenance
-- insert — the expected concurrent-import-race outcome, not a bug), the entire invocation aborts
-- and Postgres rolls back every write this call made (contributor, visitor_identity upsert,
-- research_contributions row) as a unit — nothing here explicitly catches or manually undoes a
-- prior statement. The caller (opsAdapter.mjs) is expected to catch a thrown error whose SQLSTATE
-- is 23505 and whose message names cl_openweb_message_derived_from_uniq, and resolve the winning
-- contribution via the existing contribution_links read (exactly as it did before this change) —
-- any other error is a genuine failure and must propagate.
--
-- SECURITY INVOKER (not DEFINER), per the assignment: the real import caller is service_role,
-- which already has full table access and bypasses RLS, so this function does not need to run
-- as its owner. EXECUTE is revoked from PUBLIC/anon/authenticated below and granted only to
-- service_role (+ postgres) — this is deliberately not a public-reachable mutation endpoint.
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
  p_identity_relation_type text
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
  end if;

  if p_visitor is not null then
    insert into public.visitor_identity (visitor, email, last_seen)
    values (p_visitor, p_visitor_email, now())
    on conflict (visitor) do update set email = excluded.email, last_seen = now();
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
  'function invocation, so a failure at any step rolls back every write this call made. '
  'service_role-only; see scripts/g3-community-foundation-runtime/opsAdapter.mjs '
  'createSupabaseOps().insertContribution for the caller/race-resolution contract. BRANCH-ONLY, '
  'not applied live.';

revoke execute on function public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text
) from public;
revoke execute on function public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text
) from anon;
revoke execute on function public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text
) from authenticated;
grant execute on function public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text
) to service_role;
grant execute on function public.g3_openweb_import_message(
  boolean, text, text, text, text, jsonb, uuid, uuid, text, text, text, text, text, text, jsonb,
  timestamptz, text, text, text, text, text, text, text
) to postgres;
