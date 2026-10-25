-- LIFE_JOURNEY_REMOVE_FAMILY_MEMBER_V1
-- Branch-only migration. Removes one owner-scoped family identity observation,
-- its private family relations, and any still-pending invitation. An approved
-- identity claim must be reversed through the existing claim workflow first.
-- No table, RLS policy, publication, graph, ShareGrant, or public-data change.

create or replace function public.fn_remove_family_member(
  p_owner uuid,
  p_target_ref text
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_owner boolean;
  v_admin boolean := false;
  v_actor uuid;
  v_member_id uuid;
  v_relations_removed integer := 0;
  v_claims_revoked integer := 0;
begin
  if v_uid is null then
    raise exception 'not authorized: authenticated journey owner required';
  end if;
  if p_owner is null then raise exception 'missing owner'; end if;
  if coalesce(nullif(p_target_ref, ''), '') = '' then raise exception 'missing target_ref'; end if;
  if p_target_ref = 'person:' || p_owner::text || ':self' then
    raise exception 'self profile cannot be removed as a family member';
  end if;
  if p_target_ref not like 'person:' || p_owner::text || ':p:%' then
    raise exception 'target_ref is outside this owner family namespace';
  end if;

  v_owner := exists (
    select 1 from public.persons pr
     where pr.person_id = p_owner and pr.account_user_id = v_uid
  );
  begin
    v_admin := coalesce(public.rd_is_admin(), false);
  exception when others then
    v_admin := false;
  end;
  if not (v_owner or v_admin) then
    raise exception 'not authorized: caller must be admin or the profile owner';
  end if;

  select ro.id into v_member_id
    from public.research_objects ro
   where ro.owner_person_id = p_owner
     and ro.kind = 'observation'
     and ro.source = 'family_input'
     and ro.source_ref = p_target_ref
   for update;
  if v_member_id is null then raise exception 'family member not found'; end if;

  perform 1
    from public.family_claims fc
   where fc.issuer_owner_id = p_owner and fc.target_ref = p_target_ref
   for update;

  if exists (
    select 1 from public.family_claims fc
     where fc.issuer_owner_id = p_owner
       and fc.target_ref = p_target_ref
       and fc.status = 'approved'
  ) then
    raise exception 'approved family claim must be reversed before member removal';
  end if;

  select pr.person_id into v_actor
    from public.persons pr
   where pr.account_user_id = v_uid
   limit 1;

  update public.family_claims
     set status = 'revoked',
         reviewed_by = v_actor,
         reviewed_at = now()
   where issuer_owner_id = p_owner
     and target_ref = p_target_ref
     and status = 'pending';
  get diagnostics v_claims_revoked = row_count;

  delete from public.research_objects ro
   where ro.owner_person_id = p_owner
     and ro.kind = 'relation'
     and ro.source = 'family_input'
     and ro.source_ref like 'family_relation:%'
     and (
       ro.meta->>'parent_ref' = p_target_ref
       or ro.meta->>'child_ref' = p_target_ref
       or p_target_ref = any(coalesce(ro.relates, array[]::text[]))
     );
  get diagnostics v_relations_removed = row_count;

  delete from public.research_objects where id = v_member_id;

  return jsonb_build_object(
    'ok', true,
    'target_ref', p_target_ref,
    'relations_removed', v_relations_removed,
    'claims_revoked', v_claims_revoked
  );
end;
$$;

revoke all on function public.fn_remove_family_member(uuid, text) from public;
revoke all on function public.fn_remove_family_member(uuid, text) from anon;
grant execute on function public.fn_remove_family_member(uuid, text) to authenticated;

comment on function public.fn_remove_family_member(uuid, text) is
  'Owner-scoped removal of one unclaimed family identity observation. Removes only its family_input relations and revokes pending claims; approved claims fail closed.';
