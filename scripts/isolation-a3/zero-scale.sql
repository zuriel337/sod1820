CREATE OR REPLACE FUNCTION public.fn_zero_scale(p_value integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare core int := p_value; chain int[]; i int;
begin
  if p_value is null or p_value <= 0 then
    return jsonb_build_object('method_id','zero_scale','version',1,'applicable',false,'value',p_value,'reason','ערך לא תקין');
  end if;
  while core % 10 = 0 and core > 0 loop core := core/10; end loop;   -- הסרת אפסים סופיים → שורש
  chain := array[core];
  for i in 1..4 loop chain := chain || (core * (10^i)::int); end loop;
  return jsonb_build_object('method_id','zero_scale','version',1,'applicable',true,
    'value',p_value,'core_root',core,'scale_chain',to_jsonb(chain),
    'root_matches', coalesce((
      select jsonb_agg(jsonb_build_object('phrase',phrase,'ragil',ragil) order by lead_rank nulls last)
      from (select phrase, ragil, lead_rank from public.gematria_words
             where ragil = core and is_verified = true and space='core'
             order by lead_rank nulls last limit 8) q), '[]'::jsonb),
    'source_of_truth','zero_scale_law (nodes rule) + gematria_words',
    'note','עובדה: ×10/÷10 שומר שורש-ספרות; אותה מהות בסדר-גודל אחר');
end $function$

