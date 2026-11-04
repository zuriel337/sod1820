-- Replies in My Workspace use the existing research_contributions tree for both
-- community conversations and research discussions.  Older imported messages
-- often carry author_contributor_id rather than author_user_id, so ownership is
-- resolved only through contributors.user_id or the reviewed contributor-to-Person
-- bridge. Names, email, client-side verified pairs and URL parameters never
-- establish ownership.

-- Abort if another owner changed the private reader since this review.
do $$begin
  if md5(pg_get_functiondef('public.replies_to_me(integer,timestamptz)'::regprocedure)) <> '9262089f7315b062deedbcfb9fb913f5' then
    raise exception 'replies_to_me baseline changed';
  end if;
end$$;

drop function if exists public.replies_to_me(integer, timestamptz);

create function public.replies_to_me(p_limit integer default 40, p_before timestamptz default null)
 returns table(
   id uuid,
   author_name text,
   body text,
   target_type text,
   target_id text,
   parent_id uuid,
   parent_title text,
   convergence_slug text,
   created_at timestamp with time zone,
   origin text,
   thread_root_id uuid,
   thread_path uuid[]
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with recursive my_contributors as (
    select c.id
    from public.contributors c
    where c.user_id = (select auth.uid())
    union
    select c.id
    from public.contributors c
    join public.identity_edges edge
      on edge.kind = 'legacy_seed'
     and edge.legacy_id = 'contributor:' || c.id::text
    join public.persons person on person.person_id = edge.person_id
    where person.account_user_id = (select auth.uid())
  ),
  ancestors as (
    select c.id, c.parent_id, c.author_user_id, c.author_contributor_id,
           c.id as reply_id, array[c.id]::uuid[] as thread_path, 0 as depth
    from public.research_contributions c
    where (select auth.uid()) is not null and c.parent_id is not null
      and (p_before is null or c.created_at < p_before)
    union all
    select p.id, p.parent_id, p.author_user_id, p.author_contributor_id,
           a.reply_id, array[p.id]::uuid[] || a.thread_path, a.depth + 1
    from ancestors a
    join public.research_contributions p on p.id = a.parent_id
    where a.depth < 29 and not p.id = any(a.thread_path)
  ),
  mine as (
    select distinct a.reply_id
    from ancestors a
    where a.depth > 0
      and (
        a.author_user_id = (select auth.uid())
        or a.author_contributor_id in (select id from my_contributors)
      )
  ),
  roots as (
    select distinct on (a.reply_id)
           a.reply_id, a.id as thread_root_id, a.thread_path
    from ancestors a
    order by a.reply_id, a.depth desc
  )
  select r.id, r.author_name, r.body, r.target_type, r.target_id, r.parent_id,
         case when r.origin in ('openweb','community_2029') and p.deleted_at is not null then null else p.title end as parent_title, r.convergence_slug, r.created_at, r.origin,
         roots.thread_root_id, roots.thread_path
  from public.research_contributions r
  join mine on mine.reply_id = r.id
  join roots on roots.reply_id = r.id
  join public.research_contributions p on p.id = r.parent_id
  where not (
      coalesce(r.author_user_id = (select auth.uid()), false)
      or coalesce(r.author_contributor_id in (select id from my_contributors), false)
    )
    and coalesce(r.status, '') not in ('hidden', 'rejected')
    and (coalesce(r.origin, '') not in ('openweb', 'community_2029') or r.status = 'approved')
    and (coalesce(r.origin, '') not in ('openweb','community_2029') or (
      r.deleted_at is null and r.thread_hidden_at is null
      and exists(select 1 from public.community_message_context(r.id) visible where visible.id = r.id and not visible.is_deleted)
    ))
    and (p_before is null or r.created_at < p_before)
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
$function$;

revoke all on function public.replies_to_me(integer, timestamptz) from public, anon;
grant execute on function public.replies_to_me(integer, timestamptz) to authenticated;

comment on function public.replies_to_me(integer, timestamptz) is
  'Owner-only replies across community and research trees. Imported history is included only through an exact account-to-contributor or reviewed Person identity edge; returns canonical community thread context.';

-- Public projection only: the browser supplies its own bounded device cursors.
-- No account ID, read receipt, message text or reading-state write is accepted.
create function public.community_thread_updates(p_cursors jsonb)
returns table(root_id uuid, new_count bigint, first_reply_id uuid, first_path uuid[])
language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if jsonb_typeof(p_cursors) is distinct from 'array' then raise exception 'invalid cursors' using errcode='22023'; end if;
  if jsonb_array_length(p_cursors) > 40 then raise exception 'too many cursors' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_cursors) x where jsonb_typeof(x) <> 'object'
    or not (x ?& array['root_id','message_id','created_at'])
    or (x - array['root_id','message_id','created_at']) <> '{}'::jsonb
    or coalesce(x->>'root_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(x->>'message_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(x->>'created_at','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$') then
    raise exception 'invalid cursor' using errcode='22023';
  end if;
  if (select count(distinct (x->>'root_id')::uuid) from jsonb_array_elements(p_cursors) x) <> jsonb_array_length(p_cursors) then
    raise exception 'duplicate root' using errcode='22023';
  end if;
  return query
  with recursive cursors as (
    select (x->>'root_id')::uuid rid, (x->>'message_id')::uuid mid, (x->>'created_at')::timestamptz seen
    from jsonb_array_elements(p_cursors) x
  ), tree as (
    select c.rid, r.id, r.parent_id, r.created_at, c.seen, c.mid, array[r.id]::uuid[] path, false tomb
    from cursors c join public.research_contributions r on r.id = c.rid
    where r.parent_id is null and r.origin in ('openweb','community_2029') and r.status='approved'
      and r.deleted_at is null and r.thread_hidden_at is null and nullif(btrim(r.body),'') is not null
    union all
    select t.rid, r.id, r.parent_id, r.created_at, t.seen, t.mid, t.path || r.id, r.deleted_at is not null
    from tree t join public.research_contributions r on r.parent_id=t.id
    where cardinality(t.path)<30 and not r.id=any(t.path) and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029')
      and (r.deleted_at is not null or r.status='approved' and nullif(btrim(r.body),'') is not null)
  ), unread as materialized (
    select * from tree t where cardinality(t.path)>1 and not t.tomb
      and (t.created_at,t.id) > (t.seen,t.mid)
  ), counts as (select u.rid,count(*) n from unread u group by u.rid),
  first_unread as (select distinct on(u.rid) u.rid,u.id,u.path from unread u order by u.rid,u.created_at,u.id)
  select c.rid,coalesce(n.n,0),f.id,f.path from cursors c
  left join counts n on n.rid=c.rid left join first_unread f on f.rid=c.rid;
end;
$function$;
revoke all on function public.community_thread_updates(jsonb) from public;
grant execute on function public.community_thread_updates(jsonb) to anon, authenticated;
comment on function public.community_thread_updates(jsonb) is 'Bounded read-only counts and first public reply paths after device-local cursors. Visibility matches the canonical Community reader including body-free tombstones. No account identity or read receipts.';
