-- Community guest moderator v1 (PROPOSED — not applied; DB changes need explicit
-- ZURIEL approval of this exact file).
--
-- A new, narrow role: a community guest moderator can see and approve/hide
-- unreviewed guest messages (the existing community_guest_unreviewed /
-- community_guest_review flow). It grants nothing else: not site admin, not the
-- separate community_hints → gallery treasure review, not tree-hint marking.
-- This is deliberately a NEW, narrower capability rather than widening the
-- existing single admin role, which already reaches every admin action on the
-- site. community_is_admin() and every other admin-gated function are untouched.
alter table public.users add column if not exists community_moderator boolean not null default false;

create or replace function public.community_can_moderate_guests()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.users where id = auth.uid() and (role = 'admin' or community_moderator)
  )
$function$;
revoke all on function public.community_can_moderate_guests() from public;
grant execute on function public.community_can_moderate_guests() to authenticated;

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
  where public.community_can_moderate_guests()
    and g.reviewed_at is null
    and r.status = 'approved' and r.deleted_at is null
    and (p_ids is null or g.contribution_id = any(p_ids))
  order by g.created_at desc
  limit 200
$function$;
revoke all on function public.community_guest_unreviewed(uuid[]) from public;
grant execute on function public.community_guest_unreviewed(uuid[]) to authenticated;

create or replace function public.community_guest_review(p_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.community_can_moderate_guests() then raise exception 'not authorized'; end if;
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
