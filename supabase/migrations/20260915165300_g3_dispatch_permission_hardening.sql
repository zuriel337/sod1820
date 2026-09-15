-- G3_DISPATCH_PERMISSION_HARDENING
-- Release hardening after security-advisor review.
-- The first live slice has no direct authenticated-client need for management RPCs.
-- Keep all dispatch management behind service_role until a governed admin backend
-- explicitly requires a narrower authenticated surface.

revoke execute on function public.work_log_assign_agent(
  text,text,text,text,text,text,text,text[],text[],text,text,text,text,text[]
) from authenticated;

revoke execute on function public.agent_dispatch_cancel(uuid,text) from authenticated;
revoke execute on function public.agent_dispatch_requeue(uuid) from authenticated;

-- Preserve the intended internal runtime path.
grant execute on function public.work_log_assign_agent(
  text,text,text,text,text,text,text,text[],text[],text,text,text,text,text[]
) to service_role;
grant execute on function public.agent_dispatch_cancel(uuid,text) to service_role;
grant execute on function public.agent_dispatch_requeue(uuid) to service_role;

comment on function public.work_log_assign_agent(
  text,text,text,text,text,text,text,text[],text[],text,text,text,text,text[]
) is 'Canonical structured assignment writer. G3 v1 executable by service_role only.';
comment on function public.agent_dispatch_cancel(uuid,text) is 'Dispatch cancellation path. G3 v1 executable by service_role only.';
comment on function public.agent_dispatch_requeue(uuid) is 'Explicit dispatch requeue path. G3 v1 executable by service_role only.';
