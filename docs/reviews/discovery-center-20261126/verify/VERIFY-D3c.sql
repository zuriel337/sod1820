-- אחרי D3c (אחרי D3). קריאה בלבד.
SELECT has_function_privilege('anon', 'public.admin_set_home_featured_discovery_v1(jsonb)', 'execute') AS anon_admin_set,              -- false
       has_function_privilege('authenticated', 'public.admin_set_home_featured_discovery_v1(jsonb)', 'execute') AS auth_admin_set;   -- true (ובתוכו rd_is_admin)
-- אימות תצוגה בגוף הפונקציה (צפוי true): הפונקציה קוראת לקורא הציבורי אחרי הכתיבה
SELECT position('discovery_center_feed_v1' in prosrc) > 0 AS verifies_through_the_public_reader FROM pg_proc WHERE proname = 'admin_set_home_featured_discovery_v1' AND pronamespace = 'public'::regnamespace;
-- כל גילוי שניתן לבחור מוצג (צפוי 0): בחירה אפשרית לפי שער הכותב מול קבוצת התצוגה של הקורא
SELECT count(*) AS selectable_but_not_displayed FROM public.gematria_words g
 WHERE public.public_discovery_writer_v1(g.id) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.gematria_word_method_value_v1(g.id, NULL));
