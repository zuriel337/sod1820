-- Run in a disposable PostgreSQL database only. Loads the real research RPCs.
\set ON_ERROR_STOP on
\ir test-research-sync.sql
reset role;
create table public.posts(id bigint primary key, wp_id bigint, slug text, source text, tags text[], content text);
create table public.comments(wp_id bigint primary key, post_wp_id bigint, parent_wp_id bigint, author_name text, content text, date timestamptz, status text);
create table public.users(id uuid primary key, display_name text, username text);
create table public.contributors(id uuid primary key, user_id uuid, display_name text, trusted boolean);
create table public.research_contributions(id uuid primary key default gen_random_uuid(), author_user_id uuid, author_contributor_id uuid,
  author_name text, intent text, origin text, research_state text, status text, target_type text, target_id text, parent_id uuid,
  title text, body text, gematria_claim jsonb, image_url text, media jsonb default '[]', reactions jsonb default '{}',
  created_at timestamptz default now(), last_activity_at timestamptz);
create table public.anon_contrib_log(ip text, created_at timestamptz default now());
create table public.contribution_events(user_id uuid, kind text, ref text, value integer, source text, metadata jsonb);
create function public.contribution_weight(text, boolean, boolean, boolean) returns integer language sql immutable as $$select 1$$;
insert into public.users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','חשבון בדיקה','local-review');
insert into public.posts values
  (5113, null, 'bennett-melach-631-78', 'ai', '{}', '<section id="bennett-salt-covenant-unity-20261119" data-sod-unit="bennett-salt-covenant-unity-20261119"><h2>ברית מלח</h2></section><section id="other-unit" data-sod-unit="other-unit"><h2>יחידה נוספת</h2></section>'),
  (12, 42, 'historical', 'wordpress', '{}', '<p>פוסט ותיק</p>'),
  (13, 43, 'hidden', 'ai', ARRAY['פורום'], '<section id="other-unit"></section>');
insert into public.comments values
  (414, 42, 0, 'ארכיון', '<p>תגובה ותיקה</p>', now(), 'publish'),
  (415, 42, 414, 'ארכיון', 'תגובה בהמתנה', now(), 'hold');
insert into public.research_contributions (target_type,target_id,status,body,author_name)
  values ('post','12','approved','תגובה מאוחרת לאותו פוסט','קורא'),
         ('post','5113','pending','תגובה ממתינה','קורא'),
         ('post','13','approved','תוכן מוסתר','קורא');
\ir ../supabase/migrations/20260917163500_research_contribution_moderation_alignment_v1.sql
\ir ../supabase/proposed/post_discussion_canonical_v1.sql
set role anon;
select pg_temp.fails($q$select public.post_discussion_publish_v1(5113,null,'unauthorized')$q$,'permission denied');
select pg_temp.ok((select count(*) = 2 and count(*) filter (where source_kind='wordpress') = 1 from public.post_discussion_read_v1(12)), 'one discussion combines published archive by wp_id and native by posts.id');
select pg_temp.ok((select count(*) = 0 from public.post_discussion_read_v1(13)), 'suppressed post rejected on read');
select pg_temp.ok((select count(*) = 0 from public.post_discussion_read_v1(5113)), 'pending native comment stays private');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select pg_temp.fails($q$select public.post_discussion_publish_v1(12,'other-unit','bad')$q$,'POST_UNIT_UNAVAILABLE');
select pg_temp.fails($q$select public.post_discussion_publish_v1(13,'other-unit','bad')$q$,'POST_UNAVAILABLE');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
select public.post_discussion_publish_v1(5113, 'bennett-salt-covenant-unity-20261119', 'תגובה מהיחידה');
select pg_temp.ok((select count(*) = 1 and bool_and(post_unit_id = 'bennett-salt-covenant-unity-20261119')
  from public.post_discussion_read_v1(5113)), 'Bennett native reply round-trips with the exact unit');
select public.research_state_apply_ops_v1(auth.uid(), '[{"kind":"item_upsert","op_id":"bennett-unit","bucket":"library","entity":{
  "type":"post_unit","ref":"posts:5113#bennett-salt-covenant-unity-20261119","id":"post_unit:posts:5113#bennett-salt-covenant-unity-20261119",
  "link":"/post/bennett-melach-631-78?unit=bennett-salt-covenant-unity-20261119#bennett-salt-covenant-unity-20261119"}}]',
  0, gen_random_uuid());
select pg_temp.ok(public.research_state_snapshot_v1(auth.uid())#>>'{saved,0,ref}' = 'posts:5113#bennett-salt-covenant-unity-20261119',
  'unit save is persisted through the existing research server RPC');
reset role;
