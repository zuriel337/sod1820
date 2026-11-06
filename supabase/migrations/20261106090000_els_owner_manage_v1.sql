-- Owner management of personal ELS ciphers (rename / delete). NOT APPLIED automatically:
-- a database change requires ZURIEL's explicit approval for the exact migration.
-- Scope: the owner of an els_records row that was never moderated into 'published'.
-- Published (approved) evidence stays admin-only (update_els_matrix / delete_els_matrix).
create or replace function public.rename_my_els_matrix(p_id uuid, p_title text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  r public.els_records;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if v_title is null or char_length(v_title) > 160 then return jsonb_build_object('ok', false, 'error', 'invalid_title'); end if;
  select * into r from public.els_records where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.owner_user_id is distinct from v_uid then return jsonb_build_object('ok', false, 'error', 'not_owner'); end if;
  if r.status = 'published' then return jsonb_build_object('ok', false, 'error', 'published_locked'); end if;
  update public.els_records set title = v_title where id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id, 'title', v_title);
end;
$function$;

create or replace function public.delete_my_els_matrix(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  r public.els_records;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select * into r from public.els_records where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.owner_user_id is distinct from v_uid then return jsonb_build_object('ok', false, 'error', 'not_owner'); end if;
  if r.status = 'published' then return jsonb_build_object('ok', false, 'error', 'published_locked'); end if;
  delete from public.els_records where id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$function$;

revoke all on function public.rename_my_els_matrix(uuid, text) from public, anon;
revoke all on function public.delete_my_els_matrix(uuid) from public, anon;
grant execute on function public.rename_my_els_matrix(uuid, text) to authenticated;
grant execute on function public.delete_my_els_matrix(uuid) to authenticated;
