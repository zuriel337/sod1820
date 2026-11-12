CREATE OR REPLACE FUNCTION public.admin_hold_group_source_v1(p_update_id uuid, p_hold boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_admin boolean; v_n int;
begin
  select (role = 'admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin,false) then raise exception 'admin only'; end if;
  if p_update_id is null or p_hold is null then return jsonb_build_object('ok', false, 'error', 'invalid_arguments'); end if;
  update public.channel_update_group_proof
     set held_at = case when p_hold then coalesce(held_at, now()) else null end,
         held_by = case when p_hold then auth.uid() else null end
   where update_id = p_update_id;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', false, 'error', 'no_proof'); end if;
  -- Explicit admin unhold may restore the new-intake marker, but status/source/proof checks still apply.
  update public.channel_updates set group_source_intake_public = not p_hold where id = p_update_id;
  return jsonb_build_object('ok', true, 'held', p_hold);
end $function$

