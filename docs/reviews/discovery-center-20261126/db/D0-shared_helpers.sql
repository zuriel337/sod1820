-- D0 · ארבעה עזרים משותפים: כלל אחד לבחירה ולהצגה, וכלל שיוך אחד לקליטה. *** טיוטה לאישור מדויק. לא הוחלה. ***
-- (א) public_discovery_writer_v1(p_word_id): מחזיר את הכותב הציבורי היחיד שמקבל קרדיט על גימטריה, או NULL. אותו תנאי משמש את בחירת המנהל (D3)
--     ואת ההצגה בבית (D1), כך שאי אפשר לבחור גילוי שלא יוצג, וגילוי שאיבד זכאות נעלם מהבית מיד.
-- (ג) gematria_word_method_value_v1(p_word_id, p_method): זהות הגילוי = ביטוי + שיטה + ערך. השיטה והעמודה נקראות רק מרשימת השיטות הקנונית (gematria_methods: פעילה, במנוע, עם db_column),
--     והערך נקרא מאותה עמודה שחישב המנוע (gw_enforce_engine). אין חישוב ואין ערך ידני כאן. בלי p_method: שיטת המקור (other_method) אם היא שיטה רשומה, אחרת רגיל. שיטה מפורשת שאינה רשומה או שאין לה ערך: אין שורה.
-- (ד) home_featured_picks_v1(): בחירות המנהל מ-site_flags הקיים (עד 3: [{id, method}] או מזהה יחיד בפורמט הישן), בלי כתיבה, וערך פגום מניב אפס שורות.
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

CREATE OR REPLACE FUNCTION public.gematria_word_method_value_v1(p_word_id uuid, p_method text DEFAULT NULL)
RETURNS TABLE(method_key text, value bigint, label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
WITH g AS (SELECT w.* FROM public.gematria_words w WHERE w.id = p_word_id),
req AS (
  SELECT coalesce(nullif(btrim(p_method), ''), nullif(btrim((SELECT other_method FROM g)), ''), 'רגיל') AS k, (nullif(btrim(p_method), '') IS NOT NULL) AS explicit
), m AS (
  SELECT gm.method_key, gm.db_column, gm.display_label FROM public.gematria_methods gm, req
  WHERE gm.method_key = req.k AND gm.active AND gm.in_engine AND gm.db_column IS NOT NULL
), fb AS (   -- ברירת מחדל רק כשלא נבחרה שיטה במפורש: רגיל
  SELECT gm.method_key, gm.db_column, gm.display_label FROM public.gematria_methods gm, req WHERE NOT req.explicit AND NOT EXISTS (SELECT 1 FROM m) AND gm.method_key = 'רגיל'
), pick AS (SELECT * FROM m UNION ALL SELECT * FROM fb)
SELECT pick.method_key, (to_jsonb(g) ->> pick.db_column)::bigint, pick.display_label FROM g, pick WHERE (to_jsonb(g) ->> pick.db_column) IS NOT NULL;
$$;
GRANT EXECUTE ON FUNCTION public.gematria_word_method_value_v1(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.home_featured_picks_v1()
RETURNS TABLE(ord integer, word_id uuid, method text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE msg text; arr jsonb;
BEGIN
  SELECT f.message INTO msg FROM public.site_flags f WHERE f.key = 'home_featured_discovery' AND f.enabled;
  IF msg IS NULL OR btrim(msg) = '' THEN RETURN; END IF;
  BEGIN
    IF msg ~ '^\s*\[' THEN arr := msg::jsonb; ELSE arr := jsonb_build_array(jsonb_build_object('id', btrim(msg))); END IF;
  EXCEPTION WHEN others THEN RETURN;   -- ערך פגום אינו מפיל את הבית
  END;
  IF jsonb_typeof(arr) <> 'array' THEN RETURN; END IF;
  RETURN QUERY SELECT t.o::integer, (t.e->>'id')::uuid, nullif(btrim(t.e->>'method'), '')
    FROM jsonb_array_elements(arr) WITH ORDINALITY AS t(e, o)
    WHERE jsonb_typeof(t.e) = 'object' AND (t.e->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' ORDER BY t.o LIMIT 3;
END;
$$;
GRANT EXECUTE ON FUNCTION public.home_featured_picks_v1() TO anon, authenticated;
