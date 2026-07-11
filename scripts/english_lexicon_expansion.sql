-- ============================================================================
-- הרחבת מילון-האנגלית (word_aliases lang='en') — 2026-07-11
-- ----------------------------------------------------------------------------
-- מנוע הגילויים החוצה-שפתי (EnglishDiscovery / fn_en_search) היה בנוי אך רעב:
-- 5 מילים בלבד ב-word_aliases. כאן מוסיפים 65 מילים אנגליות נפוצות/משמעותיות
-- עם תעתוק עברי פונטי מאומת → המנוע מחזיר התכנסויות אמיתיות מיד.
--
-- אופן הפעולה (עץ אחד + gematria_engine_law):
--   1) כל תעתוק עברי נכנס כ-node בקורפוס (gematria_words). הטריגר gw_enforce_engine
--      מחשב את כל ערכי-הגימטריה דרך המנוע הרשמי בלבד (ragil_calc / mistater_calc /
--      gadol_calc / kadmi_calc / atbash_calc / albam_calc / miluy_calc / ribua_calc…).
--      *אין חישוב ידני.* הטריגר bidim_sync מקרין ל-bidim (מקור ההתכנסויות).
--   2) הקישור האנגלי נוסף דרך helper קנוני add_word_alias(...) — lang='en',
--      alias_type='english', method='transliteration', verified=true.
--
-- הערות תעתוק:
--   • ללא גרש/גרשיים (') — הטריגר מחשב רק עברית טהורה ^[א-ת]+( [א-ת]+)*$.
--     צליל j/ch/zh נכתב באות בסיס (ג/צ/ז); ערך-הגימטריה זהה ממילא.
--   • צורות סופיות (ן/ם/ך/ץ) נשמרות לתקינות ה"גדול".
--
-- נתונים חיים מיד (Supabase) — לא תלוי בפריסת Vercel.
-- idempotent: אפשר להריץ שוב; add_word_alias עושה ON CONFLICT DO NOTHING.
-- ============================================================================

create temp table _en_pairs(en text, he text, conf numeric) on commit drop;
insert into _en_pairs(en,he,conf) values
('love','לאב',0.90),('light','לייט',0.95),('hope','הופ',0.93),('faith','פיית',0.90),
('soul','סול',0.93),('peace','פיס',0.92),('truth','טרות',0.90),('life','לייף',0.93),
('heart','הארט',0.93),('mind','מיינד',0.92),('spirit','ספיריט',0.93),('angel','אנגל',0.90),
('heaven','הבן',0.85),('god','גוד',0.92),('king','קינג',0.95),('glory','גלורי',0.92),
('grace','גרייס',0.92),('holy','הולי',0.92),('reality','ריאליטי',0.95),('code','קוד',0.95),
('number','נמבר',0.92),('word','וורד',0.90),('name','ניים',0.92),('time','טיים',0.93),
('world','וורלד',0.93),('sun','סאן',0.90),('moon','מון',0.92),('star','סטאר',0.93),
('fire','פייר',0.92),('water','ווטר',0.90),('earth','ארת',0.90),('sky','סקיי',0.92),
('ocean','אושן',0.90),('wind','ווינד',0.90),('power','פאוור',0.90),('energy','אנרגי',0.90),
('freedom','פרידום',0.93),('victory','ויקטורי',0.93),('destiny','דסטיני',0.92),('miracle','מירקל',0.90),
('magic','מגיק',0.90),('future','פיוצר',0.85),('change','ציינג',0.83),('believe','בליב',0.90),
('create','קריאייט',0.88),('gold','גולד',0.93),('crown','קראון',0.90),('temple','טמפל',0.90),
('prophet','פרופט',0.88),('redemption','רדמפשן',0.85),('eternity','אטרניטי',0.90),('wisdom','ויזדום',0.90),
('blessing','בלסינג',0.90),('prayer','פרייר',0.90),('vision','ויזן',0.87),('harmony','הרמוני',0.90),
('infinity','אינפיניטי',0.92),('universe','יוניברס',0.92),('matrix','מטריקס',0.93),('signal','סיגנל',0.90),
('frequency','פריקוונסי',0.88),('galaxy','גלקסי',0.90),('money','מאני',0.92),('success','סקסס',0.88),
('knowledge','נולג',0.85);

-- 1) עוגן עברי בקורפוס (הטריגר מחשב גימטריה במנוע הרשמי; מדלג על מה שכבר קיים)
insert into gematria_words (phrase, source, category, space, visibility_reason)
select p.he, 'english-expansion', 'תעתוק אנגלית', 'core', 'english_translit'
from _en_pairs p
where not exists (select 1 from gematria_words g where g.phrase = p.he);

-- 2) קישור אנגלי מאומת דרך ה-helper הקנוני
select add_word_alias(p.he, p.en, 'en', 'english', 'english-expansion', 'transliteration', p.conf, true)
from _en_pairs p;
