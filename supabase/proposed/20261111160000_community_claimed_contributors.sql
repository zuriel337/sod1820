-- PROPOSED, NOT APPLIED (needs ZURIEL's explicit approval for the exact statement; CLAUDE.md 0.4).
-- Purpose: the community's "החשבון שלי מהצ׳אט הישן" list must offer only historical profiles that are NOT yet connected to an account.
-- Most historical contributors have a private dossier (RLS hides contributors.user_id from clients), so the client cannot tell. This function
-- answers exactly one question for the ids it is given: "which of these already have an owner?". It returns ids only (no names, no accounts).
-- The client (communityArchive.fetchClaimedContributorIds) treats a missing function (PGRST202) as "unknown" and falls back to the reviewed links.
create or replace function public.community_claimed_contributors(p_ids uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.contributors c
  where c.id = any (coalesce(p_ids, '{}'::uuid[])[1:400])
    and c.user_id is not null
$$;
revoke all on function public.community_claimed_contributors(uuid[]) from public;
grant execute on function public.community_claimed_contributors(uuid[]) to anon, authenticated;
-- ROLLBACK: drop function if exists public.community_claimed_contributors(uuid[]);
