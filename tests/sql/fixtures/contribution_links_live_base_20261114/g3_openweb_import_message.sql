CREATE OR REPLACE FUNCTION public.g3_openweb_import_message(p_create_contributor boolean, p_contributor_slug text, p_contributor_display_name text, p_contributor_email text, p_contributor_source text, p_contributor_dossier_settings jsonb, p_author_contributor_id uuid, p_author_user_id uuid, p_author_name text, p_intent text, p_origin text, p_research_state text, p_status text, p_body text, p_reactions jsonb, p_created_at timestamp with time zone, p_visitor text, p_visitor_email text, p_provenance_target_id text, p_provenance_relation_type text, p_provenance_note text, p_identity_target_id text, p_identity_relation_type text, p_promote_contributor_email boolean DEFAULT false, p_parent_message_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_contributor_id uuid := p_author_contributor_id;
  v_contribution_id uuid;
  v_parent_id uuid;
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

  -- Atomic parent link (task_key=G3_COMMUNITY_CORE_PR636_ATOMIC_PARENT_LINK_V1): resolved here,
  -- inside this same transaction, so the insert below carries the real parent_id from the start —
  -- never a separate post-insert UPDATE. See this migration's header for the three outcomes.
  v_parent_id := null;
  if p_parent_message_id is not null and btrim(p_parent_message_id) <> '' then
    select from_contribution_id
      into v_parent_id
      from public.contribution_links
     where target_type = 'openweb_message'
       and target_id = p_parent_message_id
       and relation_type = 'derived_from'
     limit 1;

    if v_parent_id is null then
      -- The caller (planner.mjs) only ever supplies p_parent_message_id when it has already
      -- determined this parent is expected to be present (in this batch's predeclared id map, or
      -- already committed from a prior batch/session) — a genuinely absent parent is passed as
      -- null and never reaches this branch at all. Reaching here with no resolvable row means the
      -- caller's expectation and live provenance disagree: fail closed rather than silently
      -- inserting parent_id=null for a dependency believed present, which would misclassify a real
      -- inconsistency as the genuinely-missing-parent class.
      raise exception
        'g3_openweb_import_message: expected parent openweb_message % not found via contribution_links (derived_from) — refusing to insert with a silently null parent_id',
        p_parent_message_id;
    end if;
  end if;

  insert into public.research_contributions
    (intent, origin, research_state, status, parent_id, author_user_id, author_contributor_id,
     author_name, body, reactions, created_at)
  values
    (p_intent, p_origin, p_research_state, p_status, v_parent_id, p_author_user_id, v_contributor_id,
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
$function$
