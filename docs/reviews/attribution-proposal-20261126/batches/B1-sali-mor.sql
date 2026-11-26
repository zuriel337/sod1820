-- B1-sali-mor · קבוצה 2 (שם ייחודי) · research_contributions · "סלי מור" -> תורם sali-mor.   *** לא הוחל. דורש אימות זהות ואישור מפורש לפעולה ולטביעה 5fe474a3892968c81f66f88545c73260. ***
-- 17 שורות, כולן published. אין להריץ לפי שם: הרשימה מזהה את הרשומות המדויקות. הטביעה: md5(string_agg(id||':'||cid||':'||status, ',' ORDER BY id)).
-- הגנות: טביעה וספירה; נעילת השורות (FOR UPDATE) והתאמה למזהה, סטטוס ושדה ריק; התורם פעיל ולא ממוזג וחד-משמעי לפי שם/כינוי; עדכון רק של שורה ריקה באותו סטטוס; הסטטוס לא משתנה
-- (trg_00_zvi_standing_approve פועל רק על pending/hidden). כל סטייה = RAISE EXCEPTION והכול מתבטל.
BEGIN;
SET LOCAL lock_timeout = '5s';
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
  cid uuid; h text; n int; locked int; upd int; bad int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'sali-mor' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'B1-sali-mor: contributor % not found', 'sali-mor'; END IF;
  IF (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
       AND (lower(btrim(c.display_name)) = lower(btrim('סלי מור')) OR lower(btrim('סלי מור')) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names,'{}')) x))) <> 1
  THEN RAISE EXCEPTION 'B1-sali-mor: the name is no longer unique'; END IF;
  CREATE TEMP TABLE b1_locked ON COMMIT DROP AS
    SELECT r.id, r.status AS status_before FROM public.research_contributions r
    WHERE r.id = ANY (ids) AND r.deleted_at IS NULL AND r.author_contributor_id IS NULL AND r.author_user_id IS NULL
      AND r.status = 'published' AND lower(btrim(r.author_name)) = lower(btrim('סלי מור'))
    FOR UPDATE OF r;
  SELECT count(*), md5(string_agg(id::text || ':' || cid::text || ':' || status_before, ',' ORDER BY id)) INTO n, h FROM b1_locked;
  IF n <> 17 OR h <> '5fe474a3892968c81f66f88545c73260' THEN RAISE EXCEPTION 'B1-sali-mor: late change or list differs (n=%, fingerprint=%)', n, h; END IF;
  UPDATE public.research_contributions r SET author_contributor_id = cid
    FROM b1_locked l WHERE r.id = l.id AND r.author_contributor_id IS NULL AND r.status = l.status_before;
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd <> 17 THEN RAISE EXCEPTION 'B1-sali-mor: updated % rows, expected 17', upd; END IF;
  SELECT count(*) INTO bad FROM public.research_contributions r JOIN b1_locked l ON l.id = r.id WHERE r.status IS DISTINCT FROM l.status_before OR r.author_contributor_id IS DISTINCT FROM cid;
  IF bad <> 0 THEN RAISE EXCEPTION 'B1-sali-mor: % rows differ after update', bad; END IF;
END $$;
COMMIT;
