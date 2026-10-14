-- LOCAL ONLY: saved registry fixture from f0c92110, not a current full registry export.
-- This file contains 33 registry rows and helpers. 01_composite_engine.sql replaces
-- the temporary composite/dispatch/component stubs before any parity test runs.
drop table if exists bidim cascade; drop table if exists gematria_words cascade; drop table if exists gematria_methods cascade;
create table gematria_methods (id uuid default gen_random_uuid(), sort_order int, method_key text primary key, display_label text, category text, sub text, soul text, db_column text, in_engine bool,
 created_at timestamptz default now(), function text, active bool, deterministic bool, source_of_truth text, required_entitlement text, input_schema jsonb, output_schema jsonb, token_cost int, version int,
 mathematical_family text, order_sensitive bool, word_boundary_sensitive bool, per_word_reset bool, full_phrase_continuation bool, final_letter_sensitive bool, whitespace_normalization text,
 punctuation_normalization text, derived_from text[], dependency_rules jsonb, dependency_version int, dependency_verified_at timestamptz, scannable bool, execution_kind text, operator text, dependency_versions jsonb);
insert into gematria_methods (method_key, category, active, scannable, "function", version, execution_kind, operator, derived_from, dependency_version, dependency_verified_at, dependency_versions, mathematical_family, order_sensitive, word_boundary_sensitive) values
('אטבח_רשי','base','f','f',NULL,'1','unimplemented',NULL,NULL,'1',NULL,'{}',NULL,'t','t'),
('אטבח_רבנו_חנאל','base','f','f','fn_atbach_rabenu_hananel','2','sql_function',NULL,NULL,'2','2026-09-02 19:47:55+00','{}','base_additive_substitution','f','f'),
('רגיל','base','t','t','fn_ragil','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('סידורי','base','t','t','fn_siduri','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('מילוי','base','t','t','fn_miluy','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('אתבש','base','t','t','atbash_calc','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('אלבם','base','t','t','fn_albam','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('אותיות אחרי','base','t','t','fn_otiot_after','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('ריבוע גדול','depth','t','t','ribua_gadol_calc','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','cumulative_prefix_sum','t','t'),
('אטבח','base','t','f','fn_atbach','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive_substitution','f','f'),
('משולש מדרגות','depth','t','t','stair_triangle_calc','1','sql_function',NULL,NULL,'1','2026-09-03 05:57:01+00','{}','position_weighted_sum','t','t'),
('איק בכר','base','t','t','aiq_bekar_calc','1','sql_function',NULL,NULL,'1','2026-09-03 05:57:02+00','{}','base_additive_substitution','f','f'),
('רגיל+משולש','composite','t','t',NULL,'1','composite_engine','sum','{רגיל,קדמי}','1','2026-08-29 21:04:31+00','{"קדמי": 1, "רגיל": 1}','composite_sum','f','f'),
('הכפלה גדולה','depth','t','t','hakpala_gadol_calc','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','letter_square_sum','f','f'),
('מסתתר','base','t','t','fn_misratar','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','adjacent_difference','t','t'),
('הכפלה','base','t','t','hakpala_calc','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','letter_square_sum','f','f'),
('מילוי דמילוי','depth','t','t','miluy_demiluy_calc','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('מילוי דמילוי גדול','depth','t','t','miluy_demiluy_gadol_calc','1','sql_function',NULL,NULL,'1','2026-09-03 05:56:54+00','{}','base_additive','f','f'),
('משולש מילה','depth','t','t','triangle_word_calc','1','sql_function',NULL,NULL,'1','2026-09-03 05:56:56+00','{}','cumulative_prefix_sum','t','t'),
('משולש מילה+משולש הפוך','composite','t','t',NULL,'1','composite_engine','sum','{"משולש מילה","משולש הפוך"}','1','2026-09-03 06:10:12+00','{"משולש הפוך": 1, "משולש מילה": 1}','composite_sum','t','t'),
('אות רבתי','base','t','f','fn_rabbati','1','context_activated',NULL,'{רגיל,גדול}','1','2026-08-27 04:21:23+00','{}','extended_letter_values','f','f'),
('רגיל+מילוי','composite','t','t',NULL,'1','composite_engine','sum','{רגיל,מילוי}','1','2026-08-29 21:04:31+00','{"רגיל": 1, "מילוי": 1}','composite_sum','f','f'),
('אותיות לפני','base','t','t','fn_otiot_before','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('משולש הפוך','depth','t','t','triangle_reverse_calc','1','sql_function',NULL,NULL,'1','2026-09-03 05:56:58+00','{}','position_weighted_sum','t','t'),
('גדול','base','t','t','fn_gadol','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('רגיל+מסתתר','composite','t','t',NULL,'1','composite_engine','sum','{רגיל,מסתתר}','1','2026-08-29 21:04:31+00','{"רגיל": 1, "מסתתר": 1}','composite_sum','t','t'),
('ריבוע','base','t','t','fn_ribua','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','cumulative_prefix_sum','t','t'),
('מסתתר גדול','depth','t','t','mistater_gadol_calc','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','adjacent_difference','t','t'),
('מילוי בלבד','composite','t','t',NULL,'2','composite_engine','diff','{מילוי,רגיל}','2','2026-09-10 10:04:52+00','{"רגיל": 1, "מילוי": 1}','composite_diff','f','f'),
('מיקום האות','base','t','t','fn_mikum_haot','1','sql_function',NULL,NULL,'1','2026-09-03 06:59:09+00','{}','base_additive','f','f'),
('קדמי','base','t','t','kadmi_calc','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('משולש גדול','depth','t','t','kadmi_gadol_calc','1','sql_function',NULL,NULL,'1','2026-08-24 13:01:14+00','{}','base_additive','f','f'),
('מילוי גדול','depth','t','f','fn_miluy_gadol','1','sql_function',NULL,NULL,'1','2026-09-03 05:57:06+00','{}','base_additive',NULL,NULL),
('מילוי בלבד גדול','composite','t','f',NULL,'1','composite_engine','diff','{"מילוי גדול",רגיל}','1','2026-09-03 09:42:32+00','{"רגיל": 1, "מילוי גדול": 1}','composite_diff',NULL,NULL);
-- stubs so to_regproc('public.'||function) resolves exactly as live
do $$ declare f text; begin foreach f in array array['aiq_bekar_calc','atbash_calc','fn_albam','fn_atbach','fn_atbach_rabenu_hananel','fn_en_full_reduction','fn_en_ordinal','fn_en_reverse_ordinal','fn_en_reverse_reduction','fn_gadol','fn_mikum_haot','fn_miluy','fn_miluy_gadol','fn_misratar','fn_otiot_after','fn_otiot_before','fn_rabbati','fn_ragil','fn_ribua','fn_siduri','hakpala_calc','hakpala_gadol_calc','kadmi_calc','kadmi_gadol_calc','miluy_demiluy_calc','miluy_demiluy_gadol_calc','mistater_gadol_calc','ribua_gadol_calc','stair_triangle_calc','triangle_reverse_calc','triangle_word_calc'] loop execute format('create or replace function public.%I(text) returns bigint language sql immutable as $f$ select 0::bigint $f$', f); end loop; end $$;
create or replace function public.fn_dispatch_method(k text, p text) returns bigint language sql stable as $$ select 1::bigint $$;  -- stub (live version dispatches to the registry function)
-- LIVE definitions (verbatim)
CREATE OR REPLACE FUNCTION public.fn_method_is_executable(p_method_key text) RETURNS boolean LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
declare m public.gematria_methods%rowtype; bad int;
begin
  select * into m from public.gematria_methods where method_key = p_method_key;
  if not found then return false; end if;
  if m.execution_kind in ('sql_function', 'context_activated') then
    return m."function" is not null and to_regproc('public.' || m."function") is not null;
  end if;
  if m.execution_kind = 'composite_engine' then
    if m.operator is null or m.operator not in ('sum', 'diff') then return false; end if;
    if m.derived_from is null or coalesce(array_length(m.derived_from, 1), 0) < 2 then return false; end if;
    select count(*) into bad from unnest(m.derived_from) as c(k) left join public.gematria_methods g on g.method_key = c.k
    where g.method_key is null or g.category = 'composite' or g.active is not true or g."function" is null or to_regproc('public.' || g."function") is null;
    return bad = 0;
  end if;
  return false;
end; $function$;
CREATE OR REPLACE FUNCTION public.fn_method_is_engine_verified(p_method_key text) RETURNS boolean LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
declare m public.gematria_methods%rowtype; bad int;
begin
  select * into m from public.gematria_methods where method_key = p_method_key;
  if not found then return false; end if;
  if m.dependency_verified_at is null then return false; end if;
  if m.dependency_version is distinct from m.version then return false; end if;
  if m.category = 'composite' then
    select count(*) into bad from unnest(coalesce(m.derived_from, '{}'::text[])) as c(k) left join public.gematria_methods g on g.method_key = c.k
    where g.method_key is null or (m.dependency_versions ->> c.k) is null or (m.dependency_versions ->> c.k)::int is distinct from g.version;
    if bad > 0 then return false; end if;
  end if;
  return true;
end; $function$;
CREATE OR REPLACE FUNCTION public.fn_method_is_scannable(p_method_key text) RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  select coalesce((select gm.scannable and gm.active and public.fn_method_is_executable(gm.method_key) and public.fn_method_is_engine_verified(gm.method_key)
    from public.gematria_methods gm where gm.method_key = p_method_key), false);
$function$;
CREATE OR REPLACE FUNCTION public.fn_method_evidence_class(p_method_key text) RETURNS text LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
declare m public.gematria_methods%rowtype;
begin
  select * into m from public.gematria_methods where method_key = p_method_key;
  if not found then return 'unregistered'; end if;
  if public.fn_method_is_scannable(p_method_key) then return 'governed'; end if;
  if not public.fn_method_is_executable(p_method_key) then return 'historical_unexecutable'; end if;
  if not m.active then return 'historical_ungoverned'; end if;
  if not public.fn_method_is_engine_verified(p_method_key) then return 'historical_unverified'; end if;
  return 'historical_public';
end; $function$;
CREATE OR REPLACE FUNCTION public.fn_method_is_governed_evidence(p_method_key text) RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  select public.fn_method_evidence_class(p_method_key) = 'governed';
$function$;
-- stub of fn_composite_calc (LOWER BOUND: live dispatches each component through fn_dispatch_method)
CREATE OR REPLACE FUNCTION public.fn_composite_calc(p_composite_key text, p_phrase text) RETURNS TABLE(composite_key text, component_methods text[], component_values bigint[], operator text, result numeric, definition_version integer, provenance text)
LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
declare m public.gematria_methods%rowtype;
begin select * into m from public.gematria_methods where method_key = p_composite_key; if not found then return; end if;
  if not public.fn_method_is_executable(p_composite_key) then return; end if;
  return query select p_composite_key, m.derived_from, array[1::bigint,2::bigint], m.operator, 3::numeric, m.version, 'stub'::text; end; $function$;

