-- D3 · admin_set_home_featured_discovery_v1(p_word_id uuid) · בחירת הגילוי הנבחר להבלטה והחלפתו. *** טיוטה לאישור מדויק. לא הוחלה. ***
-- אין טבלה חדשה: כותבת לשורת site_flags הקיימת (קריאה ציבורית קיימת: site_flags_public_read) במפתח 'home_featured_discovery' (message = מזהה הגימטריה).
-- מנהל בלבד (rd_is_admin(), כמו שאר פונקציות הניהול). הבחירה נדחית אם הגימטריה אינה ציבורית וזכאית (gematria_public_word_eligible), אם אין לה מקור/קרדיט,
-- או אם הקרדיט אינו מחובר לכותב מזוהה בכלל השיוך הקנוני. NULL מבטל את הבחירה (חוזרים לברירת המחדל: הגילוי האחרון עם כותב מזוהה).
-- אין נעיצה בזרם "עכשיו": הערך משפיע רק על סעיף מרכז הגילויים בבית.
CREATE OR REPLACE FUNCTION public.admin_set_home_featured_discovery_v1(p_word_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE g public.gematria_words%ROWTYPE; v_cid uuid;
BEGIN
  IF NOT public.rd_is_admin() THEN RAISE EXCEPTION 'admin only' USING ERRCODE = '42501'; END IF;
  IF p_word_id IS NULL THEN
    INSERT INTO public.site_flags (key, enabled, message, mode, updated_at) VALUES ('home_featured_discovery', false, '', 'all', now())
      ON CONFLICT (key) DO UPDATE SET enabled = false, message = '', updated_at = now();
    RETURN jsonb_build_object('ok', true, 'featured', NULL);
  END IF;
  SELECT * INTO g FROM public.gematria_words WHERE id = p_word_id;
  IF NOT FOUND OR NOT (g.is_verified AND g.is_published AND (g.is_encrypted = false OR g.is_encrypted IS NULL) AND public.gematria_public_word_eligible(g.id)) THEN
    RAISE EXCEPTION 'not a public eligible discovery' USING ERRCODE = '22023';
  END IF;
  IF nullif(btrim(g.source), '') IS NULL THEN RAISE EXCEPTION 'discovery has no source/credit' USING ERRCODE = '22023'; END IF;
  SELECT c.id INTO v_cid FROM public.contributors c
   WHERE c.active AND c.merged_into IS NULL
     AND (lower(btrim(c.display_name)) = lower(btrim(regexp_replace(g.source, '^contribution:', ''))) OR lower(btrim(regexp_replace(g.source, '^contribution:', ''))) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names, '{}')) x))
   LIMIT 2;
  IF v_cid IS NULL OR (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
       AND (lower(btrim(c.display_name)) = lower(btrim(regexp_replace(g.source, '^contribution:', ''))) OR lower(btrim(regexp_replace(g.source, '^contribution:', ''))) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names, '{}')) x))) <> 1
  THEN RAISE EXCEPTION 'credit does not resolve to exactly one writer' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.site_flags (key, enabled, message, mode, updated_at) VALUES ('home_featured_discovery', true, p_word_id::text, 'all', now())
    ON CONFLICT (key) DO UPDATE SET enabled = true, message = excluded.message, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'featured', p_word_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_home_featured_discovery_v1(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_home_featured_discovery_v1(uuid) TO authenticated;
