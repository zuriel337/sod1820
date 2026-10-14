-- ROLE B (CLAUDE_DATABASE_LAB_20261014) · LOCAL LAB ONLY · replaces the lab STUBS fn_dispatch_method / fn_composite_calc and the component calc stubs
-- with the LIVE definitions (read-only pg_get_functiondef from linswmnnkjxvweumprav on 2026-10-14; definitions only, no rows). Verbatim bodies.
\set ON_ERROR_STOP on
drop function if exists public.fn_composite_calc(text, text) cascade;
drop function if exists public.fn_dispatch_method(text, text) cascade;
drop function if exists public.fn_ragil(text); drop function if exists public.fn_miluy(text); drop function if exists public.fn_misratar(text);
drop function if exists public.kadmi_calc(text); drop function if exists public.triangle_word_calc(text); drop function if exists public.triangle_reverse_calc(text); drop function if exists public.fn_miluy_gadol(text);
CREATE OR REPLACE FUNCTION public.fn_letter_val(c text) RETURNS integer LANGUAGE sql IMMUTABLE AS $function$
  SELECT CASE c
    WHEN 'א' THEN 1 WHEN 'ב' THEN 2 WHEN 'ג' THEN 3 WHEN 'ד' THEN 4
    WHEN 'ה' THEN 5 WHEN 'ו' THEN 6 WHEN 'ז' THEN 7 WHEN 'ח' THEN 8
    WHEN 'ט' THEN 9 WHEN 'י' THEN 10 WHEN 'כ' THEN 20 WHEN 'ך' THEN 20
    WHEN 'ל' THEN 30 WHEN 'מ' THEN 40 WHEN 'ם' THEN 40 WHEN 'נ' THEN 50
    WHEN 'ן' THEN 50 WHEN 'ס' THEN 60 WHEN 'ע' THEN 70 WHEN 'פ' THEN 80
    WHEN 'ף' THEN 80 WHEN 'צ' THEN 90 WHEN 'ץ' THEN 90 WHEN 'ק' THEN 100
    WHEN 'ר' THEN 200 WHEN 'ש' THEN 300 WHEN 'ת' THEN 400 ELSE 0 END;
$function$;
CREATE OR REPLACE FUNCTION public.fn_miluy_letter(c text) RETURNS integer LANGUAGE sql IMMUTABLE AS $function$
  SELECT CASE c
    WHEN 'א' THEN 111 WHEN 'ב' THEN 412 WHEN 'ג' THEN 83 WHEN 'ד' THEN 434
    WHEN 'ה' THEN 15 WHEN 'ו' THEN 22 WHEN 'ז' THEN 67 WHEN 'ח' THEN 418
    WHEN 'ט' THEN 419 WHEN 'י' THEN 20 WHEN 'כ' THEN 100 WHEN 'ך' THEN 100
    WHEN 'ל' THEN 74 WHEN 'מ' THEN 80 WHEN 'ם' THEN 80 WHEN 'נ' THEN 106 WHEN 'ן' THEN 106
    WHEN 'ס' THEN 120 WHEN 'ע' THEN 130 WHEN 'פ' THEN 81 WHEN 'ף' THEN 81
    WHEN 'צ' THEN 104 WHEN 'ץ' THEN 104 WHEN 'ק' THEN 186 WHEN 'ר' THEN 510
    WHEN 'ש' THEN 360 WHEN 'ת' THEN 416 ELSE 0 END;
$function$;
CREATE OR REPLACE FUNCTION public.fn_miluy_gadol_letter(c text) RETURNS integer LANGUAGE sql IMMUTABLE AS $function$
  select case c
    when 'א' then 831 when 'ב' then 412 when 'ג' then 83 when 'ד' then 434
    when 'ה' then 15 when 'ו' then 22 when 'ז' then 717 when 'ח' then 418
    when 'ט' then 419 when 'י' then 20 when 'כ' then 820 when 'ך' then 820
    when 'ל' then 74 when 'מ' then 640 when 'ם' then 640 when 'נ' then 756 when 'ן' then 756
    when 'ס' then 600 when 'ע' then 780 when 'פ' then 81 when 'ף' then 81
    when 'צ' then 104 when 'ץ' then 104 when 'ק' then 906 when 'ר' then 510
    when 'ש' then 1010 when 'ת' then 416 else 0 end;
$function$;
CREATE OR REPLACE FUNCTION public.fn_misratar_word(w text) RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $function$
DECLARE
  vals int[];
  s int := 0;
  i int;
BEGIN
  SELECT array_agg(fn_letter_val(ch)) INTO vals
  FROM regexp_split_to_table(w, '') AS ch
  WHERE fn_letter_val(ch) > 0;
  IF vals IS NULL OR array_length(vals,1) < 2 THEN RETURN 0; END IF;
  FOR i IN 1..array_length(vals,1)-1 LOOP
    s := s + abs(vals[i] - vals[i+1]);
  END LOOP;
  RETURN s;
END;
$function$;
CREATE OR REPLACE FUNCTION public.gem_sum(input text, map jsonb) RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $function$
declare
  gem jsonb := '{"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ך":20,"ל":30,"מ":40,"ם":40,"נ":50,"ן":50,"ס":60,"ע":70,"פ":80,"ף":80,"צ":90,"ץ":90,"ק":100,"ר":200,"ש":300,"ת":400}'::jsonb;
  total int := 0; ch text; i int;
begin
  if input is null then return 0; end if;
  for i in 1..char_length(input) loop
    ch := substr(input, i, 1);
    if gem ? ch then total := total + (map->>ch)::int; end if;
  end loop;
  return total;
end;
$function$;
CREATE OR REPLACE FUNCTION public.fn_miluy(p text) RETURNS integer LANGUAGE sql IMMUTABLE AS $function$
  SELECT COALESCE(SUM(fn_miluy_letter(ch)),0)::int FROM regexp_split_to_table(p,'') ch
  WHERE fn_miluy_letter(ch) > 0;
$function$;
CREATE OR REPLACE FUNCTION public.fn_miluy_gadol(p text) RETURNS integer LANGUAGE sql IMMUTABLE AS $function$
  select coalesce(sum(fn_miluy_gadol_letter(ch)),0)::int from regexp_split_to_table(p,'') ch where fn_miluy_gadol_letter(ch) > 0;
$function$;
CREATE OR REPLACE FUNCTION public.fn_misratar(phrase text) RETURNS integer LANGUAGE sql IMMUTABLE AS $function$
  SELECT COALESCE(SUM(fn_misratar_word(w)),0)::int
  FROM regexp_split_to_table(trim(phrase), '\s+') AS w;
$function$;
CREATE OR REPLACE FUNCTION public.fn_ragil(phrase text) RETURNS integer LANGUAGE sql IMMUTABLE AS $function$
  SELECT COALESCE(SUM(fn_letter_val(ch)),0)::int
  FROM regexp_split_to_table(phrase, '') AS ch;
$function$;
CREATE OR REPLACE FUNCTION public.kadmi_calc(t text) RETURNS integer LANGUAGE sql IMMUTABLE AS $function$
  select gem_sum(t, '{"א":1,"ב":3,"ג":6,"ד":10,"ה":15,"ו":21,"ז":28,"ח":36,"ט":45,"י":55,"כ":75,"ך":75,"ל":105,"מ":145,"ם":145,"נ":195,"ן":195,"ס":255,"ע":325,"פ":405,"ף":405,"צ":495,"ץ":495,"ק":595,"ר":795,"ש":1095,"ת":1495}'::jsonb);
$function$;
CREATE OR REPLACE FUNCTION public.triangle_reverse_calc(p text) RETURNS bigint LANGUAGE sql IMMUTABLE AS $function$
  WITH letters AS (
    SELECT ch, ord
    FROM regexp_split_to_table(regexp_replace(coalesce(p, ''), '[^א-ת]', '', 'g'), '') WITH ORDINALITY AS t(ch, ord)
  ),
  running AS (
    SELECT ord, sum(fn_ragil(ch)) OVER (ORDER BY ord DESC) AS run
    FROM letters
  )
  SELECT coalesce(sum(run), 0)::bigint FROM running;
$function$;
CREATE OR REPLACE FUNCTION public.triangle_word_calc(p text) RETURNS bigint LANGUAGE sql IMMUTABLE AS $function$
  WITH letters AS (
    SELECT ch, ord
    FROM regexp_split_to_table(regexp_replace(coalesce(p, ''), '[^א-ת]', '', 'g'), '') WITH ORDINALITY AS t(ch, ord)
  ),
  running AS (
    SELECT ord, sum(fn_ragil(ch)) OVER (ORDER BY ord) AS run
    FROM letters
  )
  SELECT coalesce(sum(run), 0)::bigint FROM running;
$function$;
CREATE OR REPLACE FUNCTION public.fn_dispatch_method(p_method_key text, p_phrase text) RETURNS bigint LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $function$
DECLARE
  v_fn text; v_result bigint;
BEGIN
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

