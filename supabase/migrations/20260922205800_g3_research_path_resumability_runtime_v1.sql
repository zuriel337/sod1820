-- G3 Research Path Resumability Runtime v1
-- EXTEND_EXISTING only: research_paths + research_path_revisions remain the canonical Path substrate.
-- research_plans stays unused in this slice; legacy journey_saves is not migrated or rewritten.
-- Direct tables stay RLS-closed. Authenticated users use the bounded SECURITY DEFINER RPCs below.

create index if not exists research_paths_owner_created_idx
  on public.research_paths(created_by_user_id, created_at desc)
  where created_by_user_id is not null;

create unique index if not exists research_path_revisions_path_save_key_uq
  on public.research_path_revisions(path_id, (provenance->>'save_key'))
  where nullif(provenance->>'save_key','') is not null;

create unique index if not exists research_paths_owner_fork_key_uq
  on public.research_paths(
    created_by_user_id,
    parent_path_id,
    branch_point_revision_id,
    branch_point_step_index,
    (identity_metadata->>'fork_key')
  )
  where created_by_user_id is not null
    and parent_path_id is not null
    and nullif(identity_metadata->>'fork_key','') is not null;

create or replace function public.fn_research_path_append_v1(
  p_path_id uuid default null,
  p_steps jsonb default '[]'::jsonb,
  p_identity_metadata jsonb default '{}'::jsonb,
  p_provenance jsonb default '{}'::jsonb,
  p_representation jsonb default '{}'::jsonb,
  p_expected_revision_no integer default null,
  p_save_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_path public.research_paths;
  v_latest public.research_path_revisions;
  v_existing public.research_path_revisions;
  v_path_id uuid;
  v_revision_no integer;
  v_parent_revision_id uuid;
  v_steps jsonb;
  v_step jsonb;
  v_i integer := 0;
  v_revision public.research_path_revisions;
  v_save_key text := nullif(btrim(coalesce(p_save_key,'')),'');
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  if p_steps is null or jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) < 1 then
    raise exception 'p_steps must be a non-empty json array' using errcode='22023';
  end if;
  if jsonb_array_length(p_steps) > 100 then
    raise exception 'too many appended steps' using errcode='22023';
  end if;
  if octet_length(p_steps::text) > 262144 then
    raise exception 'p_steps payload too large' using errcode='22023';
  end if;

  if p_identity_metadata is null or jsonb_typeof(p_identity_metadata) <> 'object'
     or p_provenance is null or jsonb_typeof(p_provenance) <> 'object'
     or p_representation is null or jsonb_typeof(p_representation) <> 'object' then
    raise exception 'metadata/provenance/representation must be json objects' using errcode='22023';
  end if;
  if octet_length(p_identity_metadata::text) > 32768
     or octet_length(p_provenance::text) > 65536
     or octet_length(p_representation::text) > 131072 then
    raise exception 'research path metadata payload too large' using errcode='22023';
  end if;

  if p_path_id is null then
    insert into public.research_paths(created_by_user_id, identity_metadata)
    values (
      v_uid,
      coalesce(p_identity_metadata,'{}'::jsonb)
        - 'created_by_user_id'
        - 'governance_status'
        - 'access_scope'
    )
    returning * into v_path;

    v_path_id := v_path.id;
    v_revision_no := 1;
    v_parent_revision_id := null;
    v_steps := '[]'::jsonb;
  else
    select *
      into v_path
      from public.research_paths
     where id = p_path_id
       and created_by_user_id = v_uid
     for update;

    if not found then
      raise exception 'research path not found' using errcode='P0002';
    end if;

    v_path_id := v_path.id;

    if v_save_key is not null then
      select *
        into v_existing
        from public.research_path_revisions
       where path_id = v_path_id
         and provenance->>'save_key' = v_save_key
       order by revision_no desc
       limit 1;
      if found then
        return jsonb_build_object(
          'ok', true,
          'idempotent_replay', true,
          'path_id', v_path_id,
          'revision_id', v_existing.id,
          'revision_no', v_existing.revision_no,
          'created_at', v_existing.created_at,
          'steps', v_existing.steps,
          'representation', v_existing.representation
        );
      end if;
    end if;

    select *
      into v_latest
      from public.research_path_revisions
     where path_id = v_path_id
     order by revision_no desc
     limit 1;

    if not found then
      v_revision_no := 1;
      v_parent_revision_id := null;
      v_steps := '[]'::jsonb;
    else
      if p_expected_revision_no is not null and p_expected_revision_no <> v_latest.revision_no then
        return jsonb_build_object(
          'ok', false,
          'error', 'revision_conflict',
          'path_id', v_path_id,
          'current_revision_no', v_latest.revision_no,
          'current_revision_id', v_latest.id
        );
      end if;
      v_revision_no := v_latest.revision_no + 1;
      v_parent_revision_id := v_latest.id;
      v_steps := v_latest.steps;
      v_i := jsonb_array_length(v_steps);
    end if;
  end if;

  for v_step in select value from jsonb_array_elements(p_steps)
  loop
    if jsonb_typeof(v_step) <> 'object' then
      raise exception 'every path step must be an object' using errcode='22023';
    end if;
    v_step := jsonb_set(v_step, '{step_index}', to_jsonb(v_i), true);
    v_steps := v_steps || jsonb_build_array(v_step);
    v_i := v_i + 1;
  end loop;

  if not public.fn_research_path_steps_valid(v_steps) then
    raise exception 'invalid research path step envelope' using errcode='22023';
  end if;

  insert into public.research_path_revisions(
    path_id,
    revision_no,
    parent_revision_id,
    created_by_user_id,
    governance_status,
    published_at,
    access_scope,
    steps,
    provenance,
    representation
  )
  values (
    v_path_id,
    v_revision_no,
    v_parent_revision_id,
    v_uid,
    'candidate',
    null,
    'private',
    v_steps,
    (coalesce(p_provenance,'{}'::jsonb)
      - 'governance_status'
      - 'access_scope'
      - 'published_at')
      || jsonb_build_object(
        'writer','fn_research_path_append_v1',
        'save_key', v_save_key,
        'saved_by_user', true
      ),
    coalesce(p_representation,'{}'::jsonb)
  )
  returning * into v_revision;

  return jsonb_build_object(
    'ok', true,
    'idempotent_replay', false,
    'path_id', v_path_id,
    'revision_id', v_revision.id,
    'revision_no', v_revision.revision_no,
    'created_at', v_revision.created_at,
    'steps', v_revision.steps,
    'representation', v_revision.representation
  );
exception
  when unique_violation then
    if v_save_key is not null and v_path_id is not null then
      select *
        into v_existing
        from public.research_path_revisions
       where path_id = v_path_id
         and provenance->>'save_key' = v_save_key
       order by revision_no desc
       limit 1;
      if found then
        return jsonb_build_object(
          'ok', true,
          'idempotent_replay', true,
          'path_id', v_path_id,
          'revision_id', v_existing.id,
          'revision_no', v_existing.revision_no,
          'created_at', v_existing.created_at,
          'steps', v_existing.steps,
          'representation', v_existing.representation
        );
      end if;
    end if;
    raise;
end
$function$;

create or replace function public.fn_research_path_resume_v1(
  p_path_id uuid default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path to 'pg_catalog','public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_path public.research_paths;
  v_revision public.research_path_revisions;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  if p_path_id is null then
    select p.*
      into v_path
      from public.research_paths p
      join lateral (
        select r.created_at
          from public.research_path_revisions r
         where r.path_id = p.id
         order by r.revision_no desc
         limit 1
      ) latest on true
     where p.created_by_user_id = v_uid
     order by latest.created_at desc, p.created_at desc
     limit 1;
  else
    select *
      into v_path
      from public.research_paths
     where id = p_path_id
       and created_by_user_id = v_uid;
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select *
    into v_revision
    from public.research_path_revisions
   where path_id = v_path.id
   order by revision_no desc
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_revision', 'path_id', v_path.id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'path_id', v_path.id,
    'parent_path_id', v_path.parent_path_id,
    'branch_point_revision_id', v_path.branch_point_revision_id,
    'branch_point_step_index', v_path.branch_point_step_index,
    'identity_metadata', v_path.identity_metadata,
    'revision_id', v_revision.id,
    'revision_no', v_revision.revision_no,
    'created_at', v_revision.created_at,
    'governance_status', v_revision.governance_status,
    'access_scope', v_revision.access_scope,
    'steps', v_revision.steps,
    'provenance', v_revision.provenance,
    'representation', v_revision.representation,
    'reference_validation', 'destination_surface_required'
  );
end
$function$;

create or replace function public.fn_research_path_fork_v1(
  p_parent_path_id uuid,
  p_parent_revision_id uuid,
  p_branch_point_step_index integer,
  p_branch_steps jsonb default '[]'::jsonb,
  p_identity_metadata jsonb default '{}'::jsonb,
  p_provenance jsonb default '{}'::jsonb,
  p_representation jsonb default '{}'::jsonb,
  p_fork_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_parent_path public.research_paths;
  v_parent_revision public.research_path_revisions;
  v_existing_path public.research_paths;
  v_path public.research_paths;
  v_revision public.research_path_revisions;
  v_steps jsonb := '[]'::jsonb;
  v_step jsonb;
  v_i integer := 0;
  v_fork_key text := nullif(btrim(coalesce(p_fork_key,'')),'');
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode='42501';
  end if;

  if p_parent_path_id is null or p_parent_revision_id is null
     or p_branch_point_step_index is null or p_branch_point_step_index < 0 then
    raise exception 'parent path/revision/step are required' using errcode='22023';
  end if;
  if p_branch_steps is null or jsonb_typeof(p_branch_steps) <> 'array' then
    raise exception 'p_branch_steps must be a json array' using errcode='22023';
  end if;
  if jsonb_array_length(p_branch_steps) > 100 or octet_length(p_branch_steps::text) > 262144 then
    raise exception 'branch step payload too large' using errcode='22023';
  end if;
  if p_identity_metadata is null or jsonb_typeof(p_identity_metadata) <> 'object'
     or p_provenance is null or jsonb_typeof(p_provenance) <> 'object'
     or p_representation is null or jsonb_typeof(p_representation) <> 'object' then
    raise exception 'metadata/provenance/representation must be json objects' using errcode='22023';
  end if;

  select *
    into v_parent_path
    from public.research_paths
   where id = p_parent_path_id
     and created_by_user_id = v_uid
   for update;
  if not found then
    raise exception 'parent research path not found' using errcode='P0002';
  end if;

  select *
    into v_parent_revision
    from public.research_path_revisions
   where id = p_parent_revision_id
     and path_id = p_parent_path_id;
  if not found then
    raise exception 'parent revision not found' using errcode='P0002';
  end if;

  if p_branch_point_step_index >= jsonb_array_length(v_parent_revision.steps) then
    raise exception 'branch point is outside parent revision steps' using errcode='22023';
  end if;

  if v_fork_key is not null then
    select *
      into v_existing_path
      from public.research_paths
     where created_by_user_id = v_uid
       and parent_path_id = p_parent_path_id
       and branch_point_revision_id = p_parent_revision_id
       and branch_point_step_index = p_branch_point_step_index
       and identity_metadata->>'fork_key' = v_fork_key
     limit 1;
    if found then
      return public.fn_research_path_resume_v1(v_existing_path.id)
        || jsonb_build_object('idempotent_replay', true);
    end if;
  end if;

  for v_step in
    select value
      from jsonb_array_elements(v_parent_revision.steps) with ordinality as e(value, ord)
     where ord - 1 <= p_branch_point_step_index
     order by ord
  loop
    v_step := jsonb_set(v_step, '{step_index}', to_jsonb(v_i), true);
    v_steps := v_steps || jsonb_build_array(v_step);
    v_i := v_i + 1;
  end loop;

  for v_step in select value from jsonb_array_elements(p_branch_steps)
  loop
    if jsonb_typeof(v_step) <> 'object' then
      raise exception 'every branch step must be an object' using errcode='22023';
    end if;
    v_step := jsonb_set(v_step, '{step_index}', to_jsonb(v_i), true);
    v_steps := v_steps || jsonb_build_array(v_step);
    v_i := v_i + 1;
  end loop;

  if not public.fn_research_path_steps_valid(v_steps) then
    raise exception 'invalid research path step envelope' using errcode='22023';
  end if;

  insert into public.research_paths(
    created_by_user_id,
    parent_path_id,
    branch_point_revision_id,
    branch_point_step_index,
    identity_metadata
  )
  values (
    v_uid,
    p_parent_path_id,
    p_parent_revision_id,
    p_branch_point_step_index,
    (coalesce(p_identity_metadata,'{}'::jsonb)
      - 'created_by_user_id'
      - 'governance_status'
      - 'access_scope')
      || jsonb_build_object('fork_key',v_fork_key)
  )
  returning * into v_path;

  insert into public.research_path_revisions(
    path_id,
    revision_no,
    parent_revision_id,
    created_by_user_id,
    governance_status,
    published_at,
    access_scope,
    steps,
    provenance,
    representation
  )
  values (
    v_path.id,
    1,
    null,
    v_uid,
    'candidate',
    null,
    'private',
    v_steps,
    (coalesce(p_provenance,'{}'::jsonb)
      - 'governance_status'
      - 'access_scope'
      - 'published_at')
      || jsonb_build_object(
        'writer','fn_research_path_fork_v1',
        'fork_key',v_fork_key,
        'saved_by_user',true,
        'parent_path_id',p_parent_path_id,
        'parent_revision_id',p_parent_revision_id,
        'branch_point_step_index',p_branch_point_step_index
      ),
    coalesce(p_representation,'{}'::jsonb)
  )
  returning * into v_revision;

  return jsonb_build_object(
    'ok', true,
    'idempotent_replay', false,
    'path_id', v_path.id,
    'parent_path_id', v_path.parent_path_id,
    'branch_point_revision_id', v_path.branch_point_revision_id,
    'branch_point_step_index', v_path.branch_point_step_index,
    'revision_id', v_revision.id,
    'revision_no', v_revision.revision_no,
    'created_at', v_revision.created_at,
    'steps', v_revision.steps,
    'representation', v_revision.representation
  );
exception
  when unique_violation then
    if v_fork_key is not null then
      select *
        into v_existing_path
        from public.research_paths
       where created_by_user_id = v_uid
         and parent_path_id = p_parent_path_id
         and branch_point_revision_id = p_parent_revision_id
         and branch_point_step_index = p_branch_point_step_index
         and identity_metadata->>'fork_key' = v_fork_key
       limit 1;
      if found then
        return public.fn_research_path_resume_v1(v_existing_path.id)
          || jsonb_build_object('idempotent_replay', true);
      end if;
    end if;
    raise;
end
$function$;

revoke execute on function public.fn_research_path_append_v1(uuid,jsonb,jsonb,jsonb,jsonb,integer,text) from public, anon;
revoke execute on function public.fn_research_path_resume_v1(uuid) from public, anon;
revoke execute on function public.fn_research_path_fork_v1(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb,text) from public, anon;

grant execute on function public.fn_research_path_append_v1(uuid,jsonb,jsonb,jsonb,jsonb,integer,text) to authenticated, service_role;
grant execute on function public.fn_research_path_resume_v1(uuid) to authenticated, service_role;
grant execute on function public.fn_research_path_fork_v1(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb,text) to authenticated, service_role;

comment on function public.fn_research_path_append_v1(uuid,jsonb,jsonb,jsonb,jsonb,integer,text) is
'Authenticated personal Research Path writer. Creates or appends a candidate/private revision, serializes same-path writes with a path row lock, supports optimistic expected revision and save-key idempotency. Never canonicalizes or publishes.';

comment on function public.fn_research_path_resume_v1(uuid) is
'Authenticated personal Research Path reader. Returns only the caller-owned latest revision (or latest caller-owned path when p_path_id is null). It returns stored refs as navigation/provenance and requires destination-surface live revalidation before treating them as current truth.';

comment on function public.fn_research_path_fork_v1(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb,text) is
'Authenticated personal Research Path fork writer. Branches only from a caller-owned parent revision/step, preserves the parent prefix server-side, creates a candidate/private child path and never canonicalizes or publishes.';
