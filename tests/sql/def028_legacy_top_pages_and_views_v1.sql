-- DEF-028 regression: legacy_top_pages is no longer client-callable, redirect_map keeps returning exactly the same rows to every role,
-- and topic_cards_public (intentionally SECURITY DEFINER) stays a closed, approved-only door with no e-mail-like column.
-- Runs on a DISPOSABLE PostgreSQL only. All data below is synthetic.
\set ON_ERROR_STOP on
\set QUIET on

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;

-- production shape (policies and grants as read on 7.11.2026)
create table public.posts (wp_id integer, slug text, title text, tags text[]);
alter table public.posts enable row level security;
create policy posts_anon_read on public.posts for select to anon using (not (coalesce(tags, '{}'::text[]) && array['draft']));
create policy posts_auth_read on public.posts for select to authenticated using (not (coalesce(tags, '{}'::text[]) && array['draft']));
grant select on public.posts to anon, authenticated, service_role;
insert into public.posts values
  (1, 'public-one', 'P1', array['x']), (2, 'public-two', 'P2', null), (3, 'a-draft', 'D', array['draft']),
  (null, 'no-wp-id', 'N', null), (5, null, 'no slug', null);

create view public.redirect_map as
  select wp_id, slug, '/'::text || slug as target_path from public.posts
  where wp_id is not null and slug is not null and not coalesce(tags, '{}'::text[]) && array['draft'];
grant select on public.redirect_map to anon, authenticated, service_role;

create table public.legacy_traffic (title text, views integer, source text);
alter table public.legacy_traffic enable row level security;
create policy legacy_traffic_read on public.legacy_traffic for select to public using (true);
grant select on public.legacy_traffic to anon, authenticated, service_role;
insert into public.legacy_traffic values ('Old page A', 10, 'jetpack'), ('Old page A', 5, 'jetpack'), ('Old page B', 7, 'jetpack'), ('Other source', 99, 'ga');
create function public.legacy_top_pages(p_limit integer default 15) returns table(title text, views integer)
language sql stable security definer set search_path to 'public' as $$
  select lt.title, sum(lt.views)::int as views from legacy_traffic lt
  where lt.source = 'jetpack' and lt.title is not null and lt.title <> ''
  group by lt.title order by views desc limit greatest(1, least(p_limit, 100));
$$;
grant execute on function public.legacy_top_pages(integer) to public, anon, authenticated;   -- production ACL: PUBLIC + anon + authenticated

create table public.topic_cards (id integer, slug text, title text, status text, findings jsonb, created_by text);
alter table public.topic_cards enable row level security;
create policy topic_cards_public_read on public.topic_cards for select to anon, authenticated
  using (status = 'approved' and coalesce((findings ->> '_do_not_publish')::boolean, false) = false);
create function public.topic_cards_public_findings(f jsonb) returns jsonb language sql immutable as $$ select f - '_do_not_publish' $$;
grant execute on function public.topic_cards_public_findings(jsonb) to anon, authenticated;
insert into public.topic_cards values
  (1, 'approved-one', 'T1', 'approved', '{"k":1}', 'ZURIEL'), (2, 'pending', 'T2', 'pending', '{}', 'ai'),
  (3, 'hidden', 'T3', 'approved', '{"_do_not_publish": true}', 'ai');
create view public.topic_cards_public with (security_barrier = true) as
  select id, slug, title, public.topic_cards_public_findings(findings) as findings, status, created_by from public.topic_cards t
  where status = 'approved' and coalesce(findings -> '_do_not_publish', 'false'::jsonb) is distinct from 'true'::jsonb;
grant select on public.topic_cards_public to anon, authenticated, service_role;
-- anon / authenticated have NO table privilege on topic_cards (production: anon_table_select = false)

create function pg_temp.expect_denied(p_role text, p_sql text) returns void language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  begin execute p_sql; reset role; raise exception 'EXPECTED DENIED but succeeded for role % : %', p_role, p_sql;
  exception when insufficient_privilege then reset role; end;
end $$;

-- record the rows each role sees from redirect_map BEFORE the change
create table public._before (role_name text, wp_id integer, slug text, target_path text);
grant insert, select on public._before to anon, authenticated, service_role;
begin; set local role anon; insert into public._before select 'anon', * from public.redirect_map; rollback;
begin; set local role authenticated; insert into public._before select 'authenticated', * from public.redirect_map; rollback;
insert into public._before select 'service_role', * from public.redirect_map;
-- (rolled-back inserts above ran as anon/authenticated and are discarded; re-record as the table owner for those two roles)
delete from public._before where role_name in ('anon', 'authenticated');
insert into public._before select 'anon', wp_id, slug, '/'::text || slug from public.posts where wp_id is not null and slug is not null and not coalesce(tags, '{}'::text[]) && array['draft'];
insert into public._before select 'authenticated', wp_id, slug, '/'::text || slug from public.posts where wp_id is not null and slug is not null and not coalesce(tags, '{}'::text[]) && array['draft'];

-- ---- baseline: the fixture reproduces the current behaviour ----
begin; set local role anon;
  do $$ begin
    if (select count(*) from public.legacy_top_pages(5)) <> 2 then raise exception 'BASELINE: anon must be able to call legacy_top_pages'; end if;
    if (select count(*) from public.redirect_map) <> 2 then raise exception 'BASELINE: anon must see the 2 public redirect rows'; end if;
  end $$;
rollback;

-- ---- the real migration under test ----
\i supabase/proposed/20261107120000_def028_legacy_top_pages_and_redirect_map.sql

-- ---- after the change ----
-- 1. privilege shape
do $$ begin
  if has_function_privilege('anon', 'public.legacy_top_pages(integer)', 'EXECUTE') then raise exception 'anon can still execute legacy_top_pages'; end if;
  if has_function_privilege('authenticated', 'public.legacy_top_pages(integer)', 'EXECUTE') then raise exception 'authenticated can still execute legacy_top_pages'; end if;
  if not has_function_privilege('service_role', 'public.legacy_top_pages(integer)', 'EXECUTE') then raise exception 'service_role lost execute'; end if;
  if not coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.redirect_map'::regclass), false) then raise exception 'redirect_map is not security_invoker'; end if;
end $$;
-- 2. client roles are rejected on both call styles; the server role still works and returns the aggregated rows
begin;
  select pg_temp.expect_denied('anon', $q$select * from public.legacy_top_pages(5)$q$);
  select pg_temp.expect_denied('authenticated', $q$select * from public.legacy_top_pages()$q$);
rollback;
begin; set local role service_role;
  do $$ begin
    if (select views from public.legacy_top_pages(5) where title = 'Old page A') <> 15 then raise exception 'service_role result changed'; end if;
    if (select count(*) from public.legacy_top_pages(5)) <> 2 then raise exception 'service_role row count changed'; end if;
  end $$;
rollback;
-- 3. redirect_map: every role sees exactly the rows it saw before; drafts and rows without wp_id/slug stay excluded
create temp table _after (role_name text, wp_id integer, slug text, target_path text);
grant insert, select on _after to anon, authenticated, service_role;
begin; set local role anon;          insert into _after select 'anon', * from public.redirect_map; rollback;
-- (temp table rows inserted inside a rolled-back block vanish, so compare inside one block per role)
do $$ declare r text; n_before int; n_diff int; begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    execute format('set local role %I', r);
    select count(*) into n_before from public._before where role_name = r;
    select count(*) into n_diff from (
      (select wp_id, slug, target_path from public.redirect_map except select wp_id, slug, target_path from public._before where role_name = r)
      union all
      (select wp_id, slug, target_path from public._before where role_name = r except select wp_id, slug, target_path from public.redirect_map)) d;
    reset role;
    if n_diff <> 0 or n_before <> 2 then raise exception 'redirect_map rows changed for role % (before %, diff %)', r, n_before, n_diff; end if;
  end loop;
  if exists (select 1 from public.redirect_map where slug in ('a-draft', 'no-wp-id') or slug is null) then raise exception 'redirect_map leaked a draft or incomplete row'; end if;
end $$;
-- 4. the invoker view still cannot show what the caller could not read directly (a stricter policy would now bind the view too)
begin;
  create policy posts_anon_tighten on public.posts as restrictive for select to anon using (slug <> 'public-two');
  set local role anon;
  do $$ begin if exists (select 1 from public.redirect_map where slug = 'public-two') then raise exception 'view bypassed a restrictive posts policy'; end if; end $$;
rollback;
-- 5. topic_cards_public is unchanged and stays a closed, approved-only door with no e-mail-like column or value
begin; set local role anon;
  do $$ begin
    if (select count(*) from public.topic_cards_public) <> 1 then raise exception 'anon must see exactly the one approved, publishable card'; end if;
    if exists (select 1 from public.topic_cards_public where slug in ('pending', 'hidden')) then raise exception 'unpublishable card leaked'; end if;
    if exists (select 1 from public.topic_cards_public where created_by like '%@%') then raise exception 'e-mail-like created_by'; end if;
    if exists (select 1 from public.topic_cards_public where findings ? '_do_not_publish') then raise exception 'findings sanitiser regressed'; end if;
  end $$;
rollback;
select pg_temp.expect_denied('anon', $q$select * from public.topic_cards$q$);
select pg_temp.expect_denied('authenticated', $q$select * from public.topic_cards$q$);
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name in ('topic_cards_public', 'redirect_map') and column_name ~* 'e_?mail') then
    raise exception 'an e-mail-named column appeared in a client-readable view'; end if;
  if (select reloptions from pg_class where oid = 'public.topic_cards_public'::regclass) is distinct from array['security_barrier=true'] then
    raise exception 'topic_cards_public options changed (it must stay security_barrier, SECURITY DEFINER by design)'; end if;
end $$;
-- 6. the documented rollback restores the pre-change state (and only then)
\i supabase/proposed/ROLLBACK_20261107120000_def028.sql
begin; set local role anon;
  do $$ begin if (select count(*) from public.legacy_top_pages(5)) <> 2 then raise exception 'rollback did not restore legacy_top_pages for anon'; end if; end $$;
rollback;
do $$ begin if (select coalesce(reloptions @> array['security_invoker=true'], false) from pg_class where oid = 'public.redirect_map'::regclass) then raise exception 'rollback did not restore the view'; end if; end $$;

\echo DEF-028 SQL regression: PASS
