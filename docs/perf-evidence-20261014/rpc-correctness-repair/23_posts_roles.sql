do $$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
alter table posts enable row level security; alter table post_number_keys enable row level security;
drop policy if exists posts_read on posts; create policy posts_read on posts for select using (true);           -- live: posts_anon_read / posts_auth_read = true
drop policy if exists pnk_read on post_number_keys; create policy pnk_read on post_number_keys for select using (exists (select 1 from posts p where p.id = post_id));
grant usage on schema public to anon, authenticated; grant select on posts, post_number_keys to anon, authenticated;
grant execute on function posts_by_number_strict(integer,integer), posts_by_number_strict_v2(integer,integer), posts_by_number_strict_v3(integer,integer) to anon, authenticated;
