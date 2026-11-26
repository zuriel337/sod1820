-- Reverts apply.sql: the previous policy and function body, exactly. Restores the old exposure of private rows that carry self_published=true.
begin;
do $guard$
begin
  if (select pg_get_expr(polqual, polrelid) from pg_policy
      where polrelid = 'public.els_records'::regclass and polname = 'public_read_self_published_els')
     is distinct from '((self_published = true) AND (visibility = ''public''::text))' then
    raise exception 'Unexpected public_read_self_published_els policy (apply.sql not in place)';
  end if;
end;
$guard$;
drop policy public_read_self_published_els on public.els_records;
create policy public_read_self_published_els on public.els_records for select using (self_published = true);

CREATE OR REPLACE FUNCTION public.self_publish_matrix(p_id uuid, p_on boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','not_authenticated'); end if;
  select owner_user_id into v_owner from public.els_records where id=p_id;
  if v_owner is null then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if v_owner <> v_uid then return jsonb_build_object('ok',false,'error','not_owner'); end if;
  update public.els_records set self_published = coalesce(p_on,true) where id=p_id;
  return jsonb_build_object('ok',true,'id',p_id,'self_published',coalesce(p_on,true));
end $function$;
commit;
