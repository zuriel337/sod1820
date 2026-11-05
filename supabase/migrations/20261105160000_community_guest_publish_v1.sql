-- Community guest publishing v1.
-- A visitor without an account may publish a community message immediately.
-- The message is public at once; an administrator sees guest messages that were
-- not yet reviewed (greyed in the UI) and can approve or hide each one.
-- Nothing here changes the existing add_contribution / feed / replies functions.

create table if not exists public.community_guest_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.community_guest_settings (singleton, enabled) values (true, true) on conflict (singleton) do nothing;
alter table public.community_guest_settings enable row level security;
revoke all on public.community_guest_settings from anon, authenticated;

create table if not exists public.community_guest_posts (
  contribution_id uuid primary key references public.research_contributions(id) on delete cascade,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
create index if not exists community_guest_posts_unreviewed_idx on public.community_guest_posts (created_at desc) where reviewed_at is null;
create index if not exists community_guest_posts_created_idx on public.community_guest_posts (created_at);
alter table public.community_guest_posts enable row level security;
revoke all on public.community_guest_posts from anon, authenticated;

-- Publish as a guest. Server-enforced: kill switch, no account, honeypot, text
-- only (no links or attachments), size, valid public parent, per-IP and global
-- rate limits. The display name is always the fixed "אורח" label.
create or replace function public.add_guest_community_message(
  p_body text,
  p_parent_id uuid default null,
  p_website text default null
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_headers json;
  v_ip text;
  v_body text := btrim(coalesce(p_body, ''));
  v_plain text;
  v_hour int;
  v_day int;
  v_global int;
  v_id uuid;
begin
  if auth.uid() is not null then raise exception 'use_account'; end if;
  if not coalesce((select enabled from public.community_guest_settings where singleton), false) then
    raise exception 'guest_publish_disabled';
  end if;
  -- Bots fill hidden fields. Pretend success, store nothing.
  if nullif(btrim(coalesce(p_website, '')), '') is not null then return gen_random_uuid(); end if;

  v_plain := btrim(regexp_replace(v_body, '^\[sod:v1\]\s*', ''));
  if v_plain = '' then raise exception 'empty body'; end if;
  if length(v_body) > 3000 or length(v_plain) > 1500 then raise exception 'too_long'; end if;
  if v_body ~ '📎' or v_body ~* '(https?://|www\.|[a-z0-9-]+\.(com|co\.il|org\.il|org|net|il|io|me|ly|tv|ru|info|xyz|app|dev|gl|be|to)(/|\b))' then
    raise exception 'links_not_allowed';
  end if;

  if p_parent_id is not null and not exists (
    select 1 from public.research_contributions r
    where r.id = p_parent_id and r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
      and r.origin in ('openweb', 'community_2029')
  ) then raise exception 'invalid_parent'; end if;

  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then v_headers := null;
  end;
  v_ip := coalesce(
    nullif(btrim(coalesce(v_headers->>'cf-connecting-ip', '')), ''),
    nullif(btrim(coalesce(v_headers->>'x-real-ip', '')), ''),
    nullif(btrim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), ''));
  -- Fail closed: without an address the limits cannot be enforced.
  if v_ip is null then raise exception 'rate_limited'; end if;

  select count(*) filter (where created_at > now() - interval '1 hour'),
         count(*) filter (where created_at > now() - interval '24 hours')
    into v_hour, v_day
  from public.anon_contrib_log where ip = v_ip and created_at > now() - interval '24 hours';
  if v_hour >= 3 or v_day >= 10 then raise exception 'rate_limited'; end if;
  select count(*) into v_global from public.community_guest_posts where created_at > now() - interval '1 hour';
  if v_global >= 60 then raise exception 'busy'; end if;

  insert into public.anon_contrib_log (ip) values (v_ip);
  insert into public.research_contributions
    (author_user_id, author_contributor_id, author_name, intent, origin, research_state, status,
     target_type, target_id, parent_id, body)
  values (null, null, 'אורח', 'תגובה', 'community_2029', 'discussion', 'approved',
          'home', 'community', p_parent_id, v_body)
  returning id into v_id;
  insert into public.community_guest_posts (contribution_id) values (v_id);
  if p_parent_id is not null then
    update public.research_contributions set last_activity_at = now() where id = p_parent_id;
  end if;
  return v_id;
end;
$function$;
revoke all on function public.add_guest_community_message(text, uuid, text) from public;
grant execute on function public.add_guest_community_message(text, uuid, text) to anon, authenticated;

-- Administrator view: ids of guest messages not yet reviewed. Non-admins get an
-- empty set, so the existence of this review state is never public.
create or replace function public.community_guest_unreviewed(p_ids uuid[] default null)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select g.contribution_id
  from public.community_guest_posts g
  join public.research_contributions r on r.id = g.contribution_id
  where public.community_is_admin()
    and g.reviewed_at is null
    and r.status = 'approved' and r.deleted_at is null
    and (p_ids is null or g.contribution_id = any(p_ids))
  order by g.created_at desc
  limit 200
$function$;
revoke all on function public.community_guest_unreviewed(uuid[]) from public;
grant execute on function public.community_guest_unreviewed(uuid[]) to authenticated;

-- Administrator decision on one guest message: keep it ('approve') or take it
-- down ('hide'; the row stays for history, status becomes hidden).
create or replace function public.community_guest_review(p_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.community_is_admin() then raise exception 'not authorized'; end if;
  if p_action not in ('approve', 'hide') then raise exception 'bad action'; end if;
  if not exists (select 1 from public.community_guest_posts where contribution_id = p_id) then raise exception 'not_guest_post'; end if;
  if p_action = 'hide' then
    update public.research_contributions set status = 'hidden', updated_at = now() where id = p_id;
  end if;
  update public.community_guest_posts set reviewed_at = now(), reviewed_by = auth.uid() where contribution_id = p_id;
end;
$function$;
revoke all on function public.community_guest_review(uuid, text) from public;
grant execute on function public.community_guest_review(uuid, text) to authenticated;
