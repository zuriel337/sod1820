-- B1-yaniv-levi-ROLLBACK · החזרה בטוחה.   *** לא הוחל. ***
-- מחזיר ל-NULL רק שורה שעדיין מכילה בדיוק את התורם שB1 כתבה ובאותו סטטוס. שורה ששונתה מאז מדולגת ומדווחת, ואינה נדרסת.
BEGIN;
DO $$
DECLARE ids uuid[] := ARRAY[
  'ddf80a25-1268-427b-84c6-e68f2dfde0fe'
]::uuid[];
  cid uuid; reverted int; skipped int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'yaniv-levi' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'rollback: contributor not found'; END IF;
  SELECT count(*) INTO skipped FROM unnest(ids) u(id) LEFT JOIN public.research_contributions r ON r.id = u.id
    WHERE r.id IS NULL OR r.deleted_at IS NOT NULL OR r.author_contributor_id IS DISTINCT FROM cid OR r.status IS DISTINCT FROM 'approved';
  UPDATE public.research_contributions r SET author_contributor_id = NULL
    WHERE r.id = ANY (ids) AND r.deleted_at IS NULL AND r.author_contributor_id = cid AND r.status = 'approved';
  GET DIAGNOSTICS reverted = ROW_COUNT;
  RAISE NOTICE 'B1-yaniv-levi-rollback: reverted %, skipped (changed after B1) %', reverted, skipped;
  IF reverted + skipped <> 1 THEN RAISE EXCEPTION 'rollback accounting mismatch'; END IF;
END $$;
COMMIT;
