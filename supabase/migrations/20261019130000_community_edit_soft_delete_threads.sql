-- Community 2029: author edit, soft delete that preserves threads, admin thread hide,
-- and bounded server-side reply counts.
--
-- BRANCH-ONLY. Not applied to Production by this change; it needs a focused, explicitly
-- authorized apply. Everything here is additive: new nullable columns, one private
-- archive table, and new community_* functions. Existing functions (edit_contribution,
-- remove_contribution, moderate_contribution, admin_delete_contribution) are untouched,
-- because other surfaces use them and admin_delete_contribution also deletes child replies.
--
-- Why a separate deletion marker instead of status='hidden' alone:
--   * status='hidden' already marks ~2.2k imported OpenWeb roots and ~12.6k replies that
--     must stay hidden, never become tombstones.
--   * trg_00_zvi_standing_approve_research_contribution flips status back to 'approved'
--     for one standing-approved author, so a status flip alone can silently fail to hide.
-- So a deletion is: content moved to a private archive table and blanked in the public
-- row (works regardless of that trigger), plus deleted_at as the authoritative marker.

alter table public.research_contributions
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid,
  add column if not exists thread_hidden_at timestamptz;

-- Private content archive for soft-deleted messages (recoverable, never publicly readable).
create table if not exists public.research_contribution_deletions (
  contribution_id uuid primary key references public.research_contributions(id) on delete cascade,
  body text,
  title text,
  image_url text,
  media jsonb,
  deleted_by uuid,
  deleted_at timestamptz not null default now()
);
alter table public.research_contribution_deletions enable row level security;
revoke all on public.research_contribution_deletions from anon, authenticated;

-- Tiny partial indexes: tombstone and thread-hidden lookups stay off the hot path.
create index if not exists rc_deleted_idx on public.research_contributions (parent_id) where deleted_at is not null;
create index if not exists rc_deleted_root_idx on public.research_contributions (created_at, id) where deleted_at is not null and parent_id is null;

-- A deleted message stays visible as a tombstone only while something live is below it.
-- Walks down through deleted nodes only; depth-guarded.
create or replace function public.community_has_live_descendant(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  with recursive d(id, deleted, live, depth) as (
    select c.id,
           c.deleted_at is not null and c.thread_hidden_at is null,
           c.status = 'approved' and c.deleted_at is null and c.thread_hidden_at is null
             and c.origin in ('openweb','community_2029') and nullif(btrim(c.body), '') is not null,
           1
    from public.research_contributions c
    where c.parent_id = p_id
    union all
    select c.id,
           c.deleted_at is not null and c.thread_hidden_at is null,
           c.status = 'approved' and c.deleted_at is null and c.thread_hidden_at is null
             and c.origin in ('openweb','community_2029') and nullif(btrim(c.body), '') is not null,
           d.depth + 1
    from public.research_contributions c
    join d on c.parent_id = d.id
    where d.deleted and d.depth < 64
  )
  select exists (select 1 from d where live);
$$;

-- Feed of root messages: live roots plus tombstoned roots that still hold a live thread.
-- Tombstones expose id/time only: no body, title, author or reactions.
-- total_count is computed on the first page only.
create or replace function public.community_feed_page(p_offset integer default 0, p_limit integer default 40, p_sort text default 'newest')
returns table (
  id uuid, parent_id uuid, author_name text, author_user_id uuid, author_contributor_id uuid,
  title text, body text, reactions jsonb, origin text, created_at timestamptz, edited_at timestamptz,
  is_deleted boolean, contributor_id uuid, contributor_user_id uuid,
  contributor_display_name text, contributor_avatar_url text, total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 100);
  v_asc boolean := p_sort = 'oldest';
begin
  return query
  with v as (
    select r.id, r.created_at, false as tomb
    from public.research_contributions r
    where r.parent_id is null and r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null
    union all
    select r.id, r.created_at, true
    from public.research_contributions r
    where r.parent_id is null and r.deleted_at is not null and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029') and public.community_has_live_descendant(r.id)
  ), page as (
    select v.*, case when v_offset = 0 then count(*) over () else null end as total
    from v
    order by case when v_asc then v.created_at end asc, case when v_asc then v.id end asc,
             case when not v_asc then v.created_at end desc, case when not v_asc then v.id end desc
    offset v_offset limit v_limit
  )
  select r.id, r.parent_id,
         case when p.tomb then null else r.author_name end,
         case when p.tomb then null else r.author_user_id end,
         case when p.tomb then null else r.author_contributor_id end,
         case when p.tomb then null else r.title end,
         case when p.tomb then null else r.body end,
         case when p.tomb then '{}'::jsonb else r.reactions end,
         r.origin, r.created_at,
         case when p.tomb then null else r.edited_at end,
         p.tomb,
         case when p.tomb then null else c.id end,
         case when p.tomb then null else c.user_id end,
         case when p.tomb then null else c.display_name end,
         case when p.tomb then null else c.avatar_url end,
         p.total
  from page p
  join public.research_contributions r on r.id = p.id
  left join public.contributors c on c.id = r.author_contributor_id
  order by case when v_asc then r.created_at end asc, case when v_asc then r.id end asc,
           case when not v_asc then r.created_at end desc, case when not v_asc then r.id end desc;
end;
$$;

-- Direct replies of one message, oldest first. total_count is the number of direct
-- replies visible in this list (live replies plus tombstoned replies that hold a live thread).
create or replace function public.community_replies_page(p_parent uuid, p_offset integer default 0, p_limit integer default 20)
returns table (
  id uuid, parent_id uuid, author_name text, author_user_id uuid, author_contributor_id uuid,
  title text, body text, reactions jsonb, origin text, created_at timestamptz, edited_at timestamptz,
  is_deleted boolean, contributor_id uuid, contributor_user_id uuid,
  contributor_display_name text, contributor_avatar_url text, total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
begin
  return query
  with v as (
    select r.id, r.created_at, false as tomb
    from public.research_contributions r
    where r.parent_id = p_parent and r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null
    union all
    select r.id, r.created_at, true
    from public.research_contributions r
    where r.parent_id = p_parent and r.deleted_at is not null and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029') and public.community_has_live_descendant(r.id)
  ), page as (
    select v.*, count(*) over () as total
    from v
    order by v.created_at asc, v.id asc
    offset v_offset limit v_limit
  )
  select r.id, r.parent_id,
         case when p.tomb then null else r.author_name end,
         case when p.tomb then null else r.author_user_id end,
         case when p.tomb then null else r.author_contributor_id end,
         case when p.tomb then null else r.title end,
         case when p.tomb then null else r.body end,
         case when p.tomb then '{}'::jsonb else r.reactions end,
         r.origin, r.created_at,
         case when p.tomb then null else r.edited_at end,
         p.tomb,
         case when p.tomb then null else c.id end,
         case when p.tomb then null else c.user_id end,
         case when p.tomb then null else c.display_name end,
         case when p.tomb then null else c.avatar_url end,
         p.total
  from page p
  join public.research_contributions r on r.id = p.id
  left join public.contributors c on c.id = r.author_contributor_id
  order by r.created_at asc, r.id asc;
end;
$$;

-- Direct reply counts for a batch of messages, aggregated in one query.
-- Counts direct children only; nested replies are counted under their own parent.
create or replace function public.community_reply_counts(p_ids uuid[])
returns table (parent_id uuid, reply_count bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.parent_id, count(*)::bigint
  from public.research_contributions c
  where c.parent_id = any (p_ids[1:200])
    and c.origin in ('openweb','community_2029')
    and c.thread_hidden_at is null
    and (
      (c.status = 'approved' and c.deleted_at is null and nullif(btrim(c.body), '') is not null)
      or (c.deleted_at is not null and public.community_has_live_descendant(c.id))
    )
  group by c.parent_id;
$$;

-- Author edit. Only the author, only their own live community_2029 message.
-- Historical OpenWeb rows are never editable here. Keeps id, parent, author, time, reactions.
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
  update public.research_contributions
     set body = v_body, edited_at = v_now, updated_at = v_now
   where id = p_id;
  return v_now;
end;
$$;

-- Soft delete. Author deletes their own community_2029 message; an admin may delete any
-- community message. The row, its id, parent link, time and every reply stay in place.
-- Content moves to the private archive and is blanked in the public row.
create or replace function public.community_delete_message(p_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_row public.research_contributions%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select exists (select 1 from public.users where id = v_uid and role = 'admin') into v_admin;
  select * into v_row from public.research_contributions where id = p_id for update;
  if not found then raise exception 'not found'; end if;
  if v_row.origin not in ('openweb','community_2029') then raise exception 'not authorized'; end if;
  if not v_admin and not (v_row.origin = 'community_2029' and v_row.author_user_id is not distinct from v_uid) then
    raise exception 'not authorized';
  end if;
  if v_row.deleted_at is not null then return 'already_deleted'; end if;
  if v_row.thread_hidden_at is not null or v_row.status not in ('approved','pending') then
    raise exception 'not deletable';
  end if;
  insert into public.research_contribution_deletions (contribution_id, body, title, image_url, media, deleted_by, deleted_at)
  values (v_row.id, v_row.body, v_row.title, v_row.image_url, v_row.media, v_uid, v_now);
  update public.research_contributions
     set body = null, title = null, image_url = null, media = '[]'::jsonb,
         status = 'hidden', deleted_at = v_now, deleted_by = v_uid, updated_at = v_now
   where id = p_id;
  return 'deleted';
end;
$$;

-- Admin only: hide a message and everything under it. Reversible by marker:
--   update research_contributions set status='approved', thread_hidden_at=null
--   where thread_hidden_at is not null and deleted_at is null;
-- Rows already hidden for other reasons are not touched.
create or replace function public.community_hide_thread(p_root uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_count integer;
begin
  if v_uid is null or not exists (select 1 from public.users where id = v_uid and role = 'admin') then
    raise exception 'not authorized';
  end if;
  if not exists (select 1 from public.research_contributions where id = p_root) then raise exception 'not found'; end if;
  with recursive t(id, depth) as (
    select p_root, 0
    union all
    select c.id, t.depth + 1 from public.research_contributions c join t on c.parent_id = t.id where t.depth < 64
  ), u as (
    update public.research_contributions r
       set thread_hidden_at = v_now,
           status = case when r.status = 'approved' then 'hidden' else r.status end,
           updated_at = v_now
      where r.id in (select id from t)
        and r.thread_hidden_at is null
        and (r.status = 'approved' or r.deleted_at is not null)
    returning 1
  )
  select count(*)::integer into v_count from u;
  return v_count;
end;
$$;

revoke all on function public.community_has_live_descendant(uuid) from public, anon, authenticated;
revoke all on function public.community_feed_page(integer, integer, text) from public;
revoke all on function public.community_replies_page(uuid, integer, integer) from public;
revoke all on function public.community_reply_counts(uuid[]) from public;
revoke all on function public.community_edit_message(uuid, text) from public;
revoke all on function public.community_delete_message(uuid) from public;
revoke all on function public.community_hide_thread(uuid) from public;
grant execute on function public.community_feed_page(integer, integer, text) to anon, authenticated;
grant execute on function public.community_replies_page(uuid, integer, integer) to anon, authenticated;
grant execute on function public.community_reply_counts(uuid[]) to anon, authenticated;
grant execute on function public.community_edit_message(uuid, text) to authenticated;
grant execute on function public.community_delete_message(uuid) to authenticated;
grant execute on function public.community_hide_thread(uuid) to authenticated;
