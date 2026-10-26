-- EXTEND_EXISTING: existing Community message RPCs and private edit/deletion
-- archives. Branch-only; no live apply. No RLS, source identity or graph changes.
-- Requires the already-live Community edit/soft-delete migration (2026-10-19).
-- A reviewed alias grants message ownership, never admin or research authority.

do $preconditions$
begin
  if to_regprocedure('public.community_edit_message(uuid,text)') is null
     or to_regprocedure('public.community_delete_message(uuid)') is null
     or to_regclass('public.research_contribution_edits') is null
     or to_regclass('public.research_contribution_deletions') is null then
    raise exception 'existing Community message-management foundation required';
  end if;
end $preconditions$;

create or replace function public._community_message_owned_by_caller_v1(
  p_row public.research_contributions
)
returns boolean
language sql stable security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select (select auth.uid()) is not null
    and (p_row).origin in ('openweb', 'community_2029')
    and case
      -- An explicit current author cannot be superseded by a conflicting alias.
      when (p_row).author_user_id is not null then
        (p_row).author_user_id = (select auth.uid())
      else exists (
        select 1 from public.contributors c
        where c.id = (p_row).author_contributor_id
          and (
            c.user_id = (select auth.uid())
            or (
              c.user_id is null
              and exists (
                select 1 from public.identity_edges e
                join public.persons p on p.person_id = e.person_id
                where e.kind = 'legacy_seed'
                  and e.legacy_id = 'contributor:' || c.id::text
                  and e.confidence = 100
                  and e.meta->'human_gate' = 'true'::jsonb
                  and p.account_user_id = (select auth.uid())
              )
              and not exists (
                select 1 from public.identity_edges other
                left join public.persons p on p.person_id = other.person_id
                where other.kind = 'legacy_seed'
                  and other.legacy_id = 'contributor:' || c.id::text
                  and p.account_user_id is distinct from (select auth.uid())
              )
            )
          )
      )
    end;
$function$;
revoke all on function public._community_message_owned_by_caller_v1(public.research_contributions)
  from public, anon, authenticated;

-- One bounded permission read per visible page; never expose Person IDs, emails,
-- private message content or an unowned hidden message's existence.
create or replace function public.community_message_actions_v1(p_ids uuid[])
returns table(id uuid, can_edit boolean, can_delete boolean, reason text)
language plpgsql stable security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'auth required' using errcode='42501'; end if;
  if coalesce(cardinality(p_ids),0) > 100 then
    raise exception 'at most 100 messages per page' using errcode='22023';
  end if;
  return query
    with requested as (select distinct requested_id from unnest(p_ids) requested_id),
    scoped as materialized (
      select r.*, public._community_message_owned_by_caller_v1(r) as owned,
             public.rd_is_admin() as administrator
      from public.research_contributions r join requested q on q.requested_id=r.id
      where r.origin in ('openweb','community_2029')
    ), decisions as (
      select s.id, s.owned, s.administrator,
             s.graph_node_id is not null or s.projected_insight_id is not null as protected_source,
             s.deleted_at is null and s.thread_hidden_at is null as available,
             s.status
      from scoped s
      where s.owned or s.administrator
         or (s.status='approved' and s.deleted_at is null and s.thread_hidden_at is null)
    )
    select d.id,
      coalesce(d.owned and d.available and not d.protected_source and d.status='approved',false),
      coalesce((d.owned or d.administrator) and d.available and not d.protected_source and d.status in ('approved','pending'),false),
      case when not (d.owned or d.administrator) then 'not_owner'
           when d.protected_source then 'source_requires_review'
           when not d.available or d.status is null or d.status not in ('approved','pending') then 'message_unavailable'
           else 'allowed' end
    from decisions d;
end $function$;
revoke all on function public.community_message_actions_v1(uuid[]) from public, anon;
grant execute on function public.community_message_actions_v1(uuid[]) to authenticated;

create or replace function public.community_edit_message(p_id uuid, p_body text)
returns timestamptz
language plpgsql security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.research_contributions%rowtype;
  v_body text := btrim(coalesce(p_body,''));
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'auth required' using errcode='42501'; end if;
  if length(v_body)=0 or length(v_body)>6000 then
    raise exception 'body must contain 1 to 6000 characters' using errcode='22023';
  end if;
  select * into v_row from public.research_contributions where id=p_id for update;
  if not found then raise exception 'not authorized' using errcode='42501'; end if;
  if v_row.author_contributor_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('person_contributor:'||v_row.author_contributor_id::text,1820));
  end if;
  if not coalesce(public._community_message_owned_by_caller_v1(v_row),false) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if v_row.graph_node_id is not null or v_row.projected_insight_id is not null then
    raise exception 'source_requires_review' using errcode='55000';
  end if;
  if v_row.status is distinct from 'approved' or v_row.deleted_at is not null or v_row.thread_hidden_at is not null then
    raise exception 'not editable' using errcode='55000';
  end if;
  if btrim(coalesce(v_row.body,''))=v_body then return v_row.edited_at; end if;
  insert into public.research_contribution_edits(contribution_id,body,edited_by,edited_at)
  values(v_row.id,v_row.body,v_uid,v_now);
  update public.research_contributions set body=v_body,edited_at=v_now,updated_at=v_now where id=p_id;
  return v_now;
end $function$;
revoke all on function public.community_edit_message(uuid,text) from public, anon;
grant execute on function public.community_edit_message(uuid,text) to authenticated;

create or replace function public.community_delete_message(p_id uuid)
returns text
language plpgsql security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.research_contributions%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'auth required' using errcode='42501'; end if;
  select * into v_row from public.research_contributions where id=p_id for update;
  if not found then raise exception 'not authorized' using errcode='42501'; end if;
  if v_row.author_contributor_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('person_contributor:'||v_row.author_contributor_id::text,1820));
  end if;
  if v_row.origin is null or v_row.origin not in ('openweb','community_2029')
     or not (public.rd_is_admin() or coalesce(public._community_message_owned_by_caller_v1(v_row),false)) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if v_row.graph_node_id is not null or v_row.projected_insight_id is not null then
    raise exception 'source_requires_review' using errcode='55000';
  end if;
  if v_row.deleted_at is not null then return 'already_deleted'; end if;
  if v_row.thread_hidden_at is not null or v_row.status is null or v_row.status not in ('approved','pending') then
    raise exception 'not deletable' using errcode='55000';
  end if;
  insert into public.research_contribution_deletions(contribution_id,body,title,image_url,media,status,deleted_by,deleted_at)
  values(v_row.id,v_row.body,v_row.title,v_row.image_url,v_row.media,v_row.status,v_uid,v_now);
  update public.research_contributions
     set body=null,title=null,image_url=null,media='[]'::jsonb,status='hidden',
         deleted_at=v_now,deleted_by=v_uid,updated_at=v_now
   where id=p_id;
  return 'deleted';
end $function$;
revoke all on function public.community_delete_message(uuid) from public, anon;
grant execute on function public.community_delete_message(uuid) to authenticated;

-- Older general-purpose callers must reach the same Community checks/archives.
-- Their original noncommunity research behavior remains outside this gateway.
create or replace function public.edit_contribution(p_id uuid, p_body text)
returns void language plpgsql security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare v_uid uuid := auth.uid(); v_author uuid; v_origin text;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select author_user_id,origin into v_author,v_origin from public.research_contributions where id=p_id;
  if not found then raise exception 'not found'; end if;
  if v_origin in ('openweb','community_2029') then
    perform public.community_edit_message(p_id,p_body);
    return;
  end if;
  if p_body is null or length(btrim(p_body))=0 then raise exception 'empty body'; end if;
  if not public.rd_is_admin() and (v_author is null or v_author is distinct from v_uid) then raise exception 'not authorized'; end if;
  update public.research_contributions set body=left(p_body,6000),updated_at=now() where id=p_id;
end $function$;

create or replace function public.remove_contribution(p_id uuid)
returns void language plpgsql security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare v_uid uuid := auth.uid(); v_author uuid; v_origin text;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select author_user_id,origin into v_author,v_origin from public.research_contributions where id=p_id;
  if not found then raise exception 'not found'; end if;
  if v_origin in ('openweb','community_2029') then
    perform public.community_delete_message(p_id);
    return;
  end if;
  if not public.rd_is_admin() and (v_author is null or v_author is distinct from v_uid) then raise exception 'not authorized'; end if;
  update public.research_contributions set status='hidden',updated_at=now() where id=p_id;
end $function$;

comment on function public.community_message_actions_v1(uuid[]) is
  'Authenticated bounded Community action capabilities from exact native/direct/reviewed Person ownership. No identity payload or AI calls. Direct research projections require review.';
