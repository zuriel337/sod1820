-- D4 · שיוך נכון מלכתחילה לקליטה עתידית (טריגר). *** טיוטה לאישור מדויק. לא הוחלה. תלוי ב-D0. ***
-- כלל יחיד: rc_unique_contributor_for_user_v1 (התורם הפעיל, הלא ממוזג והיחיד של המשתמש): אותו כלל של A1 ושל add_contribution לאחר D5. אין שיוך לפי שם. שם בלבד נשאר ריק.
-- השפעות עקיפות שנבדקו (קריאה בלבד): (1) trg_00_zvi_standing_approve: מאשר pending/hidden רק לתורם c66f0464 או למשתמש 24be4fb3; ה-user_id של התורם הזה הוא בדיוק 24be4fb3,
--   כך שהשיוך החדש אינו יוצר אף התאמה חדשה, והטריגר ממילא התאים לפי המשתמש; D4 רץ לפניו (שם הטריגר ממוין לפניו) ואינו נוגע ב-status.
--   (2) notify_on_contribution: קובע את בעל ההורה לפי author_user_id ורק אם חסר, לפי author_contributor_id; D4 נוגע רק בשורות שיש בהן author_user_id, ולכן אין שינוי בהתראות.
--   (3) trg_community_thread_bump, rc_normalize_author_name והגנת המדיה: לא קוראים author_contributor_id.
CREATE OR REPLACE FUNCTION public.rc_resolve_author_contributor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cid uuid;
BEGIN
  IF NEW.author_contributor_id IS NULL AND NEW.author_user_id IS NOT NULL THEN
    SELECT u.id INTO v_cid FROM public.rc_unique_contributor_for_user_v1(NEW.author_user_id) u;
    IF v_cid IS NOT NULL THEN NEW.author_contributor_id := v_cid; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_00_rc_resolve_author_contributor ON public.research_contributions;
CREATE TRIGGER trg_00_rc_resolve_author_contributor BEFORE INSERT ON public.research_contributions
  FOR EACH ROW EXECUTE FUNCTION public.rc_resolve_author_contributor();
REVOKE ALL ON FUNCTION public.rc_resolve_author_contributor() FROM public, anon, authenticated;   -- פונקציית טריגר: אין הרשאת קריאה ישירה
