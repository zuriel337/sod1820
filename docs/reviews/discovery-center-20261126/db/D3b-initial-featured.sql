-- D3b · הבחירה הראשונית של הבית (אישור נפרד, אחרי D0 ו-D1 ו-D3): "תפרצי בתשפז" = 5787 בשיטת ריבוע, ולצדו "ימין ושמאול תפרצי" = 2026 בשיטת מילוי. *** טיוטה. לא הוחלה. ***
-- כתיבה אחת לשורת site_flags הקיימת (אין שורה כרגע). מוגנת: שני המזהים, הביטויים, השיטות והערכים נבדקים בזמן הכתיבה דרך אותם עזרים שמשמשים את ההצגה; כל חריגה עוצרת בלי כתיבה.
-- (בחירה עתידית נעשית דרך D3 מהממשק, ואינה צריכה קובץ.)
DO $$
DECLARE a uuid := 'd057b2cf-c50b-4f4c-9e22-f3ff90ec008b'; b uuid := 'b3fff8e8-2c77-45dc-ad1e-7b72eb352298'; ra record; rb record; n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.site_flags WHERE key = 'home_featured_discovery') THEN RAISE EXCEPTION 'flag already exists: stop and report'; END IF;
  SELECT * INTO ra FROM public.gematria_word_method_value_v1(a, 'ריבוע');
  SELECT * INTO rb FROM public.gematria_word_method_value_v1(b, 'מילוי');
  IF ra.value IS DISTINCT FROM 5787 OR rb.value IS DISTINCT FROM 2026 THEN RAISE EXCEPTION 'value mismatch: % / %', ra.value, rb.value; END IF;
  IF (SELECT phrase FROM public.gematria_words WHERE id = a) <> 'תפרצי בתשפז' OR (SELECT phrase FROM public.gematria_words WHERE id = b) <> 'ימין ושמאול תפרצי' THEN RAISE EXCEPTION 'phrase mismatch'; END IF;
  IF public.public_discovery_writer_v1(a) IS NULL OR public.public_discovery_writer_v1(a) IS DISTINCT FROM public.public_discovery_writer_v1(b) THEN RAISE EXCEPTION 'not one public credited writer'; END IF;
  INSERT INTO public.site_flags (key, enabled, message, mode, updated_at)
  VALUES ('home_featured_discovery', true, jsonb_build_array(jsonb_build_object('id', a, 'method', 'ריבוע'), jsonb_build_object('id', b, 'method', 'מילוי'))::text, 'all', now());
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'expected 1 row'; END IF;
END $$;
-- החזרה (rollback): DELETE FROM public.site_flags WHERE key = 'home_featured_discovery' AND message LIKE '%d057b2cf-c50b-4f4c-9e22-f3ff90ec008b%';
