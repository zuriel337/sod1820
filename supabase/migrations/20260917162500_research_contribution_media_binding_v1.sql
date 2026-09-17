-- G3_SUBMISSION_MEDIA_BINDING_V1
-- EXTEND_EXISTING research_contribution_law v9: private binary representations attach to the
-- existing research_contributions identity. No media table/store/graph/registry is created.

alter table public.research_contributions
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.research_contributions
  drop constraint if exists research_contributions_media_array_ck;
alter table public.research_contributions
  add constraint research_contributions_media_array_ck
  check (jsonb_typeof(media) = 'array');

create or replace function public.bind_contribution_media(
  p_contribution_id uuid,
  p_storage_object_id uuid,
  p_role text default 'attachment'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := false;
  v_c public.research_contributions%rowtype;
  v_o record;
  v_prefix text;
  v_role text := lower(btrim(coalesce(p_role,'attachment')));
  v_mime text;
  v_kind text;
  v_ref jsonb;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  v_admin := public.rd_is_admin();
  if v_role !~ '^[a-z0-9][a-z0-9_-]{0,40}$' then raise exception 'invalid media role'; end if;

  select * into v_c from public.research_contributions where id=p_contribution_id for update;
  if not found then raise exception 'contribution not found'; end if;
  if not v_admin and v_c.author_user_id is distinct from v_uid then raise exception 'forbidden'; end if;

  select o.id,o.bucket_id,o.name,o.metadata
    into v_o
  from storage.objects o
  where o.id=p_storage_object_id;
  if not found then raise exception 'storage object not found'; end if;
  if v_o.bucket_id <> 'submission-inbox' then raise exception 'private submission object required'; end if;

  if v_c.author_contributor_id is not null then
    v_prefix := 'sod1820/2029/contributors/' || v_c.author_contributor_id::text || '/';
  elsif v_c.author_user_id is not null then
    v_prefix := 'sod1820/2029/accounts/' || v_c.author_user_id::text || '/';
  elsif v_admin then
    v_prefix := 'sod1820/2029/unresolved/';
  else
    raise exception 'contribution has no bindable identity';
  end if;
  if position(v_prefix in v_o.name) <> 1 then raise exception 'storage object outside contribution owner prefix'; end if;

  v_mime := lower(coalesce(v_o.metadata->>'mimetype',''));
  v_kind := case
    when v_mime like 'image/%' then 'image'
    when v_mime like 'video/%' then 'video'
    when v_mime like 'audio/%' then 'audio'
    when v_mime in ('application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain') then 'document'
    else null
  end;
  if v_kind is null then raise exception 'unsupported stored mime'; end if;

  if exists (
    select 1 from jsonb_array_elements(coalesce(v_c.media,'[]'::jsonb)) item
    where item->>'storage_object_id'=p_storage_object_id::text
  ) then
    return jsonb_build_object('ok',true,'already_bound',true,'contribution_id',v_c.id,'storage_object_id',p_storage_object_id);
  end if;

  v_ref := jsonb_build_object(
    'storage_object_id', p_storage_object_id,
    'kind', v_kind,
    'role', v_role,
    'visibility', 'private'
  );

  update public.research_contributions
     set media = coalesce(media,'[]'::jsonb) || jsonb_build_array(v_ref),
         updated_at = now()
   where id=v_c.id;

  return jsonb_build_object('ok',true,'already_bound',false,'contribution_id',v_c.id,'media_ref',v_ref);
end
$function$;

revoke all on function public.bind_contribution_media(uuid,uuid,text) from public,anon;
grant execute on function public.bind_contribution_media(uuid,uuid,text) to authenticated;
revoke all on function public.bind_contribution_media(uuid,uuid,text) from service_role;
