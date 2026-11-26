-- B1-panzer-ROLLBACK · החזרה בטוחה.   *** לא הוחל. ***
-- מחזיר ל-NULL רק שורה שעדיין מכילה בדיוק את התורם שB1 כתבה ובאותו סטטוס. שורה ששונתה מאז מדולגת ומדווחת, ואינה נדרסת.
BEGIN;
DO $$
DECLARE ids uuid[] := ARRAY[
  '20c540cc-82bf-4098-b223-1200492a364e',
  '729af9b9-5562-41f4-9a7a-fc910bc79285'
]::uuid[];
  cid uuid; reverted int; skipped int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'israel-panzer' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'rollback: contributor not found'; END IF;
  SELECT count(*) INTO skipped FROM unnest(ids) u(id) LEFT JOIN public.research_contributions r ON r.id = u.id
    WHERE r.id IS NULL OR r.deleted_at IS NOT NULL OR r.author_contributor_id IS DISTINCT FROM cid OR r.status IS DISTINCT FROM 'approved';
  UPDATE public.research_contributions r SET author_contributor_id = NULL
    WHERE r.id = ANY (ids) AND r.deleted_at IS NULL AND r.author_contributor_id = cid AND r.status = 'approved';
  GET DIAGNOSTICS reverted = ROW_COUNT;
  RAISE NOTICE 'B1-panzer-rollback: reverted %, skipped (changed after B1) %', reverted, skipped;
  IF reverted + skipped <> 2 THEN RAISE EXCEPTION 'rollback accounting mismatch'; END IF;
END $$;
COMMIT;
