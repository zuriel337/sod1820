-- Community v3 (PROPOSED — not applied; DB changes need explicit ZURIEL approval of this exact file).
--
-- 1. Guest publishing becomes reply-only. An anonymous visitor (optional display
--    name, always labelled "(אורח)") may answer an existing public message but can no
--    longer open a new conversation. Every other guest rule (kill switch, honeypot,
--    text only, size, rate limits, review) is unchanged. The signature is unchanged,
--    so the client and grants keep working; only the new error 'reply_only' is added.
--
-- Guests also lose the optional display name (existing named guest messages stay as they are).
--
-- 2. "Entered the tree" hints. An administrator (the Human Gate) marks a public chat
--    message as a hint that entered the tree. The marker is a side table: the
--    message itself is not edited, copied or re-ranked. Everyone can read the short
--    list (it is pinned as one line at the top of the chat); only an administrator
--    can add or remove a row. Nothing is seeded: which messages enter is ZURIEL's call.

-- ---------------------------------------------------------------- 1. reply-only
create or replace function public.add_guest_community_message(
  p_body text,
  p_parent_id uuid default null,
  p_website text default null,
  p_name text default null
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
  v_author text := 'אורח';
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

  -- A guest may only comment on an existing message, never start a conversation.
  if p_parent_id is null then raise exception 'reply_only'; end if;

  v_plain := btrim(regexp_replace(v_body, '^\[sod:v1\]\s*', ''));
  if v_plain = '' then raise exception 'empty body'; end if;
  if length(v_body) > 3000 or length(v_plain) > 1500 then raise exception 'too_long'; end if;
  if v_body ~ '📎' or v_body ~* '(https?://|www\.|[a-z0-9-]+\.(com|co\.il|org\.il|org|net|il|io|me|ly|tv|ru|info|xyz|app|dev|gl|be|to)(/|\b))' then
    raise exception 'links_not_allowed';
  end if;

  -- A guest has no name of their own: p_name is accepted for compatibility with older
  -- clients and ignored, so every guest comment is published as plain 'אורח'.

  if not exists (
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
  values (null, null, v_author, 'תגובה', 'community_2029', 'discussion', 'approved',
          'home', 'community', p_parent_id, v_body)
  returning id into v_id;
  insert into public.community_guest_posts (contribution_id) values (v_id);
  update public.research_contributions set last_activity_at = now() where id = p_parent_id;
  return v_id;
end;
$function$;
revoke all on function public.add_guest_community_message(text, uuid, text, text) from public;
grant execute on function public.add_guest_community_message(text, uuid, text, text) to anon, authenticated;

-- ------------------------------------------------------------ 2. tree hints
create table if not exists public.community_tree_hints (
  contribution_id uuid primary key references public.research_contributions(id) on delete cascade,
  entered_at timestamptz not null default now(),
  entered_by uuid
);
create index if not exists community_tree_hints_entered_idx on public.community_tree_hints (entered_at desc);
alter table public.community_tree_hints enable row level security;
revoke all on public.community_tree_hints from anon, authenticated;

-- Public read: only messages that are still public. `path` is the ancestry
-- (root first) so the page can link straight to the message in its thread.
create or replace function public.community_tree_hints_list(p_limit int default 20)
returns table (id uuid, author_name text, body text, entered_at timestamptz, path uuid[])
language sql
stable
security definer
set search_path to 'public'
as $function$
  select r.id, r.author_name, r.body, h.entered_at,
         (with recursive up as (
            select c.id, c.parent_id, array[c.id] as chain, 1 as depth
            from public.research_contributions c where c.id = r.id
            union all
            select p.id, p.parent_id, p.id || up.chain, up.depth + 1
            from public.research_contributions p join up on p.id = up.parent_id
            where up.depth < 30
          )
          select chain from up where parent_id is null limit 1) as path
  from public.community_tree_hints h
  join public.research_contributions r on r.id = h.contribution_id
  where r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
    and r.origin in ('openweb', 'community_2029')
  order by h.entered_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50))
$function$;
revoke all on function public.community_tree_hints_list(int) from public;
grant execute on function public.community_tree_hints_list(int) to anon, authenticated;

-- Administrator only: ids of hints (so the message action can show its state).
create or replace function public.community_tree_hint_set(p_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.community_is_admin() then raise exception 'not authorized'; end if;
  if p_action not in ('enter', 'remove') then raise exception 'bad action'; end if;
  if p_action = 'enter' then
    if not exists (
      select 1 from public.research_contributions r
      where r.id = p_id and r.status = 'approved' and r.deleted_at is null
        and r.origin in ('openweb', 'community_2029')
    ) then raise exception 'invalid_message'; end if;
    insert into public.community_tree_hints (contribution_id, entered_by)
    values (p_id, auth.uid()) on conflict (contribution_id) do nothing;
  else
    delete from public.community_tree_hints where contribution_id = p_id;
  end if;
end;
$function$;
revoke all on function public.community_tree_hint_set(uuid, text) from public;
grant execute on function public.community_tree_hint_set(uuid, text) to authenticated;
