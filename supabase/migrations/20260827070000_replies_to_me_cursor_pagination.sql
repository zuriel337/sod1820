-- COMMAND_CENTER_ATTENTION_CLOSURE Pass 1, §4 (replies visibility fix — BLOCKER: git-mirror).
-- This file source-controls a change that was already applied live via MCP earlier in this
-- pass (drift caught in the follow-up review) so the branch diff matches the live DB.
--
-- Adds an OPTIONAL cursor param (p_before) so older replies beyond the first page are reachable
-- ("Load more"), instead of a hard, unpaginated LIMIT that silently dropped anything past it.
-- Backward-compatible: p_before defaults to NULL -> identical behavior/output to the prior
-- version for any caller that only passes p_limit (or nothing). Newest-first order preserved.
-- No new table, no change to which rows are visible (same ownership/status logic as before).
create or replace function public.replies_to_me(p_limit integer default 40, p_before timestamptz default null)
 returns table(id uuid, author_name text, body text, target_type text, target_id text, parent_id uuid, parent_title text, convergence_slug text, created_at timestamp with time zone)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select r.id, r.author_name, r.body, r.target_type, r.target_id, r.parent_id,
         p.title as parent_title, r.convergence_slug, r.created_at
  from public.research_contributions r
  join public.research_contributions p on p.id = r.parent_id
  where p.author_user_id = auth.uid()
    and r.author_user_id is distinct from auth.uid()
    and coalesce(r.status,'') not in ('hidden','rejected')
    and (p_before is null or r.created_at < p_before)
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit,40), 100));
$function$;

-- CREATE OR REPLACE with a new trailing parameter creates a SECOND overload in Postgres rather
-- than replacing the original (functions are identified by name+arg-types) -- this repo has hit
-- this exact ambiguous-overload bug before (see 20260825030357_drop_stale_els_matrix_overloads_*.sql).
-- Caught live (both replies_to_me(integer) and replies_to_me(integer,timestamptz) existed at once,
-- which would make supabase.rpc('replies_to_me', {p_limit:...}) ambiguous over PostgREST). Drop the
-- stale 1-arg overload; the 2-arg version (p_before default null) is fully backward compatible alone.
drop function if exists public.replies_to_me(integer);

-- Explicit, self-documenting grant (this function's EXECUTE privilege was already inherited via
-- schema-level default privileges -- verified live with has_function_privilege() before and after
-- this migration was originally applied -- but no prior migration in this repo ever granted it
-- explicitly for this function, so make it explicit here rather than relying on an implicit default).
grant execute on function public.replies_to_me(integer, timestamptz) to authenticated;
