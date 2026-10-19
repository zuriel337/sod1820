-- Community 2029: automatic link between a signed-in account and its old OpenWeb author record,
-- decided only by the account's CONFIRMED email matching the contributor's stored email exactly
-- (same rule as contributors_claim_legacy, without the manual click).
--
-- BRANCH-ONLY. Not applied to any live database. Nothing here runs by itself: the user-facing function
-- is called by the community page after sign-in, and the bulk function is admin-only and must be run
-- explicitly. Existing functions are untouched.
--
-- Deliberately NOT auto-linked (left for manual review):
--   * an account that already owns a contributor row (add_contribution picks "limit 1", so a second row
--     could silently change which contributor, and which trust flag, new posts use);
--   * trusted / vip / locked / inactive / merged contributors, or any source other than openweb_import;
--   * a contributor that is already claimed.
-- Undo: update contributors set user_id = null where id in (select contributor_id from contributor_claim_events where method like 'auto_%');

create table if not exists public.contributor_claim_events (
  id bigserial primary key,
  contributor_id uuid not null,
  user_id uuid not null,
  method text not null,
  created_at timestamptz not null default now()
);
alter table public.contributor_claim_events enable row level security;
revoke all on public.contributor_claim_events from anon, authenticated;
revoke all on sequence public.contributor_claim_events_id_seq from anon, authenticated;

-- Called for the signed-in user. Never raises for "nothing to do": returns {claimed, messages, reason}.
create or replace function public.contributors_claim_legacy_by_email()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_ids uuid[];
  v_messages bigint := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select lower(btrim(email)), email_confirmed_at into v_email, v_confirmed from auth.users where id = v_uid;
  if v_email is null or v_email = '' or v_confirmed is null then
    return jsonb_build_object('claimed', 0, 'messages', 0, 'reason', 'email_not_confirmed');
  end if;
  if exists (select 1 from public.contributors where user_id = v_uid) then
    return jsonb_build_object('claimed', 0, 'messages', 0, 'reason', 'account_has_contributor');
  end if;

  with picked as (
    select id from public.contributors
    where user_id is null and source = 'openweb_import' and merged_into is null
      and coalesce(trusted, false) = false and coalesce(vip, false) = false
      and coalesce(locked, false) = false and coalesce(active, true) = true
      and lower(btrim(email)) = v_email
    order by created_at
    limit 5
    for update
  ), upd as (
    update public.contributors c set user_id = v_uid, updated_at = now()
    from picked where c.id = picked.id and c.user_id is null
    returning c.id
  ), logged as (
    insert into public.contributor_claim_events (contributor_id, user_id, method)
    select id, v_uid, 'auto_login' from upd returning contributor_id
  )
  select array_agg(contributor_id) into v_ids from logged;

  if v_ids is null then
    return jsonb_build_object('claimed', 0, 'messages', 0, 'reason', 'no_match');
  end if;
  select count(*) into v_messages from public.research_contributions
   where author_contributor_id = any (v_ids) and origin = 'openweb' and status = 'approved';
  return jsonb_build_object('claimed', array_length(v_ids, 1), 'messages', v_messages, 'reason', null);
end;
$$;

-- Admin one-shot: link every eligible old author whose email matches a CONFIRMED site account, using the
-- same rules as above. Returns counts and contributor ids only (no emails).
create or replace function public.contributors_link_registered_legacy()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_linked uuid[];
  v_skipped uuid[];
begin
  if not public.community_is_admin() then raise exception 'not authorized'; end if;

  with cand as (
    select c.id as contributor_id, u.id as user_id,
           exists (select 1 from public.contributors o where o.user_id = u.id) as has_contributor
    from public.contributors c
    join auth.users u on lower(btrim(u.email)) = lower(btrim(c.email)) and u.email_confirmed_at is not null
    where c.user_id is null and c.source = 'openweb_import' and c.merged_into is null
      and coalesce(c.trusted, false) = false and coalesce(c.vip, false) = false
      and coalesce(c.locked, false) = false and coalesce(c.active, true) = true
      and nullif(btrim(c.email), '') is not null
  ), upd as (
    update public.contributors c set user_id = cand.user_id, updated_at = now()
    from cand where c.id = cand.contributor_id and not cand.has_contributor and c.user_id is null
    returning c.id, cand.user_id
  ), logged as (
    insert into public.contributor_claim_events (contributor_id, user_id, method)
    select id, user_id, 'auto_backfill' from upd returning contributor_id
  )
  select (select array_agg(contributor_id) from logged),
         (select array_agg(contributor_id) from cand where has_contributor)
  into v_linked, v_skipped;

  return jsonb_build_object(
    'linked', coalesce(array_length(v_linked, 1), 0),
    'skipped_account_has_contributor', coalesce(array_length(v_skipped, 1), 0),
    'linked_contributor_ids', coalesce(to_jsonb(v_linked), '[]'::jsonb),
    'skipped_contributor_ids', coalesce(to_jsonb(v_skipped), '[]'::jsonb));
end;
$$;

revoke all on function public.contributors_claim_legacy_by_email() from public, anon;
revoke all on function public.contributors_link_registered_legacy() from public, anon;
grant execute on function public.contributors_claim_legacy_by_email() to authenticated;
grant execute on function public.contributors_link_registered_legacy() to authenticated;
