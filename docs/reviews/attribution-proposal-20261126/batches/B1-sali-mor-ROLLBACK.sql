-- B1-sali-mor-ROLLBACK · החזרה בטוחה.   *** לא הוחל. ***
-- מחזיר ל-NULL רק שורה שעדיין מכילה בדיוק את התורם שB1 כתבה ובאותו סטטוס. שורה ששונתה מאז מדולגת ומדווחת, ואינה נדרסת.
BEGIN;
DO $$
DECLARE ids uuid[] := ARRAY[
  '0fe41158-5607-498f-a648-cdfc96facaaf',
  '1ca902c3-604a-40d4-87df-acb2fc913976',
  '230ad20e-b71d-438a-a64c-8ed51fdec43f',
  '262c71f7-6eb9-4526-97da-fb58b5349378',
  '6371c59e-76d8-45d9-82ed-97eb4e6a05d6',
  '676876c5-3159-4d07-8714-0629ee803d82',
  '6b10ad5b-b6d1-4f0a-8fd7-c39542fcd63a',
  '75b16da3-825c-44a8-bc26-8e4a3cee62c7',
  '81c7f8a1-226d-4032-90f9-5a3d7c4f11a6',
  '94a2732b-5183-4f7e-b2dd-2d8f47fcd6a3',
  'b4f211a2-f548-4271-a3ec-8f34eebd65b9',
  'bc485f55-6e45-4479-b8a7-ea9c5f8f3165',
  'bceaf074-ccad-4fee-b4d0-6c8b6d8e2930',
  'c93f2858-77d6-47b1-b0ef-6fd846779ac6',
  'd000b1da-a63b-4bcc-8dcd-484027b8a55e',
  'f9c3e189-68a8-4ab3-bcc9-e060537cf75d',
  'fe1f5151-7a4b-4bc0-ad35-6442d64758ad'
]::uuid[];
  cid uuid; reverted int; skipped int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'sali-mor' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'rollback: contributor not found'; END IF;
  SELECT count(*) INTO skipped FROM unnest(ids) u(id) LEFT JOIN public.research_contributions r ON r.id = u.id
    WHERE r.id IS NULL OR r.deleted_at IS NOT NULL OR r.author_contributor_id IS DISTINCT FROM cid OR r.status IS DISTINCT FROM 'published';
  UPDATE public.research_contributions r SET author_contributor_id = NULL
    WHERE r.id = ANY (ids) AND r.deleted_at IS NULL AND r.author_contributor_id = cid AND r.status = 'published';
  GET DIAGNOSTICS reverted = ROW_COUNT;
  RAISE NOTICE 'B1-sali-mor-rollback: reverted %, skipped (changed after B1) %', reverted, skipped;
  IF reverted + skipped <> 17 THEN RAISE EXCEPTION 'rollback accounting mismatch'; END IF;
END $$;
COMMIT;
