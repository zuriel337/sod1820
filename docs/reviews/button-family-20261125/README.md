# משפחת כפתורים אחת — מיפוי חריגות ואיחוד הדרגתי (25.11.2026)

החלטת ZURIEL: לפתור מהיסוד את חוסר האחידות של הכפתורים באתר 2029 בתשתית המרכזית, לא כפתור מקומי בכל פעם. המקור היחיד: `src/components/experience2029/royal2029.css` (`.r29-btn`). מצב: **ענף בלבד; לא מוזג ולא נפרס.**

## התקן (Design V2 §14.2–§14.4, canonical_ui_components_law v13 §3)
- קבוצות כפתורים ממורכזות; בשורה אחת ברוחב אחיד (`.r29-btn-group`).
- גובה 44px לפחות, גופן 14–16px, כפתור אייקון ריבוע 44px (`.r29-btn.is-icon`).
- כחול רויאל לפעולה ראשית (`.is-primary`); מסגרת זהב לפעולה משנית (`.is-quiet`).
- בחירה מרובה: תיבות סימון (`.r29-check` / `.r29-check-group`), לא כפתורים גדולים.
- בלי חזרה על כותרות וטקסטים; בלי צבע, גודל או צל מקומי.

## מה נוסף לתשתית
`royal2029.css`: `.r29-btn-group`, `.r29-btn.is-icon`, `.r29-check-group`, `.r29-check` (+ פוקוס, כפוי צבעים, מצבי השבתה והמתנה). `WatchButton`: `variant="check2029"` (אותו מנוע, אותו מצב; ה־props בוחרים תצוגה). **חלונית המעקב של הפוסט** נבנתה עליהם: כותרת אחת, שורת הסבר אחת, שורת תיבת סימון לכל יעד מאומת, כפתור "סגירה" ראשי.

## מיפוי החריגות (קוד, לא הערכה)
`node scripts/map-button-deviations-2029.mjs`: כלל שמזהה כפתור (`button`/`*btn*`/`*button*`) ומצייר לעצמו צורה (רדיוס + רקע/מסגרת + ריפוד/גובה), וכן `<button style={{borderRadius}}>` בתוך רכיב. total 319 in 101 files.

| קובץ | כללים חריגים |
|---|---|
| `src/components/number2029/numberCore2029.css` | 24 |
| `src/pages/bentovFindingsProduct2029.css` | 22 |
| `src/components/experience2029/elsNativeClassic2029.css` | 21 |
| `src/pages/ahavatTorahSystem2029.css` | 21 |
| `src/pages/seferYetzirahWorld2029.css` | 13 |
| `src/components/experience2029/systemFrame2029.css` | 11 |
| `src/components/number2029/numberLivingWorld2029.css` | 9 |
| `src/components/experience2029/birth-map-studio-2029.css` | 7 |
| `src/components/person-journey.css` | 6 |
| `src/pages/community2029.css` | 6 |
| `src/pages/post2029-reading.css` | 6 |
| `src/components/books2029/ahavatLetterStudy2029.css` | 5 |
| `src/components/books2029/bookSourceReader2029.css` | 5 |
| `src/components/experience2029/sod2029-closed.css` | 5 |
| `src/components/gematria2029/spatialMethodStage2029.css` | 5 |

(רשימה מלאה: `scripts/button-family-baseline-2029.json`.)

## שער CI
`test/button-family-guard-2029.test.mjs`: **מנוף חד־כיווני.** קובץ חדש עם עיצוב כפתור משלו, או קובץ שמגדיל את המספר שלו, נכשל. הורדה: `node scripts/map-button-deviations-2029.mjs --lower`. העלאת הבסיס היא החלטת ZURIEL בלבד. השער אינו משנה התנהגות, ואינו נוגע בחריגים שאושרו (רזיאל, היכל, מטריצת הצופן, בית המדרש — §14.12 C).

## איחוד הדרגתי (מוצע, כל שלב בפני עצמו וממתין לאישור)
1. **משטחי פעולה משותפים:** שורות הפעולות של פוסט וקהילה, חלוניות (`systemFrame2029.css`, `community2029.css`, `contentActions2029.css`): החלפת כללי הכפתור המקומיים ב־`.r29-btn` / `.r29-btn-group`. שינוי חזותי קטן, בלי שינוי לוגיקה.
2. **עמודי תוכן** (`post2029-*.css`, `posts*`, `calculator*`, `topic2029`, `stats2029`): כפתורי הפעולה הראשית/המשנית לפי התקן.
3. **משטחי מחקר מיוחדים** (`numberCore2029.css`, `elsNativeClassic2029.css`, `bentov*`, `ahavat*`, `seferYetzirah*`): רק לאחר החלטה לפי §14.12 C; ברירת מחדל נשארים.
4. אחרי כל שלב: `--lower` ועדכון הבסיס; בדיקה בשלוש ערכות, 320/390/1440, נגישות ותקציב המעטפת.
5. **`canonical_ui_components_law` v13 §3** — הוספת סעיף 3א בחוק עצמו (DB) דורשת אישור נפרד. הנוסח המדויק לאישור: `docs/reviews/design-language-gap-map-20261125/law-v14-exact.sql` (לא הוחל).
