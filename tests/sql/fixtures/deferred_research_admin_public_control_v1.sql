-- DEFERRED TEST FIXTURE ONLY. NOT A RELEASE MIGRATION.
-- Preserved proposed publication helper for separate security gate; never apply through the World release.
-- RESEARCH_2029_ADMIN_PUBLIC_CONTROL_V1 — Human-Gate publication action on research_objects.
-- EXTEND_EXISTING over truth_axes_foundation_law v3 (Axis 4 privacy_scope).
--   PUBLIC != CANONICAL      : publishing changes ACCESS only; never status/verification/canonicality.
--   PUBLICATION != GOVERNANCE: this RPC is separate from admin_research_review (governance) and never calls it.
--   public_candidate is NOT published; it is not a synonym for public.
-- BRANCH-ONLY: not applied to the live project by this change.

-- 1. Additive vocabulary: allow 'public'.
alter table public.research_objects drop constraint if exists research_objects_privacy_scope_check;
alter table public.research_objects
  add constraint research_objects_privacy_scope_check
  check (privacy_scope = any (array['private','family_shared','public_candidate','public']));

-- 2. Public read: ONLY privacy_scope='public', not person_only, and not owner-bound (owner_person_id is null). public_candidate / family_shared not widened.
drop policy if exists ro_public_read on public.research_objects;
create policy ro_public_read on public.research_objects
  for select
  using (
    privacy_scope = 'public'
    and owner_person_id is null
    and coalesce(meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
  );

-- 2b. READ boundary (live-verified before this change: anon/authenticated hold NO table SELECT on research_objects,
--     so ro_admin_read could never take effect and even a genuine admin got 403). Grant table SELECT; RLS decides rows:
--       ro_admin_read   -> admin only (authenticated, users.role='admin')
--       ro_public_read  -> privacy_scope='public' and not person_only
--     Granting SELECT would ALSO activate the legacy ro_dossier_read policy (public_candidate + dossier visible), which
--     is inconsistent with PUBLIC_CANDIDATE != PUBLIC. It is replaced below by the narrower public-scope-only rule, so the
--     grant cannot widen anything beyond 'public'. (Live count of public_candidate rows visible under that policy: 0.)
drop policy if exists ro_dossier_read on public.research_objects;
create policy ro_dossier_read on public.research_objects
  for select
  using (
    privacy_scope = 'public'
    and owner_person_id is null
    and coalesce(meta #>> '{ext,personal_scope,scope}', '') <> 'person_only'
    and coalesce(((meta -> 'ext') -> 'writer_dossier') ->> 'visible', 'false') = 'true'
    and exists (
      select 1 from public.contributors c
      where c.display_name = research_objects.contributor
        and coalesce(c.dossier_settings ->> 'visibility', 'public') <> 'private'
    )
  );
grant select on public.research_objects to anon, authenticated;

-- 3. Admin-only publication toggle: privacy_scope <-> public, append-only history in meta.publication.history.
create or replace function public.admin_research_set_publication_v1(
  p_id uuid,
  p_publish boolean,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin   boolean;
  r         public.research_objects;
  v_to      text;
  v_entry   jsonb;
begin
  select (role = 'admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin, false) then raise exception 'admin only'; end if;
  if p_id is null or p_publish is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  end if;

  select * into r from public.research_objects where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  if p_publish then
    if coalesce(r.meta #>> '{ext,personal_scope,scope}', '') = 'person_only' then
      return jsonb_build_object('ok', false, 'error', 'person_only_cannot_publish', 'privacy_scope', r.privacy_scope);
    end if;
    if r.owner_person_id is not null then
      return jsonb_build_object('ok', false, 'error', 'owner_bound_cannot_publish', 'privacy_scope', r.privacy_scope);
    end if;
    if r.privacy_scope = 'public' then
      return jsonb_build_object('ok', false, 'error', 'already_public', 'privacy_scope', r.privacy_scope);
    end if;
    v_to := 'public';
  else
    if r.privacy_scope <> 'public' then
      return jsonb_build_object('ok', false, 'error', 'not_public', 'privacy_scope', r.privacy_scope);
    end if;
    v_to := 'private';
  end if;

  v_entry := jsonb_build_object(
    'action', case when p_publish then 'publish' else 'unpublish' end,
    'by', auth.uid()::text,
    'at', now(),
    'from_scope', r.privacy_scope,
    'to_scope', v_to,
    'note', nullif(left(coalesce(p_note, ''), 500), '')
  );

  -- Access axis only. status / engine_verified / engine_detail / promoted_node_id / source / contributor untouched.
  update public.research_objects
     set privacy_scope = v_to,
         meta = jsonb_set(
                  coalesce(meta, '{}'::jsonb),
                  '{publication}',
                  coalesce(meta -> 'publication', '{}'::jsonb)
                    || jsonb_build_object(
                         'history',
                         coalesce(meta #> '{publication,history}', '[]'::jsonb) || jsonb_build_array(v_entry)))
   where id = p_id;

  return jsonb_build_object(
    'ok', true, 'id', p_id, 'privacy_scope', v_to, 'from_scope', r.privacy_scope,
    'status', r.status, 'governance_changed', false, 'canonicality_changed', false
  );
end;
$$;

revoke all on function public.admin_research_set_publication_v1(uuid, boolean, text) from public, anon;
grant execute on function public.admin_research_set_publication_v1(uuid, boolean, text) to authenticated, service_role;

comment on function public.admin_research_set_publication_v1(uuid, boolean, text) is
  'Human-Gate publication toggle (Axis-4 privacy_scope private<->public). Admin only. Does not touch governance, verification or canonicality.';
