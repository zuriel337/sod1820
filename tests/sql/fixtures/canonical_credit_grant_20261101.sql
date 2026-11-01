CREATE OR REPLACE FUNCTION public.credit_grant(p_user uuid, p_amount integer, p_reason text, p_meta jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  insert into credit_ledger(user_id, amount, reason, meta)
  values (p_user, p_amount, p_reason, coalesce(p_meta,'{}'::jsonb)) returning id into v_id;
  update profiles set credits = coalesce(credits,0) + p_amount, updated_at = now() where user_id = p_user;
  if not found then
    insert into profiles(user_id, credits) values (p_user, greatest(p_amount,0))
    on conflict (user_id) do update set credits = coalesce(profiles.credits,0) + p_amount, updated_at = now();
  end if;
  return v_id;
end $function$

