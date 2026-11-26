-- B2-zion-siboni · קבוצה 2 (שם ייחודי) · channel_updates.contributor_id · "ציון סיבוני" -> zion-siboni.   *** לא הוחל. דורש אימות זהות ואישור מפורש לפעולה ולטביעה 29a51d70c0d20433d0390b068198f56b. ***
-- 5 עדכוני ערוץ מפורסמים (channel=main, source=auto, ללא הוכחת קבוצה, ללא רשומות מחקר ציבוריות תלויות). הטביעה: md5(string_agg(id||':'||cid, ',' ORDER BY id)).
-- הטריגרים על channel_updates הם על status/image_url/channel בלבד: contributor_id אינו מפעיל אותם.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE ids uuid[] := ARRAY[
  '36c5d5e9-7dd7-4943-9261-d243e4440f93',
  '382a6708-85e9-41f0-8969-3bcf60cef833',
  '70959319-d5c7-450d-a258-b0af4e316c43',
  '786eec01-f67c-48fe-9fbe-09f58d812f40',
  'c8e29fba-6894-44e5-ba0d-fcdf2b16c949'
]::uuid[];
  cid uuid; h text; n int; upd int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'zion-siboni' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'B2-zion-siboni: contributor % not found', 'zion-siboni'; END IF;
  IF (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
       AND (lower(btrim(c.display_name)) = lower(btrim('ציון סיבוני')) OR lower(btrim('ציון סיבוני')) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names,'{}')) x))) <> 1
  THEN RAISE EXCEPTION 'B2-zion-siboni: the name is no longer unique'; END IF;
  CREATE TEMP TABLE b2_locked ON COMMIT DROP AS
    SELECT cu.id FROM public.channel_updates cu
    WHERE cu.id = ANY (ids) AND cu.status = 'published' AND cu.contributor_id IS NULL
      AND lower(btrim(coalesce(cu.credit, cu.source))) = lower(btrim('ציון סיבוני'))
    FOR UPDATE OF cu;
  SELECT count(*), md5(string_agg(id::text || ':' || cid::text, ',' ORDER BY id)) INTO n, h FROM b2_locked;
  IF n <> 5 OR h <> '29a51d70c0d20433d0390b068198f56b' THEN RAISE EXCEPTION 'B2-zion-siboni: late change or list differs (n=%, fingerprint=%)', n, h; END IF;
  UPDATE public.channel_updates cu SET contributor_id = cid FROM b2_locked l WHERE cu.id = l.id AND cu.contributor_id IS NULL AND cu.status = 'published';
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd <> 5 THEN RAISE EXCEPTION 'B2-zion-siboni: updated % rows, expected 5', upd; END IF;
END $$;
COMMIT;
