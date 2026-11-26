-- B1 · קבוצה 2 (שם ייחודי, דורש אימות זהות לפני הרצה) · research_contributions.   *** לא הוחל. ***
-- אין להריץ לפי שם בלבד: כל בלוק מאושר בנפרד, אחרי שZURIEL אימת שהשם הוא אותו אדם.
-- ספירות צפויות: כריסטינה 60 · סלי מור 17 · ישראל פנצ׳ר 2 · יניב לוי 1. כל בלוק נכשל אם הספירה שונה או אם סטטוס השתנה.
-- הסטטוס מוגבל ל-approved/published, ולכן טריגר האישור הקבוע אינו פעיל על השורות.
-- תבנית (לכל בלוק מחליפים name/slug/count):
BEGIN;
CREATE TEMP TABLE b1 ON COMMIT DROP AS
SELECT r.id, (SELECT id FROM public.contributors WHERE slug = 'sali-mor' AND active AND merged_into IS NULL) AS cid, r.status AS status_before
FROM public.research_contributions r
WHERE r.deleted_at IS NULL AND r.status IN ('approved','published')
  AND r.author_contributor_id IS NULL AND r.author_user_id IS NULL
  AND lower(btrim(r.author_name)) = lower(btrim('סלי מור'))
  AND (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
         AND (lower(btrim(c.display_name)) = lower(btrim('סלי מור')) OR lower(btrim('סלי מור')) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names,'{}')) x))) = 1;
DO $$ BEGIN IF (SELECT count(*) FROM b1) <> 17 THEN RAISE EXCEPTION 'B1: unexpected row count %', (SELECT count(*) FROM b1); END IF;
            IF (SELECT count(*) FROM b1 WHERE cid IS NULL) <> 0 THEN RAISE EXCEPTION 'B1: contributor not found'; END IF; END $$;
CREATE TEMP TABLE b1_log ON COMMIT DROP AS SELECT id, cid FROM b1;
UPDATE public.research_contributions r SET author_contributor_id = b1.cid FROM b1 WHERE r.id = b1.id AND r.author_contributor_id IS NULL;
DO $$ BEGIN IF (SELECT count(*) FROM public.research_contributions r JOIN b1 ON b1.id = r.id WHERE r.status IS DISTINCT FROM b1.status_before) <> 0 THEN RAISE EXCEPTION 'B1: a status changed'; END IF; END $$;
SELECT id, cid FROM b1_log ORDER BY id;   -- שמור לצורך החזרה
COMMIT;
-- בלוקים נוספים: ('כריסטינה','christina',60) · ('ישראל פנצ׳ר','israel-panzer',2) · ('יניב לוי','yaniv-levi',1).
-- הערה: "ישראל פנצ'ר" עם גרש ASCII (2 שורות מקור forum) אינו תואם אוטומטית, והוא מועמד לכינוי (wa_names) בהחלטת ZURIEL.
