-- Subscriber Attribution Wiring v1 — path 3 (Auth-OTP gate).
-- ────────────────────────────────────────────────────────────────────────────
-- ⚠️ WIRING, NOT A SCHEMA MIGRATION: subscribers.acquisition (jsonb) ALREADY exists.
-- This only teaches the existing handle_new_user() trigger to persist the acquisition
-- snapshot that requestEmailOtp() now threads through auth user_metadata
-- (raw_user_meta_data->'acquisition'), plus a signup linkage row in subscribe_events.
-- The Auth-OTP signup is the dominant path and has no client localStorage server-side,
-- so the snapshot can only arrive via user_metadata. All prior behavior is preserved
-- verbatim (users + profiles rows, subscriber insert, idempotency). No column/table added.
--
-- HELD — do NOT apply without ZURIEL authorization (branch/PR review first).

create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  -- 🌱 שורת-profiles קנונית (מקור-אמת אחד). idempotent.
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;

  -- WIRING: תצלום-ייחוס + visitor_id שהלקוח צירף ל-user_metadata (requestEmailOtp).
  -- jsonb אמיתי בלבד; כל צורה אחרת → null (Rank, Don't Hide — לא ממציאים ייחוס).
  if jsonb_typeof(new.raw_user_meta_data->'acquisition') = 'object' then
    v_acq := new.raw_user_meta_data->'acquisition';
  end if;
  v_visitor := coalesce(v_acq->>'visitor_id', new.raw_user_meta_data->>'visitor_id');

  -- הוספה אוטומטית לרשימת התפוצה (אם המייל עוד לא שם) — עכשיו עם acquisition כשקיים.
  if new.email is not null then
    insert into public.subscribers (email, name, source, active, acquisition)
    select new.email,
           coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@','1')),
           'site-signup', true, v_acq
    where not exists (select 1 from public.subscribers s where lower(s.email) = lower(new.email));
  end if;

  -- 🔗 קישור-מבקר בזמן-ההרשמה (אותו visitor_id) — לשחזור Visitor→events→signup. לא-חוסם.
  if v_visitor is not null and v_visitor <> '' then
    begin
      insert into public.subscribe_events (visitor_id, source, action, topic)
      values (v_visitor, 'site-signup', 'signup', 'newsletter');
    exception when others then null;  -- קישור לא-קריטי
    end;
  end if;

  return new;
end $function$;
