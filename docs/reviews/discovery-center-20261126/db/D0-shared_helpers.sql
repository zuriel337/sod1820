-- D0 · שני עזרים משותפים: כלל אחד לבחירה ולהצגה, וכלל שיוך אחד לקליטה. *** טיוטה לאישור מדויק. לא הוחלה. ***
-- (א) public_discovery_writer_v1(p_word_id): מחזיר את הכותב הציבורי היחיד שמקבל קרדיט על גימטריה, או NULL. אותו תנאי משמש את בחירת המנהל (D3)
--     ואת ההצגה בבית (D1), כך שאי אפשר לבחור גילוי שלא יוצג, וגילוי שאיבד זכאות נעלם מהבית מיד.
-- (ב) rc_unique_contributor_for_user_v1(p_user): התורם הפעיל, הלא ממוזג והיחיד של משתמש. אותו כלל של A1, משמש את add_contribution (D5) ואת טריגר הקליטה (D4).
CREATE OR REPLACE FUNCTION public.public_discovery_writer_v1(p_word_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
WITH g AS (
  SELECT regexp_replace(coalesce(w.source, ''), '^contribution:', '') AS credit, w.source
  FROM public.gematria_words w
  WHERE w.id = p_word_id AND (w.is_encrypted = false OR w.is_encrypted IS NULL) AND w.is_verified AND w.is_published
    AND public.gematria_public_word_eligible(w.id)
    AND nullif(btrim(w.source), '') IS NOT NULL
    AND w.source !~* '^(promoted|excel_import|entity_|emotion_|auto:|admin_curated|wp_id|wa-vip)' AND lower(btrim(w.source)) <> 'sod1820'
), pw AS (
  SELECT c.id, lower(btrim(x)) AS nm
  FROM public.contributors c, LATERAL unnest(array[c.display_name] || coalesce(c.wa_names, '{}')) x
  WHERE c.active AND c.merged_into IS NULL AND nullif(btrim(x), '') IS NOT NULL
    AND NOT coalesce(c.locked, false) AND NOT coalesce(c.building, false) AND coalesce(c.dossier_settings->>'visibility', 'public') = 'public'
), hit AS (
  SELECT DISTINCT pw.id FROM g JOIN pw ON pw.nm = lower(btrim(g.credit))
)
SELECT CASE WHEN (SELECT count(*) FROM hit) = 1 AND EXISTS (SELECT 1 FROM g) THEN (SELECT id FROM hit) END;
$$;
GRANT EXECUTE ON FUNCTION public.public_discovery_writer_v1(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rc_unique_contributor_for_user_v1(p_user uuid)
RETURNS TABLE(id uuid, trusted boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
WITH m AS (SELECT c.id, coalesce(c.trusted, false) AS trusted FROM public.contributors c WHERE c.user_id = p_user AND c.active AND c.merged_into IS NULL)
SELECT m.id, m.trusted FROM m WHERE (SELECT count(*) FROM m) = 1;
$$;
REVOKE ALL ON FUNCTION public.rc_unique_contributor_for_user_v1(uuid) FROM public, anon, authenticated;   -- פנימי: נקרא רק מ-add_contribution ומהטריגר (definer)
