# M0-F · תיקון המדידה באתר הציבורי (בקשת צוריאל, 12.11.2026: ״גם תתקן מדידה״)

> קוד בענף בלבד. לא נפרס, ולא היה שינוי במסד. בסיס: `origin/main` 949c24ad5. בעלים: `traffic_intelligence_law` v11 (אמת המדידה) ופונקציות ההקרנה הקיימות ב־`src/lib/publicReadingTelemetry2029.js`. המנגנון הקיים הורחב; לא נוצר מנגנון מדידה חדש.

## מה היה שבור (נמדד בחי, קריאה בלבד)

| מקור | שבוע לפני 4.11 | היום |
|---|---|---|
| `site_visits` (כניסות) | ‏1,100–1,600 אנשים ביום | **חזר מ־9.11**: כ־1,350 אנשים ביום |
| `events` page/engagement + performance/web_vital | ‏~5,000 בשבוע | עובד (2,560 + 1,356 ביומיים) |
| `events` פעולות (חישוב גימטריה 2,574 · מקור הגעה 2,133 · סיפורים · שיתוף · וידאו · מחקר · מסע · אוריינטציה) | אלפים בשבוע | **0–4** |
| `visitor_events` (שיתוף, הצטרפות לוואטסאפ, פעולות) | ‏~3,000 ביום | **‏~8 ביום** |
| `page_views` (צפיות בפוסט) | ‏150–340 ביום | **0–1** |

הסיבה: בבנייה הציבורית `emit()` ו־`track()` חוזרות מוקדם, `logView` מדלג, ושירות הבקשות (`public-reading-deploy/transport.js`) מתיר רק כניסות, engagement, ‏Web Vitals ודיווח תקלה.

## התיקון
- **משפחה אחת חסומה:** `readingActionSpec` / `readingActionProps` / `readingActionBody` ב־`publicReadingTelemetry2029.js`.
  - אותה תורה כמו כניסות ו־RUM: בלי זהות מבקר או session (`p_sod_id` ו־`p_session_id` = null), עם תווית המסלול המנורמלת בלבד.
  - לכל משטח יש רשימת אירועים קבועה ושדות חסומים: אסימון קצר, בוליאני, או מספר שלם.
  - טקסט שהמבקר הקליד (ביטוי, ערך, מזהה שיתוף, slug, כתובת) לא יוצא מהדפדפן: ההקרנה מסירה אותו והמאמת דוחה אותו.
- **משטחים:** `calculator_2029` · `entry_2029` · `journey_2029` · `share` · `join` · `arrival` · `content` (צפייה בפריט ציבורי לפי מזהה מספרי ציבורי).
- **בלי לגעת בנקודות הקריאה:**
  - `emit()` ← המשפחה הציבורית. ‏`track()` ← `emit()`. ‏`visitor_events` נשאר סגור בבנייה הזו.
  - `trackShare` ← `share/share {platform}`. ‏`trackWhatsappJoin` ← `join/click {surface}`.
  - מקור הגעה: פעם אחת ב־session, בכניסה הראשונה (`emitPublicArrivalOnce`). המקור ממופה ממילון קבוע, ותג הקמפיין `?src=` נשמר רק כאסימון קצר.
  - צפייה בפוסט: `logView("post", slug, id)` ← `content/view {kind, item_id}`, פעם אחת ב־session. ה־slug לא נשלח.
- **בשירות הבקשות:** קבלה רק של הצורה המדויקת, קשורה למסלול המנורמל של החלון ששלח, עם מפתח אנונימי בלבד (JWT של חשבון לא עובר). עד 60 פעולות לחלון ב־10 דקות. כתובת ה־beacon עדיין לא פותחת משטחים אחרים.
- **ללא שינוי:** GA4 (פתוח מ־10.11), ‏Meta Pixel (לפי 11.11), כניסות, engagement, ‏RUM, דיווח תקלה. ‏`runtime_error` נשאר מקומי (בקונסולה בלבד).

## בדיקות (מקומית, לא CI)
- `node --test test/public-reading-action-measurement.test.mjs` → ‏6/6:
  - הקרנה, מאמת, העברה עם מפתח אנונימי בלבד;
  - דחייה של חלון לא תואם, מקור לא ציבורי, כתובת beacon ושדה חופשי;
  - תקרת 60;
  - חיווט הלקוח.
- אחרי `node scripts/build-public-reading-production.mjs` (כמו ב־CI):
  - `node --test test/public-reading-observability.test.mjs test/public-reading-analytics-worker.test.mjs test/analytics-2029-one-tree-contract.test.mjs test/public-reading-real-gtag-shape.test.mjs test/def012-page-views-public-build.test.mjs` → ‏26/26;
  - הבדיקות הקיימות של חסימת אירוע כללי, זהות וכתובת ה־beacon ממשיכות לעבור.
- `node scripts/test-legacy-retired.mjs` → PASS. ‏`node scripts/test-2029-module-boundary.mjs` → PASS. הבנייה הציבורית → exit 0.

## מה לא נעשה / הצעד הבא
- **לוחות הניהול:** דוחות שקוראים `visitor_events` או `page_views` (צפיות בפוסט, שיתופים) עוד לא קוראים את `events` (`content/view`, ‏`share`, ‏`join`, ‏`arrival`). זה התאמת קוראים — שלב המשך (M1).
- **אימות בחי** אפשרי רק אחרי פריסה: קריאה של `events` לפי surface אחרי שעה של תנועה.
- **חפיפה:** טיוטה ישנה של GPT, ‏PR #1283 (8.11, ‏`gpt/analytics-full-site-restoration-20261108`), נוגעת באותו תחום. היא לא יובאה. רוב מה שהציעה (כניסות ו־engagement) כבר נכנס ל־main בנפרד. מומלץ שצוריאל יסגור אותה כמוחלפת.
