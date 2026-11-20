CREATE OR REPLACE FUNCTION public.fn_all_methods(p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
declare
  w text := btrim(p_word);
  v jsonb := '{}'::jsonb;
  r record;
  cached jsonb;
  val bigint;
begin
  -- compat key -> registry method_key. Values are ONLY produced by the registry dispatch.
  for r in
    select * from (values
      ('רגיל','רגיל'),('מסתתר','מסתתר'),('קדמי','קדמי'),('מילוי','מילוי'),('גדול','גדול'),
      ('סידורי','סידורי'),('אתבש','אתבש'),('אלבם','אלבם'),('הכפלה','הכפלה'),
      ('הכפלה_גדול','הכפלה גדולה'),('קדמי_גדול','משולש גדול'),('מילוי_דמילוי','מילוי דמילוי'),
      ('ריבוע','ריבוע'),('ריבוע_גדול','ריבוע גדול'),
      ('אותיות_אחרי','אותיות אחרי'),('אותיות_לפני','אותיות לפני')
    ) t(compat_key, method_key)
  loop
    if exists (select 1 from public.gematria_methods g
                where g.method_key = r.method_key and g.active
                  and coalesce(g.required_entitlement,'public') = 'public')
       and public.fn_method_is_engine_verified(r.method_key)
       and public.fn_method_is_executable(r.method_key)
    then
      val := public.fn_method_value(r.method_key, w);
      if val is not null then v := v || jsonb_build_object(r.compat_key, val); end if;
    end if;
  end loop;
  -- provenance only: whether a verified stored row exists (and its כל_הערכים blob); never a value source
  select to_jsonb(t) into cached from (
    select all_values as "כל_הערכים" from public.gematria_words
     where phrase = w and is_verified = true and ((select public.rd_is_admin()) or public.gematria_public_word_eligible(gematria_words.id))
     order by (space='core') desc, lead_rank nulls last limit 1) t;
  if cached is not null then v := v || cached || jsonb_build_object('מהמאגר', true);
  else v := v || jsonb_build_object('מהמאגר', false); end if;
  return v;
end $function$
