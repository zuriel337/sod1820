-- SOD1820 Research Path public reader foundation v1
-- Assignment ENTRY_LEARN_PUBLIC_RESEARCH_PATH_READER_V1 (work_log 3e170ba3-cd69-4f02-a8b2-bc1c8c2c6759).
-- Security challenge: work_log 9506ea00-ebae-4056-a3fd-4b22ccab6dff.
-- BRANCH ONLY: not applied to live DB. Human Gate required before any live apply.
--
-- V2 amendment: work_log 605bc8ad-be64-4f19-8fac-dd664a476873 (ENTRY_LEARN_PUBLIC_RESEARCH_PATH_READER_V2_RETRACTION).
--
-- Scope: (1) publication hardening on research_path_revisions, (2) ONE bounded anon-callable reader,
--        (3) Human-Gate publication-axis retraction (admin-only RPC; no unretract).
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

-- Retraction is a third, publication-axis fact: it neither changes governance_status nor erases published_at
-- (historical fact) nor flips access_scope. The three fields are all-null or all-set, only on a published revision.
alter table public.research_path_revisions
  add column retracted_at timestamptz null,
  add column retracted_by_user_id uuid null,
  add column retraction_reason text null;

alter table public.research_path_revisions
  add constraint research_path_revisions_retraction_coherent_ck
  check (
    (retracted_at is null and retracted_by_user_id is null and retraction_reason is null)
    or (
      retracted_at is not null
      and retracted_by_user_id is not null
      and published_at is not null
      and retraction_reason is not null
      and btrim(retraction_reason) <> ''
      and char_length(retraction_reason) <= 1000
    )
  );

-- Published revisions are immutable: reviewed steps/representation/provenance/identity cannot change in place,
-- and a published revision cannot be deleted or truncated. Promotion (published_at null -> set) stays possible
-- through a separate Human-Gate-only writer; this migration adds no promotion path.
create or replace function public.fn_research_path_published_immutable_v1()
returns trigger
language plpgsql
security definer
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
      -- The only permitted mutation of a published revision: the exact retraction-field transition
      -- (unretracted -> retracted), by an authenticated admin acting as themselves. Everything else,
      -- including any change to an already-retracted row (no unretract), stays immutable.
      if tg_op = 'UPDATE'
         and old.retracted_at is null
         and new.retracted_at is not null
         and new.retracted_by_user_id is not distinct from auth.uid()
         and auth.uid() is not null
         and public.rd_is_admin()
         and (to_jsonb(new) - 'retracted_at' - 'retracted_by_user_id' - 'retraction_reason')
             = (to_jsonb(old) - 'retracted_at' - 'retracted_by_user_id' - 'retraction_reason')
      then
        return new;
      end if;
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

revoke all on function public.fn_research_path_published_immutable_v1() from public, anon, authenticated, service_role;

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
     and r.retracted_at is null
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
         and b.retracted_at is null
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
'Public Research Path reader. Only approved|canonical + access_scope=public + published_at<=now() + not retracted revisions; generic not_found otherwise; explicit allowlisted projection (no provenance, created_by, identity_metadata, parent revision ids). Does not grant canonicalization; governance_status and published_at are separate axes. References must be resolved by the destination surface.';

-- 4. Human-Gate retraction ---------------------------------------------------------------------------

-- Removes ONE published revision from public access. Admin-only (public.rd_is_admin()), actor derived from
-- auth.uid(), never caller-supplied. Sets only the three retraction fields; governance_status, published_at,
-- access_scope and content are untouched (and enforced by the immutability trigger). No unretract: republish
-- requires a new revision. service_role / anon / PUBLIC cannot execute it and cannot satisfy the trigger.
create or replace function public.fn_research_path_public_retract_v1(p_path_id uuid, p_revision_no integer, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_rev public.research_path_revisions;
begin
  if v_uid is null or not public.rd_is_admin() then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_reason is null or btrim(p_reason) = '' or char_length(p_reason) > 1000 then
    raise exception 'retraction reason required (1..1000 chars)' using errcode='22023';
  end if;

  select * into v_rev
    from public.research_path_revisions r
   where r.path_id = p_path_id and r.revision_no = p_revision_no
   for update;
  if not found or v_rev.published_at is null
     or v_rev.governance_status not in ('approved','canonical') or v_rev.access_scope <> 'public' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_rev.retracted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_retracted');
  end if;

  update public.research_path_revisions
     set retracted_at = now(), retracted_by_user_id = v_uid, retraction_reason = p_reason
   where id = v_rev.id;

  return jsonb_build_object('ok', true, 'path_id', p_path_id, 'revision_no', p_revision_no,
                            'retracted_at', now(), 'retracted_by_user_id', v_uid);
end
$function$;

revoke all on function public.fn_research_path_public_retract_v1(uuid, integer, text) from public;
revoke all on function public.fn_research_path_public_retract_v1(uuid, integer, text) from anon, authenticated, service_role;
grant execute on function public.fn_research_path_public_retract_v1(uuid, integer, text) to authenticated;

comment on function public.fn_research_path_public_retract_v1(uuid, integer, text) is
'Human-Gate retraction of one published Research Path revision (admin via rd_is_admin(); actor = auth.uid()). Sets retracted_at/retracted_by_user_id/retraction_reason only; governance_status, published_at, access_scope and content are untouched. Retracted revisions are not served by the public reader. No unretract: republish requires a new revision.';
