\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table auth.users (id uuid primary key);
create table public.research_items (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  bucket text not null,
  entity_type text not null,
  entity_ref text,
  title text,
  link text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.research_contributions (
  id uuid primary key,
  media jsonb not null default '[]'::jsonb
);
create table public.channel_updates (id uuid primary key, image_url text, thumb_url text);
create table public.gallery_images (id uuid primary key, image_url text, thumb_url text);
create table public.research_objects (id uuid primary key, source text, source_ref text);
create table storage.objects (
  id uuid primary key,
  bucket_id text not null,
  name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  last_accessed_at timestamptz,
  unique (bucket_id, name)
);

alter table public.research_items enable row level security;
create policy ri_select_own on public.research_items for select to authenticated using (user_id = (select auth.uid()));
create policy ri_insert_own on public.research_items for insert to authenticated with check (user_id = (select auth.uid()));
create policy ri_update_own on public.research_items for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy ri_delete_own on public.research_items for delete to authenticated using (user_id = (select auth.uid()));
grant usage on schema public, auth to authenticated, service_role;
grant select, insert, update, delete on public.research_items to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select, insert, update, delete on storage.objects to service_role;
grant execute on function auth.uid() to authenticated, service_role;

insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');
insert into public.research_items(id,user_id,bucket,entity_type,entity_ref,title,metadata) values
  ('a1000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','hint','hint','one','hint one','{}'),
  ('a1000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','hint','hint','two','hint two','{}'),
  ('a2000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','hint','hint','other','other hint','{}'),
  ('a1000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','library','phrase','keep','library row','{}'),
  ('a1000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','hint','hint','free','unbound hint','{}');

insert into public.research_contributions(id,media) values
  ('c1000000-0000-4000-8000-000000000001','[]'),
  ('c1000000-0000-4000-8000-000000000002','[{"storage_object_id":"d1000000-0000-4000-8000-000000000006","kind":"image","role":"attachment","visibility":"private"}]');
insert into public.channel_updates(id,image_url) values
  ('e1000000-0000-4000-8000-000000000001','storage-object:d1000000-0000-4000-8000-000000000007');

insert into storage.objects(id,bucket_id,name,metadata,created_at,updated_at) values
  ('d1000000-0000-4000-8000-000000000001','submission-inbox','sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000001/image/original.png','{"mimetype":"image/png","size":1024}',now(),now()),
  ('d1000000-0000-4000-8000-000000000002','submission-inbox','sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000002/image/original.webp','{"mimetype":"image/webp","size":2048}',now(),now()),
  ('d1000000-0000-4000-8000-000000000003','submission-inbox','sod1820/2029/accounts/22222222-2222-4222-8222-222222222222/2026/10/f2000000-0000-4000-8000-000000000003/image/original.png','{"mimetype":"image/png","size":1024}',now(),now()),
  ('d1000000-0000-4000-8000-000000000004','submission-inbox','sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000004/image/original.png','{"mimetype":"image/jpeg","size":999}',now(),now()),
  ('d1000000-0000-4000-8000-000000000005','submission-inbox','sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000005/image/original.png','{"mimetype":"image/png","size":512}',now() - interval '3 hours',now() - interval '3 hours'),
  ('d1000000-0000-4000-8000-000000000006','submission-inbox','sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000006/image/original.png','{"mimetype":"image/png","size":1024}',now() - interval '3 hours',now() - interval '3 hours'),
  ('d1000000-0000-4000-8000-000000000007','submission-inbox','sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000007/image/original.png','{"mimetype":"image/png","size":1024}',now() - interval '3 hours',now() - interval '3 hours'),
  ('d1000000-0000-4000-8000-000000000008','submission-inbox','sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000008/image/original.avif','{"mimetype":"image/avif","size":4096}',now(),now()),
  ('d1000000-0000-4000-8000-000000000009','media','sod1820/2029/image/2026/10/f1000000-0000-4000-8000-000000000009/original.png','{"mimetype":"image/png","size":1024}',now(),now());

create or replace function pg_temp.ok(condition boolean, message text) returns void language plpgsql as $$
begin if condition is not true then raise exception 'ASSERT: %', message; end if; end $$;
create or replace function pg_temp.fails(statement text, expected text, message text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then
    if sqlerrm ilike '%' || expected || '%' then return; end if;
    raise exception 'ASSERT: % (wrong error: %)', message, sqlerrm;
  end;
  raise exception 'ASSERT: % (statement unexpectedly succeeded)', message;
end $$;

begin;
\ir ../../supabase/migrations/20261026212450_research_item_hint_private_media_v1.sql

select pg_temp.ok(
  public.private_research_item_hint_media_valid(
    '[{"storage_object_id":"d1000000-0000-4000-8000-000000000002","intent_id":"f1000000-0000-4000-8000-000000000002","kind":"image","role":"evidence_image","visibility":"private"}]'::jsonb
  ) is false,
  'media validator rejects a missing state rather than accepting SQL unknown'
);
select pg_temp.ok(
  public.private_research_item_hint_media_valid(
    '[{"storage_object_id":"d1000000-0000-4000-8000-000000000002","intent_id":"f1000000-0000-4000-8000-000000000002","kind":"image","role":"evidence_image","visibility":"private","state":null}]'::jsonb
  ) is false,
  'media validator rejects a JSON null state'
);
select pg_temp.ok(
  public.private_research_item_hint_media_valid(
    '[{"storage_object_id":"d1000000-0000-4000-8000-000000000002","intent_id":"f1000000-0000-4000-8000-000000000002","kind":"image","role":"evidence_image","visibility":"private","state":"unknown"}]'::jsonb
  ) is false,
  'media validator rejects a noncanonical state'
);
select pg_temp.ok(
  (select bool_and(public.private_research_item_hint_media_valid(jsonb_build_array(jsonb_build_object(
    'storage_object_id','d1000000-0000-4000-8000-000000000002',
    'intent_id','f1000000-0000-4000-8000-000000000002',
    'kind','image','role','evidence_image','visibility','private','state',allowed_state
  )))) from unnest(array['bound','cleanup_pending','delete_pending','detached']) as states(allowed_state)),
  'media validator accepts every canonical lifecycle state'
);
-- Execute as the fixture table owner: the server-managed trigger permits this role,
-- so these failures prove that the table constraint itself rejects unsafe shapes.
select pg_temp.fails($q$
  update public.research_items
  set media='[{"storage_object_id":"d1000000-0000-4000-8000-000000000002","intent_id":"f1000000-0000-4000-8000-000000000002","kind":"image","role":"evidence_image","visibility":"private"}]'
  where id='a1000000-0000-4000-8000-000000000002'
$q$,'research_items_media_array_ck','table constraint rejects a missing state');
select pg_temp.fails($q$
  update public.research_items
  set media='[{"storage_object_id":"d1000000-0000-4000-8000-000000000002","intent_id":"f1000000-0000-4000-8000-000000000002","kind":"image","role":"evidence_image","visibility":"private","state":null}]'
  where id='a1000000-0000-4000-8000-000000000002'
$q$,'research_items_media_array_ck','table constraint rejects a JSON null state');

select pg_temp.ok(
  has_function_privilege('service_role','public.private_research_item_hint_media_bind(uuid,text,text,bigint,text,uuid)','EXECUTE'),
  'service role can call the narrow binder'
);
select pg_temp.ok(
  not has_function_privilege('authenticated','public.private_research_item_hint_media_bind(uuid,text,text,bigint,text,uuid)','EXECUTE')
  and not has_function_privilege('anon','public.private_research_item_hint_media_bind(uuid,text,text,bigint,text,uuid)','EXECUTE'),
  'client roles cannot call private media functions'
);
select pg_temp.ok(
  not has_function_privilege('authenticated','public.private_research_item_hint_media_orphan_preview(integer)','EXECUTE'),
  'orphan preview is service-only'
);

set local role service_role;
select pg_temp.fails($q$
  update public.research_items
  set media='[{"storage_object_id":"d1000000-0000-4000-8000-000000000002","kind":"image","role":"evidence_image","visibility":"private","state":"bound"}]'
  where id='a1000000-0000-4000-8000-000000000002'
$q$,'server managed','service key cannot bypass the narrow server RPC with direct JSON');
select pg_temp.ok(
  (public.private_research_item_hint_media_owner_check(
    'a1000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111'
  )->>'ok')::boolean,
  'owner check accepts the exact hint owner'
);
select pg_temp.fails($q$
  select public.private_research_item_hint_media_owner_check(
    'a1000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222')
$q$,'hint owner denied','other owner is denied');
select pg_temp.fails($q$
  select public.private_research_item_hint_media_owner_check(
    'a1000000-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333333')
$q$,'hint owner denied','non-owning admin identity receives no exception');
select pg_temp.fails($q$
  select public.private_research_item_hint_media_owner_check(
    'a1000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111')
$q$,'hint owner denied','wrong bucket is denied');

select pg_temp.ok(
  (public.private_research_item_hint_media_bind(
    'a1000000-0000-4000-8000-000000000001',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000001/image/original.png',
    'image/png',1024,'evidence_image','11111111-1111-4111-8111-111111111111'
  )->>'already_bound')::boolean is false,
  'verified owner object binds once'
);
select pg_temp.ok(
  (public.private_research_item_hint_media_bind(
    'a1000000-0000-4000-8000-000000000001',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000001/image/original.png',
    'image/png',1024,'evidence_image','11111111-1111-4111-8111-111111111111'
  )->>'already_bound')::boolean,
  'bind retry is idempotent'
);
select pg_temp.ok(
  (select media = '[{"kind":"image","role":"evidence_image","state":"bound","visibility":"private","intent_id":"f1000000-0000-4000-8000-000000000001","storage_object_id":"d1000000-0000-4000-8000-000000000001"}]'::jsonb
   from public.research_items where id='a1000000-0000-4000-8000-000000000001'),
  'hint persists only opaque bounded media semantics'
);
select pg_temp.ok(
  (public.private_research_item_hint_media_access(
    'a1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111'
  )->>'size')::bigint = 1024,
  'owner access resolves the exact bound object'
);
select pg_temp.fails($q$
  select public.private_research_item_hint_media_access(
    'a1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222')
$q$,'access denied','owner B cannot read owner A media');
select pg_temp.fails($q$
  select public.private_research_item_hint_media_bind(
    'a1000000-0000-4000-8000-000000000002',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000001/image/original.png',
    'image/png',1024,'evidence_image','11111111-1111-4111-8111-111111111111')
$q$,'already referenced','one object cannot cross-bind to another hint');
select pg_temp.fails($q$
  select public.private_research_item_hint_media_bind(
    'a1000000-0000-4000-8000-000000000002',
    'sod1820/2029/accounts/22222222-2222-4222-8222-222222222222/2026/10/f2000000-0000-4000-8000-000000000003/image/original.png',
    'image/png',1024,'evidence_image','11111111-1111-4111-8111-111111111111')
$q$,'outside hint owner prefix','another account path is rejected');
select pg_temp.fails($q$
  select public.private_research_item_hint_media_bind(
    'a1000000-0000-4000-8000-000000000002',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000004/image/original.png',
    'image/png',1024,'evidence_image','11111111-1111-4111-8111-111111111111')
$q$,'readback mismatch','MIME and size mismatch cannot bind');
select pg_temp.fails($q$
  select public.private_research_item_hint_media_bind(
    'a1000000-0000-4000-8000-000000000002',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000006/image/original.png',
    'image/png',1024,'evidence_image','11111111-1111-4111-8111-111111111111')
$q$,'already referenced','contribution-bound object cannot bind to hint');
select pg_temp.fails($q$
  select public.private_research_item_hint_media_bind(
    'a1000000-0000-4000-8000-000000000002',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000007/image/original.png',
    'image/png',1024,'evidence_image','11111111-1111-4111-8111-111111111111')
$q$,'already referenced','channel-bound object cannot bind to hint');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select pg_temp.fails($q$
  insert into public.research_items(id,user_id,bucket,entity_type,entity_ref,media)
  values('a1000000-0000-4000-8000-000000000099','11111111-1111-4111-8111-111111111111','hint','hint','forged',
    '[{"storage_object_id":"d1000000-0000-4000-8000-000000000002","kind":"image","role":"evidence_image","visibility":"private","state":"bound"}]')
$q$,'server managed','direct insert cannot manufacture a binding');
select pg_temp.fails($q$
  update public.research_items set media='[{"storage_object_id":"d1000000-0000-4000-8000-000000000002","kind":"image","role":"evidence_image","visibility":"private","state":"bound"}]'
  where id='a1000000-0000-4000-8000-000000000001'
$q$,'server managed','direct media JSON replacement is blocked');
update public.research_items set metadata='{"image_url":"submission-inbox/forged","storage_object_id":"d1000000-0000-4000-8000-000000000002"}'
where id='a1000000-0000-4000-8000-000000000001';
select pg_temp.ok(
  (select media->0->>'storage_object_id'='d1000000-0000-4000-8000-000000000001' from public.research_items where id='a1000000-0000-4000-8000-000000000001'),
  'metadata forgery cannot change authoritative binding'
);
select pg_temp.fails($q$
  update public.research_items set bucket='library' where id='a1000000-0000-4000-8000-000000000001'
$q$,'identity is server managed','bound hint cannot move bucket');
select pg_temp.fails($q$
  delete from public.research_items where id='a1000000-0000-4000-8000-000000000001'
$q$,'requires server cleanup','direct delete cannot orphan bound media');
update public.research_items set title='library preserved' where id='a1000000-0000-4000-8000-000000000003';
delete from public.research_items where id='a1000000-0000-4000-8000-000000000004';
select pg_temp.ok(
  (select title='library preserved' from public.research_items where id='a1000000-0000-4000-8000-000000000003')
  and not exists (select 1 from public.research_items where id='a1000000-0000-4000-8000-000000000004'),
  'ordinary research items and unbound hints retain existing writes'
);
reset role;

set local role service_role;
select public.private_research_item_hint_media_detach(
  'a1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111');
select pg_temp.fails($q$
  select public.private_research_item_hint_media_access(
    'a1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111')
$q$,'access denied','detach immediately revokes new reads');
select pg_temp.fails($q$
  select public.private_research_item_hint_media_bind(
    'a1000000-0000-4000-8000-000000000001',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000001/image/original.png',
    'image/png',1024,'evidence_image','11111111-1111-4111-8111-111111111111')
$q$,'binding revoked','cleanup-pending object cannot rebind');
select pg_temp.fails($q$
  update public.research_contributions set media = media || '[{"storage_object_id":"d1000000-0000-4000-8000-000000000001","kind":"image","role":"attachment","visibility":"private"}]'
  where id='c1000000-0000-4000-8000-000000000001'
$q$,'reserved by research item hint','contribution cannot claim a hint cleanup object');
reset role;
delete from storage.objects where id='d1000000-0000-4000-8000-000000000001';
set local role service_role;
select public.private_research_item_hint_media_finalize(
  'a1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111');
select pg_temp.ok(
  (select media->0->>'state'='detached' and media->0->>'intent_id'='f1000000-0000-4000-8000-000000000001'
   from public.research_items where id='a1000000-0000-4000-8000-000000000001'),
  'detach leaves only an opaque revocation tombstone after binary deletion'
);

reset role;
insert into storage.objects(id,bucket_id,name,metadata,created_at,updated_at) values
  ('d1000000-0000-4000-8000-000000000010','submission-inbox','sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000001/image/original.png','{"mimetype":"image/png","size":1024}',now(),now());
set local role service_role;
select pg_temp.fails($q$
  select public.private_research_item_hint_media_bind(
    'a1000000-0000-4000-8000-000000000001',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000001/image/original.png',
    'image/png',1024,'evidence_image','11111111-1111-4111-8111-111111111111')
$q$,'binding revoked','old upload and binding receipts cannot resurrect a detached intent');
select pg_temp.fails($q$
  update public.research_contributions set media = media || '[{"storage_object_id":"d1000000-0000-4000-8000-000000000010","kind":"image","role":"attachment","visibility":"private"}]'
  where id='c1000000-0000-4000-8000-000000000001'
$q$,'upload intent reserved','a detached hint intent cannot be rebound through contributions');
reset role;
delete from storage.objects where id='d1000000-0000-4000-8000-000000000010';
set local role service_role;

select public.private_research_item_hint_media_bind(
  'a1000000-0000-4000-8000-000000000001',
  'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000002/image/original.webp',
  'image/webp',2048,'evidence_image','11111111-1111-4111-8111-111111111111');
select pg_temp.ok(
  (public.private_research_item_hint_delete('a1000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111')->>'delete_pending')::boolean,
  'item deletion enters a recoverable tombstone before binary deletion'
);
select pg_temp.ok(
  exists(select 1 from public.research_items where id='a1000000-0000-4000-8000-000000000001')
  and (select media->0->>'state'='delete_pending' from public.research_items where id='a1000000-0000-4000-8000-000000000001'),
  'failed binary deletion retains an unreadable retry record'
);
select pg_temp.fails($q$
  select public.private_research_item_hint_media_cleanup_access(
    'a1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000002/image/original.webp',
    'detach','11111111-1111-4111-8111-111111111111')
$q$,'cleanup not pending','cleanup purpose cannot be swapped');
select pg_temp.ok(
  (public.private_research_item_hint_media_cleanup_access(
    'a1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000002/image/original.webp',
    'delete','11111111-1111-4111-8111-111111111111')->>'ok')::boolean,
  'delete retry resolves only the exact tombstoned object'
);
select pg_temp.ok(
  (public.private_research_item_hint_delete_finalize('a1000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111')->>'delete_pending')::boolean,
  'hint cannot finalize while its binary still exists'
);
reset role;
delete from storage.objects where id='d1000000-0000-4000-8000-000000000002';
set local role service_role;
select pg_temp.ok(
  (public.private_research_item_hint_delete_finalize('a1000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111')->>'deleted')::boolean,
  'hint deletes after every binary is gone'
);

select pg_temp.ok(
  (public.private_research_item_hint_media_bind(
    'a1000000-0000-4000-8000-000000000002',
    'sod1820/2029/accounts/11111111-1111-4111-8111-111111111111/2026/10/f1000000-0000-4000-8000-000000000008/image/original.avif',
    'image/avif',4096,'evidence_image','11111111-1111-4111-8111-111111111111')->>'ok')::boolean,
  'second hint binds independently'
);
select pg_temp.ok(
  (public.private_research_item_hint_delete('a1000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111')->>'delete_pending')::boolean,
  'second delete is staged'
);
reset role;
delete from storage.objects where id='d1000000-0000-4000-8000-000000000008';
set local role service_role;
select pg_temp.ok(
  (public.private_research_item_hint_delete_finalize('a1000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111')->>'deleted')::boolean,
  'delete retry converges without duplicate links'
);

select pg_temp.ok(
  (public.private_research_item_hint_media_orphan_preview(100)->>'dry_run')::boolean
  and not (public.private_research_item_hint_media_orphan_preview(100)->>'executor_enabled')::boolean
  and not (public.private_research_item_hint_media_orphan_preview(100)->>'retention_ttl_decided')::boolean,
  'retention remains dry-run-only with no guessed TTL or executor'
);
select pg_temp.ok(
  (public.private_research_item_hint_media_orphan_preview(100)->'objects') @>
    '[{"storage_object_id":"d1000000-0000-4000-8000-000000000005"}]'::jsonb,
  'old unreferenced object appears only after upload capability window'
);
select pg_temp.ok(
  not ((public.private_research_item_hint_media_orphan_preview(100)->'objects') @>
    '[{"storage_object_id":"d1000000-0000-4000-8000-000000000006"}]'::jsonb)
  and not ((public.private_research_item_hint_media_orphan_preview(100)->'objects') @>
    '[{"storage_object_id":"d1000000-0000-4000-8000-000000000007"}]'::jsonb)
  and not ((public.private_research_item_hint_media_orphan_preview(100)->'objects') @>
    '[{"storage_object_id":"d1000000-0000-4000-8000-000000000003"}]'::jsonb),
  'contribution, channel and recent/cross-owner objects are not cleanup candidates'
);
reset role;

rollback;

select pg_temp.ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='research_items' and column_name='media'
  ),
  'migration rolls back cleanly in the disposable database'
);
select pg_temp.ok(
  to_regprocedure('public.private_research_item_hint_media_bind(uuid,text,text,bigint,text,uuid)') is null,
  'rollback removes private media RPCs'
);

\echo 'research item hint private media SQL acceptance: PASS'
