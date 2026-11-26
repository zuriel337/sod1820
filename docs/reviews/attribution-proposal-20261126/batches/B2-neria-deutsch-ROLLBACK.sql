-- B2-neria-deutsch-ROLLBACK · החזרה בטוחה: מחזיר ל-NULL רק עדכון שעדיין מכיל את התורם שB2 כתבה ובסטטוס published; ששונה מאז מדולג ומדווח.   *** לא הוחל. ***
BEGIN;
DO $$
DECLARE ids uuid[] := ARRAY[
  'b21db691-6afc-4729-be02-f9a8700b4dbc'
]::uuid[];
  cid uuid; reverted int; skipped int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'neria-deutsch' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'rollback: contributor not found'; END IF;
  SELECT count(*) INTO skipped FROM unnest(ids) u(id) LEFT JOIN public.channel_updates cu ON cu.id = u.id WHERE cu.id IS NULL OR cu.contributor_id IS DISTINCT FROM cid OR cu.status IS DISTINCT FROM 'published';
  UPDATE public.channel_updates cu SET contributor_id = NULL WHERE cu.id = ANY (ids) AND cu.contributor_id = cid AND cu.status = 'published';
  GET DIAGNOSTICS reverted = ROW_COUNT;
  RAISE NOTICE 'B2-neria-deutsch-rollback: reverted %, skipped %', reverted, skipped;
  IF reverted + skipped <> 1 THEN RAISE EXCEPTION 'rollback accounting mismatch'; END IF;
END $$;
COMMIT;
