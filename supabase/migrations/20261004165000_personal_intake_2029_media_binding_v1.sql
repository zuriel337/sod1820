-- PERSONAL_INTAKE_2029_UNIFIED_V1
-- EXTEND_EXISTING only: research_items library + submission-inbox + media-upload-intent.
-- No new table/store. Personal intake remains Workspace membership, never truth/canonical/publication.

create or replace function public.private_personal_intake_media_access_v1(
  p_item_id uuid,
  p_storage_object_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item public.research_items%rowtype;
  v_object record;
begin
  if p_actor_id is null or p_item_id is null or p_storage_object_id is null then
    raise exception 'personal media identity required' using errcode='22023';
  end if;

  select * into v_item
  from public.research_items
  where id=p_item_id and user_id=p_actor_id and bucket='library' and entity_type='personal_intake';

  if not found then raise exception 'personal intake item not found' using errcode='42501'; end if;
  if nullif(v_item.metadata#>>'{artifact,storage_object_id}','') is distinct from p_storage_object_id::text then
    raise exception 'personal media ref not bound' using errcode='42501';
  end if;

  select o.id,o.bucket_id,o.name,o.metadata into v_object
  from storage.objects o
  where o.id=p_storage_object_id and o.bucket_id='submission-inbox';

  if not found then raise exception 'storage object not found' using errcode='P0002'; end if;

  -- Personal Intake V1 is account-owned only. Contributor/unresolved submissions use contribution binding.
  if position('sod1820/2029/accounts/' || p_actor_id::text || '/' in v_object.name) <> 1 then
    raise exception 'storage object outside personal owner prefix' using errcode='42501';
  end if;

  return jsonb_build_object(
    'ok',true,
    'bucket',v_object.bucket_id,
    'path',v_object.name,
    'mime',lower(coalesce(v_object.metadata->>'mimetype','')),
    'size',coalesce((v_object.metadata->>'size')::bigint,(v_object.metadata->>'contentLength')::bigint,0)
  );
end;
$$;

revoke all on function public.private_personal_intake_media_access_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.private_personal_intake_media_access_v1(uuid,uuid,uuid) to service_role;

create or replace function public.guard_personal_intake_media_delete_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_storage_id uuid;
begin
  if old.entity_type <> 'personal_intake' or old.bucket <> 'library' then return old; end if;
  begin
    v_storage_id := nullif(old.metadata#>>'{artifact,storage_object_id}','')::uuid;
  exception when others then
    raise exception 'PERSONAL_INTAKE_MEDIA_REF_INVALID' using errcode='22023';
  end;
  if v_storage_id is null then return old; end if;

  if exists (
    select 1 from storage.objects o
    where o.id=v_storage_id and o.bucket_id='submission-inbox'
  ) then
    raise exception 'PERSONAL_MEDIA_CLEANUP_REQUIRED' using errcode='P0001';
  end if;
  return old;
end;
$$;

revoke all on function public.guard_personal_intake_media_delete_v1() from public,anon,authenticated,service_role;

drop trigger if exists research_items_personal_media_delete_guard_v1 on public.research_items;
create trigger research_items_personal_media_delete_guard_v1
before delete on public.research_items
for each row execute function public.guard_personal_intake_media_delete_v1();

comment on function public.private_personal_intake_media_access_v1(uuid,uuid,uuid)
is 'Service-only resolver for account-owned Personal Intake media. Returns physical path only after research_items ownership + opaque object ref match.';
comment on function public.guard_personal_intake_media_delete_v1()
is 'Prevents research_items/account erasure from orphaning Personal Intake binaries. Storage API must remove binary first.';
