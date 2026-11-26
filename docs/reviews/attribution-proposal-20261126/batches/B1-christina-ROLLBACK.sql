-- B1-christina-ROLLBACK · החזרה בטוחה.   *** לא הוחל. ***
-- מחזיר ל-NULL רק שורה שעדיין מכילה בדיוק את התורם שB1 כתבה ובאותו סטטוס. שורה ששונתה מאז מדולגת ומדווחת, ואינה נדרסת.
BEGIN;
DO $$
DECLARE ids uuid[] := ARRAY[
  '0120315b-c056-4e35-878a-033fc16f412e',
  '05c3f127-206d-426e-8bb5-d7fa269a84ba',
  '0a6efdaf-c1bd-46c4-acf9-a5f7e0a1b893',
  '0bb89ce3-b30f-4773-b9af-4e40e35f3cb4',
  '0f745bd2-9e82-4587-b7f8-9b96be7abbb9',
  '16cd1cec-3a21-49a9-bf61-6e85a4323391',
  '1db35aca-e8a7-4914-b167-2b3dac86394f',
  '1fead7ea-4054-42d8-8a31-034933fb2da1',
  '229e223b-e998-43f5-b2ad-6f0f8068dc79',
  '22f20c0e-bb97-401c-a453-521504d45ffc',
  '2b868e29-7071-4b8a-888d-7d74d50c4398',
  '2cfabeb1-3538-448f-b8ee-a228a053ea83',
  '3565a011-23c0-4a41-85e3-2d5b6e5deb4d',
  '3f12b06a-6b0a-4c95-a014-67ec48b3fc9f',
  '40817a9f-b9cb-4052-af03-2bb5d593c848',
  '44fe1f6e-339a-49ed-9d5d-3cb007acf3ce',
  '4de8bde1-69ca-4153-a19b-c610b922cb59',
  '4ee7c777-6a40-4854-9bbe-d496cf6135d0',
  '50cbce7e-d69e-45a4-88db-25d139e9e724',
  '51d4f75f-0b0b-442e-9613-17e268cac44e',
  '548e4403-9f9c-404b-a93f-b3caf58956ba',
  '54917418-3a1e-4409-896a-2da566d0e98d',
  '5a453217-9d8b-4509-85c9-57a74bab381a',
  '5ce445ca-367e-404e-9734-169c2c156848',
  '5ce8cd15-a42d-438e-953a-4c3d9122e9c8',
  '61a18437-44ca-4368-84f2-c3dfee62c16e',
  '6620fcba-84d7-44f7-8d61-03fdfea4b326',
  '688a08ec-08c7-47a1-8764-7fa7b4d61eb8',
  '69d62204-6147-43af-b7d2-bc732ddcd5cb',
  '6af27332-a5d4-48e2-be70-ea330f61d6ed',
  '75b8c284-9a5e-47ee-8321-68d76017f773',
  '75c3edde-d5d4-4995-9a2a-db5c0b828077',
  '78f4e2d9-3916-44fa-b687-08b8ae4fc3c7',
  '82dc497d-a1a2-4e54-92a6-84c79b11c01a',
  '867cd0af-9fa4-42fc-bfb6-b280ccd1b2ea',
  '8b13a114-8fb9-4417-ae59-a05d6431343b',
  '9d17c397-4254-4ed6-af54-78d6cddc034e',
  'a19fba66-ba22-4fa7-be52-4ed957498da5',
  'abd180ab-f811-4b0e-b9ab-3419e02bcd30',
  'abebfbba-e40a-4260-ba27-8f94681c6cf1',
  'b2e9c239-8860-4d2a-9e2f-c27e9cded3a1',
  'b5a485bd-bb86-49a6-8e14-13698b54cae5',
  'b601774e-0a60-42ca-9b93-e80678ceb326',
  'b877f2b1-2d31-4f12-9150-fc25d32047e3',
  'ba0e38b6-7f60-45b6-9f2a-01a1d8d06cda',
  'c8fe10b1-24ae-44e0-968b-6ebd900f07a8',
  'd4964257-8a65-40c0-9107-bf272f7d81a4',
  'd61348d0-1c68-4220-8c93-d9c72514eb25',
  'da3dfd70-85ba-43a4-9117-cd416a1da951',
  'dce75fb6-2b43-4411-a3d1-1f8db295977b',
  'ea65c9c6-33e7-4bff-b2eb-ee378527219b',
  'ec39d344-ed9b-41be-8f7a-44edc82b1fdc',
  'ed4ae598-4ce4-4d9b-b2c1-2f01c9b804d7',
  'f0f427ec-d50b-490b-b77c-364d4b5887df',
  'f1c2061d-a224-4f06-b743-e9f3b96d1676',
  'f62b0b9f-2cb2-4301-9cb6-70ba4361dbb1',
  'f69ec968-ad4d-4278-8da4-016042800b29',
  'f734e2c5-ed19-46ea-afff-b91d22b654f6',
  'fa30ff20-38c9-42e5-9b41-f991ef4f21e7',
  'fb1b2e00-cd52-4280-a9d1-6256be3b95e1'
]::uuid[];
  cid uuid; reverted int; skipped int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'christina' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'rollback: contributor not found'; END IF;
  SELECT count(*) INTO skipped FROM unnest(ids) u(id) LEFT JOIN public.research_contributions r ON r.id = u.id
    WHERE r.id IS NULL OR r.deleted_at IS NOT NULL OR r.author_contributor_id IS DISTINCT FROM cid OR r.status IS DISTINCT FROM 'published';
  UPDATE public.research_contributions r SET author_contributor_id = NULL
    WHERE r.id = ANY (ids) AND r.deleted_at IS NULL AND r.author_contributor_id = cid AND r.status = 'published';
  GET DIAGNOSTICS reverted = ROW_COUNT;
  RAISE NOTICE 'B1-christina-rollback: reverted %, skipped (changed after B1) %', reverted, skipped;
  IF reverted + skipped <> 60 THEN RAISE EXCEPTION 'rollback accounting mismatch'; END IF;
END $$;
COMMIT;
