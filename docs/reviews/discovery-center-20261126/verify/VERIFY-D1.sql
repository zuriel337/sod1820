-- אחרי D0 ו-D1 (לא דורש D2-D5). קריאה בלבד.
SELECT has_function_privilege('anon', 'public.discovery_center_feed_v1()', 'execute') AS anon_feed,     -- true
       has_function_privilege('anon', 'public.discovery_center_stats_v1()', 'execute') AS anon_stats;   -- true
-- פרטיות: הפלט אינו מכיל כותב עם פרופיל פרטי/נעול (צפוי 0):
SELECT count(*) AS private_writers_in_feed FROM jsonb_array_elements(public.discovery_center_feed_v1()->'active_writers') w
 JOIN public.contributors c ON c.slug = w->>'slug' WHERE coalesce(c.locked, false) OR coalesce(c.building, false) OR coalesce(c.dossier_settings->>'visibility', 'public') <> 'public';
-- כל גילוי ברשימה נושא שיטה וערך (צפוי 0 חסרים):
SELECT count(*) AS missing_identity FROM jsonb_array_elements(public.discovery_center_feed_v1()->'latest_discoveries') d WHERE d->>'method' IS NULL OR d->>'value' IS NULL;
-- מונה אוטומטי וללא כפל (צפוי 0): הפרש בין מונה הבית לספירה ישירה של ביטויים ציבוריים ייחודיים:
SELECT (public.discovery_center_stats_v1()->>'gematria_public')::int - (SELECT count(DISTINCT lower(btrim(g.phrase))) FROM public.gematria_words g WHERE (g.is_encrypted = false OR g.is_encrypted IS NULL) AND g.is_verified AND g.is_published AND public.gematria_public_word_eligible(g.id)) AS counter_diff;
-- אין שינוי סטטוס עדכוני ערוץ (צפוי 135, לא השתנה): SELECT count(*) FROM public.channel_updates WHERE status = 'published';
