-- Rollback of 20261106120000_def001_revoke_resolve_visitor_email.sql. Restores the exact pre-change behaviour (including the exposure it removed):
-- apply only if the change breaks a legitimate flow that cannot be fixed forward. Definitions below are the production ones captured 2026-11-06.
grant execute on function public.resolve_visitor_email(text, text) to public, anon, authenticated;
alter function public.resolve_visitor_email(text, text) set search_path = public;

create or replace function public.notification_prefs_guest_get_v1(p_visitor text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_vis text := lower(btrim(coalesce(p_visitor, '')));
  v_out jsonb;
begin
  if auth.uid() is not null then raise exception 'guest endpoint'; end if;
  if v_vis !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'bad visitor identity'; end if;
  select jsonb_build_object('topics', np.topics, 'channels', np.channels, 'email', np.email, 'intensity', np.intensity, 'muted_until', np.muted_until)
  into v_out from public.notification_prefs np where np.user_id is null and np.visitor_id = v_vis;
  return v_out;
end
$function$;

create or replace function public.notification_prefs_guest_save_v1(
  p_visitor text, p_topics text[] default '{}'::text[], p_channels text[] default '{}'::text[], p_email text default null::text,
  p_intensity text default null::text, p_set_intensity boolean default false,
  p_muted_until timestamp with time zone default null::timestamp with time zone, p_set_muted_until boolean default false
) returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_vis text := lower(btrim(coalesce(p_visitor, '')));
  v_topics text[] := coalesce(p_topics, '{}'::text[]);
  v_channels text[] := coalesce(p_channels, '{}'::text[]);
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_out jsonb;
begin
  if auth.uid() is not null then raise exception 'guest endpoint'; end if;
  if v_vis !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'bad visitor identity'; end if;
  if cardinality(v_topics) > 100 or exists (select 1 from unnest(v_topics) t where btrim(t) = '' or length(t) > 160) then raise exception 'invalid topics'; end if;
  if cardinality(v_channels) > 8 or exists (select 1 from unnest(v_channels) c where btrim(c) = '' or length(c) > 32) then raise exception 'invalid channels'; end if;
  if v_email is not null and length(v_email) > 320 then raise exception 'invalid email'; end if;
  if p_set_intensity and (p_intensity is null or length(p_intensity) > 32) then raise exception 'invalid intensity'; end if;
  insert into public.notification_prefs(user_id, visitor_id, topics, channels, email, intensity, muted_until)
  values (null, v_vis, v_topics, v_channels, v_email, case when p_set_intensity then p_intensity else 'normal' end, case when p_set_muted_until then p_muted_until else null end)
  on conflict (visitor_id) do update
    set topics = excluded.topics, channels = excluded.channels, email = excluded.email,
        intensity = case when p_set_intensity then excluded.intensity else public.notification_prefs.intensity end,
        muted_until = case when p_set_muted_until then excluded.muted_until else public.notification_prefs.muted_until end,
        updated_at = now()
    where public.notification_prefs.user_id is null
  returning jsonb_build_object('topics', topics, 'channels', channels, 'email', email, 'intensity', intensity, 'muted_until', muted_until) into v_out;
  if v_out is null then raise exception 'visitor identity unavailable'; end if;
  return v_out;
end
$function$;
