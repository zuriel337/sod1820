-- E1 · בדיקת אכיפה לחוק gematria_auto_registry_law v2 (GEMATRIA ROOT GATE): גימטריה שמופיעה בגוף פוסט חייבת להיות גם שורה קנונית ב-gematria_words, עם הערך שחישב המנוע בשיטה הנטענת.
-- קריאה בלבד; אינה כותבת, אינה מחשבת ואינה פונקציה. מאתרת את הטענות בגוף הפוסטים (בלוקים "הביטוי / השיטה / התוצאה"); הצורה המקבילה בקוד: scripts/lib/gematriaRootGate2029.mjs (נבדקת ב-test/gematria-root-gate-2029.test.mjs).
-- כל שורה בפלט היא ממצא: no_root (קיימת רק בגוף הפוסט), root_not_public (השורש לא מאומת/מפורסם/גלוי), unknown_method (שיטה שאינה ברשימה הקנונית), value_mismatch (הערך שונה מעמודת המנוע). פלט ריק = החוק מתקיים.
-- מצב נקרא 26.11.2026: 2 טענות ב-1 פוסט (5107), 0 ממצאים.
-- *** גבול הכיסוי: רק בלוקים בצורת "הביטוי / השיטה / התוצאה" בגוף פוסט. אינו בודק טקסט חופשי, תגובות, ספרים, צפנים או מקורות אחרים, ואינו מוכיח שהחוק נאכף בכל האתר. ***
WITH c AS (
  SELECT p.id AS post_id, p.slug, btrim(m[1]) AS phrase, btrim(m[2]) AS method, m[3]::bigint AS claimed
  FROM public.posts p, regexp_matches(p.content, '<b>\s*הביטוי:\s*</b>\s*([^<]+)</p>\s*<p[^>]*>\s*<b>\s*השיטה:\s*</b>\s*([^<]+)</p>\s*<p[^>]*>\s*<b>\s*התוצאה:\s*</b>\s*<span[^>]*data-gem="(\d+)"', 'g') m
  WHERE p.content LIKE '%הביטוי:%'
), j AS (
  SELECT c.*, g.id AS word_id, (g.is_verified AND g.is_published AND coalesce(g.is_encrypted, false) = false) AS root_public, gm.db_column,
         CASE WHEN gm.db_column IS NOT NULL THEN (to_jsonb(g) ->> gm.db_column)::bigint END AS engine_value
  FROM c
  LEFT JOIN LATERAL (SELECT * FROM public.gematria_words w WHERE lower(btrim(w.phrase)) = lower(c.phrase) ORDER BY (w.is_verified AND w.is_published) DESC, w.created_at LIMIT 1) g ON true
  LEFT JOIN public.gematria_methods gm ON gm.method_key = c.method AND gm.active AND gm.in_engine AND gm.db_column IS NOT NULL
)
SELECT post_id, slug, phrase, method, claimed,
       CASE WHEN word_id IS NULL THEN 'no_root' WHEN NOT root_public THEN 'root_not_public' WHEN db_column IS NULL THEN 'unknown_method' WHEN engine_value IS DISTINCT FROM claimed THEN 'value_mismatch' END AS finding
FROM j
WHERE word_id IS NULL OR NOT root_public OR db_column IS NULL OR engine_value IS DISTINCT FROM claimed;
