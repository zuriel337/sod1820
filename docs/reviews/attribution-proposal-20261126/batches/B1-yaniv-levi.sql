-- B1-yaniv-levi · קבוצה 2 (שם ייחודי) · research_contributions · "יניב לוי" -> תורם yaniv-levi.   *** לא הוחל. דורש אימות זהות ואישור מפורש לפעולה ולטביעה 76d603f833b73801fd45cf6bb084d893. ***
-- 1 שורות, כולן approved. אין להריץ לפי שם: הרשימה מזהה את הרשומות המדויקות. הטביעה: md5(string_agg(id||':'||cid||':'||status, ',' ORDER BY id)).
-- הגנות: טביעה וספירה; נעילת השורות (FOR UPDATE) והתאמה למזהה, סטטוס ושדה ריק; התורם פעיל ולא ממוזג וחד-משמעי לפי שם/כינוי; עדכון רק של שורה ריקה באותו סטטוס; הסטטוס לא משתנה
-- (trg_00_zvi_standing_approve פועל רק על pending/hidden). כל סטייה = RAISE EXCEPTION והכול מתבטל.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE ids uuid[] := ARRAY[
  'ddf80a25-1268-427b-84c6-e68f2dfde0fe'
]::uuid[];
  cid uuid; h text; n int; locked int; upd int; bad int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'yaniv-levi' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'B1-yaniv-levi: contributor % not found', 'yaniv-levi'; END IF;
  IF (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
       AND (lower(btrim(c.display_name)) = lower(btrim('יניב לוי')) OR lower(btrim('יניב לוי')) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names,'{}')) x))) <> 1
  THEN RAISE EXCEPTION 'B1-yaniv-levi: the name is no longer unique'; END IF;
  CREATE TEMP TABLE b1_locked ON COMMIT DROP AS
    SELECT r.id, r.status AS status_before FROM public.research_contributions r
    WHERE r.id = ANY (ids) AND r.deleted_at IS NULL AND r.author_contributor_id IS NULL AND r.author_user_id IS NULL
      AND r.status = 'approved' AND lower(btrim(r.author_name)) = lower(btrim('יניב לוי'))
    FOR UPDATE OF r;
  SELECT count(*), md5(string_agg(id::text || ':' || cid::text || ':' || status_before, ',' ORDER BY id)) INTO n, h FROM b1_locked;
  IF n <> 1 OR h <> '76d603f833b73801fd45cf6bb084d893' THEN RAISE EXCEPTION 'B1-yaniv-levi: late change or list differs (n=%, fingerprint=%)', n, h; END IF;
  UPDATE public.research_contributions r SET author_contributor_id = cid
    FROM b1_locked l WHERE r.id = l.id AND r.author_contributor_id IS NULL AND r.status = l.status_before;
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd <> 1 THEN RAISE EXCEPTION 'B1-yaniv-levi: updated % rows, expected 1', upd; END IF;
  SELECT count(*) INTO bad FROM public.research_contributions r JOIN b1_locked l ON l.id = r.id WHERE r.status IS DISTINCT FROM l.status_before OR r.author_contributor_id IS DISTINCT FROM cid;
  IF bad <> 0 THEN RAISE EXCEPTION 'B1-yaniv-levi: % rows differ after update', bad; END IF;
END $$;
COMMIT;
