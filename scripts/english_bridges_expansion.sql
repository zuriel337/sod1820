-- ============================================================================
-- גשרי-שפה אמיתיים (language_links) — כמו secret=סוד — 2026-07-11
-- ----------------------------------------------------------------------------
-- רקע: ניסיון קודם הוסיף 65 *תעתוקים* פונטיים ל-word_aliases (dream→דרים) —
-- שכבה שטוחה: זורקים את המילה האנגלית, כותבים את הצליל בעברית, מחשבים גימטריה
-- עברית על ההגייה. צוריאל דחה — זה לא מה שהוא בונה. **הוחזר/נמחק במלואו.**
--
-- מה שצוריאל בונה = «גשר»: הערך של המילה האנגלית *בשיטת-גימטריה אנגלית* שווה
-- לערך *העברי (רגיל)* של **התרגום** שלה — והמשמעות נשמרת. נעילה משולשת:
-- משמעות + ערך-אנגלי + ערך-עברי. דוגמאות מאושרות של צוריאל:
--   secret (English Ordinal 70) = סוד (רגיל 70)
--   glory  (Full Reduction  32) = כבוד (רגיל 32)
--   priest (Reverse Ordinal 75) = כהן  (רגיל 75)
--
-- הכלי: fn direct_bridge_scan(jsonb) — מקבל זוגות {en, he-translation}, מחשב 4
-- שיטות אנגליות (Ordinal / Full-Reduction / Reverse-Ordinal / Reverse-Reduction)
-- ומחזיר רק היכן שאחת מהן = fn_ragil(he). אלה גשרים נדירים: ~1 לכל ~280 זוגות.
--
-- סרקנו ~1,160 זוגות-תרגום מדויקים → 4 נעילות נקיות חדשות. נכנסות כ-status='pending'
-- (human_verified=false) → מופיעות בפאנל האדמין «🌉 גשרים לאישור».
-- **אישור ידני בלבד** דרך admin_verify_bridge(id,'verify'). לא מאשרים אוטומטית.
-- ============================================================================

-- דוגמת-הרצה של הסורק (read-only) — כך מוצאים עוד:
-- select * from direct_bridge_scan('[{"en":"slave","he":"עבד"}, ...]'::jsonb);

-- 3 הגשרים שנמצאו (נכנסים כ«ממתין לאישור»):
insert into language_links
  (hebrew, foreign_word, lang, relationship_type, method, gematria_he, evidence_level, status, human_verified, created_by_name, note)
values
('עבד','slave','en','shared_value','Reverse Ordinal',76,'strong','pending',false,'מנוע · סריקת גשרים',
 'slave ב-Reverse Ordinal (a=26…z=1) = 76 · עבד ברגיל = 76 · עבד = התרגום של slave. תרגום + ערך משותף, אומת במנוע. שיטה חזקה (כמו priest=כהן=75). רמז (מופרד): מעבדות לחירות.'),
('טוב','good','en','shared_value','Reverse Reduction',17,'medium','pending',false,'מנוע · סריקת גשרים',
 'good ב-Reverse Reduction = 17 · טוב ברגיל = 17 · טוב = התרגום של good. שיטה רביעית (פחות קנונית) → evidence=medium.'),
('הבטחה','promise','en','shared_value','Reverse Reduction',29,'medium','pending',false,'מנוע · סריקת גשרים',
 'promise ב-Reverse Reduction = 29 · הבטחה ברגיל = 29 · הבטחה = התרגום של promise. שיטה: Reverse Reduction → evidence=medium.'),
('כס','throne','en','shared_value','English Ordinal',80,'strong','pending',false,'מנוע · סריקת גשרים',
 'throne ב-English Ordinal (a=1…z=26) = 80 · כס ברגיל = 80 · כס = התרגום של throne (צורת-מקרא של כסא, «כס הכבוד»). שיטה חזקה (כמו secret=סוד=70). רמז (מופרד): 80 = פ · כס-מלכות.');
