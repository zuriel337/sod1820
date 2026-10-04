-- SOD1820 Research Path public reader foundation v1
-- Assignment ENTRY_LEARN_PUBLIC_RESEARCH_PATH_READER_V1 (work_log 3e170ba3-cd69-4f02-a8b2-bc1c8c2c6759).
-- Security challenge: work_log 9506ea00-ebae-4056-a3fd-4b22ccab6dff.
-- BRANCH ONLY: not applied to live DB. Human Gate required before any live apply.
--
-- Scope: (1) publication hardening on research_path_revisions, (2) ONE bounded anon-callable reader.
-- Governance (governance_status) and publication/access (published_at, access_scope) stay SEPARATE axes.
-- No table grants, no RLS policies, no views. Resume/append/fork semantics are untouched.

-- 1. Publication hardening -------------------------------------------------------------------

-- access_scope vocabulary: 'private' (column default, written by append/fork) and 'public' (reader eligibility).
-- Live rows: 3 x 'private'. Constraints are additive validations; no existing row is mutated.
alter table public.research_path_revisions
  add constraint research_path_revisions_access_scope_ck
  check (access_scope in ('private','public'));

alter table public.research_path_revisions
  add constraint research_path_revisions_published_requires_approved_public_ck
  check (
    published_at is null
    or (governance_status in ('approved','canonical') and access_scope = 'public')
  );

-- Published revisions are immutable: reviewed steps/representation/provenance/identity cannot change in place,
-- and a published revision cannot be deleted or truncated. Promotion (published_at null -> set) stays possible
-- through a separate Human-Gate-only writer; this migration adds no promotion path.
create or replace function public.fn_research_path_published_immutable_v1()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
begin
  if tg_table_name = 'research_path_revisions' then
    if tg_op = 'TRUNCATE' then
      if exists (select 1 from public.research_path_revisions where published_at is not null) then
        raise exception 'published research path revisions are immutable' using errcode='23001';
      end if;
      return null;
    end if;
    if old.published_at is not null then
      raise exception 'published research path revisions are immutable' using errcode='23001';
    end if;
  elsif tg_table_name = 'research_paths' then
    if exists (select 1 from public.research_path_revisions r where r.path_id = old.id and r.published_at is not null) then
      raise exception 'research path identity is immutable once a revision is published' using errcode='23001';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$function$;

revoke all on function public.fn_research_path_published_immutable_v1() from public, anon, authenticated;

create trigger research_path_revisions_published_immutable_trg
  before update or delete on public.research_path_revisions
  for each row execute function public.fn_research_path_published_immutable_v1();

create trigger research_path_revisions_published_no_truncate_trg
  before truncate on public.research_path_revisions
  for each statement execute function public.fn_research_path_published_immutable_v1();

create trigger research_paths_published_identity_immutable_trg
  before update or delete on public.research_paths
  for each row execute function public.fn_research_path_published_immutable_v1();

-- 2. Internal projection helper (not callable by clients) ---------------------------------------

-- Explicit allowlists; unknown keys are dropped. href is kept only as a same-origin relative path.
create or replace function public.fn_research_path_public_project_v1(p_steps jsonb, p_representation jsonb)
returns jsonb
language sql
immutable
set search_path to 'pg_catalog','public'
as $function$
  select jsonb_build_object(
    'steps', coalesce((
      select jsonb_agg(
        (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
           from jsonb_each(s.value) e
          where e.key in ('step_index','entity_type','entity_ref','locator','label_key','surface',
                          'capability_key','outcome_status','reason','negative_scope',
                          'finding_refs','source_refs','version_refs')
             or (e.key = 'href' and jsonb_typeof(e.value) = 'string' and (e.value #>> '{}') ~ '^/[^/\\]'))
        order by s.ord)
      from jsonb_array_elements(p_steps) with ordinality as s(value, ord)
      where jsonb_typeof(s.value) = 'object'
    ), '[]'::jsonb),
    'representation', coalesce((
      select jsonb_object_agg(e.key, e.value)
        from jsonb_each(p_representation) e
       where e.key = 'surface'
          or (e.key = 'href' and jsonb_typeof(e.value) = 'string' and (e.value #>> '{}') ~ '^/[^/\\]')
    ), '{}'::jsonb)
  )
$function$;

revoke all on function public.fn_research_path_public_project_v1(jsonb, jsonb) from public, anon, authenticated;

-- 3. Public reader ---------------------------------------------------------------------------------

create or replace function public.fn_research_path_public_read_v1(p_path_id uuid, p_revision_no integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_rev public.research_path_revisions;
  v_path public.research_paths;
  v_proj jsonb;
  v_parent_public boolean := false;
begin
  -- Eligibility is fixed here, never caller-supplied. Default revision = latest ELIGIBLE revision.
  select r.* into v_rev
    from public.research_path_revisions r
   where r.path_id = p_path_id
     and r.governance_status in ('approved','canonical')
     and r.access_scope = 'public'
     and r.published_at is not null
     and r.published_at <= now()
     and (p_revision_no is null or r.revision_no = p_revision_no)
   order by r.revision_no desc
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_path from public.research_paths where id = v_rev.path_id;

  -- Lineage is disclosed only when the branch-point revision itself passes the public filter.
  if v_path.parent_path_id is not null then
    select exists (
      select 1 from public.research_path_revisions b
       where b.id = v_path.branch_point_revision_id
         and b.path_id = v_path.parent_path_id
         and b.governance_status in ('approved','canonical')
         and b.access_scope = 'public'
         and b.published_at is not null
         and b.published_at <= now()
    ) into v_parent_public;
  end if;

  v_proj := public.fn_research_path_public_project_v1(v_rev.steps, v_rev.representation);

  return jsonb_build_object(
    'ok', true,
    'path_id', v_rev.path_id,
    'revision_no', v_rev.revision_no,
    'revision_id', v_rev.id,
    'governance_status', v_rev.governance_status,
    'published_at', v_rev.published_at,
    'parent_path_id', case when v_parent_public then v_path.parent_path_id end,
    'branch_point_step_index', case when v_parent_public then v_path.branch_point_step_index end,
    'steps', v_proj->'steps',
    'representation', v_proj->'representation',
    'reference_validation', 'destination_surface_required'
  );
end
$function$;

revoke all on function public.fn_research_path_public_read_v1(uuid, integer) from public;
revoke all on function public.fn_research_path_public_read_v1(uuid, integer) from anon, authenticated, service_role;
grant execute on function public.fn_research_path_public_read_v1(uuid, integer) to anon, authenticated, service_role;

comment on function public.fn_research_path_public_read_v1(uuid, integer) is
'Public Research Path reader. Only approved|canonical + access_scope=public + published_at<=now() revisions; generic not_found otherwise; explicit allowlisted projection (no provenance, created_by, identity_metadata, parent revision ids). Does not grant canonicalization; governance_status and published_at are separate axes. References must be resolved by the destination surface.';
