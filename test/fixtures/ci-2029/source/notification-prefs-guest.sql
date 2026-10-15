CREATE OR REPLACE FUNCTION public.notification_prefs_guest_get_v1(p_visitor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
