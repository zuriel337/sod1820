-- ENGINE GOVERNANCE FOUNDATION — advisory hygiene follow-up.
-- Every function created or replaced by the Foundation migrations pinned to
-- search_path='public' (Supabase linter 0011_function_search_path_mutable).
-- Behaviour-neutral: all objects these functions touch are already schema-qualified.
-- fn_bidim_id is IMMUTABLE and pinned too so its value can never depend on session state.
alter function public.fn_method_is_executable(text)        set search_path to 'public';
alter function public.fn_method_is_engine_verified(text)   set search_path to 'public';
alter function public.fn_method_is_scannable(text)         set search_path to 'public';
alter function public.fn_method_value(text, text)          set search_path to 'public';
alter function public.fn_bidim_id(uuid, text, int, text)   set search_path to 'public';
alter function public.fn_independent_method_set(text[])    set search_path to 'public';
alter function public.fn_method_is_derived(text)           set search_path to 'public';
alter function public.fn_method_scan_report()              set search_path to 'public';
alter function public.fn_composite_calc(text, text)        set search_path to 'public';
alter function public.fn_composite_calc_all_ops(text, text) set search_path to 'public';
alter function public.fn_relation_composite_evidence(text, text) set search_path to 'public';
alter function public.fn_number_lookup(bigint)             set search_path to 'public';
alter function public.fn_dispatch_method(text, text)       set search_path to 'public';
