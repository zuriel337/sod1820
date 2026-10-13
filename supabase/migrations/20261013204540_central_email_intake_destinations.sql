-- Existing Intake owner: a private editorial intent on the original occurrence.
-- No queue/source table, public publication, delivery or notification side effects.
begin;
create or replace function public.admin_email_intake_capabilities_v1()
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
  select jsonb_build_object('routing',exists(select 1 from public.users where id=auth.uid() and role='admin'),
    'publication',false);
$$;
revoke all on function public.admin_email_intake_capabilities_v1() from public,anon;
grant execute on function public.admin_email_intake_capabilities_v1() to authenticated;
create or replace function public.admin_email_intake_route_v1(
  p_inbound_id bigint, p_destinations text[], p_expected_revision integer
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_meta jsonb;
  v_revision integer;
  v_destinations text[];
  v_route jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.users where id=auth.uid() and role='admin') then
    raise insufficient_privilege using message='admin required';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise invalid_parameter_value using message='expected revision required';
  end if;
  if cardinality(coalesce(p_destinations,'{}'::text[])) > 3 or exists(
    select 1 from unnest(p_destinations) d where d is null or d not in ('world','nowbar','writer')
  ) then raise invalid_parameter_value using message='unsupported destination'; end if;
  select coalesce(array_agg(distinct d order by d),'{}'::text[]) into v_destinations from unnest(p_destinations) d;
  select coalesce(meta,'{}'::jsonb) into v_meta from public.inbound_emails where id=p_inbound_id for update;
  if not found then raise no_data_found using message='source unavailable'; end if;
  v_revision := coalesce((v_meta->'intake_projection_v1'->>'revision')::integer,0);
  if v_revision <> p_expected_revision then raise exception 'source changed; refresh required'; end if;
  v_route := jsonb_build_object('v',1,'revision',v_revision+1,'state','draft',
    'destinations',to_jsonb(v_destinations),'decided_by',auth.uid(),'decided_at',now());
  update public.inbound_emails set meta=jsonb_set(v_meta,'{intake_projection_v1}',v_route)
    where id=p_inbound_id;
  if not found then raise insufficient_privilege using message='source not writable'; end if;
  return v_route;
end;
$$;
revoke all on function public.admin_email_intake_route_v1(bigint,text[],integer) from public,anon;
grant execute on function public.admin_email_intake_route_v1(bigint,text[],integer) to authenticated;
commit;
