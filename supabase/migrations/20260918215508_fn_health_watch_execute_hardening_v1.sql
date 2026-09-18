revoke all on function public.fn_health_watch() from public, anon, authenticated;
grant execute on function public.fn_health_watch() to service_role;
comment on function public.fn_health_watch() is
  'G3_2029_CONTROL_PLANE_FOUNDATION_V1: server-only infrastructure health watcher. Alerts terminate in public.notify_admin(); client EXECUTE revoked.';
