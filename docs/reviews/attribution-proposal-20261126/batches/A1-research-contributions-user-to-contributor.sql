-- A1 · קבוצה 1 (שיוך מוכח) · research_contributions: משתמש -> תורם.   *** לא הוחל. דורש אישור מפורש של ZURIEL. ***
-- ראיה: author_user_id == contributors.user_id, כאשר לאותו משתמש תורם פעיל אחד בלבד (ללא מיזוג). לא לפי שם.
-- רק שורות approved/published: הסטטוס אינו משתנה, ולכן trg_00_zvi_standing_approve_research_contribution אינו משנה דבר.
-- ספירה צפויה: 177. נכשל (ומתבטל) אם הספירה שונה, או אם סטטוס כלשהו השתנה.
BEGIN;
CREATE TEMP TABLE a1 ON COMMIT DROP AS
SELECT r.id, c.id AS cid, r.status AS status_before
FROM public.research_contributions r
JOIN public.contributors c ON c.user_id = r.author_user_id AND c.active AND c.merged_into IS NULL
WHERE r.deleted_at IS NULL AND r.status IN ('approved','published') AND r.author_contributor_id IS NULL
  AND (SELECT count(*) FROM public.contributors c2 WHERE c2.user_id = r.author_user_id AND c2.active AND c2.merged_into IS NULL) = 1;
DO $$ BEGIN IF (SELECT count(*) FROM a1) <> 177 THEN RAISE EXCEPTION 'A1: unexpected row count %', (SELECT count(*) FROM a1); END IF; END $$;
CREATE TEMP TABLE a1_log ON COMMIT DROP AS SELECT id, cid FROM a1;
UPDATE public.research_contributions r SET author_contributor_id = a1.cid FROM a1 WHERE r.id = a1.id AND r.author_contributor_id IS NULL;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.research_contributions r JOIN a1 ON a1.id = r.id WHERE r.status IS DISTINCT FROM a1.status_before) <> 0 THEN RAISE EXCEPTION 'A1: a status changed'; END IF;
  IF (SELECT count(*) FROM public.research_contributions r JOIN a1 ON a1.id = r.id WHERE r.author_contributor_id = a1.cid) <> 177 THEN RAISE EXCEPTION 'A1: not all rows updated'; END IF;
END $$;
SELECT id, cid FROM a1_log ORDER BY id;   -- שמור את הרשימה לצורך החזרה (rollback)
COMMIT;
-- החזרה (rollback), לאחר שמירת הרשימה:  UPDATE public.research_contributions SET author_contributor_id = NULL WHERE id = ANY (<ids שנשמרו>) AND author_user_id IS NOT NULL;
