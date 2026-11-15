-- Align publication conventions and document 37 with the corrected authorship decision.
BEGIN;

DO $writer_attribution$
DECLARE
  item record;
  stored_hash text;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    (4, 'publishing_conventions', '62fc7eee6c9631999f920efae960e00b', 'd9cd0e30c0c629b2f04f87714f8a58df', $auth4$## שיוך הודעה מיובאת לכותב שלה · 13.11.2026
הוראה זו מחליפה את סעיף השיוך לחשבון המפרסם ב״זהות פרסום ושיחה מיובאת״. כל הודעה, כולל הודעת הפתיחה, מופיעה בקהילה בשם הכותב שלה ונקשרת לזהות הכותב הקיימת כדי שתופיע גם בדף הכתב. פעולת ייבוא או עריכה מערכתית אינה משנה את זהות הכותב. הודעות בעל האתר בלבד מופיעות בשם התצוגה sod1820. השם האישי וכתובת הכניסה נשארים פרטיים.
כאשר אין התאמה מאומתת לדף כתב קיים, ההודעה ממתינה לשיוך. קרדיט טקסטואלי, תגית או שם דומה אינם קישור לזהות. דף חדש נפתח רק לאחר בדיקת הזהות והכרעת הבעלים. כללי החשיפה של ״פרטי הודעה״ ממשיכים לחול.$auth4$),
    (37, 'sod1820_reality_stream_os_master_v3_20261016_draft', '952914e83a177151eb7031c115d2262e', '925968e5e8dc31be9d1036f4ca2fe3fb', $auth37$## הגילוי היומי · דפי הכותבים בשיחה המשותפת · 13.11.2026
הוראה זו מחליפה את שיוך שורש השיחה לפרופיל sod1820 בסעיף ״הגילוי היומי · שיחה מקושרת לקהילה ול׳עכשיו׳״. הודעת הפתיחה של ציון סיבוני משויכת לדף של ציון. כל תגובה משויכת לדף הכותב שלה. sod1820 משמש רק להודעות שכתב בעל הפרופיל. אותו מזהה הודעה משמש בשיחה ובדף הכותב. הפריט היחיד ב״עכשיו״ מקשר לשיחה. הסט הראשוני נשאר מוגבל ל־12.11.2026 לפי שעון ישראל.$auth37$)
  ) AS plan(id, slug, before_hash, after_hash, delta)
  ORDER BY id
  LOOP
    SELECT md5(body) INTO stored_hash FROM public.project_codex
      WHERE id = item.id AND slug = item.slug FOR UPDATE;
    IF stored_hash = item.after_hash OR (item.id = 37 AND stored_hash = '54fdc5c06b12bbe933c958f172f4b833') THEN
      CONTINUE;
    END IF;
    IF stored_hash IS DISTINCT FROM item.before_hash THEN
      RAISE EXCEPTION 'Contract % changed since review', item.id;
    END IF;
    UPDATE public.project_codex SET body = body || E'\n\n' || item.delta || E'\n', updated_at = now()
      WHERE id = item.id AND slug = item.slug AND md5(body || E'\n\n' || item.delta || E'\n') = item.after_hash;
    IF NOT FOUND THEN RAISE EXCEPTION 'Contract % candidate hash mismatch', item.id; END IF;
  END LOOP;
END
$writer_attribution$;

SELECT id, md5(body) AS body_hash FROM public.project_codex WHERE id IN (4, 37) ORDER BY id;
COMMIT;
