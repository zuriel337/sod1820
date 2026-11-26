-- B2-zion-siboni-ROLLBACK · החזרה בטוחה: מחזיר ל-NULL רק עדכון שעדיין מכיל את התורם שB2 כתבה ובסטטוס published; ששונה מאז מדולג ומדווח.   *** לא הוחל. ***
BEGIN;
DO $$
DECLARE ids uuid[] := ARRAY[
  '36c5d5e9-7dd7-4943-9261-d243e4440f93',
  '382a6708-85e9-41f0-8969-3bcf60cef833',
  '70959319-d5c7-450d-a258-b0af4e316c43',
  '786eec01-f67c-48fe-9fbe-09f58d812f40',
  'c8e29fba-6894-44e5-ba0d-fcdf2b16c949'
]::uuid[];
  cid uuid; reverted int; skipped int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'zion-siboni' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'rollback: contributor not found'; END IF;
  SELECT count(*) INTO skipped FROM unnest(ids) u(id) LEFT JOIN public.channel_updates cu ON cu.id = u.id WHERE cu.id IS NULL OR cu.contributor_id IS DISTINCT FROM cid OR cu.status IS DISTINCT FROM 'published';
  UPDATE public.channel_updates cu SET contributor_id = NULL WHERE cu.id = ANY (ids) AND cu.contributor_id = cid AND cu.status = 'published';
  GET DIAGNOSTICS reverted = ROW_COUNT;
  RAISE NOTICE 'B2-zion-siboni-rollback: reverted %, skipped %', reverted, skipped;
  IF reverted + skipped <> 5 THEN RAISE EXCEPTION 'rollback accounting mismatch'; END IF;
END $$;
COMMIT;
