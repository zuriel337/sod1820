-- Community presence v1 (PROPOSED — not applied; DB changes need explicit ZURIEL
-- approval of this exact file).
--
-- ZURIEL: "whoever is logged into the site, among members, I want it like the old
-- chat — online [indicator]." No presence/online concept exists today; this adds the
-- minimal one: a heartbeat timestamp on the existing account row (matching the
-- repo's own last_seen_at naming convention elsewhere), not a realtime socket
-- channel. A member is "online" while something on the site pinged in the last 2
-- minutes. Only username/display_name/avatar are exposed — the same public profile
-- fields already shown elsewhere in the chat (e.g. message authorship); no email,
-- no page/route, nothing private. Public read, matching the legacy chat's visible
-- participant list; ping requires a real signed-in account (never a guest).
alter table public.users add column if not exists last_seen_at timestamptz;
create index if not exists users_last_seen_at_idx on public.users (last_seen_at desc) where last_seen_at is not null;

create or replace function public.community_presence_ping()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.users set last_seen_at = now() where id = auth.uid()
$function$;
revoke all on function public.community_presence_ping() from public;
grant execute on function public.community_presence_ping() to authenticated;

create or replace function public.community_presence_online(p_limit int default 24)
returns table (id uuid, username text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select id, username, display_name, avatar_url
  from public.users
  where last_seen_at > now() - interval '2 minutes'
  order by last_seen_at desc
  limit greatest(1, least(coalesce(p_limit, 24), 100))
$function$;
revoke all on function public.community_presence_online(int) from public;
grant execute on function public.community_presence_online(int) to anon, authenticated;
