-- G3 cheap least-privilege cleanup: legacy Journey telemetry
-- EXTEND_EXISTING only. Keep the anonymous journey-save telemetry RPC, but
-- remove dead direct-table public reads and bound the SECURITY DEFINER payload.
-- Existing rows/history are preserved verbatim; no Research Path/Journey migration.

drop policy if exists journey_saves_public_read on public.journey_saves;
revoke select on table public.journey_saves from anon, authenticated;

create or replace function public.log_journey_save(
  p_visitor text,
  p_root integer,
  p_path jsonb default '[]'::jsonb,
  p_world text default null
)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_visitor text := nullif(btrim(coalesce(p_visitor,'')),'');
  v_path jsonb := coalesce(p_path,'[]'::jsonb);
  v_world text := nullif(btrim(coalesce(p_world,'')),'');
begin
  if p_root is null then
    return;
  end if;

  -- visitor_id is an analytics pseudonym, not an unbounded free-text field.
  if v_visitor is not null and length(v_visitor) > 128 then
    raise exception 'visitor id too long' using errcode='22023';
  end if;

  if jsonb_typeof(v_path) <> 'array' then
    raise exception 'journey path must be a json array' using errcode='22023';
  end if;
  if jsonb_array_length(v_path) > 50 then
    raise exception 'journey path has too many steps' using errcode='22023';
  end if;
  if octet_length(v_path::text) > 8192 then
    raise exception 'journey path payload too large' using errcode='22023';
  end if;

  if v_world is not null and length(v_world) > 160 then
    raise exception 'journey world too long' using errcode='22023';
  end if;

  insert into public.journey_saves(visitor_id, root, path, world)
  values (v_visitor, p_root, v_path, v_world);
end
$function$;

-- PUBLIC previously implied EXECUTE to every role. Preserve the actual browser
-- consumers explicitly while reducing the privilege surface.
revoke execute on function public.log_journey_save(text,integer,jsonb,text) from public;
grant execute on function public.log_journey_save(text,integer,jsonb,text) to anon, authenticated, service_role;

comment on function public.log_journey_save(text,integer,jsonb,text) is
'Legacy Journey analytics writer. Anonymous/authenticated callers may append a bounded save event. Direct journey_saves reads remain private/server-side; payload bounds prevent unbounded SECURITY DEFINER storage writes.';
