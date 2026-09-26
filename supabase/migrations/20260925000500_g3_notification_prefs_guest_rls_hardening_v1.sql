-- SOD1820 — G3 notification_prefs guest RLS hardening v1
-- Owners: rls_client_read_protocol v2 + subscription_funnel_law v19 + identity_architecture_law v1
-- EXTEND_EXISTING ONLY: same notification_prefs table and same visitor_id identity primitive.
-- Goal: anon may operate only on one opaque guest identity through bounded RPCs; never enumerate guest rows.

create or replace function public.notification_prefs_guest_get_v1(p_visitor text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_vis text := lower(btrim(coalesce(p_visitor, '')));
  v_out jsonb;
begin
  if auth.uid() is not null then
    raise exception 'guest endpoint';
  end if;
  if v_vis !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'bad visitor identity';
  end if;

  select jsonb_build_object(
    'topics', np.topics,
    'channels', np.channels,
    'email', np.email,
    'intensity', np.intensity,
    'muted_until', np.muted_until
  )
  into v_out
  from public.notification_prefs np
  where np.user_id is null
    and np.visitor_id = v_vis;

  return v_out;
end
$function$;

create or replace function public.notification_prefs_guest_save_v1(
  p_visitor text,
  p_topics text[] default '{}'::text[],
  p_channels text[] default '{}'::text[],
  p_email text default null,
  p_intensity text default null,
  p_set_intensity boolean default false,
  p_muted_until timestamptz default null,
  p_set_muted_until boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_vis text := lower(btrim(coalesce(p_visitor, '')));
  v_topics text[] := coalesce(p_topics, '{}'::text[]);
  v_channels text[] := coalesce(p_channels, '{}'::text[]);
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_out jsonb;
begin
  if auth.uid() is not null then
    raise exception 'guest endpoint';
  end if;
  if v_vis !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'bad visitor identity';
  end if;
  if cardinality(v_topics) > 100
     or exists (select 1 from unnest(v_topics) t where btrim(t) = '' or length(t) > 160) then
    raise exception 'invalid topics';
  end if;
  if cardinality(v_channels) > 8
     or exists (select 1 from unnest(v_channels) c where btrim(c) = '' or length(c) > 32) then
    raise exception 'invalid channels';
  end if;
  if v_email is not null and length(v_email) > 320 then
    raise exception 'invalid email';
  end if;
  if p_set_intensity and (p_intensity is null or length(p_intensity) > 32) then
    raise exception 'invalid intensity';
  end if;

  insert into public.notification_prefs(
    user_id, visitor_id, topics, channels, email, intensity, muted_until
  ) values (
    null, v_vis, v_topics, v_channels, v_email,
    case when p_set_intensity then p_intensity else 'normal' end,
    case when p_set_muted_until then p_muted_until else null end
  )
  on conflict (visitor_id) do update
    set topics = excluded.topics,
        channels = excluded.channels,
        email = excluded.email,
        intensity = case
          when p_set_intensity then excluded.intensity
          else public.notification_prefs.intensity
        end,
        muted_until = case
          when p_set_muted_until then excluded.muted_until
          else public.notification_prefs.muted_until
        end,
        updated_at = now()
    where public.notification_prefs.user_id is null
  returning jsonb_build_object(
    'topics', topics,
    'channels', channels,
    'email', email,
    'intensity', intensity,
    'muted_until', muted_until
  ) into v_out;

  if v_out is null then
    raise exception 'visitor identity unavailable';
  end if;
  return v_out;
end
$function$;

-- Direct anon table access cannot prove row ownership: visitor_id is browser-held opaque state,
-- not a Postgres/JWT claim. Remove the enumerable table surface and expose only exact-key RPCs.
drop policy if exists np_anon_select on public.notification_prefs;
drop policy if exists np_anon_insert on public.notification_prefs;
drop policy if exists np_anon_update on public.notification_prefs;
revoke all privileges on table public.notification_prefs from anon;

revoke all on function public.notification_prefs_guest_get_v1(text) from public;
revoke all on function public.notification_prefs_guest_save_v1(text,text[],text[],text,text,boolean,timestamptz,boolean) from public;
grant execute on function public.notification_prefs_guest_get_v1(text) to anon;
grant execute on function public.notification_prefs_guest_save_v1(text,text[],text[],text,text,boolean,timestamptz,boolean) to anon;
