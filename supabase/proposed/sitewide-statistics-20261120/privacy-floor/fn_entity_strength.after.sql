CREATE OR REPLACE FUNCTION public.fn_entity_strength(p_type text, p_ref text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
declare
  v_val int; conv int; researchers int; reactors int; state_rank int;
  s_engine numeric; s_pop numeric; s_state numeric; total int;
begin
  -- ערך-היעד: מספר=עצמו · ביטוי=גימטריה רגילה מהמנוע
  if p_type = 'number' then
    v_val := nullif(regexp_replace(coalesce(p_ref,''), '\D', '', 'g'), '')::int;
  else
    v_val := public.fn_ragil(coalesce(p_ref,''));
  end if;

  -- 🔵 עובדת-מנוע: עומק-התכנסות (כמה ביטויים מאומתים נפגשים בערך)
  conv := coalesce((select count(*) from public.gematria_words
                    where ragil = v_val and coalesce(is_encrypted,false)=false and public.gematria_public_word_eligible(gematria_words.id)), 0);
  -- 👥 פופולריות: חוקרים שונים (מאוחד 4a) + מגיבים שונים
  researchers := public.entity_collective_count(p_type, p_ref);
  reactors := coalesce((
    select count(distinct rid) from (
      select jsonb_array_elements_text(kv.value) rid
      from public.research_contributions rc,
           lateral jsonb_each(coalesce(rc.reactions,'{}'::jsonb)) kv
      where rc.target_type=p_type and rc.target_id=p_ref and rc.status='approved'
        and jsonb_typeof(kv.value)='array'
    ) x), 0);
  -- ✅ בשלות: שלב-המחקר הגבוה ביותר על ה-node
  state_rank := coalesce((select max(case research_state
       when 'canonical' then 5 when 'validated' then 4 when 'investigating' then 3
       when 'discussion' then 2 when 'idea' then 1 else 0 end)
     from public.research_contributions
     where target_type=p_type and target_id=p_ref and status='approved'), 0);

  s_engine := least(1.0, conv::numeric / 40);              -- 40+ ביטויים = עוצמת-מנוע מלאה (p99≈32)
  s_pop    := least(1.0, (researchers*2 + reactors)::numeric / 15);
  s_state  := state_rank::numeric / 5;
  total := round(45*s_engine + 45*s_pop + 10*s_state);      -- 0..100

  return jsonb_build_object(
    'strength', total, 'value', v_val,
    'engine',   jsonb_build_object('convergence', conv,        'score', round(45*s_engine)),
    'popular',  jsonb_build_object('researchers', researchers, 'reactors', reactors, 'score', round(45*s_pop)),
    'maturity', jsonb_build_object('state_rank', state_rank,   'score', round(10*s_state)));
end $function$
