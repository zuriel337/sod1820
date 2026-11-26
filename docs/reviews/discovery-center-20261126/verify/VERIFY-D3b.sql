-- אחרי D0, D1, D3 ו-D3b. קריאה בלבד.
-- זהות הנבחר (צפוי: תפרצי בתשפז / ריבוע / 5787, ולצדו ימין ושמאול תפרצי / מילוי / 2026):
SELECT j->'featured'->>'phrase' AS phrase, j->'featured'->>'method' AS method, j->'featured'->>'value' AS value, j->'featured_with' AS beside FROM (SELECT public.discovery_center_feed_v1() AS j) f;
-- שורת הדגל (צפוי: enabled true, הודעה = מערך שתי הבחירות):
SELECT enabled, message FROM public.site_flags WHERE key = 'home_featured_discovery';
