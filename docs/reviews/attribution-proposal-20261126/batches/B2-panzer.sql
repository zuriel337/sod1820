-- B2-panzer · קבוצה 2 (שם ייחודי) · channel_updates.contributor_id · "ישראל פנצ׳ר" -> israel-panzer.   *** לא הוחל. דורש אימות זהות ואישור מפורש לפעולה ולטביעה b6cf5055bfd4d407cf096cbac292f9cf. ***
-- 2 עדכוני ערוץ מפורסמים (channel=main, source=auto, ללא הוכחת קבוצה, ללא רשומות מחקר ציבוריות תלויות). הטביעה: md5(string_agg(id||':'||cid, ',' ORDER BY id)).
-- הטריגרים על channel_updates הם על status/image_url/channel בלבד: contributor_id אינו מפעיל אותם.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE ids uuid[] := ARRAY[
  '453cacd6-f29c-4552-bf80-1cd1e3c1108d',
  '6b7f4636-f9eb-40f6-b6c8-774a4a919fd9'
]::uuid[];
  cid uuid; h text; n int; upd int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'israel-panzer' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'B2-panzer: contributor % not found', 'israel-panzer'; END IF;
  IF (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
       AND (lower(btrim(c.display_name)) = lower(btrim('ישראל פנצ׳ר')) OR lower(btrim('ישראל פנצ׳ר')) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names,'{}')) x))) <> 1
  THEN RAISE EXCEPTION 'B2-panzer: the name is no longer unique'; END IF;
  CREATE TEMP TABLE b2_locked ON COMMIT DROP AS
    SELECT cu.id FROM public.channel_updates cu
    WHERE cu.id = ANY (ids) AND cu.status = 'published' AND cu.contributor_id IS NULL
      AND lower(btrim(coalesce(cu.credit, cu.source))) = lower(btrim('ישראל פנצ׳ר'))
    FOR UPDATE OF cu;
  SELECT count(*), md5(string_agg(id::text || ':' || cid::text, ',' ORDER BY id)) INTO n, h FROM b2_locked;
  IF n <> 2 OR h <> 'b6cf5055bfd4d407cf096cbac292f9cf' THEN RAISE EXCEPTION 'B2-panzer: late change or list differs (n=%, fingerprint=%)', n, h; END IF;
  UPDATE public.channel_updates cu SET contributor_id = cid FROM b2_locked l WHERE cu.id = l.id AND cu.contributor_id IS NULL AND cu.status = 'published';
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd <> 2 THEN RAISE EXCEPTION 'B2-panzer: updated % rows, expected 2', upd; END IF;
END $$;
COMMIT;
