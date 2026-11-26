-- אחרי D0 בלבד (לא דורש D1-D5). קריאה בלבד. הציפיות בהערות.
-- הרשאות: כל העזרים פנימיים (צפוי: false, false, false, false):
SELECT has_function_privilege('anon', 'public.gematria_word_method_value_v1(uuid,text)', 'execute') AS anon_method_value,
       has_function_privilege('anon', 'public.home_featured_picks_v1()', 'execute') AS anon_picks,
       has_function_privilege('anon', 'public.public_discovery_writer_v1(uuid)', 'execute') AS anon_writer,
       has_function_privilege('anon', 'public.rc_unique_contributor_for_user_v1(uuid)', 'execute') AS anon_internal_rule;
SELECT has_function_privilege('authenticated', 'public.gematria_word_method_value_v1(uuid,text)', 'execute') AS auth_method_value,   -- false
       has_function_privilege('authenticated', 'public.home_featured_picks_v1()', 'execute') AS auth_picks,                         -- false
       has_function_privilege('authenticated', 'public.public_discovery_writer_v1(uuid)', 'execute') AS auth_writer;                -- false
-- שער הפרטיות בתוך העזר (צפוי 0): לגימטריה לא ציבורית/לא מאומתת/מוצפנת אין שורה
SELECT count(*) AS non_public_rows FROM public.gematria_words g CROSS JOIN LATERAL public.gematria_word_method_value_v1(g.id, NULL) m
 WHERE NOT (g.is_verified AND g.is_published AND coalesce(g.is_encrypted, false) = false AND public.gematria_public_word_eligible(g.id));
-- זהות הגילוי של שני גילויי יניב (צפוי: ריבוע 5787, מילוי 2026):
SELECT g.phrase, m.method_key, m.value FROM public.gematria_words g CROSS JOIN LATERAL public.gematria_word_method_value_v1(g.id, NULL) m
 WHERE g.id IN ('d057b2cf-c50b-4f4c-9e22-f3ff90ec008b', 'b3fff8e8-2c77-45dc-ad1e-7b72eb352298');
