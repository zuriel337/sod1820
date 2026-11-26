-- B2-yaniv-levi · קבוצה 2 (שם ייחודי) · channel_updates.contributor_id · "יניב לוי" -> yaniv-levi.   *** לא הוחל. דורש אימות זהות ואישור מפורש לפעולה ולטביעה 73e793db1ac107fb6c11123237883904. ***
-- 1 עדכוני ערוץ מפורסמים (channel=main, source=auto, ללא הוכחת קבוצה, ללא רשומות מחקר ציבוריות תלויות). הטביעה: md5(string_agg(id||':'||cid, ',' ORDER BY id)).
-- הטריגרים על channel_updates הם על status/image_url/channel בלבד: contributor_id אינו מפעיל אותם.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE ids uuid[] := ARRAY[
  '0e24ef92-af08-421c-a6a2-54b6a7ad6018'
]::uuid[];
  cid uuid; h text; n int; upd int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'yaniv-levi' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'B2-yaniv-levi: contributor % not found', 'yaniv-levi'; END IF;
  IF (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
       AND (lower(btrim(c.display_name)) = lower(btrim('יניב לוי')) OR lower(btrim('יניב לוי')) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names,'{}')) x))) <> 1
  THEN RAISE EXCEPTION 'B2-yaniv-levi: the name is no longer unique'; END IF;
  CREATE TEMP TABLE b2_locked ON COMMIT DROP AS
    SELECT cu.id FROM public.channel_updates cu
    WHERE cu.id = ANY (ids) AND cu.status = 'published' AND cu.contributor_id IS NULL
      AND lower(btrim(coalesce(cu.credit, cu.source))) = lower(btrim('יניב לוי'))
    FOR UPDATE OF cu;
  SELECT count(*), md5(string_agg(id::text || ':' || cid::text, ',' ORDER BY id)) INTO n, h FROM b2_locked;
  IF n <> 1 OR h <> '73e793db1ac107fb6c11123237883904' THEN RAISE EXCEPTION 'B2-yaniv-levi: late change or list differs (n=%, fingerprint=%)', n, h; END IF;
  UPDATE public.channel_updates cu SET contributor_id = cid FROM b2_locked l WHERE cu.id = l.id AND cu.contributor_id IS NULL AND cu.status = 'published';
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd <> 1 THEN RAISE EXCEPTION 'B2-yaniv-levi: updated % rows, expected 1', upd; END IF;
END $$;
COMMIT;
