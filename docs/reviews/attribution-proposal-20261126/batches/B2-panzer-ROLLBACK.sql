-- B2-panzer-ROLLBACK · החזרה בטוחה: מחזיר ל-NULL רק עדכון שעדיין מכיל את התורם שB2 כתבה ובסטטוס published; ששונה מאז מדולג ומדווח.   *** לא הוחל. ***
BEGIN;
DO $$
DECLARE ids uuid[] := ARRAY[
  '453cacd6-f29c-4552-bf80-1cd1e3c1108d',
  '6b7f4636-f9eb-40f6-b6c8-774a4a919fd9'
]::uuid[];
  cid uuid; reverted int; skipped int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'israel-panzer' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'rollback: contributor not found'; END IF;
  SELECT count(*) INTO skipped FROM unnest(ids) u(id) LEFT JOIN public.channel_updates cu ON cu.id = u.id WHERE cu.id IS NULL OR cu.contributor_id IS DISTINCT FROM cid OR cu.status IS DISTINCT FROM 'published';
  UPDATE public.channel_updates cu SET contributor_id = NULL WHERE cu.id = ANY (ids) AND cu.contributor_id = cid AND cu.status = 'published';
  GET DIAGNOSTICS reverted = ROW_COUNT;
  RAISE NOTICE 'B2-panzer-rollback: reverted %, skipped %', reverted, skipped;
  IF reverted + skipped <> 2 THEN RAISE EXCEPTION 'rollback accounting mismatch'; END IF;
END $$;
COMMIT;
