-- PROPOSAL ONLY. Requires separate explicit approval; not applied.
-- Existing handle_new_user trigger only: preserve user/profile creation,
-- stop implicit mailing enrolment for ALL new Auth accounts, including Legacy.
-- Existing subscribers, historical consents, credits, roles and explicit forms unchanged.
BEGIN;
DO $guard$
BEGIN
  IF (SELECT prosrc FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure) <> $expected$
declare
  v_acq jsonb := null;
  v_visitor text := null;
begin
  insert into public.users (id, email, username, display_name, avatar_url, role, tier)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'user', 'free'
  )
  on conflict (id) do nothing;

  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;

  if jsonb_typeof(new.raw_user_meta_data->'acquisition') = 'object' then
    v_acq := new.raw_user_meta_data->'acquisition';
  end if;
  v_visitor := coalesce(v_acq->>'visitor_id', new.raw_user_meta_data->>'visitor_id');

  if new.email is not null then
    insert into public.subscribers (email, name, source, active, acquisition)
    select new.email,
           coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@','1')),
           'site-signup', true, v_acq
    where not exists (select 1 from public.subscribers s where lower(s.email) = lower(new.email));
  end if;

  if v_visitor is not null and v_visitor <> '' then
    begin
      insert into public.subscribe_events (visitor_id, source, action, topic)
      values (v_visitor, 'site-signup', 'signup', 'newsletter');
    exception when others then null;
    end;
  end if;

  return new;
end $expected$
     AND (SELECT prosrc FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure) <> $new$
begin
  insert into public.users (id, email, username, display_name, avatar_url, role, tier)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'user', 'free'
  )
  on conflict (id) do nothing;

  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;

  -- Creating an account is not newsletter consent. Existing explicit newsletter
  -- signup/opt-out handlers retain their own validated purpose and suppression.
  return new;
end
$new$
  THEN RAISE EXCEPTION 'handle_new_user_source_changed_review_required'; END IF;
END
$guard$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.users (id, email, username, display_name, avatar_url, role, tier)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'user', 'free'
  )
  on conflict (id) do nothing;

  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;

  -- Creating an account is not newsletter consent. Existing explicit newsletter
  -- signup/opt-out handlers retain their own validated purpose and suppression.
  return new;
end
$function$;
COMMIT;

