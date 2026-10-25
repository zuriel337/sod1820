-- Tested rollback for 20261025010603_family_claim_self_redeem_owner_reader_v1.sql.
-- Restores the pre-patch redeemer and removes only the new owner reader.

drop function if exists public.fn_list_my_family_claims();

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

  select * into v_row from public.family_claims
   where token_hash = v_hash and flow = 'invitation'
   for update;

  if not found then
    raise exception 'invalid token';
  end if;

  update public.family_claims set attempts = attempts + 1 where id = v_row.id;

  if v_row.status = 'revoked' then
    raise exception 'token has been revoked';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'token already used';
  end if;
  if v_row.token_expires_at <= now() then
    raise exception 'token has expired';
  end if;

  select person_id into v_claimant from public.persons where account_user_id = v_uid limit 1;
  if v_claimant is null then
    raise exception 'no linked identity for the authenticated caller';
  end if;

  update public.family_claims
     set status = 'approved', claimant_person_id = v_claimant, consumed_at = now()
   where id = v_row.id;

  return jsonb_build_object('id', v_row.id, 'target_ref', v_row.target_ref, 'status', 'approved');
end;
$$;

revoke all on function public.fn_redeem_family_invitation(text) from public;
revoke all on function public.fn_redeem_family_invitation(text) from anon;
grant execute on function public.fn_redeem_family_invitation(text) to authenticated;
