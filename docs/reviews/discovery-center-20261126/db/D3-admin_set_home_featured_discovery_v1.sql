-- D3 · admin_set_home_featured_discovery_v1(p_word_id) · בחירת הגילוי הנבחר והחלפתו, מנהל בלבד. *** טיוטה לאישור מדויק. לא הוחלה. ***
-- אין טבלה חדשה: כותבת לשורת site_flags הקיימת (site_flags_public_read) במפתח 'home_featured_discovery' (message = מזהה הגימטריה).
-- תנאי הבחירה זהים לתנאי ההצגה: שניהם בודקים public_discovery_writer_v1(id) (D0): גימטריה ציבורית וזכאית (gematria_public_word_eligible), עם מקור, לא מקור מערכת/sod1820,
--   והקרדיט מתאים לכותב ציבורי יחיד (פרופיל פעיל, לא נעול, לא בבנייה, visibility=public). בחירה שאינה עוברת נדחית.
-- אם הגילוי שנבחר איבד זכאות אחרי הבחירה, D1 מפסיק להציג אותו (אותו עזר) וחוזר לגילוי האחרון עם כותב ציבורי, בלי כל פעולה.
-- NULL מבטל את הבחירה. אין נעיצה ב"עכשיו".
CREATE OR REPLACE FUNCTION public.admin_set_home_featured_discovery_v1(p_word_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.rd_is_admin() THEN RAISE EXCEPTION 'admin only' USING ERRCODE = '42501'; END IF;
  IF p_word_id IS NULL THEN
    INSERT INTO public.site_flags (key, enabled, message, mode, updated_at) VALUES ('home_featured_discovery', false, '', 'all', now())
      ON CONFLICT (key) DO UPDATE SET enabled = false, message = '', updated_at = now();
    RETURN jsonb_build_object('ok', true, 'featured', NULL);
  END IF;
  IF public.public_discovery_writer_v1(p_word_id) IS NULL THEN
    RAISE EXCEPTION 'not a public eligible discovery with exactly one public credited writer' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.site_flags (key, enabled, message, mode, updated_at) VALUES ('home_featured_discovery', true, p_word_id::text, 'all', now())
    ON CONFLICT (key) DO UPDATE SET enabled = true, message = excluded.message, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'featured', p_word_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_home_featured_discovery_v1(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_home_featured_discovery_v1(uuid) TO authenticated;
