# תוכנית מימוש — מסלול תרגום טקסט פוסטים (content_translation_law §4) · תכנון בלבד
בסיס: 418a737 · הפוסט «מה קורה הבורא» לא שונה · לא הופעל מנוע · לא נוצרה טבלה · לא פורסם.
החלטות מחייבות: מנוע קנוני קיים בלבד; זהות פוסט אחת + תרגום לכל שפה; לא ב-video_transcripts; לא בבלוקים סטטיים; עברית=מקור; בלי קשר ל-video_key.

## 1. אחסון
`public.content_translations` (טיוטה: `content_translations_v1_PROPOSAL.sql`, לא מוחל): שורה לכל (entity_type='post', entity_id=posts.id, lang), unique. עברית נשארת ב-posts.* (provenance); אין שורת he. שדות: title/excerpt/content מתורגמים, source_lang, source_hash (sha256 של המקור העברי), validation (דוח מאמת), translated_by/model, status pending|draft|published (law §5). RLS/GRANT כמו video_transcripts: קריאה רק published + פוסט-אב גלוי (RLS של posts, תג «טיוטה»); כתיבה service_role בלבד.
`post_translations_public_v1` (security_invoker): מחזיר רק תרגום שה-source_hash שלו עדיין תואם למקור הנוכחי — עריכת הפוסט מסתירה תרגום ישן בלי טריגר על posts.

## 2. חלוקה למקטעים (בלי שהמודל נוגע ב-HTML/URL)
מנתח HTML אחד, משותף למנוע ולמאמת: מוציא רק **צמתי טקסט** כמקטעים עם id; תגיות, href, חותמות זמן, מבנה טבלה — נשארים בצד ומורכבים מחדש מהמקור. מקטע ≈ בלוק (פסקה/תא/פריט), קבוצות עד ~1,200 טוקני מקור לקריאה (max_tokens הנוכחי 4000). Hebrew «שמור-מילולית» (ציטוטי „…” ופסוקים, blockquote, עמודת הביטוי בטבלת הגימטריה) מוחלפים בסמן ⟦K#⟧ ומוחזרים מילולית — כך כתיב עברי ופסוקים לא עוברים דרך המודל.

## 3. אימות (לפני status≠pending)
(א) round-trip: פירוק+הרכבה של המקור = זהה בייט-בייט; (ב) שלד תגיות זהה; כל href זהה; (ג) כל ⟦K#⟧ מופיע בדיוק פעם, והטקסט העברי המקורי שלו מופיע מילולית; (ד) כל רצף ספרות במקטע המקור (ערכי גימטריה, תאריכים, חותמות זמן) מופיע במקטע המתורגם; (ה) אין מקטע חסר/כפול/ריק; (ו) source_hash נבדק שוב בכתיבה (אין כתיבה אם המקור השתנה); כשל → ניסיון חוזר אחד למקטע, אחר כך נשאר pending עם validation. אין פרסום חלקי. ערכי גימטריה לא «עוברים בירושה» בתרגום (law v3) — המספרים נשמרים כטקסט, לא מחושבים מחדש.

## 4. מנוע
הרחבת Edge Function `video-transcribe` (הבעלים הקנוני לפי §2) בפעולות `translate_entity` / `get_entity` + מודול טהור `_shared/entityTranslationPolicy.js` בסגנון `videoTranscriptPolicy.js`; אותו TRANSLATE_SYSTEM (שמות/פסוקים/מספרים נשמרים), אותו סט he·en·ar·es·fr·ru·pt·de (יעדים: 7), אותה הרשאה x-fb-admin-key, רישום עלות ב-ai_token_log הקיים. אין מנוע/טבלת-עלות/Registry חדשים. נקודת זהירות: sonnet-5 ללא `thinking` מריץ adaptive (טוקני חשיבה מחויבים כפלט) — לבדוק ב-usage של הפיילוט ולהקטין effort בתוך אותו מנוע אם נדרש.

## 5. בורר שפה
לפי law §6 + W0 §4: אותה כתובת ואותה זהות; מצב שפה `?lang=` (ללא עץ ניתוב חדש, hreflang/SEO נדחים ל-localization). רכיב לשוניות קטן ב-Post2029Page שצורך את ה-view; ברירת מחדל he; שפה חסרה = נפילה לעברית; dir=rtl ל-he/ar, ltr לשאר; שומר עוגן/גלילה. **שינוי UI דורש Design owner** (CLAUDE.md) — לא יבוצע לפני אישורו. אין VideoTranscript.jsx בריפו; הדפוס הקנוני ייבנה אחת (לפוסטים) ויוכל לשמש גם תמלולים בעתיד.

## 6. תיאום בעלות (נסרק 11.11)
סשן קטגוריות/סדרות/מדיה (work_log 8bcd0675; PR #1303): owner publishing_conventions id=4, contentSeries2029Identity.js, postsCatalog2029Projection.js, nowPublications2029.js, קבצי מדיה/YouTube. **אין חפיפה** עם: migration חדש, _shared/entityTranslationPolicy.js, הרחבת video-transcribe, Post2029Page.jsx, post2029ReadingProjection.js. **נקודת תיאום**: PublicContinuity2029Page.jsx נמצא ב-#1303 — לא ייגע בו עד מיזוג/תיאום. לא נערכים חוזי קטגוריות/סדרות. תיאום = רישום scope ב-work_log לצוריאל (ללא הודעות בין סוכנים) — לא נכתב עדיין.

## 7. בדיקות קבלה
DB (בדיקת SQL מקומית/ענף, לפני Production): unique (post,lang); אין שורה lang=source_lang; anon רואה רק published; פוסט בתג «טיוטה» — תרגומיו נסתרים; anon/authenticated לא כותבים; status/source_hash/validation לא נחשפים; עריכת פוסט → ה-view מסתיר תרגום ישן; מחיקת פוסט/זהות לא נשברת.
מנוע (יחידה, בלי רשת): round-trip זהה; ⟦K#⟧ מילולי; ספרות/חותמות זמן נשמרות; href זהים; שלד זהה; מקטע חסר/כפול → כשל; חלוקה ≤ תקציב טוקנים; כתיבה אידמפוטנטית לפי source_hash; אין כתיבה כשהמקור השתנה; כל קריאה נרשמת ב-ai_token_log.
פיילוט (באישור, status=draft מוסתר): הפוסט הזה ל-7 שפות; כל המאמתים עוברים; סקירה אנושית דגימה; הוכחת התאמה ל-usage בפועל מול ההערכה.
קורא: לשוניות רק לשפות שפורסמו; he ברירת מחדל; ?lang= עמוק; RTL/LTR; בלי גלישה אופקית 390/1440; זהות/עוגן נשמרים; ללא שפה = ללא שינוי בדף.

## 8. הערכת עלות (הערכה, לא נמדדה; claude-sonnet-5: $2/MTok קלט, $10/MTok פלט; Batch −50%)
הפוסט: 6,516 תווי טקסט (≈1,182 מילים), 12,627 תווי HTML; המודל רואה רק טקסט (≈3–5K טוקני קלט כולל הנחיה וסמנים). פלט לשפה ≈2–4K טוקנים (+0–2K אם adaptive thinking פעיל).
| תרחיש | טוקנים (7 שפות) | עלות |
|---|---|---|
| נמוך (בלי thinking, בלי ניסיון חוזר) | ~21K קלט / ~14K פלט | ≈ $0.18 |
| צפוי (+25% ניסיונות חוזרים) | ~30K / ~25K | ≈ $0.31 |
| גבוה (thinking פעיל, פלט ארוך בעברית→ar/ru) | ~34K / ~45K | ≈ $0.52 |
Batch (אסינכרוני, −50%): ≈ $0.09–0.26. כל הפרויקט (בנייה+בדיקות+פיילוט) < $2 בקריאות ספק; הסדר-גודל לכל 1,000 פוסטים בגודל דומה: ≈ $180–520 (Batch: חצי). לפני ריצה אמיתית: count_tokens על המקטעים בפועל לקבלת מספר מדויק.

## 9. שלבים (כל שער דורש אישור נפרד)
0 סקירת תוכנית + Design owner (חינם) → 1 מודול policy + בדיקות מקומיות (ענף, חינם) → 2 החלת מיגרציה (אישור DB) → 3 הרחבת/פריסת video-transcribe (אישור פריסה) → 4 פיילוט draft לפוסט (אישור עלות) → 5 לשוניות בקורא (Design owner + אישור merge) → 6 פרסום תרגומים (אישור). «מה קורה הבורא» נשאר ללא שינוי עד סיום שלבים 1–4.

---
## עדכון 2 (אושר: טבלה כללית; מודול + בדיקות מקומיות + סימולציית מיגרציה מבודדת) — אין החלה ל-Production
קבצים: `supabase/proposed/content_translations_v1_PROPOSAL.sql` (הועבר מ-work/, לא מוחל) · `tests/sql/content_translations_v1.sql` + `scripts/run-content-translations-sql-test.sh` (Postgres מקומי זמני) · `supabase/functions/_shared/entityTranslationPolicy.js` · `test/entity-translation-policy.test.mjs`.
הרצה: `bash scripts/run-content-translations-sql-test.sh` · `node --test test/entity-translation-policy.test.mjs`.

תיקון ממצא 1 — RLS עצמאי: מדיניות הקריאה על הטבלה עצמה דורשת status='published' + הפוסט-האב גלוי למשתמש (RLS של posts, כולל «טיוטה») + `source_hash` = ה-hash של המקור העברי הנוכחי. תרגום מיושן אינו קריא גם בקריאה ישירה לטבלה; ה-view הוא הקרנה בלבד. בנוסף טריגר publish-guard: גם service_role לא יכול לפרסם תרגום עם hash לא-עדכני.
תיקון ממצא 2 — זהות ישויות: `entity_id` חייב להתאים ל-`^[1-9][0-9]{0,17}$` (אין סימן/אפסים/רווחים/ספרות יוניקוד/גלישת bigint); עמודה מחושבת `post_id bigint` מבצעת המרה רק כשהתבנית תקינה (המרה בטוחה, בלי חריגה); FK ל-posts(id) ON DELETE CASCADE (תרגום לא יכול להצביע על פוסט שאינו קיים; מחיקת פוסט מסירה רק נגזרות); אין ALTER ואין טריגר על posts. ממצא נוסף שהבדיקה חשפה: עמודה מחושבת אינה מחושבת ב-BEFORE trigger — ה-guard מחשב מ-entity_id.
הוכחה: בדיקות SQL T0–T9 (hash parity, stale direct-read, draft post, draft אחרי הסרת/החזרת תג, פוסט ציבורי זהה לא פותח טיוטה, 14 מזהים פסולים, FK/unique/lang/status/hash, grants/עמודות, בידוד כתיבה, publish-guard, cascade, snapshot של catalog של posts). נבדקו 6 מוטציות: 5 נתפסו; «אין תנאי post_id במדיניות» נתפס אחרי הוספת T4c; «regex רופף» שקול (שכבה כפולה: עמודה מחושבת + check).
מודול: parsePostId, planEntityTranslation (עברית אף פעם לא יעד), sourceHash (בייט-זהה ל-SQL), segmentHtml/reassemble/roundTrip (הפוסט האמיתי חוזר בייט-לבייט; המודל לא רואה תגיות/URL), ⟦K#⟧ למובאות עבריות מילוליות, verifyTranslation (keep/ספרות ASCII/הזרקת markup/מזהים/שלד תגיות), chunking לפי תקציב טוקנים, parseBatchAnswer קפדני. 17 בדיקות.

### תיאום בעלות (נסרק 11.11, PRs פתוחים + ענפים מאז 6.11 + work_log)
- Codex: אין ענפי codex/* מאז 10.11 ואין רשומות work_log מ/אל Codex ב-72 שעות; אין מה לתאם — ההפניה: AGENTS.md → CLAUDE.md §0.
- חפיפות: **#1189 (GPT, draft)** מוסיף `PostSystemAddition2029.jsx` ומשנה `Post2029Page.jsx` («תוספות מערכת נפרדות» בפוסטים) — יחסי: (א) שלב לשוניות הקורא יתנגש בקובץ אותו; (ב) אם ימוזג, `posts.ai_addition` יוצג בנפרד ← יש לבחון אז את כפילות סעיפי «תוספת המערכת» שבתוך תוכן «מה קורה הבורא» מול ai-addition.html. #1296 (חוזה קשרי פוסט/סדרה) ו-#1288 (מסגרת וידאו בפוסט) — ללא קבצים חופפים. #1303 — PublicContinuity2029Page.jsx בלבד (לא נגעתי).
- מה שנוסף בענף זה חדש בלבד: אין שינוי בחוזי קטגוריות/סדרות/מדיה, אין שינוי ב-package.json/CI/video-transcribe/Post2029Page.
