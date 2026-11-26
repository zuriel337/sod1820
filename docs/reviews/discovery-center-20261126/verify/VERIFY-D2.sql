-- אחרי D0 ו-D2 (לא דורש D1, D3-D5). קריאה בלבד.
SELECT has_function_privilege('anon', 'public.writer_public_material_v1(uuid,text,integer,timestamptz,text)', 'execute') AS anon_writer_material;   -- true
-- כותב פרטי מחזיר אפס שורות (צפוי 0):
SELECT count(*) FROM public.writer_public_material_v1((SELECT id FROM public.contributors WHERE slug = 'openweb-u-zawigiuo'));
-- גימטריה בדף הכותב כביטוי = ערך (שיטה), ביטוי פעם אחת (צפוי: שורות כגון "תפרצי בתשפז = 5787 (ריבוע)"):
SELECT excerpt FROM public.writer_public_material_v1((SELECT id FROM public.contributors WHERE slug = 'yaniv-levi'), 'gematria', 100) WHERE excerpt LIKE '%תפרצי%';
-- אין כפילות (צפוי 0):
SELECT count(*) - count(DISTINCT dedupe_key) AS duplicate_rows FROM public.writer_public_material_v1((SELECT id FROM public.contributors WHERE slug = 'yaniv-levi'), NULL, 100);
