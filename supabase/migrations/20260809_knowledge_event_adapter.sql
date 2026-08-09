-- 🔌 Knowledge Event Adapter — הממשק הרשמי היחיד בין צד-הידע ל-Dispatcher (subscription_funnel_law).
-- החוזה: כשצד-הידע (רזיאל / decision_ledger / כל מנוע-ידע) *מחליט* שנוצר/התעדכן ידע —
-- הוא קורא ל-knowledge_event(entity_type, stable_id, kind, source_ref) ותו לא. אין כתיבה כפולה,
-- אין ידיעה על topics/URL/עברית בצד-הידע. כל ההחלטות (מה, מי, האם בכלל) הן של צד-הידע;
-- ה-Adapter רק *מולחן ייצוג* (כותרת/גוף/קישור) ומעביר ל-dispatch הקיים — בלי לשנות אותו.
--
-- ⚖️ גבולות (inter_agent_coordination_law): צד-הידע = הסוכן השני (רזיאל/סיווג/candidate→decision).
--     ה-Adapter + Dispatcher + Notifications = הצד הזה. זה קו-הגבול היחיד; אין קריאה אחרת.
--
-- כללי-ברזל שמומשו כאן:
--   (1) whitelist-kind: רק 'candidate_decided' | 'knowledge_updated' עוברים. כל kind אחר → 0 (בלי fan-out).
--       question/discussion/candidate_created/candidate_dismissed הם רעש-דיון — לא התראה.
--   (2) שער-כניסה: entity_type null או stable_id ריק → 0.
--   (6) ייצוג מולחן בצד-ההתראות בלבד (v12): צד-הידע שולח זהות קנונית נקייה; הטקסט נבנה כאן.
--   (5/7) חיבור ל-dispatch הקיים, *מבודד-כשל*: begin/exception → כשל בהתראות לעולם לא זורק
--         חזרה ומפיל את החלטת-הידע. dedupe (recipient|kind|source_ref) + fan-out + audit = בתוך dispatch.
--   (8) מודל-הטרנזקציה: dispatch סינכרוני, אותה טרנזקציה, לא זורק על entity לא-מוכר (resolve→[]→0).
--       לכן ה-Adapter בטוח לקריאה מתוך טריגר/פונקציה של צד-הידע.
-- לא נוגע ב: dispatch · resolve_topics · watch_toggle · Notification Center · world:mine · חוליות-יניב.
create or replace function public.knowledge_event(
  p_entity_type text, p_stable_id text, p_kind text, p_source_ref text)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare v_n int := 0; v_title text; v_body text; v_link text; v_id text := btrim(coalesce(p_stable_id,''));
begin
  -- (1) whitelist — kind לא-מאושר → 0, בלי fan-out
  if p_kind not in ('candidate_decided','knowledge_updated') then return 0; end if;
  if p_entity_type is null or v_id = '' then return 0; end if;

  -- (6) ייצוג מולחן בצד ההתראות (v12) — האירוע נקי בלי טקסט
  v_link := case p_entity_type
    when 'number' then '/number/' || v_id
    when 'author' then '/community/researcher/' || v_id
    when 'cat'    then '/category/' || v_id
    when 'codes'  then '/codes'
    when 'stream' then '/archive'
    else null end;
  if p_kind = 'candidate_decided' then
    v_title := case p_entity_type
      when 'number' then '🔥 התכנסות/חומר חדש סביב ' || v_id
      when 'author' then '🔥 ידע חדש מאת ' || v_id
      else '🔥 ידע חדש' end;
    v_body := 'זוהה ואושר ידע חדש הקשור לכאן.';
  else -- knowledge_updated
    v_title := case p_entity_type
      when 'number' then '🔄 עדכון בידע על ' || v_id
      else '🔄 הידע התעדכן' end;
    v_body := 'נוסף חומר/ראיה לידע הקיים כאן.';
  end if;

  -- (5/7) חיבור ל-dispatch הקיים, מבודד-כשל: לעולם לא זורק חזרה להחלטת-הידע.
  --       dedupe (recipient|kind|source_ref) + fan-out + audit — הכל בתוך dispatch, ללא שינוי.
  begin
    v_n := public.dispatch(p_entity_type, v_id, p_kind, p_source_ref, v_title, v_body, v_link, null);
  exception when others then
    v_n := 0;   -- failure isolation
  end;
  return v_n;
end $function$;

-- (חסום מהציבור/לקוח — צד-הידע רץ כ-service_role/SECURITY DEFINER)
revoke all on function public.knowledge_event(text,text,text,text) from public;
grant execute on function public.knowledge_event(text,text,text,text) to service_role;
