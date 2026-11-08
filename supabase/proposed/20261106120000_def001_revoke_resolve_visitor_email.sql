-- DEF-001 (P0) - e-mail exposure to the `anon` role. Two independent exposure paths are closed here.
--
-- Path 1: public.resolve_visitor_email(p_visitor text, p_uid text) is SECURITY DEFINER, has no caller check and
--   carried the default PUBLIC EXECUTE privilege. With the public anon key anyone could pass a user UUID (p_uid)
--   or a guest visitor id (p_visitor) and receive the matching e-mail address.
-- Path 2: public.notification_prefs_guest_get_v1 / _save_v1 treat the guest visitor id as a secret and return the
--   saved e-mail for it, but visitor ids are readable by anon in push_subscriptions, feedback and els_records.
--   Closing path 1 alone would leave "read a visitor id -> call the guest RPC -> get the e-mail".
--
-- Verified before writing this file: nothing in src/, api/, public-reading-deploy/ or supabase/functions
-- references resolve_visitor_email; the only SQL dependent (els_analytics) is admin-guarded SECURITY DEFINER and
-- runs as the owner, so it is unaffected by the revoke. No UI consumer reads `email` from the guest prefs RPCs
-- (WatchButton, SystemFrame2029, CommunityPersonalActions2029 use topics/channels/intensity only).
-- The visitor-id enumeration itself is handled separately (DEF-001b, two-step rollout).
--
-- NOT applied by this repository change. Apply only with explicit ZURIEL approval (production DB change).

-- Part A: server-side only.
revoke all on function public.resolve_visitor_email(text, text) from public;
revoke all on function public.resolve_visitor_email(text, text) from anon, authenticated;
grant execute on function public.resolve_visitor_email(text, text) to service_role;
alter function public.resolve_visitor_email(text, text) set search_path = '';

-- Part B: the guest preference RPCs stop returning the stored address (it stays stored and still receives
-- mail). `has_email` tells the UI that one is saved. Signature, ownership and grants are unchanged.
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
    'email', null,
    'has_email', coalesce(np.email, '') <> '',
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
  p_email text default null::text,
  p_intensity text default null::text,
  p_set_intensity boolean default false,
  p_muted_until timestamp with time zone default null::timestamp with time zone,
  p_set_muted_until boolean default false
) returns jsonb
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
    'email', null,
    'has_email', coalesce(email, '') <> '',
    'intensity', intensity,
    'muted_until', muted_until
  ) into v_out;

  if v_out is null then
    raise exception 'visitor identity unavailable';
  end if;
  return v_out;
end
$function$;
