-- D4 · שיוך נכון מלכתחילה לקליטת תרומות עתידיות. *** טיוטה לאישור מדויק. לא הוחלה. ***
-- הבעיה: מסלולי קליטה שאינם add_contribution (ייבוא, קבוצות, מערכת) יצרו שורות עם author_user_id בלי author_contributor_id (207 שורות לפני A1).
-- התיקון הוא אותו כלל מוכח של A1 ברגע ההכנסה: אם יש משתמש ואין תורם, והמשתמש שייך לתורם פעיל וחד-משמעי אחד: מקשרים. אין שיוך לפי שם.
-- שם בלבד/עמום/בלי זהות נשאר ריק ונראה בדוח הסקירה (D5, ראו README), ולא נכתב אוטומטית.
-- סדר: trg_00_rc_resolve... רץ לפני trg_00_zvi_standing_approve... (לפי סדר אלפביתי), כך שהטריגר הקיים רואה את השיוך. הוא לא משנה סטטוס.
CREATE OR REPLACE FUNCTION public.rc_resolve_author_contributor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cid uuid; v_n int;
BEGIN
  IF NEW.author_contributor_id IS NULL AND NEW.author_user_id IS NOT NULL THEN
    SELECT count(*), (array_agg(c.id))[1] INTO v_n, v_cid FROM public.contributors c WHERE c.user_id = NEW.author_user_id AND c.active AND c.merged_into IS NULL;
    IF v_n = 1 THEN NEW.author_contributor_id := v_cid; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_00_rc_resolve_author_contributor ON public.research_contributions;
CREATE TRIGGER trg_00_rc_resolve_author_contributor BEFORE INSERT ON public.research_contributions
  FOR EACH ROW EXECUTE FUNCTION public.rc_resolve_author_contributor();
-- הערה: add_contribution משתמש ב-"limit 1" על contributors לפי user_id בלי סינון פעיל/ממוזג. תיקון עתידי: להשתמש באותו כלל חד-משמעי (באישור נפרד).
