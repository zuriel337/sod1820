-- Community 2029, second additive step (depends on 20261019130000): restore, edit history,
-- message context for deep links, archive-wide search, user reports with an admin queue,
--
-- BRANCH-ONLY. Not applied to any live database. Everything is new objects, except
-- community_edit_message (re-created to keep history). The reply-notification link lives in its own
-- migration (20261019145000) because it replaces a shared trigger function.

-- Previous bodies of edited messages. Private: only the admin function below reads it.
create table if not exists public.research_contribution_edits (
  id bigserial primary key,
  contribution_id uuid not null references public.research_contributions(id) on delete cascade,
  body text,
  edited_by uuid,
  edited_at timestamptz not null default now()
);
create index if not exists rc_edits_idx on public.research_contribution_edits (contribution_id, edited_at desc);
alter table public.research_contribution_edits enable row level security;
revoke all on public.research_contribution_edits from anon, authenticated;
revoke all on sequence public.research_contribution_edits_id_seq from anon, authenticated;

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.research_contributions(id) on delete cascade,
  reporter_id uuid not null,
  reason text not null check (reason in ('spam','abuse','personal','other')),
  note text,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_by uuid,
  resolved_at timestamptz,
  unique (message_id, reporter_id)
);
create index if not exists community_reports_open_idx on public.community_reports (created_at desc) where status = 'open';
alter table public.community_reports enable row level security;
revoke all on public.community_reports from anon, authenticated;

-- Trigram index for archive search (pg_trgm is already installed on the project).
create extension if not exists pg_trgm;
create index if not exists rc_community_body_trgm_idx on public.research_contributions using gin (body gin_trgm_ops)
  where status = 'approved' and origin in ('openweb','community_2029');

create or replace function public.community_is_admin()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from public.users where id = auth.uid() and role = 'admin') $$;
revoke all on function public.community_is_admin() from public, anon;
grant execute on function public.community_is_admin() to authenticated;

-- Edit now keeps the previous body for the admin history.
create or replace function public.community_edit_message(p_id uuid, p_body text)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.research_contributions%rowtype;
  v_body text := btrim(coalesce(p_body, ''));
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if length(v_body) = 0 then raise exception 'empty body'; end if;
  if length(v_body) > 6000 then raise exception 'body too long'; end if;
  select * into v_row from public.research_contributions where id = p_id for update;
  if not found then raise exception 'not found'; end if;
  if v_row.origin <> 'community_2029' or v_row.author_user_id is distinct from v_uid then
    raise exception 'not authorized';
  end if;
  if v_row.status <> 'approved' or v_row.deleted_at is not null or v_row.thread_hidden_at is not null then
    raise exception 'not editable';
  end if;
  if btrim(coalesce(v_row.body, '')) = v_body then return v_row.edited_at; end if;
  insert into public.research_contribution_edits (contribution_id, body, edited_by, edited_at)
  values (v_row.id, v_row.body, v_uid, v_now);
  update public.research_contributions
     set body = v_body, edited_at = v_now, updated_at = v_now
   where id = p_id;
  return v_now;
end;
$$;

create or replace function public.community_edit_history(p_id uuid)
returns table (body text, edited_by_name text, edited_at timestamptz)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.community_is_admin() then raise exception 'not authorized'; end if;
  return query
    select e.body, coalesce(nullif(u.display_name, ''), nullif(u.username, ''), 'חבר הקהילה'), e.edited_at
    from public.research_contribution_edits e
    left join public.users u on u.id = e.edited_by
    where e.contribution_id = p_id
    order by e.edited_at desc
    limit 50;
end;
$$;

-- Restore. A deleted message: its author within 5 minutes of deleting it, or an admin at any time.
-- A hidden thread: admin only; restores the rows hidden by that same action.
create or replace function public.community_restore(p_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.research_contributions%rowtype;
  v_admin boolean := public.community_is_admin();
  v_arch public.research_contribution_deletions%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_row from public.research_contributions where id = p_id for update;
  if not found then raise exception 'not found'; end if;

  if v_row.thread_hidden_at is not null then
    if not v_admin then raise exception 'not authorized'; end if;
    update public.research_contributions r
       set thread_hidden_at = null,
           status = case when r.deleted_at is null and r.status = 'hidden' then 'approved' else r.status end,
           updated_at = v_now
     where r.thread_hidden_at = v_row.thread_hidden_at;
    return 'thread_restored';
  end if;

  if v_row.deleted_at is null then raise exception 'nothing to restore'; end if;
  if not v_admin and not (v_row.author_user_id is not distinct from v_uid and v_row.deleted_by is not distinct from v_uid
                          and v_row.deleted_at > v_now - interval '5 minutes') then
    raise exception 'not authorized';
  end if;
  select * into v_arch from public.research_contribution_deletions where contribution_id = p_id;
  if not found then raise exception 'nothing to restore'; end if;
  update public.research_contributions
     set body = v_arch.body, title = v_arch.title, image_url = v_arch.image_url, media = coalesce(v_arch.media, '[]'::jsonb),
         status = coalesce(v_arch.status, 'approved'), deleted_at = null, deleted_by = null, updated_at = v_now
   where id = p_id;
  delete from public.research_contribution_deletions where contribution_id = p_id;
  return 'restored';
end;
$$;

-- Admin list: recently deleted messages and hidden threads (with their private text).
create or replace function public.community_admin_removed(p_limit integer default 50)
returns table (kind text, id uuid, parent_id uuid, author_name text, body text, at timestamptz)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.community_is_admin() then raise exception 'not authorized'; end if;
  return query
  select * from (
    select 'thread'::text, r.id, r.parent_id, r.author_name, coalesce(r.body, d.body), r.thread_hidden_at
    from public.research_contributions r
    left join public.research_contribution_deletions d on d.contribution_id = r.id
    where r.thread_hidden_at is not null
      and not exists (select 1 from public.research_contributions p where p.id = r.parent_id and p.thread_hidden_at = r.thread_hidden_at)
    union all
    select 'deleted'::text, r.id, r.parent_id, r.author_name, d.body, r.deleted_at
    from public.research_contributions r
    join public.research_contribution_deletions d on d.contribution_id = r.id
    where r.deleted_at is not null and r.thread_hidden_at is null
  ) x(kind, id, parent_id, author_name, body, at)
  order by x.at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

-- True when every ancestor of a message is visible (live or tombstone) up to a root. Replies under a
-- parent that was hidden by moderation are not reachable from the feed, so search and deep links must not
-- surface them either.
create or replace function public.community_chain_visible(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  with recursive up(pid, depth, ok) as (
    select r.parent_id, 1, true from public.research_contributions r where r.id = p_id
    union all
    select r.parent_id, up.depth + 1,
           (r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
              and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null)
           or (r.deleted_at is not null and r.thread_hidden_at is null and r.origin in ('openweb','community_2029'))
    from public.research_contributions r join up on r.id = up.pid
    where up.ok and up.depth < 30
  )
  select not exists (select 1 from up where not ok)
     and exists (select 1 from up where pid is null and ok);
$$;
revoke all on function public.community_chain_visible(uuid) from public, anon, authenticated;

-- Message plus its visible ancestors, root first (deep links, notifications). Empty if the target is not visible.
create or replace function public.community_message_context(p_id uuid)
returns table (
  id uuid, parent_id uuid, author_name text, author_user_id uuid, author_contributor_id uuid,
  title text, body text, reactions jsonb, origin text, created_at timestamptz, edited_at timestamptz,
  is_deleted boolean, contributor_id uuid, contributor_user_id uuid,
  contributor_display_name text, contributor_avatar_url text, total_count bigint
)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  return query
  with recursive up(rid, pid, depth, tomb) as (
    select r.id, r.parent_id, 1,
           case when r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
                     and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null then false
                when r.deleted_at is not null and r.thread_hidden_at is null and r.origin in ('openweb','community_2029') then true
                else null end
    from public.research_contributions r where r.id = p_id
    union all
    select r.id, r.parent_id, up.depth + 1,
           case when r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
                     and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null then false
                when r.deleted_at is not null and r.thread_hidden_at is null and r.origin in ('openweb','community_2029') then true
                else null end
    from public.research_contributions r join up on r.id = up.pid
    where up.tomb is not null and up.depth < 30
  ), chain as (
    select * from up where tomb is not null
  )
  select r.id, r.parent_id,
         case when c.tomb then null else r.author_name end,
         case when c.tomb then null else r.author_user_id end,
         case when c.tomb then null else r.author_contributor_id end,
         case when c.tomb then null else r.title end,
         case when c.tomb then null else r.body end,
         case when c.tomb then '{}'::jsonb else r.reactions end,
         r.origin, r.created_at,
         case when c.tomb then null else r.edited_at end,
         c.tomb,
         case when c.tomb then null else ct.id end,
         case when c.tomb then null else ct.user_id end,
         case when c.tomb then null else ct.display_name end,
         case when c.tomb then null else ct.avatar_url end,
         null::bigint
  from chain c
  join public.research_contributions r on r.id = c.rid
  left join public.contributors ct on ct.id = r.author_contributor_id
  -- the target itself must be visible; ancestors stop at the first invisible one
  where exists (select 1 from chain t where t.rid = p_id)
    and exists (select 1 from chain t where t.pid is null)
  order by c.depth desc;
end;
$$;

-- Archive-wide search over live messages (never tombstones, never hidden or deleted text).
create or replace function public.community_search(p_query text, p_offset integer default 0, p_limit integer default 20)
returns table (
  id uuid, parent_id uuid, author_name text, author_user_id uuid, author_contributor_id uuid,
  title text, body text, reactions jsonb, origin text, created_at timestamptz, edited_at timestamptz,
  is_deleted boolean, contributor_id uuid, contributor_user_id uuid,
  contributor_display_name text, contributor_avatar_url text, total_count bigint
)
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_q text := btrim(coalesce(p_query, ''));
  v_pat text;
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if length(v_q) < 2 or length(v_q) > 80 then return; end if;
  v_pat := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
  with hit as (
    select r.id, r.created_at, count(*) over () as total
    from public.research_contributions r
    where r.status = 'approved' and r.origin in ('openweb','community_2029')
      and r.deleted_at is null and r.thread_hidden_at is null
      and r.body ilike v_pat
      and public.community_chain_visible(r.id)
    order by r.created_at desc, r.id desc
    offset v_offset limit v_limit
  )
  select r.id, r.parent_id, r.author_name, r.author_user_id, r.author_contributor_id, r.title, r.body, r.reactions,
         r.origin, r.created_at, r.edited_at, false, ct.id, ct.user_id, ct.display_name, ct.avatar_url,
         case when v_offset = 0 then h.total else null end
  from hit h
  join public.research_contributions r on r.id = h.id
  left join public.contributors ct on ct.id = r.author_contributor_id
  order by r.created_at desc, r.id desc;
end;
$$;

-- User report of a live message (signed-in users, not their own message, 20 per day).
create or replace function public.community_report_message(p_id uuid, p_reason text, p_note text default null)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.research_contributions%rowtype;
  v_inserted integer;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if p_reason not in ('spam','abuse','personal','other') then raise exception 'bad reason'; end if;
  select * into v_row from public.research_contributions where id = p_id;
  if not found or v_row.status <> 'approved' or v_row.deleted_at is not null or v_row.thread_hidden_at is not null
     or v_row.origin not in ('openweb','community_2029') then raise exception 'not found'; end if;
  if v_row.author_user_id is not distinct from v_uid then raise exception 'own message'; end if;
  if (select count(*) from public.community_reports where reporter_id = v_uid and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'rate_limited';
  end if;
  insert into public.community_reports (message_id, reporter_id, reason, note)
  values (p_id, v_uid, p_reason, left(nullif(btrim(coalesce(p_note, '')), ''), 300))
  on conflict (message_id, reporter_id) do nothing;
  get diagnostics v_inserted = row_count;
  return case when v_inserted = 1 then 'reported' else 'already_reported' end;
end;
$$;

create or replace function public.community_admin_reports(p_limit integer default 50)
returns table (report_id uuid, message_id uuid, parent_id uuid, reason text, note text, body text, author_name text, reporter_name text, created_at timestamptz, report_count bigint)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.community_is_admin() then raise exception 'not authorized'; end if;
  return query
  select distinct on (c.message_id) c.id, c.message_id, r.parent_id, c.reason, c.note, coalesce(r.body, d.body), r.author_name,
         coalesce(nullif(u.display_name, ''), nullif(u.username, ''), 'חבר הקהילה'), c.created_at,
         (select count(*) from public.community_reports x where x.message_id = c.message_id and x.status = 'open')
  from public.community_reports c
  join public.research_contributions r on r.id = c.message_id
  left join public.research_contribution_deletions d on d.contribution_id = r.id
  left join public.users u on u.id = c.reporter_id
  where c.status = 'open'
  order by c.message_id, c.created_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

-- Resolve every open report on the reported message: dismiss, delete it (soft), or hide its thread.
create or replace function public.community_resolve_report(p_report uuid, p_action text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_msg uuid;
begin
  if not public.community_is_admin() then raise exception 'not authorized'; end if;
  if p_action not in ('dismiss','delete','hide_thread') then raise exception 'bad action'; end if;
  select message_id into v_msg from public.community_reports where id = p_report;
  if not found then raise exception 'not found'; end if;
  if p_action = 'delete' then perform public.community_delete_message(v_msg);
  elsif p_action = 'hide_thread' then perform public.community_hide_thread(v_msg); end if;
  update public.community_reports
     set status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end, resolved_by = v_uid, resolved_at = now()
   where message_id = v_msg and status = 'open';
  return p_action;
end;
$$;

revoke all on function public.community_edit_message(uuid, text) from public;
revoke all on function public.community_edit_history(uuid) from public;
revoke all on function public.community_restore(uuid) from public;
revoke all on function public.community_admin_removed(integer) from public;
revoke all on function public.community_message_context(uuid) from public;
revoke all on function public.community_search(text, integer, integer) from public;
revoke all on function public.community_report_message(uuid, text, text) from public;
revoke all on function public.community_admin_reports(integer) from public;
revoke all on function public.community_resolve_report(uuid, text) from public;
grant execute on function public.community_edit_message(uuid, text) to authenticated;
grant execute on function public.community_edit_history(uuid) to authenticated;
grant execute on function public.community_restore(uuid) to authenticated;
grant execute on function public.community_admin_removed(integer) to authenticated;
grant execute on function public.community_message_context(uuid) to anon, authenticated;
grant execute on function public.community_search(text, integer, integer) to anon, authenticated;
grant execute on function public.community_report_message(uuid, text, text) to authenticated;
grant execute on function public.community_admin_reports(integer) to authenticated;
grant execute on function public.community_resolve_report(uuid, text) to authenticated;
