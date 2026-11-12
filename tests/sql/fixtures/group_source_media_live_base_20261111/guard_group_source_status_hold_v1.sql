CREATE OR REPLACE FUNCTION public.guard_group_source_status_hold_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  if new.status is distinct from 'live' then new.group_source_intake_public := false; end if;
  return new;
end $function$

