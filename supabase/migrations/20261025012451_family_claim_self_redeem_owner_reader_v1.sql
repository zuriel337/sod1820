-- FAMILY_CLAIM_SELF_REDEEM_OWNER_READER_20261025
-- Owner: person_foundation_contract_law v6
--
-- Bounded patch over the existing family_claims workflow:
--   1. A valid pending invitation cannot be redeemed by its issuer's own Person.
--   2. An authenticated journey owner can list safe claim metadata for family
--      target_refs they currently own, without accepting an owner parameter.
--
-- This migration does not grant table access, add an RLS policy, touch
-- research_objects, create a ShareGrant, transfer research, or publish data.
-- Tested rollback: tests/sql/fixtures/rollback_family_claim_self_redeem_owner_reader_v1.sql

create or replace function public.fn_redeem_family_invitation(p_raw_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid      uuid := auth.uid();
  v_hash     text;
  v_row      public.family_claims%rowtype;
  v_claimant uuid;
begin
  if v_uid is null then
    raise exception 'not authorized: authenticated claimant required';
  end if;
  if coalesce(nullif(p_raw_token, ''), '') = '' then
    raise exception 'missing token';
  end if;

  v_hash := encode(extensions.digest(p_raw_token, 'sha256'), 'hex');

  select * into v_row
    from public.family_claims
   where token_hash = v_hash
     and flow = 'invitation'
   for update;

  if not found then
    raise exception 'invalid token';
  end if;

  -- Preserve the existing revoked/used/expired behavior, including the attempt
  -- count for those invalid states. A valid self-redeem is rejected before any
  -- claim row mutation, so the invitation remains usable by its intended person.
  if v_row.status = 'revoked' then
    update public.family_claims set attempts = attempts + 1 where id = v_row.id;
    raise exception 'token has been revoked';
  end if;
  if v_row.status <> 'pending' then
    update public.family_claims set attempts = attempts + 1 where id = v_row.id;
    raise exception 'token already used';
  end if;
  if v_row.token_expires_at <= now() then
    update public.family_claims set attempts = attempts + 1 where id = v_row.id;
    raise exception 'token has expired';
  end if;

  select person_id into v_claimant
    from public.persons
   where account_user_id = v_uid
   limit 1;

  if v_claimant is null then
    raise exception 'no linked identity for the authenticated caller';
  end if;
  if v_claimant = v_row.issuer_owner_id then
    raise exception 'invitation issuer cannot redeem own family invitation';
  end if;

  update public.family_claims
     set attempts = attempts + 1
   where id = v_row.id;

  update public.family_claims
     set status = 'approved',
         claimant_person_id = v_claimant,
         consumed_at = now()
   where id = v_row.id;

  return jsonb_build_object(
    'id', v_row.id,
    'target_ref', v_row.target_ref,
    'status', 'approved'
  );
end;
$$;

revoke all on function public.fn_redeem_family_invitation(text) from public;
revoke all on function public.fn_redeem_family_invitation(text) from anon;
grant execute on function public.fn_redeem_family_invitation(text) to authenticated;

comment on function public.fn_redeem_family_invitation(text) is
  'Redeems one Family Claim invitation. Rejects issuer self-redeem before mutating a valid pending claim.';

create or replace function public.fn_list_my_family_claims()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_rows  jsonb;
begin
  if v_uid is null then
    raise exception 'not authorized: authenticated journey owner required';
  end if;

  select person_id into v_owner
    from public.persons
   where account_user_id = v_uid
   limit 1;

  if v_owner is null then
    raise exception 'no linked identity for the authenticated caller';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', fc.id,
        'flow', fc.flow,
        'status', fc.status,
        'target_ref', fc.target_ref,
        'created_at', fc.created_at,
        'reviewed_at', fc.reviewed_at,
        'consumed_at', fc.consumed_at,
        'token_expires_at', fc.token_expires_at,
        'has_claimant', fc.claimant_person_id is not null
      ) order by fc.created_at desc, fc.id
    ),
    '[]'::jsonb
  ) into v_rows
    from public.family_claims fc
   where exists (
     select 1
       from public.research_objects ro
      where ro.owner_person_id = v_owner
        and ro.kind = 'observation'
        and ro.source_ref = fc.target_ref
        and ro.source_ref like 'person:' || v_owner::text || ':p:%'
   );

  return v_rows;
end;
$$;

revoke all on function public.fn_list_my_family_claims() from public;
revoke all on function public.fn_list_my_family_claims() from anon;
grant execute on function public.fn_list_my_family_claims() to authenticated;

comment on function public.fn_list_my_family_claims() is
  'Owner-scoped Family Claim metadata reader. Owner derives only from auth.uid(); returns no token, claimant identity, attempts, meta, or research content.';
