-- LIFE_JOURNEY_PRIVATE_HINT_MEDIA_AND_ENTRY_CONTINUATION_20261026
-- Branch-only schema proposal. Reuses research_items + submission-inbox; no new store/table/bucket.

alter table public.research_items
  add column if not exists media jsonb not null default '[]'::jsonb;

create or replace function public.private_research_item_hint_media_valid(p_media jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $function$
  select case
    when jsonb_typeof(p_media) is distinct from 'array' then false
    else not exists (
      select 1
      from jsonb_array_elements(p_media) as item(value)
      where jsonb_typeof(item.value) is distinct from 'object'
         or coalesce(item.value->>'storage_object_id','')
              !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or coalesce(item.value->>'intent_id','')
              !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or item.value->>'kind' is distinct from 'image'
         or item.value->>'role' is distinct from 'evidence_image'
         or item.value->>'visibility' is distinct from 'private'
         or coalesce(item.value->>'state','') not in ('bound','cleanup_pending','delete_pending','detached')
         or exists (
           select 1 from jsonb_object_keys(item.value) as key(name)
           where key.name not in ('storage_object_id','intent_id','kind','role','visibility','state')
         )
    )
  end
$function$;

revoke all on function public.private_research_item_hint_media_valid(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.private_research_item_hint_media_valid(jsonb)
  to authenticated, service_role;

alter table public.research_items
  drop constraint if exists research_items_media_array_ck;
alter table public.research_items
  add constraint research_items_media_array_ck
  check (
    public.private_research_item_hint_media_valid(media)
    and (media = '[]'::jsonb or bucket = 'hint')
  );

create or replace function public.private_research_item_hint_media_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_trusted boolean := current_user in ('postgres','supabase_admin');
begin
  if tg_op = 'INSERT' then
    if not v_trusted and new.media is distinct from '[]'::jsonb then
      raise exception 'research item media is server managed';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if not v_trusted and new.media is distinct from old.media then
      raise exception 'research item media is server managed';
    end if;
    if not v_trusted and old.media <> '[]'::jsonb
       and (new.id is distinct from old.id
         or new.user_id is distinct from old.user_id
         or new.bucket is distinct from old.bucket
         or new.entity_type is distinct from old.entity_type) then
      raise exception 'bound research item identity is server managed';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' and not v_trusted and old.media <> '[]'::jsonb then
    raise exception 'bound research item deletion requires server cleanup';
  end if;
  return old;
end
$function$;

revoke all on function public.private_research_item_hint_media_guard()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_research_item_hint_media_guard on public.research_items;
create trigger trg_research_item_hint_media_guard
before insert or update or delete on public.research_items
for each row execute function public.private_research_item_hint_media_guard();

-- Existing contribution binding remains the same, but cannot claim an object already reserved
-- by a personal hint. The shared advisory lock serializes that check with the new hint binder.
create or replace function public.private_research_item_hint_media_cross_source_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_id uuid;
  v_intent_id text;
begin
  if tg_op = 'UPDATE' and new.media is not distinct from old.media then return new; end if;
  for v_id in
    select (item->>'storage_object_id')::uuid
    from jsonb_array_elements(coalesce(new.media,'[]'::jsonb)) item
    where coalesce(item->>'storage_object_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    order by item->>'storage_object_id'
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_id::text, 0));
    if exists (
      select 1 from public.research_items ri, jsonb_array_elements(ri.media) hint_media
      where hint_media->>'storage_object_id' = v_id::text
    ) then raise exception 'storage object reserved by research item hint'; end if;
    select case
      when split_part(o.name, '/', 7) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then split_part(o.name, '/', 7)
      else null end
    into v_intent_id
    from storage.objects o
    where o.id = v_id and o.bucket_id = 'submission-inbox';
    if v_intent_id is not null and exists (
      select 1 from public.research_items ri, jsonb_array_elements(ri.media) hint_media
      where hint_media->>'intent_id' = v_intent_id
    ) then raise exception 'storage upload intent reserved by research item hint'; end if;
  end loop;
  return new;
end
$function$;

revoke all on function public.private_research_item_hint_media_cross_source_guard()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_research_contribution_hint_media_exclusion on public.research_contributions;
create trigger trg_research_contribution_hint_media_exclusion
before insert or update of media on public.research_contributions
for each row execute function public.private_research_item_hint_media_cross_source_guard();

create or replace function public.private_research_item_hint_media_reference_count(
  p_storage_object_id uuid
)
returns bigint
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    (select count(*) from public.research_items ri
      where exists (
        select 1 from jsonb_array_elements(coalesce(ri.media,'[]'::jsonb)) item
        where item->>'storage_object_id' = p_storage_object_id::text
      ))
    +
    (select count(*) from public.research_contributions rc
      where exists (
        select 1 from jsonb_array_elements(coalesce(rc.media,'[]'::jsonb)) item
        where item->>'storage_object_id' = p_storage_object_id::text
      ))
    +
    (select count(*) from public.channel_updates cu
      where cu.image_url = 'storage-object:' || p_storage_object_id::text
         or cu.thumb_url = 'storage-object:' || p_storage_object_id::text)
    +
    (select count(*) from public.gallery_images gi
      where gi.image_url = 'storage-object:' || p_storage_object_id::text
         or gi.thumb_url = 'storage-object:' || p_storage_object_id::text)
    +
    (select count(*) from public.research_objects ro
      where ro.source = 'storage-object:' || p_storage_object_id::text
         or ro.source_ref = 'storage-object:' || p_storage_object_id::text)
$function$;

revoke all on function public.private_research_item_hint_media_reference_count(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.private_research_item_hint_media_owner_check(
  p_hint_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if p_actor_id is null then raise exception 'actor required'; end if;
  if not exists (
    select 1 from public.research_items ri
    where ri.id = p_hint_id and ri.user_id = p_actor_id and ri.bucket = 'hint'
  ) then
    raise exception 'hint owner denied';
  end if;
  return jsonb_build_object('ok', true, 'hint_id', p_hint_id);
end
$function$;

create or replace function public.private_research_item_hint_media_bind(
  p_hint_id uuid,
  p_storage_path text,
  p_expected_mime text,
  p_expected_size bigint,
  p_role text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_hint public.research_items%rowtype;
  v_object record;
  v_path text := btrim(coalesce(p_storage_path,''));
  v_mime text := lower(split_part(btrim(coalesce(p_expected_mime,'')), ';', 1));
  v_actual_mime text;
  v_actual_size bigint;
  v_intent_id uuid;
  v_ref jsonb;
begin
  if p_actor_id is null then raise exception 'actor required'; end if;
  if p_role is distinct from 'evidence_image' then raise exception 'invalid media role'; end if;
  if p_expected_size is null or p_expected_size <= 0 or p_expected_size > 26214400 then raise exception 'invalid media size'; end if;
  if v_mime not in ('image/png','image/jpeg','image/webp','image/gif','image/avif') then raise exception 'unsupported image mime'; end if;
  if v_path = '' or length(v_path) > 500 or v_path like '%..%' or position(chr(92) in v_path) > 0 or v_path ~ '[[:cntrl:]]' then raise exception 'invalid storage path'; end if;
  if position('sod1820/2029/accounts/' || p_actor_id::text || '/' in v_path) <> 1 then raise exception 'storage object outside hint owner prefix'; end if;
  if split_part(v_path, '/', 7) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'invalid upload intent identity'; end if;
  v_intent_id := split_part(v_path, '/', 7)::uuid;

  select * into v_hint
  from public.research_items ri
  where ri.id = p_hint_id and ri.user_id = p_actor_id and ri.bucket = 'hint'
  for update;
  if not found then raise exception 'hint owner denied'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_path, 0));
  select o.id, o.bucket_id, o.name, o.metadata into v_object
  from storage.objects o
  where o.bucket_id = 'submission-inbox' and o.name = v_path;
  if not found then raise exception 'storage object not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_object.id::text, 0));
  select o.id, o.bucket_id, o.name, o.metadata into v_object
  from storage.objects o
  where o.id = v_object.id and o.bucket_id = 'submission-inbox' and o.name = v_path
  for update;
  if not found then raise exception 'storage object not found'; end if;

  v_actual_mime := lower(split_part(coalesce(v_object.metadata->>'mimetype',''), ';', 1));
  v_actual_size := case
    when coalesce(v_object.metadata->>'size', v_object.metadata->>'contentLength', '') ~ '^[0-9]+$'
      then coalesce(v_object.metadata->>'size', v_object.metadata->>'contentLength')::bigint
    else -1
  end;
  if v_actual_mime is distinct from v_mime or v_actual_size is distinct from p_expected_size then raise exception 'stored object readback mismatch'; end if;
  if (v_mime = 'image/png' and v_path !~* '\.png$')
     or (v_mime = 'image/jpeg' and v_path !~* '\.(jpg|jpeg)$')
     or (v_mime = 'image/webp' and v_path !~* '\.webp$')
     or (v_mime = 'image/gif' and v_path !~* '\.gif$')
     or (v_mime = 'image/avif' and v_path !~* '\.avif$') then
    raise exception 'stored object extension mismatch';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'intent_id' = v_intent_id::text and item->>'state' = 'detached'
  ) then raise exception 'media binding revoked'; end if;

  if exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'storage_object_id' = v_object.id::text and item->>'state' in ('cleanup_pending','delete_pending')
  ) then raise exception 'media binding revoked'; end if;

  if exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'storage_object_id' = v_object.id::text and item->>'state' = 'bound'
  ) then
    return jsonb_build_object(
      'ok', true, 'already_bound', true, 'hint_id', p_hint_id,
      'storage_object_id', v_object.id, 'kind', 'image', 'role', 'evidence_image'
    );
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'role' = 'evidence_image' and item->>'state' <> 'detached'
  ) then raise exception 'hint media role already bound'; end if;

  if public.private_research_item_hint_media_reference_count(v_object.id) <> 0 then
    raise exception 'storage object already referenced';
  end if;

  v_ref := jsonb_build_object(
    'storage_object_id', v_object.id,
    'intent_id', v_intent_id,
    'kind', 'image',
    'role', 'evidence_image',
    'visibility', 'private',
    'state', 'bound'
  );
  update public.research_items set media = media || jsonb_build_array(v_ref) where id = p_hint_id;

  return jsonb_build_object(
    'ok', true, 'already_bound', false, 'hint_id', p_hint_id,
    'storage_object_id', v_object.id, 'kind', 'image', 'role', 'evidence_image'
  );
end
$function$;

create or replace function public.private_research_item_hint_media_access(
  p_hint_id uuid,
  p_storage_object_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_object record;
  v_size bigint;
begin
  if p_actor_id is null then raise exception 'actor required'; end if;
  if not exists (
    select 1
    from public.research_items ri, jsonb_array_elements(ri.media) item
    where ri.id = p_hint_id
      and ri.user_id = p_actor_id
      and ri.bucket = 'hint'
      and item->>'storage_object_id' = p_storage_object_id::text
      and item->>'kind' = 'image'
      and item->>'role' = 'evidence_image'
      and item->>'visibility' = 'private'
      and item->>'state' = 'bound'
  ) then raise exception 'hint media access denied'; end if;

  select o.id, o.bucket_id, o.name, o.metadata into v_object
  from storage.objects o
  where o.id = p_storage_object_id and o.bucket_id = 'submission-inbox'
    and position('sod1820/2029/accounts/' || p_actor_id::text || '/' in o.name) = 1;
  if not found then raise exception 'storage object not found'; end if;
  v_size := case
    when coalesce(v_object.metadata->>'size', v_object.metadata->>'contentLength', '') ~ '^[0-9]+$'
      then coalesce(v_object.metadata->>'size', v_object.metadata->>'contentLength')::bigint
    else 0
  end;
  return jsonb_build_object(
    'ok', true, 'bucket', v_object.bucket_id, 'path', v_object.name,
    'mime', lower(split_part(coalesce(v_object.metadata->>'mimetype',''), ';', 1)),
    'size', v_size
  );
end
$function$;

create or replace function public.private_research_item_hint_media_detach(
  p_hint_id uuid,
  p_storage_object_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_hint public.research_items%rowtype;
  v_object record;
  v_size bigint;
begin
  if p_actor_id is null then raise exception 'actor required'; end if;
  select * into v_hint from public.research_items ri
  where ri.id = p_hint_id and ri.user_id = p_actor_id and ri.bucket = 'hint'
  for update;
  if not found then raise exception 'hint owner denied'; end if;

  if not exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'storage_object_id' = p_storage_object_id::text
  ) then raise exception 'hint media ref not found'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'storage_object_id' = p_storage_object_id::text and item->>'state' = 'detached'
  ) then
    return jsonb_build_object('ok', true, 'object_missing', true, 'already_detached', true, 'hint_id', p_hint_id, 'storage_object_id', p_storage_object_id);
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'storage_object_id' = p_storage_object_id::text and item->>'state' = 'delete_pending'
  ) then raise exception 'hint deletion pending'; end if;

  update public.research_items ri
  set media = (
    select coalesce(jsonb_agg(
      case when item.value->>'storage_object_id' = p_storage_object_id::text
        then jsonb_set(item.value, '{state}', '"cleanup_pending"'::jsonb, false)
        else item.value end order by item.ordinality
    ), '[]'::jsonb)
    from jsonb_array_elements(ri.media) with ordinality as item(value, ordinality)
  )
  where ri.id = p_hint_id;

  perform pg_advisory_xact_lock(hashtextextended(p_storage_object_id::text, 0));
  select o.id, o.bucket_id, o.name, o.metadata into v_object
  from storage.objects o
  where o.id = p_storage_object_id and o.bucket_id = 'submission-inbox'
    and position('sod1820/2029/accounts/' || p_actor_id::text || '/' in o.name) = 1
  for update;
  if not found then
    return jsonb_build_object('ok', true, 'object_missing', true, 'hint_id', p_hint_id, 'storage_object_id', p_storage_object_id);
  end if;
  v_size := case
    when coalesce(v_object.metadata->>'size', v_object.metadata->>'contentLength', '') ~ '^[0-9]+$'
      then coalesce(v_object.metadata->>'size', v_object.metadata->>'contentLength')::bigint
    else 0
  end;
  return jsonb_build_object(
    'ok', true, 'object_missing', false, 'hint_id', p_hint_id,
    'storage_object_id', p_storage_object_id, 'bucket', v_object.bucket_id,
    'path', v_object.name,
    'mime', lower(split_part(coalesce(v_object.metadata->>'mimetype',''), ';', 1)),
    'size', v_size
  );
end
$function$;

create or replace function public.private_research_item_hint_media_finalize(
  p_hint_id uuid,
  p_storage_object_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_hint public.research_items%rowtype;
begin
  if p_actor_id is null then raise exception 'actor required'; end if;
  select * into v_hint from public.research_items ri where ri.id = p_hint_id for update;
  if not found then
    return jsonb_build_object('ok', true, 'already_finalized', true, 'hint_missing', true);
  end if;
  if v_hint.user_id is distinct from p_actor_id or v_hint.bucket is distinct from 'hint' then raise exception 'hint owner denied'; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'storage_object_id' = p_storage_object_id::text
  ) then return jsonb_build_object('ok', true, 'already_finalized', true, 'hint_missing', false); end if;
  if exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'storage_object_id' = p_storage_object_id::text and item->>'state' = 'detached'
  ) then return jsonb_build_object('ok', true, 'already_finalized', true, 'hint_missing', false); end if;
  if not exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'storage_object_id' = p_storage_object_id::text and item->>'state' = 'cleanup_pending'
  ) then raise exception 'media cleanup not pending'; end if;

  update public.research_items ri
  set media = (
    select coalesce(jsonb_agg(
      case when item.value->>'storage_object_id' = p_storage_object_id::text
        then jsonb_set(item.value, '{state}', '"detached"'::jsonb, false)
        else item.value end order by item.ordinality
    ), '[]'::jsonb)
    from jsonb_array_elements(ri.media) with ordinality as item(value, ordinality)
  )
  where ri.id = p_hint_id;
  return jsonb_build_object('ok', true, 'already_finalized', false, 'hint_missing', false);
end
$function$;

create or replace function public.private_research_item_hint_delete(
  p_hint_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_hint public.research_items%rowtype;
  v_media jsonb;
begin
  if p_actor_id is null then raise exception 'actor required'; end if;
  select * into v_hint from public.research_items ri
  where ri.id = p_hint_id and ri.user_id = p_actor_id and ri.bucket = 'hint'
  for update;
  if not found then raise exception 'hint owner denied'; end if;

  if v_hint.media = '[]'::jsonb then
    delete from public.research_items where id = p_hint_id;
    return jsonb_build_object('ok', true, 'hint_id', p_hint_id, 'deleted', true, 'delete_pending', false, 'media', '[]'::jsonb);
  end if;

  update public.research_items ri
  set media = (
    select coalesce(jsonb_agg(jsonb_set(item.value, '{state}', '"delete_pending"'::jsonb, false)
      order by item.ordinality), '[]'::jsonb)
    from jsonb_array_elements(ri.media) with ordinality as item(value, ordinality)
  )
  where ri.id = p_hint_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'storage_object_id', o.id,
    'bucket', o.bucket_id,
    'path', o.name,
    'mime', lower(split_part(coalesce(o.metadata->>'mimetype',''), ';', 1)),
    'size', case
      when coalesce(o.metadata->>'size', o.metadata->>'contentLength', '') ~ '^[0-9]+$'
        then coalesce(o.metadata->>'size', o.metadata->>'contentLength')::bigint
      else 0 end
  )), '[]'::jsonb) into v_media
  from jsonb_array_elements(v_hint.media) item
  join storage.objects o on o.id::text = item->>'storage_object_id'
    and o.bucket_id = 'submission-inbox'
    and position('sod1820/2029/accounts/' || p_actor_id::text || '/' in o.name) = 1;

  return jsonb_build_object('ok', true, 'hint_id', p_hint_id, 'deleted', false, 'delete_pending', true, 'media', v_media);
end
$function$;

create or replace function public.private_research_item_hint_delete_finalize(
  p_hint_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_hint public.research_items%rowtype;
begin
  if p_actor_id is null then raise exception 'actor required'; end if;
  select * into v_hint from public.research_items ri where ri.id = p_hint_id for update;
  if not found then return jsonb_build_object('ok', true, 'deleted', true, 'delete_pending', false, 'already_finalized', true); end if;
  if v_hint.user_id is distinct from p_actor_id or v_hint.bucket is distinct from 'hint' then raise exception 'hint owner denied'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_hint.media) item
    where item->>'state' is distinct from 'delete_pending'
  ) then raise exception 'hint deletion not pending'; end if;
  if exists (
    select 1
    from jsonb_array_elements(v_hint.media) item
    join storage.objects o on o.id::text = item->>'storage_object_id' and o.bucket_id = 'submission-inbox'
  ) then
    return jsonb_build_object('ok', true, 'deleted', false, 'delete_pending', true, 'already_finalized', false);
  end if;
  delete from public.research_items where id = p_hint_id;
  return jsonb_build_object('ok', true, 'deleted', true, 'delete_pending', false, 'already_finalized', false);
end
$function$;

create or replace function public.private_research_item_hint_media_cleanup_access(
  p_hint_id uuid,
  p_storage_object_id uuid,
  p_storage_path text,
  p_cleanup_mode text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_hint public.research_items%rowtype;
  v_object record;
begin
  if p_actor_id is null then raise exception 'actor required'; end if;
  if p_cleanup_mode not in ('detach','delete') then raise exception 'invalid cleanup mode'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_storage_object_id::text, 0));
  select * into v_hint from public.research_items ri where ri.id = p_hint_id for update;
  if found then
    if v_hint.user_id is distinct from p_actor_id or v_hint.bucket is distinct from 'hint' then raise exception 'hint owner denied'; end if;
    if not exists (
      select 1 from jsonb_array_elements(v_hint.media) item
      where item->>'storage_object_id' = p_storage_object_id::text
        and item->>'state' = case when p_cleanup_mode = 'delete' then 'delete_pending' else 'cleanup_pending' end
    ) then raise exception 'media cleanup not pending'; end if;
  elsif public.private_research_item_hint_media_reference_count(p_storage_object_id) <> 0 then
    raise exception 'orphan object still referenced';
  end if;

  select o.id, o.bucket_id, o.name into v_object
  from storage.objects o
  where o.id = p_storage_object_id and o.bucket_id = 'submission-inbox'
    and o.name = p_storage_path
    and position('sod1820/2029/accounts/' || p_actor_id::text || '/' in o.name) = 1
  for update;
  if not found then
    return jsonb_build_object('ok', true, 'object_missing', true, 'bucket', 'submission-inbox', 'path', p_storage_path);
  end if;
  if not exists (select 1 from public.research_items ri where ri.id = p_hint_id)
     and public.private_research_item_hint_media_reference_count(p_storage_object_id) <> 0 then
    raise exception 'orphan object still referenced';
  end if;
  return jsonb_build_object('ok', true, 'object_missing', false, 'bucket', v_object.bucket_id, 'path', v_object.name);
end
$function$;

create or replace function public.private_research_item_hint_media_orphan_preview(
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_rows jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then raise exception 'invalid preview limit'; end if;
  select coalesce(jsonb_agg(to_jsonb(candidate)), '[]'::jsonb) into v_rows
  from (
    select o.id as storage_object_id, o.bucket_id as bucket, o.name as path,
      greatest(o.created_at, coalesce(o.updated_at, o.created_at), coalesce(o.last_accessed_at, o.created_at)) as last_activity_at,
      'unreferenced_after_upload_capability_window'::text as reason,
      false as execution_authorized
    from storage.objects o
    where o.bucket_id = 'submission-inbox'
      and o.name ~ '^sod1820/2029/accounts/[0-9a-f-]{36}/'
      and greatest(o.created_at, coalesce(o.updated_at, o.created_at), coalesce(o.last_accessed_at, o.created_at)) <= now() - interval '7200 seconds'
      and public.private_research_item_hint_media_reference_count(o.id) = 0
    order by o.created_at, o.id
    limit p_limit
  ) candidate;
  return jsonb_build_object(
    'ok', true,
    'dry_run', true,
    'executor_enabled', false,
    'retention_ttl_decided', false,
    'objects', v_rows
  );
end
$function$;

revoke all on function public.private_research_item_hint_media_owner_check(uuid,uuid) from public, anon, authenticated;
revoke all on function public.private_research_item_hint_media_bind(uuid,text,text,bigint,text,uuid) from public, anon, authenticated;
revoke all on function public.private_research_item_hint_media_access(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.private_research_item_hint_media_detach(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.private_research_item_hint_media_finalize(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.private_research_item_hint_delete(uuid,uuid) from public, anon, authenticated;
revoke all on function public.private_research_item_hint_delete_finalize(uuid,uuid) from public, anon, authenticated;
revoke all on function public.private_research_item_hint_media_cleanup_access(uuid,uuid,text,text,uuid) from public, anon, authenticated;
revoke all on function public.private_research_item_hint_media_orphan_preview(integer) from public, anon, authenticated;

grant execute on function public.private_research_item_hint_media_owner_check(uuid,uuid) to service_role;
grant execute on function public.private_research_item_hint_media_bind(uuid,text,text,bigint,text,uuid) to service_role;
grant execute on function public.private_research_item_hint_media_access(uuid,uuid,uuid) to service_role;
grant execute on function public.private_research_item_hint_media_detach(uuid,uuid,uuid) to service_role;
grant execute on function public.private_research_item_hint_media_finalize(uuid,uuid,uuid) to service_role;
grant execute on function public.private_research_item_hint_delete(uuid,uuid) to service_role;
grant execute on function public.private_research_item_hint_delete_finalize(uuid,uuid) to service_role;
grant execute on function public.private_research_item_hint_media_cleanup_access(uuid,uuid,text,text,uuid) to service_role;
grant execute on function public.private_research_item_hint_media_orphan_preview(integer) to service_role;

comment on column public.research_items.media is
  'Server-managed private hint attachment refs only: opaque storage_object_id/intent_id + kind/role/visibility/state. Never stores paths, URLs or tokens.';
comment on function public.private_research_item_hint_media_orphan_preview(integer) is
  'Dry-run only. Shows unreferenced private account objects after the 7200-second upload-capability window; authorizes no TTL, purge or executor.';
