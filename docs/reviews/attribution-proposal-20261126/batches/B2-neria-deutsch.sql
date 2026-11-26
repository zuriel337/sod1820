-- B2-neria-deutsch · קבוצה 2 (שם ייחודי) · channel_updates.contributor_id · "נריה דויטש" -> neria-deutsch.   *** לא הוחל. דורש אימות זהות ואישור מפורש לפעולה ולטביעה 09dfdf89ec6baa28511570c2e2928eda. ***
-- 1 עדכוני ערוץ מפורסמים (channel=main, source=auto, ללא הוכחת קבוצה, ללא רשומות מחקר ציבוריות תלויות). הטביעה: md5(string_agg(id||':'||cid, ',' ORDER BY id)).
-- הטריגרים על channel_updates הם על status/image_url/channel בלבד: contributor_id אינו מפעיל אותם.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE ids uuid[] := ARRAY[
  'b21db691-6afc-4729-be02-f9a8700b4dbc'
]::uuid[];
  cid uuid; h text; n int; upd int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'neria-deutsch' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'B2-neria-deutsch: contributor % not found', 'neria-deutsch'; END IF;
  IF (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
       AND (lower(btrim(c.display_name)) = lower(btrim('נריה דויטש')) OR lower(btrim('נריה דויטש')) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names,'{}')) x))) <> 1
  THEN RAISE EXCEPTION 'B2-neria-deutsch: the name is no longer unique'; END IF;
  CREATE TEMP TABLE b2_locked ON COMMIT DROP AS
    SELECT cu.id FROM public.channel_updates cu
    WHERE cu.id = ANY (ids) AND cu.status = 'published' AND cu.contributor_id IS NULL
      AND lower(btrim(coalesce(cu.credit, cu.source))) = lower(btrim('נריה דויטש'))
    FOR UPDATE OF cu;
  SELECT count(*), md5(string_agg(id::text || ':' || cid::text, ',' ORDER BY id)) INTO n, h FROM b2_locked;
  IF n <> 1 OR h <> '09dfdf89ec6baa28511570c2e2928eda' THEN RAISE EXCEPTION 'B2-neria-deutsch: late change or list differs (n=%, fingerprint=%)', n, h; END IF;
  UPDATE public.channel_updates cu SET contributor_id = cid FROM b2_locked l WHERE cu.id = l.id AND cu.contributor_id IS NULL AND cu.status = 'published';
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd <> 1 THEN RAISE EXCEPTION 'B2-neria-deutsch: updated % rows, expected 1', upd; END IF;
END $$;
COMMIT;
