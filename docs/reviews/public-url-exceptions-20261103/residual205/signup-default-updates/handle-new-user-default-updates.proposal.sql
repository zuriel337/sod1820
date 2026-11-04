-- PROPOSAL ONLY. Shared-server approval is required before application.
-- Supersedes the held identity-only A proposal; does not apply that old policy.
-- Canonical tables/function/trigger only. No new table, RPC, job, queue or flag.
-- Requires approved site-updates purpose schema B and accepted active unsubscribe D.
-- No historical subscriber UPDATE or backfill is performed by this migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- Bound the activation boundary. Existing pre-lock Auth transactions finish first.
LOCK TABLE auth.users IN SHARE ROW EXCLUSIVE MODE;
DO $migration$
declare
  v_old_body text := $old_body$
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
end $old_body$;
  v_new_body text := $new_body$
declare
  v_cutoff timestamptz;
  v_email text;
  v_subscriber public.subscribers%rowtype;
  v_subscriber_id bigint;
  v_enrolled boolean := false;
begin
  -- Reuse the existing Auth provisioning owner. No callable signup RPC is added.
  if TG_TABLE_SCHEMA <> 'auth' or TG_TABLE_NAME <> 'users'
     or TG_WHEN <> 'AFTER' or TG_LEVEL <> 'ROW'
     or TG_OP not in ('INSERT', 'UPDATE') or TG_NARGS <> 1 then
    raise exception 'site_signup_default_trigger_context_invalid';
  end if;
  v_cutoff := TG_ARGV[0]::timestamptz;
  if v_cutoff is null or not isfinite(v_cutoff) then
    raise exception 'site_signup_default_cutoff_invalid';
  end if;

  -- Preserve canonical creation and fixed defaults; metadata is not privilege.
  -- Confirmation updates never recreate users/profiles or change role/credits.
  if TG_OP = 'INSERT' then
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
  end if;

  -- Only post-activation new accounts, after Auth's actual email verification.
  -- No provider-name, claimed metadata verification, visitor, acquisition or Follow.
  if new.created_at is null or new.created_at < v_cutoff
     or new.is_anonymous is distinct from false
     or new.email_confirmed_at is null then
    return new;
  end if;
  if TG_OP = 'UPDATE' then
    if old.email_confirmed_at is not null
       or old.is_anonymous is distinct from false
       or old.created_at is distinct from new.created_at
       or lower(btrim(old.email)) is distinct from lower(btrim(new.email)) then
      return new;
    end if;
  end if;
  v_email := lower(btrim(new.email));
  if v_email is null or v_email = '' or length(v_email) > 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    return new;
  end if;

  -- This is the user's new default-signup policy, not explicit checkbox opt-in.
  -- The pre-existing unique lower(email) identity remains canonical.
  insert into public.subscribers
    (email, source, active, email_purposes, site_updates_consented_at)
  values
    (v_email, 'site-signup-default-updates-v1', true,
     ARRAY['site-updates']::text[], new.email_confirmed_at)
  on conflict (lower(email)) do nothing
  returning id into v_subscriber_id;
  v_enrolled := v_subscriber_id is not null;

  if not v_enrolled then
    -- Serialize against opt-out and other consent writes. Never reactivate.
    select s.* into v_subscriber from public.subscribers s
    where lower(s.email) = v_email for update;
    if not found then
      raise exception 'site_signup_default_subscriber_conflict_missing';
    end if;
    if v_subscriber.active is distinct from true
       or v_subscriber.unsubscribed_at is not null then
      return new;
    end if;
    if v_subscriber.email_purposes @> ARRAY['site-updates']::text[] then
      return new; -- Replay preserves the existing consent time and audit event.
    end if;
    -- Preserve every old purpose/source/acquisition/timestamp. Add only the newly
    -- authorized purpose and its verification time, under the locked active row.
    update public.subscribers
    set email_purposes = array_append(email_purposes, 'site-updates'),
        site_updates_consented_at = coalesce(site_updates_consented_at, new.email_confirmed_at)
    where id = v_subscriber.id and active = true and unsubscribed_at is null
      and not (email_purposes @> ARRAY['site-updates']::text[])
    returning id into v_subscriber_id;
    v_enrolled := v_subscriber_id is not null;
  end if;

  if v_enrolled then
    -- Existing provenance stream, no new audience store, Follow or mail dispatch.
    insert into public.subscribe_events (user_id, source, action, topic, created_at)
    values (new.id, 'site-signup-default-updates-v1', 'signup', 'newsletter',
            new.email_confirmed_at);
  end if;
  return new;
end
$new_body$;
  v_current record;
  v_trigger record;
  v_confirm_attnum smallint;
  v_cutoff_text text;
  v_cutoff timestamptz;
begin

  select p.* into strict v_current from pg_proc p
  where p.oid = 'public.handle_new_user()'::regprocedure;
  if not v_current.prosecdef or v_current.proconfig is distinct from ARRAY['search_path=public']::text[]
     or v_current.prorettype <> 'trigger'::regtype
     or v_current.prolang <> (select oid from pg_language where lanname = 'plpgsql') then
    raise exception 'handle_new_user_attributes_changed_review_required';
  end if;
  if (select count(*) from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal) <> 1 then
    raise exception 'auth_triggers_changed_review_required';
  end if;
  select * into strict v_trigger from pg_trigger
  where tgrelid='auth.users'::regclass and tgname='on_auth_user_created' and not tgisinternal;
  select attnum into strict v_confirm_attnum from pg_attribute
  where attrelid='auth.users'::regclass and attname='email_confirmed_at' and not attisdropped;
  if v_trigger.tgfoid <> v_current.oid or v_trigger.tgenabled <> 'O'
     or v_trigger.tgqual is not null or v_trigger.tgconstraint <> 0
     or v_trigger.tgoldtable is not null or v_trigger.tgnewtable is not null then
    raise exception 'on_auth_user_created_changed_review_required';
  end if;

  if v_current.prosrc <> v_old_body and v_current.prosrc <> v_new_body then
    raise exception 'handle_new_user_source_changed_review_required';
  end if;
  -- Fail closed before touching Auth if B is missing, unvalidated or has drifted.
  if not exists (select 1 from pg_attribute where attrelid='public.subscribers'::regclass
                 and attname='site_updates_consented_at' and atttypid='timestamptz'::regtype and not attisdropped)
     or not exists (select 1 from pg_constraint where conrelid='public.subscribers'::regclass
                    and conname='subscribers_email_purposes_valid' and convalidated
                    and pg_get_constraintdef(oid) = $required_constraint$CHECK (((cardinality(email_purposes) > 0) AND (email_purposes <@ ARRAY['general'::text, 'site-openings'::text, 'site-updates'::text]) AND ((NOT (email_purposes @> ARRAY['site-openings'::text])) OR (opening_updates_consented_at IS NOT NULL)) AND ((NOT (email_purposes @> ARRAY['site-updates'::text])) OR (site_updates_consented_at IS NOT NULL))))$required_constraint$)
     or not exists (select 1 from pg_policy where polrelid='public.subscribers'::regclass
                    and polname='subscribers_public_insert' and polcmd='a'
                    and pg_get_expr(polwithcheck,polrelid) = $required_policy$((email_purposes = ARRAY['general'::text]) AND (opening_updates_consented_at IS NULL) AND (site_updates_consented_at IS NULL))$required_policy$)
     or not (select relrowsecurity from pg_class where oid='public.subscribers'::regclass) then
    raise exception 'site_updates_schema_B_not_ready';
  end if;
  if exists (select 1 from pg_trigger
             where tgrelid in ('public.subscribers'::regclass, 'public.subscribe_events'::regclass)
             and not tgisinternal) then
    raise exception 'subscriber_side_effect_triggers_review_required';
  end if;
  if not exists (select 1 from pg_index i where i.indrelid='public.subscribers'::regclass
                 and i.indisunique and i.indisvalid and i.indisready
                 and i.indnkeyatts=1 and i.indpred is null and pg_get_expr(i.indexprs,i.indrelid)='lower(email)') then
    raise exception 'subscriber_email_identity_changed_review_required';
  end if;
  if v_current.prosrc = v_new_body then

    if v_trigger.tgtype <> 21 or v_trigger.tgnargs <> 1
       or v_trigger.tgattr::text <> v_confirm_attnum::text then
      raise exception 'on_auth_user_created_changed_review_required';
    end if;
    v_cutoff_text := convert_from(substring(v_trigger.tgargs from 1 for octet_length(v_trigger.tgargs)-1), 'UTF8');
    v_cutoff := v_cutoff_text::timestamptz;
    if not isfinite(v_cutoff) or v_cutoff_text !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{6}Z$' then
      raise exception 'site_signup_default_cutoff_invalid';
    end if;

    -- Idempotent migration replay retains the original cutoff byte-for-byte.
  else
    if v_trigger.tgtype <> 5 or v_trigger.tgnargs <> 0 or v_trigger.tgattr::text <> '' then
      raise exception 'on_auth_user_created_changed_review_required';
    end if;
    v_cutoff_text := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  end if;
  execute format('CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS %L', v_new_body);
  execute format('CREATE OR REPLACE TRIGGER on_auth_user_created AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(%L)', v_cutoff_text);
  if (select proowner from pg_proc where oid=v_current.oid) <> v_current.proowner
     or (select proacl from pg_proc where oid=v_current.oid) is distinct from v_current.proacl then
    raise exception 'handle_new_user_owner_or_acl_changed';
  end if;
  raise notice 'SITE_SIGNUP_DEFAULT_ACTIVATION_UTC=%', v_cutoff_text;
end
$migration$;
COMMIT;
-- Capture this result in the approved apply receipt; it contains no PII.
SELECT md5(p.prosrc) AS function_body_md5, p.prosecdef, p.proconfig,
       pg_get_userbyid(p.proowner) AS function_owner,
       pg_get_triggerdef(t.oid) AS activation_trigger
FROM pg_proc p JOIN pg_trigger t ON t.tgfoid=p.oid
WHERE p.oid='public.handle_new_user()'::regprocedure AND t.tgrelid='auth.users'::regclass
  AND t.tgname='on_auth_user_created';
