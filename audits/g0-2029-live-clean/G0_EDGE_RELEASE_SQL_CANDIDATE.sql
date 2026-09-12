-- SOD1820 G0 EDGE / CRON ROOT-OF-TRUST RELEASE CANDIDATE
-- BRANCH-ONLY. DO NOT RUN before explicit ZURIEL "תעלה".
-- At release use the canonical Supabase migration action, then mirror the generated migration version into git.
-- No secret values belong in this file. G0-targeted service auth resolves FB_ADMIN_KEY from Vault at execution time.

-- 1) Watchman stays under system_suggestions_law and all admin alerts end in notify_admin.
create or replace function public.system_watchman_run(p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_detected jsonb;
  v_pulse jsonb;
  v_pending int := 0;
  v_titles text := '';
  v_worth boolean := false;
  v_text text;
  v_sent jsonb;
begin
  v_detected := public.detect_suggestions();
  v_pulse := coalesce(public.site_pulse(7), '{}'::jsonb);

  select count(*), coalesce(string_agg('• ' || title || ' (' || coalesce(confidence::text,'—') || '%)', E'\n'), '')
    into v_pending, v_titles
  from (
    select title, confidence
      from public.system_suggestions
     where status = 'pending'
     order by confidence desc nulls last, created_at desc
     limit 8
  ) s;

  v_worth := coalesce(p_force,false)
    or v_pending > 0
    or coalesce((v_pulse->>'pending_ratings')::int,0) >= 10
    or coalesce((v_pulse->>'ai_analyses')::int,0) > 0
    or coalesce((v_pulse->>'new_findings')::int,0) > 0;

  if not v_worth then
    return jsonb_build_object('ok',true,'sent',false,'reason','nothing_worth_reporting','detected',v_detected,'pulse',v_pulse);
  end if;

  v_text := concat_ws(E'\n',
    '🧠 דופק סוד 1820 · 7 ימים',
    format('🤖 ניתוחי AI: %s', coalesce(v_pulse->>'ai_analyses','0')),
    format('🔬 המשיכו לחקור: %s%% · הוסיפו למחקר: %s%%', coalesce(v_pulse->>'ai_continue_rate','0'), coalesce(v_pulse->>'ai_research_rate','0')),
    format('🌌 ממצאים חדשים: %s · גשרי שפה: %s', coalesce(v_pulse->>'new_findings','0'), coalesce(v_pulse->>'new_bridges','0')),
    format('✍️ ממתינים לדירוג: %s', coalesce(v_pulse->>'pending_ratings','0')),
    case when v_pending > 0 then E'\n🧠 המלצות מערכת:\n' || v_titles else null end,
    '👉 https://sod1820.co.il/admin'
  );

  v_sent := public.notify_admin(v_text, null);
  return jsonb_build_object('ok',true,'sent',true,'suggestions',v_pending,'detected',v_detected,'pulse',v_pulse,'notify',v_sent);
end;
$$;

revoke all on function public.system_watchman_run(boolean) from public;
revoke all on function public.system_watchman_run(boolean) from anon;
revoke all on function public.system_watchman_run(boolean) from authenticated;
grant execute on function public.system_watchman_run(boolean) to service_role, postgres;

-- detect_suggestions mutates system_suggestions and site_pulse exposes internal analytics.
-- They are internal watchman primitives, not public APIs.
revoke all on function public.detect_suggestions() from public;
revoke all on function public.detect_suggestions() from anon;
revoke all on function public.detect_suggestions() from authenticated;
grant execute on function public.detect_suggestions() to service_role, postgres;

revoke all on function public.site_pulse(integer) from public;
revoke all on function public.site_pulse(integer) from anon;
revoke all on function public.site_pulse(integer) from authenticated;
grant execute on function public.site_pulse(integer) to service_role, postgres;

-- Preserve the admin button but remove the old embedded-credential HTTP round trip.
create or replace function public.admin_fire_watchman()
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.rd_is_admin() then raise exception 'admin only'; end if;
  perform public.system_watchman_run(true);
  return 'fired';
end;
$$;
revoke all on function public.admin_fire_watchman() from public;
revoke all on function public.admin_fire_watchman() from anon;
grant execute on function public.admin_fire_watchman() to authenticated, postgres;

-- 2) Payment alert: one canonical admin-alert path, no direct Resend Edge sender.
create or replace function public.notify_payment_request_tg()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text;
  v_name text;
  v_text text;
begin
  select u.email, coalesce(u.display_name, p.full_name)
    into v_email, v_name
    from public.users u
    left join public.profiles p on p.user_id = u.id
   where u.id = new.user_id;

  v_text := concat_ws(E'\n',
    '💳 בקשת רכישת קרדיטים חדשה',
    format('₪%s · %s קרדיטים', coalesce(new.price_ils::text,'—'), coalesce(new.credits::text,'—')),
    format('אמצעי: %s', case when new.method = 'bit' then 'ביט/פייבוקס' else 'העברה בנקאית' end),
    format('גולש: %s%s', coalesce(v_name,'—'), case when v_email is not null then ' (' || v_email || ')' else '' end),
    case when nullif(new.reference,'') is not null then 'הערה: ' || new.reference else null end,
    'לאישור: אתר ← אדמין ← אישורי תשלום'
  );

  perform public.notify_admin(v_text, nullif(new.proof_url,''));
  return new;
exception when others then
  return new;
end;
$$;

-- 3) Raziel identity must point at the current live implementation before wa-christina is retired.
update public.agent_identity
   set wa_slug = 'wa-raziel'
 where agent_id = 'raziel'
   and active = true
   and wa_slug = 'wa-christina';

-- 4) Replace G0-targeted cron credential-in-command paths atomically.
-- These Edge cron calls use one existing service-to-service secret present in both Vault and Edge env.
do $$
declare
  r record;
begin
  for r in
    select jobid from cron.job
     where jobname in (
       'page-ready-auto',
       'reply-email-auto',
       'research-nurture-daily',
       'share-to-facebook',
       'system-watchman-weekly',
       'wa-daily-digest',
       'wa-raziel'
     )
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;

select cron.schedule(
  'page-ready-auto',
  '*/15 * * * *',
  $cron$
    with s as (
      select decrypted_secret as key
        from vault.decrypted_secrets
       where name = 'FB_ADMIN_KEY'
       order by created_at desc
       limit 1
    )
    select net.http_post(
      url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/notify-page-ready?mode=send&max=100',
      headers := jsonb_build_object('Content-Type','application/json','x-fb-admin-key',s.key),
      body := '{}'::jsonb
    )
    from s where nullif(s.key,'') is not null;
  $cron$
);

select cron.schedule(
  'reply-email-auto',
  '*/10 * * * *',
  $cron$
    with s as (
      select decrypted_secret as key
        from vault.decrypted_secrets
       where name = 'FB_ADMIN_KEY'
       order by created_at desc
       limit 1
    )
    select net.http_post(
      url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/notify-reply-email?max=100',
      headers := jsonb_build_object('Content-Type','application/json','x-fb-admin-key',s.key),
      body := '{}'::jsonb
    )
    from s where nullif(s.key,'') is not null;
  $cron$
);

select cron.schedule(
  'research-nurture-daily',
  '0 8 * * *',
  $cron$
    with s as (
      select decrypted_secret as key
        from vault.decrypted_secrets
       where name = 'FB_ADMIN_KEY'
       order by created_at desc
       limit 1
    )
    select net.http_post(
      url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/research-nurture',
      headers := jsonb_build_object('Content-Type','application/json','x-fb-admin-key',s.key),
      body := '{}'::jsonb
    )
    from s where nullif(s.key,'') is not null;
  $cron$
);

select cron.schedule(
  'share-to-facebook',
  '*/5 * * * *',
  $cron$
    with s as (
      select decrypted_secret as key
        from vault.decrypted_secrets
       where name = 'FB_ADMIN_KEY'
       order by created_at desc
       limit 1
    )
    select net.http_post(
      url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/share-to-facebook',
      headers := jsonb_build_object('Content-Type','application/json','x-fb-admin-key',s.key),
      body := '{}'::jsonb
    )
    from s where nullif(s.key,'') is not null;
  $cron$
);

select cron.schedule(
  'wa-raziel',
  '*/2 * * * *',
  $cron$
    with s as (
      select decrypted_secret as key
        from vault.decrypted_secrets
       where name = 'FB_ADMIN_KEY'
       order by created_at desc
       limit 1
    )
    select net.http_post(
      url := 'https://linswmnnkjxvweumprav.supabase.co/functions/v1/wa-raziel',
      headers := jsonb_build_object('Content-Type','application/json','x-fb-admin-key',s.key),
      body := '{}'::jsonb
    )
    from s where nullif(s.key,'') is not null;
  $cron$
);

select cron.schedule(
  'system-watchman-weekly',
  '0 8 * * 0',
  $cron$
    select public.system_watchman_run(false);
  $cron$
);

-- wa-daily-digest intentionally remains unscheduled/retired.
-- Other legacy active cron credentials discovered by the independent audit remain an explicit
-- G0 decision item; this candidate does not falsely claim to have migrated unrelated cron owners.
