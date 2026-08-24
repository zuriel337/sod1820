-- SOD1820 — Claim / Invitation Foundation Contract — PHASE 2
-- ZURIEL Human-Gate: "CLAIM / INVITATION PHASE 2" authorization (work_log actor=CLAUDE BEFORE entry, this session).
-- Applied to the live project via apply_migration, on the existing branch
-- claude/family-claim-invitation-phase1 (same unmerged feature, additive to the same table).
--
-- Adds the 4 remaining lifecycle RPCs. No table/column change — family_claims already carries
-- everything these functions need (reviewed_by/reviewed_at/consumed_at/meta), from Phase 1.
--
-- Dual owner-authorization (required, per ZURIEL): every function resolves BOTH the stored
-- issuer_owner_id snapshot AND the live current owner of target_ref (fresh SELECT against
-- research_objects, inside this SECURITY DEFINER function — never via a broadened client
-- grant/policy on research_objects, which remains untouched). Either match authorizes.
--
-- State transitions enforced exactly as specified:
--   review:  flow=request AND status=pending -> approved OR rejected. Nothing else.
--            Invitation-flow rows are explicitly rejected here — they can only reach 'approved'
--            via fn_redeem_family_invitation (token possession), never via owner review, closing
--            the exact token-bypass risk named in the brief.
--   revoke:  status=pending -> revoked (either flow). Never approved -> revoked.
--   reverse: status=approved -> reversed. Never deletes the row. Writes reversal provenance into
--            `meta` (reversed_by/reversed_at) WITHOUT touching reviewed_by/reviewed_at, so the
--            original approval's provenance is never overwritten.
--   get_status: admin / current owner (snapshot-or-live) / the claimant of that exact row only.
--            Returns claim metadata only — never token_hash, never research_objects content.
--
-- Claim identity remains hard-separated from confirm-relation/family-share/publish: none of these
-- four functions write to research_objects, privacy_scope, or mint a family person-ref. None
-- weakens research_objects RLS/grants — owner resolution happens entirely inside these
-- SECURITY DEFINER functions, exactly like fn_submit_family_claim_request already does in Phase 1.

create or replace function public.fn_review_family_claim(
  p_claim_id uuid,
  p_decision text
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_row public.family_claims%rowtype;
  v_live_owner uuid;
  v_authorized boolean;
  v_actor uuid;
begin
  if p_claim_id is null then raise exception 'missing claim id'; end if;
  if p_decision not in ('approve','reject') then
    raise exception 'invalid decision: % (must be approve or reject)', p_decision;
  end if;

  select * into v_row from public.family_claims where id = p_claim_id for update;
  if not found then raise exception 'claim not found'; end if;

  if v_row.flow <> 'request' then
    raise exception 'review is only valid for flow=request claims; invitation claims are approved only via token redemption';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'claim is not pending (current status: %)', v_row.status;
  end if;

  v_admin := exists (select 1 from public.users u where u.id = v_uid and u.role = 'admin');

  select owner_person_id into v_live_owner
    from public.research_objects
   where kind = 'observation' and source_ref = v_row.target_ref
   limit 1;

  v_authorized := v_admin
    or exists (select 1 from public.persons pr where pr.person_id = v_row.issuer_owner_id and pr.account_user_id = v_uid)
    or (v_live_owner is not null and exists (select 1 from public.persons pr where pr.person_id = v_live_owner and pr.account_user_id = v_uid));

  if not v_authorized then
    raise exception 'not authorized: caller must be admin or the current owner of the claimed identity';
  end if;

  select person_id into v_actor from public.persons where account_user_id = v_uid limit 1;

  update public.family_claims
     set status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
         reviewed_by = v_actor,
         reviewed_at = now(),
         consumed_at = case when p_decision = 'approve' then now() else consumed_at end
   where id = p_claim_id;

  return jsonb_build_object('id', p_claim_id, 'status', case when p_decision = 'approve' then 'approved' else 'rejected' end);
end;
$$;

revoke all on function public.fn_review_family_claim(uuid, text) from public;
grant execute on function public.fn_review_family_claim(uuid, text) to authenticated;

create or replace function public.fn_revoke_family_claim(p_claim_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_row public.family_claims%rowtype;
  v_live_owner uuid;
  v_authorized boolean;
  v_actor uuid;
begin
  if p_claim_id is null then raise exception 'missing claim id'; end if;

  select * into v_row from public.family_claims where id = p_claim_id for update;
  if not found then raise exception 'claim not found'; end if;

  if v_row.status <> 'pending' then
    raise exception 'only a pending claim can be revoked (current status: %)', v_row.status;
  end if;

  v_admin := exists (select 1 from public.users u where u.id = v_uid and u.role = 'admin');

  select owner_person_id into v_live_owner
    from public.research_objects
   where kind = 'observation' and source_ref = v_row.target_ref
   limit 1;

  v_authorized := v_admin
    or exists (select 1 from public.persons pr where pr.person_id = v_row.issuer_owner_id and pr.account_user_id = v_uid)
    or (v_live_owner is not null and exists (select 1 from public.persons pr where pr.person_id = v_live_owner and pr.account_user_id = v_uid));

  if not v_authorized then
    raise exception 'not authorized: caller must be admin or the current owner of the claimed identity';
  end if;

  select person_id into v_actor from public.persons where account_user_id = v_uid limit 1;

  update public.family_claims
     set status = 'revoked',
         reviewed_by = v_actor,
         reviewed_at = now()
   where id = p_claim_id;

  return jsonb_build_object('id', p_claim_id, 'status', 'revoked');
end;
$$;

revoke all on function public.fn_revoke_family_claim(uuid) from public;
grant execute on function public.fn_revoke_family_claim(uuid) to authenticated;

create or replace function public.fn_reverse_family_claim(p_claim_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_row public.family_claims%rowtype;
  v_live_owner uuid;
  v_authorized boolean;
  v_actor uuid;
begin
  if p_claim_id is null then raise exception 'missing claim id'; end if;

  select * into v_row from public.family_claims where id = p_claim_id for update;
  if not found then raise exception 'claim not found'; end if;

  if v_row.status <> 'approved' then
    raise exception 'only an approved claim can be reversed (current status: %)', v_row.status;
  end if;

  v_admin := exists (select 1 from public.users u where u.id = v_uid and u.role = 'admin');

  select owner_person_id into v_live_owner
    from public.research_objects
   where kind = 'observation' and source_ref = v_row.target_ref
   limit 1;

  v_authorized := v_admin
    or exists (select 1 from public.persons pr where pr.person_id = v_row.issuer_owner_id and pr.account_user_id = v_uid)
    or (v_live_owner is not null and exists (select 1 from public.persons pr where pr.person_id = v_live_owner and pr.account_user_id = v_uid));

  if not v_authorized then
    raise exception 'not authorized: caller must be admin or the current owner of the claimed identity';
  end if;

  select person_id into v_actor from public.persons where account_user_id = v_uid limit 1;

  -- reversal provenance -> meta only; reviewed_by/reviewed_at from the ORIGINAL approval untouched
  update public.family_claims
     set status = 'reversed',
         meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object('reversed_by', v_actor, 'reversed_at', now())
   where id = p_claim_id;

  return jsonb_build_object('id', p_claim_id, 'status', 'reversed');
end;
$$;

revoke all on function public.fn_reverse_family_claim(uuid) from public;
grant execute on function public.fn_reverse_family_claim(uuid) to authenticated;

create or replace function public.fn_get_family_claim_status(p_claim_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_row public.family_claims%rowtype;
  v_live_owner uuid;
  v_authorized boolean;
begin
  if p_claim_id is null then raise exception 'missing claim id'; end if;

  select * into v_row from public.family_claims where id = p_claim_id;
  if not found then raise exception 'claim not found'; end if;

  v_admin := exists (select 1 from public.users u where u.id = v_uid and u.role = 'admin');

  select owner_person_id into v_live_owner
    from public.research_objects
   where kind = 'observation' and source_ref = v_row.target_ref
   limit 1;

  v_authorized := v_admin
    or exists (select 1 from public.persons pr where pr.person_id = v_row.issuer_owner_id and pr.account_user_id = v_uid)
    or (v_live_owner is not null and exists (select 1 from public.persons pr where pr.person_id = v_live_owner and pr.account_user_id = v_uid))
    or (v_row.claimant_person_id is not null and exists (select 1 from public.persons pr where pr.person_id = v_row.claimant_person_id and pr.account_user_id = v_uid));

  if not v_authorized then
    raise exception 'not authorized: caller must be admin, the current owner, or the claimant of this specific claim';
  end if;

  return jsonb_build_object(
    'id', v_row.id, 'flow', v_row.flow, 'status', v_row.status, 'target_ref', v_row.target_ref,
    'created_at', v_row.created_at, 'reviewed_at', v_row.reviewed_at, 'consumed_at', v_row.consumed_at,
    'has_claimant', v_row.claimant_person_id is not null
  );
end;
$$;

revoke all on function public.fn_get_family_claim_status(uuid) from public;
grant execute on function public.fn_get_family_claim_status(uuid) to authenticated;
