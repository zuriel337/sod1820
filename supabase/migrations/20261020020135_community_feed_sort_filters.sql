-- Community 2029: archive-wide feed sorting and filters.
--
-- This is a versioned reader rather than a replacement for community_feed_page:
-- older clients keep their exact contract, while the new Community UI can detect
-- this reader and only then expose the additional controls. The function returns
-- the same public row shape and preserves tombstone privacy.

create or replace function public.community_feed_page_v2(
  p_offset integer default 0,
  p_limit integer default 40,
  p_sort text default 'newest',
  p_filter text default 'all',
  p_window text default 'month'
)
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
  v_sort text := case when p_sort in ('newest','active','discussed','liked','oldest') then p_sort else 'newest' end;
  v_filter text := case when p_filter in ('all','unanswered','media','mine','community','legacy') then p_filter else 'all' end;
  v_since timestamptz := case
    when p_sort not in ('discussed','liked') then null
    when p_window = 'week' then now() - interval '7 days'
    when p_window = 'all' then null
    else now() - interval '30 days'
  end;
  v_user uuid := auth.uid();
begin
  return query
  with roots as (
    select r.id, r.created_at, false as tomb
    from public.research_contributions r
    where r.parent_id is null and r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null
    union all
    select r.id, r.created_at, true
    from public.research_contributions r
    where r.parent_id is null and r.deleted_at is not null and r.thread_hidden_at is null
      and r.origin in ('openweb','community_2029') and public.community_has_live_descendant(r.id)
  ), scored as (
    select roots.id, roots.created_at, roots.tomb,
           coalesce(m.reply_count, 0::bigint) as reply_count,
           greatest(roots.created_at, coalesce(m.last_reply_at, roots.created_at)) as last_activity_at,
           (
             case when r.reactions->>'likes' ~ '^[0-9]+$' then (r.reactions->>'likes')::bigint else 0::bigint end
             + case when jsonb_typeof(r.reactions->'👍') = 'array' then jsonb_array_length(r.reactions->'👍')::bigint else 0::bigint end
           ) as like_count
    from roots
    join public.research_contributions r on r.id = roots.id
    -- A parent-indexed lateral read is deliberate. On the live archive, the
    -- planner repeatedly rescanned an archive-wide aggregate (22.6 s); this
    -- bounded lookup completed the same ranking plan in about 108 ms.
    left join lateral (
      select count(*)::bigint as reply_count, max(child.created_at) as last_reply_at
      from public.research_contributions child
      where child.parent_id = roots.id
        and child.origin in ('openweb','community_2029')
        and child.thread_hidden_at is null
        and (
          (child.status = 'approved' and child.deleted_at is null and nullif(btrim(child.body), '') is not null)
          or (child.deleted_at is not null and public.community_has_live_descendant(child.id))
        )
    ) m on true
    left join public.contributors c on c.id = r.author_contributor_id
    where (v_since is null or roots.created_at >= v_since)
      and case v_filter
        when 'unanswered' then coalesce(m.reply_count, 0) = 0
        when 'media' then not roots.tomb and (
          nullif(btrim(r.image_url), '') is not null
          or (r.media is not null and r.media <> '[]'::jsonb and r.media <> '{}'::jsonb)
          or r.body ~* 'https?://[^[:space:]]+\.(jpg|jpeg|png|webp|gif|pdf|txt|docx)([?#][^[:space:]]*)?'
        )
        when 'mine' then v_user is not null and (r.author_user_id = v_user or c.user_id = v_user)
        when 'community' then r.origin = 'community_2029'
        when 'legacy' then r.origin = 'openweb'
        else true
      end
  ), page as (
    select scored.*, case when v_offset = 0 then count(*) over () else null end as total
    from scored
    order by
      case when v_sort = 'oldest' then scored.created_at end asc,
      case when v_sort = 'active' then scored.last_activity_at end desc,
      case when v_sort = 'discussed' then scored.reply_count end desc,
      case when v_sort = 'liked' then scored.like_count end desc,
      case when v_sort = 'discussed' then scored.last_activity_at end desc,
      case when v_sort = 'liked' then scored.reply_count end desc,
      case when v_sort not in ('oldest','active','discussed','liked') then scored.created_at end desc,
      case when v_sort = 'oldest' then scored.id end asc,
      scored.created_at desc,
      scored.id desc
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
  order by
    case when v_sort = 'oldest' then p.created_at end asc,
    case when v_sort = 'active' then p.last_activity_at end desc,
    case when v_sort = 'discussed' then p.reply_count end desc,
    case when v_sort = 'liked' then p.like_count end desc,
    case when v_sort = 'discussed' then p.last_activity_at end desc,
    case when v_sort = 'liked' then p.reply_count end desc,
    case when v_sort not in ('oldest','active','discussed','liked') then p.created_at end desc,
    case when v_sort = 'oldest' then p.id end asc,
    p.created_at desc,
    p.id desc;
end;
$$;

revoke all on function public.community_feed_page_v2(integer, integer, text, text, text) from public;
grant execute on function public.community_feed_page_v2(integer, integer, text, text, text) to anon, authenticated;

comment on function public.community_feed_page_v2(integer, integer, text, text, text) is
  'Bounded Community root feed with archive-wide sort/filter controls; preserves v1 fallback and tombstone privacy.';
