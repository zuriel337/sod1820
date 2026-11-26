-- B1-panzer · קבוצה 2 (שם ייחודי) · research_contributions · "ישראל פנצ׳ר" -> תורם israel-panzer.   *** לא הוחל. דורש אימות זהות ואישור מפורש לפעולה ולטביעה a1ca79475969e6786dbadcc75d7ce1cc. ***
-- 2 שורות, כולן approved. אין להריץ לפי שם: הרשימה מזהה את הרשומות המדויקות. הטביעה: md5(string_agg(id||':'||cid||':'||status, ',' ORDER BY id)).
-- הגנות: טביעה וספירה; נעילת השורות (FOR UPDATE) והתאמה למזהה, סטטוס ושדה ריק; התורם פעיל ולא ממוזג וחד-משמעי לפי שם/כינוי; עדכון רק של שורה ריקה באותו סטטוס; הסטטוס לא משתנה
-- (trg_00_zvi_standing_approve פועל רק על pending/hidden). כל סטייה = RAISE EXCEPTION והכול מתבטל.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE ids uuid[] := ARRAY[
  '20c540cc-82bf-4098-b223-1200492a364e',
  '729af9b9-5562-41f4-9a7a-fc910bc79285'
]::uuid[];
  cid uuid; h text; n int; locked int; upd int; bad int;
BEGIN
  SELECT id INTO cid FROM public.contributors WHERE slug = 'israel-panzer' AND active AND merged_into IS NULL;
  IF cid IS NULL THEN RAISE EXCEPTION 'B1-panzer: contributor % not found', 'israel-panzer'; END IF;
  IF (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
       AND (lower(btrim(c.display_name)) = lower(btrim('ישראל פנצ׳ר')) OR lower(btrim('ישראל פנצ׳ר')) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names,'{}')) x))) <> 1
  THEN RAISE EXCEPTION 'B1-panzer: the name is no longer unique'; END IF;
  CREATE TEMP TABLE b1_locked ON COMMIT DROP AS
    SELECT r.id, r.status AS status_before FROM public.research_contributions r
    WHERE r.id = ANY (ids) AND r.deleted_at IS NULL AND r.author_contributor_id IS NULL AND r.author_user_id IS NULL
      AND r.status = 'approved' AND lower(btrim(r.author_name)) = lower(btrim('ישראל פנצ׳ר'))
    FOR UPDATE OF r;
  SELECT count(*), md5(string_agg(id::text || ':' || cid::text || ':' || status_before, ',' ORDER BY id)) INTO n, h FROM b1_locked;
  IF n <> 2 OR h <> 'a1ca79475969e6786dbadcc75d7ce1cc' THEN RAISE EXCEPTION 'B1-panzer: late change or list differs (n=%, fingerprint=%)', n, h; END IF;
  UPDATE public.research_contributions r SET author_contributor_id = cid
    FROM b1_locked l WHERE r.id = l.id AND r.author_contributor_id IS NULL AND r.status = l.status_before;
  GET DIAGNOSTICS upd = ROW_COUNT;
  IF upd <> 2 THEN RAISE EXCEPTION 'B1-panzer: updated % rows, expected 2', upd; END IF;
  SELECT count(*) INTO bad FROM public.research_contributions r JOIN b1_locked l ON l.id = r.id WHERE r.status IS DISTINCT FROM l.status_before OR r.author_contributor_id IS DISTINCT FROM cid;
  IF bad <> 0 THEN RAISE EXCEPTION 'B1-panzer: % rows differ after update', bad; END IF;
END $$;
COMMIT;
