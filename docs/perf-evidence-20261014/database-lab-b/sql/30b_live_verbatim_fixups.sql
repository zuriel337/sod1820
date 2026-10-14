-- ROLE B · LOCAL LAB ONLY · the saved lab (f0c92110 numlab_setup/numlab_fn) carries comment-trimmed copies of four live functions; these are the LIVE texts (incl. comments), read 2026-10-14.
\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION public.fn_method_is_scannable(p_method_key text) RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  select coalesce((
    select gm.scannable
       and gm.active
       and public.fn_method_is_executable(gm.method_key)
       and public.fn_method_is_engine_verified(gm.method_key)
    from public.gematria_methods gm
    where gm.method_key = p_method_key
  ), false);
$function$;
CREATE OR REPLACE FUNCTION public.fn_method_evidence_class(p_method_key text) RETURNS text LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
declare m public.gematria_methods%rowtype;
begin
  select * into m from public.gematria_methods where method_key = p_method_key;
  if not found then return 'unregistered'; end if;                       -- row exists, registry does not know the method
  if public.fn_method_is_scannable(p_method_key) then return 'governed'; end if;
  if not public.fn_method_is_executable(p_method_key) then return 'historical_unexecutable'; end if;
  if not m.active then return 'historical_ungoverned'; end if;           -- Human Gate has not admitted it (the 4 composites)
  if not public.fn_method_is_engine_verified(p_method_key) then return 'historical_unverified'; end if;
  return 'historical_public';                                            -- legitimate, but corpus scanning not opened
end;
$function$;
CREATE OR REPLACE FUNCTION public.fn_dispatch_method(p_method_key text, p_phrase text) RETURNS bigint LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
  v_fn text; v_result bigint;
BEGIN
  -- MF-X2: `active` is the Human-Gate lifecycle flag for direct dispatch. A method that
  -- governance has disabled must not execute, and is reported through the SAME existing
  -- NULL signal already used for unknown/unwired methods (see migration header).
  SELECT function INTO v_fn
    FROM public.gematria_methods
   WHERE method_key = p_method_key
     AND active = true
     AND function IS NOT NULL;
  IF v_fn IS NULL THEN RETURN NULL; END IF;
  EXECUTE format('SELECT (%I($1))::bigint', v_fn) INTO v_result USING p_phrase;
  RETURN v_result;
END;
$function$;
CREATE OR REPLACE FUNCTION public.fn_composite_calc(p_composite_key text, p_phrase text)
 RETURNS TABLE(composite_key text, component_methods text[], component_values bigint[], operator text, result numeric, definition_version integer, provenance text)
 LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
declare
  m public.gematria_methods%rowtype;
  v_values bigint[] := '{}'::bigint[];
  k text; v bigint; v_acc numeric;
begin
  select * into m from public.gematria_methods where method_key = p_composite_key;
  if not found then return; end if;
  if m.category is distinct from 'composite' then return; end if;
  if m.execution_kind is distinct from 'composite_engine' then return; end if;
  -- COMPOSITE LIFECYCLE GATE: the composite's OWN Human-Gate flag. fn_method_is_executable
  -- below validates the COMPONENTS only, so without this a disabled composite still computed.
  if m.active is not true then return; end if;
  if not public.fn_method_is_executable(p_composite_key) then return; end if;

  foreach k in array m.derived_from loop
    v := public.fn_dispatch_method(k, p_phrase);
    if v is null then return; end if;
    v_values := v_values || v;
  end loop;

  if m.operator = 'sum' then
    select sum(x)::numeric into v_acc from unnest(v_values) as t(x);
  elsif m.operator = 'diff' then
    if array_length(v_values, 1) <> 2 then return; end if;
    v_acc := abs(v_values[1] - v_values[2])::numeric;
  else
    return;
  end if;

  return query select
    p_composite_key, m.derived_from, v_values, m.operator, v_acc, m.version,
    format('registry-driven composite engine: gematria_methods(method_key=%s) derived_from=%s operator=%s version=%s dependency_versions=%s; components dispatched via fn_dispatch_method -> %s',
           p_composite_key, m.derived_from::text, m.operator, m.version,
           m.dependency_versions::text, v_values::text);
end;
$function$;
grant execute on all functions in schema public to anon, authenticated;
