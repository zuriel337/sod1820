-- COMMAND_CENTER_ATTENTION_CLOSURE Pass 1 follow-up, §2 (deep-reply visibility closure).
--
-- Problem: replies_to_me only ever joined the IMMEDIATE parent (p.id = r.parent_id), so a
-- reply-to-a-reply (depth >= 2) never reached the original thread-root author -- only whoever
-- wrote the immediate parent got notified. Confirmed live-verified root cause from the Pass 1
-- audit; explicitly deferred there as "a material RPC semantic change" pending this closure.
--
-- Fix: walk the EXISTING research_contributions.parent_id graph with a recursive CTE instead of
-- adding any new column/trigger/table/backfill (research_contributions already models the full
-- thread as a self-referencing chain -- no denormalized thread_root_id needed).
--
-- Design notes (matches the closure spec exactly):
--   - "ancestors" walks upward from every contribution via parent_id, bounded to depth < 25
--     (safety cap -- normal threads here are a handful of levels deep; this only guards against
--     pathological/unexpected depth, not a realistic case).
--   - Ancestor visibility itself is NOT status-filtered (matches original behavior exactly: the
--     original query never checked p.status either -- only r.status on the surfaced reply).
--   - "mine" is `select distinct reply_id ... where depth > 0 and author_user_id = auth.uid()` --
--     the DISTINCT is what guarantees a reply is returned at most once even if more than one
--     ancestor in its chain happens to be authored by the same caller (e.g. the caller wrote both
--     the thread root and a mid-thread reply).
--   - Final SELECT still filters/orders/limits exactly as before: excludes the caller's own
--     replies, excludes hidden/rejected, newest-first, cursor pagination (p_before) preserved,
--     returns columns describing the reply itself (r) plus its own immediate parent's title for
--     display context -- never a copy of an ancestor row standing in for the reply.
create or replace function public.replies_to_me(p_limit integer default 40, p_before timestamptz default null)
 returns table(id uuid, author_name text, body text, target_type text, target_id text, parent_id uuid, parent_title text, convergence_slug text, created_at timestamp with time zone)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with recursive ancestors as (
    select c.id, c.parent_id, c.author_user_id, c.id as reply_id, 0 as depth
    from public.research_contributions c
    union all
    select p.id, p.parent_id, p.author_user_id, a.reply_id, a.depth + 1
    from ancestors a
    join public.research_contributions p on p.id = a.parent_id
    where a.depth < 25
  ),
  mine as (
    select distinct reply_id
    from ancestors
    where depth > 0
      and author_user_id = auth.uid()
  )
  select r.id, r.author_name, r.body, r.target_type, r.target_id, r.parent_id,
         p.title as parent_title, r.convergence_slug, r.created_at
  from public.research_contributions r
  join mine m on m.reply_id = r.id
  join public.research_contributions p on p.id = r.parent_id
  where r.author_user_id is distinct from auth.uid()
    and coalesce(r.status,'') not in ('hidden','rejected')
    and (p_before is null or r.created_at < p_before)
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit,40), 100));
$function$;

-- Same signature as the previous migration (integer, timestamptz) -- CREATE OR REPLACE here
-- genuinely replaces in place, no new overload, nothing to drop.
grant execute on function public.replies_to_me(integer, timestamptz) to authenticated;
