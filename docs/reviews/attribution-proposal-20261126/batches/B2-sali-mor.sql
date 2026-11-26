-- B2-sali-mor · קבוצה 2 (שם ייחודי) · channel_updates.contributor_id · "סלי מור" -> sali-mor.   *** לא הוחל. דורש אימות זהות ואישור מפורש לפעולה ולטביעה 30cf0d808c3fa891a6ada2cb00366608. ***
-- 1 עדכוני ערוץ מפורסמים (channel=main, source=auto, ללא הוכחת קבוצה, ללא רשומות מחקר ציבוריות תלויות). הטביעה: md5(string_agg(id||':'||cid, ',' ORDER BY id)).
-- הטריגרים על channel_updates הם על status/image_url/channel בלבד: contributor_id אינו מפעיל אותם.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE ids uuid[] := ARRAY[
  '4930f105-d6a9-4d7d-9e8e-f16f2a1c333d'
]::uuid[];
  cid uuid; h text; n int; upd int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'sali-mor' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'B2-sali-mor: contributor % not found', 'sali-mor'; END IF;
  IF (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
       AND (lower(btrim(c.display_name)) = lower(btrim('סלי מור')) OR lower(btrim('סלי מור')) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names,'{}')) x))) <> 1
  THEN RAISE EXCEPTION 'B2-sali-mor: the name is no longer unique'; END IF;
  CREATE TEMP TABLE b2_locked ON COMMIT DROP AS
    SELECT cu.id FROM public.channel_updates cu
    WHERE cu.id = ANY (ids) AND cu.status = 'published' AND cu.contributor_id IS NULL
      AND lower(btrim(coalesce(cu.credit, cu.source))) = lower(btrim('סלי מור'))
    FOR UPDATE OF cu;
  SELECT count(*), md5(string_agg(id::text || ':' || cid::text, ',' ORDER BY id)) INTO n, h FROM b2_locked;
  IF n <> 1 OR h <> '30cf0d808c3fa891a6ada2cb00366608' THEN RAISE EXCEPTION 'B2-sali-mor: late change or list differs (n=%, fingerprint=%)', n, h; END IF;
  UPDATE public.channel_updates cu SET contributor_id = cid FROM b2_locked l WHERE cu.id = l.id AND cu.contributor_id IS NULL AND cu.status = 'published';
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd <> 1 THEN RAISE EXCEPTION 'B2-sali-mor: updated % rows, expected 1', upd; END IF;
END $$;
COMMIT;
