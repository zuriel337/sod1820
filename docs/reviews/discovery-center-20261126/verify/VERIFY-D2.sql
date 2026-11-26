-- אחרי D0 ו-D2 (לא דורש D1, D3-D5). קריאה בלבד.
SELECT has_function_privilege('anon', 'public.writer_public_material_v1(uuid,text,integer,timestamptz,text)', 'execute') AS anon_writer_material;   -- true
-- כותב פרטי מחזיר אפס שורות (צפוי 0):
SELECT count(*) FROM public.writer_public_material_v1((SELECT id FROM public.contributors WHERE slug = 'openweb-u-zawigiuo'));
-- גימטריה בדף הכותב כביטוי = ערך (שיטה), ביטוי פעם אחת (צפוי: שורות כגון "תפרצי בתשפז = 5787 (ריבוע)"):
SELECT excerpt FROM public.writer_public_material_v1((SELECT id FROM public.contributors WHERE slug = 'yaniv-levi'), 'gematria', 100) WHERE excerpt LIKE '%תפרצי%';
-- אין כפילות (צפוי 0):
SELECT count(*) - count(DISTINCT dedupe_key) AS duplicate_rows FROM public.writer_public_material_v1((SELECT id FROM public.contributors WHERE slug = 'yaniv-levi'), NULL, 100);
-- צפנים לפי שלוש דרגות הפרסום (צפוי: 0 פרטיים, 0 מוסתרים, 0 כפולים; כל צופן בדף הכותב נקרא ציבורית לפי RLS של els_records):
SELECT (SELECT count(*) FROM public.writer_public_material_v1(c.id, 'cipher', 100) m JOIN public.els_records e ON e.id::text = m.ref_id WHERE e.visibility <> 'public' OR e.status = 'hidden') AS private_or_hidden_ciphers,
       (SELECT count(*) - count(DISTINCT dedupe_key) FROM public.writer_public_material_v1(c.id, 'cipher', 100)) AS duplicate_ciphers
FROM public.contributors c WHERE c.slug = 'yaniv-levi';
SELECT count(*) AS ciphers_not_publicly_readable FROM public.contributors c CROSS JOIN LATERAL public.writer_public_material_v1(c.id, 'cipher', 100) m JOIN public.els_records e ON e.id::text = m.ref_id
 WHERE NOT ((e.status = 'published' AND e.visibility = 'public') OR (e.self_published = true AND e.visibility = 'public'));
