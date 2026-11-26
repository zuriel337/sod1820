-- D3b · הבחירה הראשונית של הבית (אישור נפרד, אחרי D0 ו-D1 ו-D3): "תפרצי בתשפז" = 5787 בשיטת ריבוע, ולצדו "ימין ושמאול תפרצי" = 2026 בשיטת מילוי. *** טיוטה. לא הוחלה. ***
-- כתיבה אחת לשורת site_flags הקיימת (אין שורה כרגע). מוגנת: שני המזהים, הביטויים, השיטות והערכים נבדקים בזמן הכתיבה דרך אותם עזרים שמשמשים את ההצגה; כל חריגה עוצרת בלי כתיבה.
-- (בחירה עתידית נעשית דרך D3 מהממשק, ואינה צריכה קובץ.)
DO $$
DECLARE a uuid := 'd057b2cf-c50b-4f4c-9e22-f3ff90ec008b'; b uuid := 'b3fff8e8-2c77-45dc-ad1e-7b72eb352298'; ra record; rb record; n integer; f jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM public.site_flags WHERE key = 'home_featured_discovery') THEN RAISE EXCEPTION 'flag already exists: stop and report'; END IF;
  SELECT * INTO ra FROM public.gematria_word_method_value_v1(a, 'ריבוע');
  SELECT * INTO rb FROM public.gematria_word_method_value_v1(b, 'מילוי');
  IF ra.value IS DISTINCT FROM 5787 OR rb.value IS DISTINCT FROM 2026 THEN RAISE EXCEPTION 'value mismatch: % / %', ra.value, rb.value; END IF;
  IF (SELECT phrase FROM public.gematria_words WHERE id = a) IS DISTINCT FROM 'תפרצי בתשפז' OR (SELECT phrase FROM public.gematria_words WHERE id = b) IS DISTINCT FROM 'ימין ושמאול תפרצי' THEN RAISE EXCEPTION 'phrase mismatch (a missing row counts as a mismatch)'; END IF;
  IF public.public_discovery_writer_v1(a) IS NULL OR public.public_discovery_writer_v1(a) IS DISTINCT FROM public.public_discovery_writer_v1(b) THEN RAISE EXCEPTION 'not one public credited writer'; END IF;
  INSERT INTO public.site_flags (key, enabled, message, mode, updated_at)
  VALUES ('home_featured_discovery', true, jsonb_build_array(jsonb_build_object('id', a, 'method', 'ריבוע'), jsonb_build_object('id', b, 'method', 'מילוי'))::text, 'all', now());
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'expected 1 row'; END IF;
  -- אימות תצוגה (מקור יחיד): אחרי הכתיבה הקורא הציבורי חייב להציג את הנבחר ואת מה שלצדו, אחרת כל הבלוק מתבטל
  f := public.discovery_center_feed_v1();
  IF f->'featured'->>'id' IS DISTINCT FROM a::text OR f->'featured'->>'method' IS DISTINCT FROM 'ריבוע' OR f->'featured_with'->0->>'id' IS DISTINCT FROM b::text OR f->'featured_with'->0->>'method' IS DISTINCT FROM 'מילוי' THEN RAISE EXCEPTION 'display check failed: the feed does not show the two picks (a missing value counts as a failure)'; END IF;
END $$;
-- החזרה: D3b-rollback.sql (מוחקת רק אם הערך עדיין זהה בדיוק לערך שנכתב כאן; בחירת מנהל מאוחרת אינה נמחקת).
