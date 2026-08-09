-- 🔗 גשר-alias: העניין-הישן «els» (דילוגי אותיות/צפנים בניוזלטר+אונבורדינג) = הערוץ הקנוני codes:new.
-- resolve_topics הוא שכבת-ה-alias (subscription_funnel_law v12): fan-out של צופן מתאים גם למי שבחר
-- codes:new וגם למי שבחר את הנושא-הישן els — «מגדירים אותם לפי ההתראות שכבר הגדירו», בלי לכתוב
-- לנתוני-משתמש. In-App כרגע; משלוח-מייל לקבוצה הזו יעבוד כשערוץ ה-Email ייפתח. לא נוגע ב-/codes UI (צעד 3).
create or replace function public.resolve_topics(p_entity_type text, p_stable_id text)
returns text[] language plpgsql immutable set search_path to 'public' as $function$
begin
  return case p_entity_type
    when 'number'         then array['number:'  || p_stable_id]
    when 'author'         then array['author:'  || p_stable_id]
    when 'category'       then array['cat:'     || p_stable_id]
    when 'cipher_feed'    then array['codes:new', 'els']   -- codes:new (קנוני) + els (alias ישן)
    when 'reality_stream' then array['stream:reality']
    else array[]::text[]
  end;
end $function$;
revoke all on function public.resolve_topics(text,text) from public;
