-- D3c (תוספת אחרי D3, 27.11.2026) · admin_set_home_featured_discovery_v1(p_picks jsonb) + אימות תצוגה אחרי הכתיבה: אותה פונקציה כמו D3, ובנוסף אחרי כתיבת הדגל נקרא discovery_center_feed_v1 (מקור התצוגה היחיד) וכל בחירה חייבת להופיע בו עם אותה שיטה, אחרת הפעולה כולה מבוטלת (22023). כך בחירה שאינה ניתנת להצגה (ביטוי כפול שאינו הראשון, חסרה שיטת ברירת מחדל, אובדן זכאות) נדחית גם בעתיד, בלי שכפול לוגיקה. D3 המקורי הוחל; זו החלפה בלבד.
-- (D3 המקורי) admin_set_home_featured_discovery_v1(p_picks jsonb) · בחירת הגילוי הנבחר ושל מה שלצדו (עד 3), מנהל בלבד. *** טיוטה לאישור מדויק. לא הוחלה. ***
-- p_picks = [{"id": <מזהה גימטריה>, "method": <שיטה מרשימת gematria_methods>}, ...]. NULL או [] מבטל. הראשון הוא הנבחר, הבאים מוצגים לצדו. אין נעיצה ב"עכשיו".
-- אין טבלה חדשה: כותבת לשורת site_flags הקיימת (site_flags_public_read) במפתח 'home_featured_discovery'; message = מערך JSON של {id, method} כשהשיטה מפורשת.
-- תנאי הבחירה זהים לתנאי ההצגה (D1): public_discovery_writer_v1(id) לא ריק (גימטריה ציבורית וזכאית, כותב ציבורי יחיד) וגם gematria_word_method_value_v1(id, method) מחזיר ערך (שיטה רשומה, פעילה ובמנוע, עם ערך שחישב המנוע).
-- שיטה שאינה רגילה מקבלת מקום שווה: היא נשמרת במפורש ואינה מוחלפת ב-ragil. גילוי שאיבד זכאות נעלם מהבית מיד (D1 בודק מחדש), בלי פעולה.
CREATE OR REPLACE FUNCTION public.admin_set_home_featured_discovery_v1(p_picks jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE e jsonb; wid uuid; meth text; mk text; val bigint; stored jsonb := '[]'::jsonb; seen uuid[] := '{}'; n integer; f jsonb;
BEGIN
  IF NOT public.rd_is_admin() THEN RAISE EXCEPTION 'admin only' USING ERRCODE = '42501'; END IF;
  IF p_picks IS NULL OR p_picks = '[]'::jsonb THEN
    INSERT INTO public.site_flags (key, enabled, message, mode, updated_at) VALUES ('home_featured_discovery', false, '', 'all', now())
      ON CONFLICT (key) DO UPDATE SET enabled = false, message = '', updated_at = now();
    RETURN jsonb_build_object('ok', true, 'featured', '[]'::jsonb);
  END IF;
  IF jsonb_typeof(p_picks) <> 'array' OR jsonb_array_length(p_picks) > 3 THEN RAISE EXCEPTION 'picks must be an array of 1-3' USING ERRCODE = '22023'; END IF;
  FOR e IN SELECT * FROM jsonb_array_elements(p_picks) LOOP
    IF jsonb_typeof(e) <> 'object' OR (e->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'bad pick' USING ERRCODE = '22023'; END IF;
    wid := (e->>'id')::uuid; meth := nullif(btrim(e->>'method'), '');
    IF wid = ANY(seen) THEN RAISE EXCEPTION 'a discovery can appear once' USING ERRCODE = '22023'; END IF;
    IF public.public_discovery_writer_v1(wid) IS NULL THEN RAISE EXCEPTION 'not a public eligible discovery with exactly one public credited writer' USING ERRCODE = '22023'; END IF;
    mk := NULL; val := NULL;
    SELECT m.method_key, m.value INTO mk, val FROM public.gematria_word_method_value_v1(wid, meth) m;
    IF mk IS NULL THEN RAISE EXCEPTION 'method not available for this phrase' USING ERRCODE = '22023'; END IF;
    seen := seen || wid;
    stored := stored || jsonb_build_array(jsonb_build_object('id', wid, 'method', mk));
  END LOOP;
  INSERT INTO public.site_flags (key, enabled, message, mode, updated_at) VALUES ('home_featured_discovery', true, stored::text, 'all', now())
    ON CONFLICT (key) DO UPDATE SET enabled = true, message = excluded.message, updated_at = now();
  -- אימות תצוגה (מקור יחיד): כל בחירה חייבת להופיע בפלט הקורא הציבורי עם אותה שיטה; אחרת הכתיבה מתבטלת
  f := public.discovery_center_feed_v1();
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(stored) s
    WHERE NOT EXISTS (
      SELECT 1 FROM (SELECT f->'featured' AS d UNION ALL SELECT x FROM jsonb_array_elements(coalesce(f->'featured_with', '[]'::jsonb)) x) z
      WHERE z.d->>'id' = s->>'id' AND z.d->>'method' = s->>'method')
  ) THEN RAISE EXCEPTION 'selection is not displayable on the home (later duplicate phrase, missing default method or lost eligibility)' USING ERRCODE = '22023'; END IF;
  RETURN jsonb_build_object('ok', true, 'featured', stored);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_home_featured_discovery_v1(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_home_featured_discovery_v1(jsonb) TO authenticated;
