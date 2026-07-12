-- 🔮 עדשת ההצלבה הבין-שיטתית לחיפוש-ה-AI העמוק (unified_graph_law · research_workspace_law)
-- נותן ל-AI לא רק "מילים ששוות ברגיל" אלא הצלבות: שיטה נסתרת של המילה נופלת על פני-מילה אחרת.
-- קורא מ-bidim (phrase×method×value, כבר קריא-ציבורי). מחזיר רק צירופים לגישים:
-- לפחות צד אחד = רגיל (פנים↔נסתר), ורק שיטות "קריאות" (בלי הכפלה/ריבוע/גדול שמנפחים ערכים אקראיים).
-- משמש בכל משטח דרך src/lib/deepAnalysis.js (דף מספר · מעבדת-השם/שפות · מרכז מחקר).
create or replace function public.number_cross_resonance(
  p_self  text,
  p_pairs jsonb,               -- [{"method":"רגיל","value":99}, {"method":"אתבש","value":250}, ...]
  p_limit int default 90
)
returns table(self_method text, self_value int, match_phrase text, match_method text, lead_rank int, is_verified boolean)
language sql stable security definer set search_path = public as $$
  with legible as (select unnest(array['רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר']) m),
  ours as (
    select (e->>'method')::text self_method, (e->>'value')::int self_value
    from jsonb_array_elements(p_pairs) e
    where (e->>'method')::text in (select m from legible)
      and (e->>'value')::int between 10 and 100000
  )
  select o.self_method, o.self_value, b.phrase, b.method, gw.lead_rank, coalesce(gw.is_verified,false)
  from ours o
  join bidim b on b.value = o.self_value and b.method in (select m from legible)
  left join lateral (
    select lead_rank, is_verified from gematria_words g
    where g.phrase = b.phrase order by lead_rank asc nulls last limit 1
  ) gw on true
  where b.phrase <> p_self
    and (b.method = 'רגיל' or o.self_method = 'רגיל')   -- פנים↔נסתר בלבד → לגיש וקריא
    and b.phrase !~ '[A-Za-z0-9]'                        -- בלי לועזית/מספרים ברשומה
  -- דירוג: רגיל-מול-נסתר קודם · מאומת · lead_rank · מילים קצרות איקוניות · א״ב
  order by o.self_method,
           (b.method = 'רגיל') desc,
           coalesce(gw.is_verified,false) desc,
           coalesce(gw.lead_rank, 999999),
           char_length(b.phrase),
           b.phrase
  limit p_limit;
$$;

revoke all on function public.number_cross_resonance(text, jsonb, int) from public;
grant execute on function public.number_cross_resonance(text, jsonb, int) to anon, authenticated, service_role;
