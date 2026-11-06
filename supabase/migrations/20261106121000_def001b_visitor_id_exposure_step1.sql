-- DEF-001b (step 1 of 2) - stop guest visitor ids (bearer-style identifiers used by the guest notification RPCs and
-- watch_toggle) from being readable by clients. Companion of 20261106120000_def001_revoke_resolve_visitor_email.sql.
--
-- Exposure found in the audit: `visitor_id` is readable by anon in public.push_subscriptions (policy ps_anon_select),
-- public.feedback (policy feedback_public_read = true) and public.els_records (table-level SELECT). A visitor id is enough
-- to call notification_prefs_guest_save_v1 / watch_toggle for that guest.
--
-- Step 1 (this file) is backward compatible and safe to apply before any frontend deployment:
--   * feedback: no reader exists in src/, api/ or supabase/functions; only administrators keep read access.
--   * els_records: every reader selects an explicit column list that never contains visitor_id; the table-level SELECT
--     is replaced by a column grant that excludes it (service_role and the owner are unaffected).
--   * push_subscriptions: ADDS the two SECURITY DEFINER RPCs the client will use. Table access is NOT touched here.
-- Step 2 (supabase/proposed/20261106121500_def001b_push_subscriptions_lockdown.sql) removes the anon table access and
-- must only be applied AFTER the frontend that calls these RPCs (src/lib/push.js) is live.
--
-- NOT applied by this repository change. Apply only with explicit ZURIEL approval (production DB change).

-- feedback: administrators only.
drop policy if exists feedback_public_read on public.feedback;
create policy feedback_admin_read on public.feedback for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));
revoke select on public.feedback from anon;

-- els_records: every column except visitor_id stays readable under the existing row policies.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'els_records' and column_name <> 'visitor_id';
  if cols is null then raise exception 'els_records not found'; end if;
  execute 'revoke select on public.els_records from anon, authenticated';
  execute format('grant select (%s) on public.els_records to anon, authenticated', cols);
end $$;

-- push_subscriptions: write path through RPCs (the browser can then lose direct table access in step 2).
create or replace function public.push_subscription_upsert_v1(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_topics text[] default null,
  p_user_agent text default null,
  p_visitor text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_endpoint text := btrim(coalesce(p_endpoint, ''));
  v_visitor text := nullif(lower(btrim(coalesce(p_visitor, ''))), '');
  v_topics text[] := coalesce(p_topics, '{}'::text[]);
begin
  if v_endpoint !~ '^https://' or length(v_endpoint) > 2048 then raise exception 'invalid endpoint'; end if;
  if length(coalesce(p_p256dh, '')) not between 1 and 512 or length(coalesce(p_auth, '')) not between 1 and 512 then
    raise exception 'invalid keys';
  end if;
  if v_visitor is not null and v_visitor !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'bad visitor identity';
  end if;
  if cardinality(v_topics) > 100 or exists (select 1 from unnest(v_topics) t where btrim(t) = '' or length(t) > 160) then
    raise exception 'invalid topics';
  end if;

  insert into public.push_subscriptions (endpoint, p256dh, auth, user_id, visitor_id, topics, user_agent, last_seen)
  values (v_endpoint, p_p256dh, p_auth, v_uid, case when v_uid is null then v_visitor end, v_topics,
          left(p_user_agent, 512), now())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_id = excluded.user_id,
        visitor_id = excluded.visitor_id,
        topics = excluded.topics,
        user_agent = excluded.user_agent,
        last_seen = excluded.last_seen
    where public.push_subscriptions.user_id is null or public.push_subscriptions.user_id = v_uid;
end
$function$;

create or replace function public.push_subscription_delete_v1(p_endpoint text) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  delete from public.push_subscriptions
  where endpoint = btrim(coalesce(p_endpoint, ''))
    and (user_id is null or user_id = auth.uid());
end
$function$;

revoke all on function public.push_subscription_upsert_v1(text, text, text, text[], text, text) from public;
revoke all on function public.push_subscription_delete_v1(text) from public;
grant execute on function public.push_subscription_upsert_v1(text, text, text, text[], text, text) to anon, authenticated, service_role;
grant execute on function public.push_subscription_delete_v1(text) to anon, authenticated, service_role;
