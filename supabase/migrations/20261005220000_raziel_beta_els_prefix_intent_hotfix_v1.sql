-- RAZIEL_BETA_ELS_PREFIX_INTENT_HOTFIX_V1 — «בדוק את משיח בדילוגים» routed to no_match.
-- Cause: fn_raziel_route is token-boundary (20261005050000); the attached-ב ELS forms are not implicit matches,
-- and fn_raziel_extract_subject did not stop them, so the subject became «משיח בדילוגים».
-- Scope: (1) explicit prefixed ELS keywords on agent_identity.els_cipher (append-only, no dedupe/removal);
--        (2) fn_raziel_extract_subject: stop array only (בדילוג/בדילוגים/בדילוגי). No generic prefix stripping,
--        fn_raziel_route / ELS engine / routing_enabled untouched.

update public.agent_identity
   set match_keywords = coalesce(match_keywords, '{}'::text[])
                        || array['בדילוג','בדילוגים','בדילוגי','בדילוגי אותיות']
 where agent_id = 'els_cipher'
   and not (match_keywords @> array['בדילוג','בדילוגים','בדילוגי','בדילוגי אותיות']);

create or replace function public.fn_raziel_extract_subject(p_question text, p_intent text)
returns text
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v text; w text; parts text[] := '{}'; nwords int;
  stop text[] := array['מה','הערך','ערך','של','בגימטריה','גימטריה','הגימטריה','כמה','שווה','שוה','חישוב',
                       'תמצא','מצא','למצוא','דילוגים','דילוג','דילוגי','אותיות','בתורה','בצופן','בדוק','חפש',
                       -- explicit attached-ב ELS forms (hotfix; no generic prefix stripping):
                       'בדילוג','בדילוגים','בדילוגי',
                       -- מילות-קישור/הצבעה שאינן חלק מהנושא (תיקון «זה חיים»):
                       'זה','זו','זהו','הזה','הזו','הזאת','הם','הן','הוא','היא','מהו','מהי','את','הערכים'];
begin
  if coalesce(p_question,'')='' then return null; end if;
  -- Phase F: bounded source-question stop-words, ONLY for tanakh_source («בתנ״ך» splits into «בתנ»+«ך» below). Other intents unchanged.
  if p_intent = 'tanakh_source' then
    stop := stop || array['איפה','היכן','באיזה','באיזו','איזה','איזו','מופיע','מופיעה','מופיעים','מופיעות','נמצא','נמצאת','נמצאים',
                          'תנ','בתנ','ך','תנך','בתנך','פסוק','פסוקים','ספר','ספרים','מקור','מקורות','הופעות'];
  end if;
  v := regexp_replace(p_question, '[?!.,:;״''\"]+', ' ', 'g');
  v := btrim(regexp_replace(v, '\s+', ' ', 'g'));
  foreach w in array regexp_split_to_array(v, '\s+') loop
    if w <> '' and not (w = any(stop)) then parts := parts || w; end if;
  end loop;
  v := btrim(array_to_string(parts,' '));
  nwords := coalesce(array_length(parts,1),0);
  if v = '' or nwords = 0 or nwords > 4 or length(v) > 30 then return null; end if;
  return v;
end $function$;
