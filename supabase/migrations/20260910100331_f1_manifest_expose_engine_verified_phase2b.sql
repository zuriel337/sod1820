-- PHASE 2b · fn_all_methods_full — LIVE BODY.
-- Membership = REGISTRY ACTIVE (not "has a function name"); dispatch = canonical fn_method_value;
-- registry_trace = explicit per-method execution manifest over ALL registered methods.
-- Return shape unchanged (subject/entitlement/source/method_count/methods/registry_trace).
-- ZURIEL rule (work_log 4adc54b8): context_activated (אות רבתי) is NEVER auto-computed.
-- Run gate, scan gate and engine-verified are reported as SEPARATE axes.
CREATE OR REPLACE FUNCTION public.fn_all_methods_full(p_subject text, p_entitlement text DEFAULT 'public'::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  r record; v_res bigint; v jsonb := '{}'::jsonb; v_man jsonb := '[]'::jsonb;
  urank int := case lower(coalesce(p_entitlement,'public')) when 'admin' then 3 when 'premium' then 2 when 'subscriber' then 1 else 0 end;
  mrank int; v_status text; v_note text; v_scan text; v_val jsonb; v_ev boolean;
begin
  for r in select method_key, "function", required_entitlement, version, active, execution_kind,
                  scannable, sort_order, dependency_rules
             from public.gematria_methods order by sort_order loop
    v_res := null; v_note := null; v_val := 'null'::jsonb;
    mrank := case lower(coalesce(r.required_entitlement,'public')) when 'admin' then 3 when 'premium' then 2 when 'subscriber' then 1 else 0 end;
    v_scan := case when public.fn_method_is_scannable(r.method_key) then 'scannable' else 'scan-disallowed' end;
    v_ev   := public.fn_method_is_engine_verified(r.method_key);

    if not r.active then
      v_status := 'inactive';
    elsif mrank > urank then
      v_status := 'entitlement-gated'; v_note := r.required_entitlement;
    elsif r.execution_kind = 'context_activated' then
      v_status := 'context-required';
      v_note := coalesce((select rr->>'condition' from jsonb_array_elements(coalesce(r.dependency_rules,'[]'::jsonb)) rr
                          where rr ? 'condition' limit 1), 'explicit_or_source_attested_context');
    elsif not public.fn_method_is_executable(r.method_key) then
      v_status := 'not-executable';
    else
      begin
        v_res := public.fn_method_value(r.method_key, p_subject);
        if v_res is null then v_status := 'adapter-unavailable';
        else v_status := 'executed';
             v := v || jsonb_build_object(r.method_key, v_res);
             v_val := to_jsonb(v_res);
        end if;
      exception when others then
        v_status := 'failed'; v_note := left(sqlerrm,120);
      end;
    end if;

    v_man := v_man || jsonb_build_object(
      'method', r.method_key, 'status', v_status, 'value', v_val,
      'execution_kind', r.execution_kind, 'fn', r."function", 'version', r.version,
      'entitlement', r.required_entitlement, 'scan_status', v_scan,
      'engine_verified', v_ev, 'ran', (v_status = 'executed'), 'note', v_note);
  end loop;

  return jsonb_build_object(
    'subject', p_subject, 'entitlement', lower(coalesce(p_entitlement,'public')),
    'source', 'registry-driven (gematria_methods) — canonical dispatch via fn_method_value',
    'method_count', (select count(*) from jsonb_object_keys(v)),
    'methods', v, 'registry_trace', v_man);
end $function$;
