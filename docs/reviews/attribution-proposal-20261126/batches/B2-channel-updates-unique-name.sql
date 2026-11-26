-- B2 · קבוצה 2 (שם ייחודי, דורש אימות) · channel_updates.contributor_id לעדכונים מפורסמים.   *** לא הוחל. ***
-- ספירות צפויות: ציון סיבוני 5 · ישראל פנצ׳ר 2 · יניב לוי 1 · נריה דויטש 1 · סלי מור 1.
-- "בדרך לנצח" (34) אינו כלול: נראה כשם ערוץ, לא כאדם. ההכרעה אצל ZURIEL.
-- הטריגרים על channel_updates הם על status/image_url/channel בלבד; contributor_id אינו מפעיל אותם.
-- שים לב: עדכון זה משנה שיוך של רשומות מחקר ציבוריות שמקורן בעדכון (world_contributor_research_v2), ולכן כל שם מאושר בנפרד.
BEGIN;
CREATE TEMP TABLE b2 ON COMMIT DROP AS
SELECT cu.id, (SELECT id FROM public.contributors WHERE slug = 'zion-siboni' AND active AND merged_into IS NULL) AS cid
FROM public.channel_updates cu
WHERE cu.status = 'published' AND cu.contributor_id IS NULL
  AND lower(btrim(coalesce(cu.credit, cu.source))) = lower(btrim('ציון סיבוני'))
  AND (SELECT count(*) FROM public.contributors c WHERE c.active AND c.merged_into IS NULL
         AND (lower(btrim(c.display_name)) = lower(btrim('ציון סיבוני')) OR lower(btrim('ציון סיבוני')) = ANY (SELECT lower(btrim(x)) FROM unnest(coalesce(c.wa_names,'{}')) x))) = 1;
DO $$ BEGIN IF (SELECT count(*) FROM b2) <> 5 THEN RAISE EXCEPTION 'B2: unexpected row count %', (SELECT count(*) FROM b2); END IF;
            IF (SELECT count(*) FROM b2 WHERE cid IS NULL) <> 0 THEN RAISE EXCEPTION 'B2: contributor not found'; END IF; END $$;
CREATE TEMP TABLE b2_log ON COMMIT DROP AS SELECT id, cid FROM b2;
UPDATE public.channel_updates cu SET contributor_id = b2.cid FROM b2 WHERE cu.id = b2.id AND cu.contributor_id IS NULL;
SELECT id, cid FROM b2_log ORDER BY id;   -- שמור לצורך החזרה: UPDATE public.channel_updates SET contributor_id = NULL WHERE id = ANY (<ids>);
COMMIT;
-- בלוקים נוספים: ('ישראל פנצ׳ר','israel-panzer',2) · ('יניב לוי','yaniv-levi',1) · ('נריה דויטש','neria-deutsch',1) · ('סלי מור','sali-mor',1).
