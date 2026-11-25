# מסירת סגירה — חבילת ייצוב 25.11.2026 (WORK_PUBLIC_DISCOVERY_20261122)

מסמך זה מאפשר לסשן הבא להמשיך בלי לקרוא את השיחה. מצב חי נקרא מחדש מ־Vercel ומ־`origin/main` בכל סשן (CLAUDE.md 0.1). אין כאן אישור לשום פעולה.

## מצב בזמן הכתיבה
- **Production:** `dpl_GGS7hqRq9fnj9zjxUVnzV6ZHLdCw` ← `ae6e52d969fb4f811603c6cebeda4442d35297f0` (S-54 מרכוז תמונות, #1550, #1545 v12). נקודת חזרה: הפריסה שלפניה.
- **`origin/main`:** `ae6e52d`. החבילה לא מוזגה ולא נפרסה.
- **החבילה:** PR #1551, ענף `claude/work-public-discovery-log-read-ryfcnx`, בסיס `ae6e52d` (0 מאחור). הראש המדויק נמצא בתיאור ה־PR.
- **מסד:** בסשן זה לא שונה דבר, מלבד רשומות `work_log` פסיביות. v12 של `traffic_intelligence_law` הוחל ב־25.11 (#1545, md5 `d8346332`).

## מה בחבילה (#1551)
| פריט | מצב | ראיה |
|---|---|---|
| S-56 ארכיון תמונות ישן | IMPLEMENTED, BRANCH-ONLY | `public-reading-deploy/legacy-upload-redirect.js`, `legacy-upload-public-keys.json`, `test/legacy-upload-redirect-2029.test.mjs` |
| S-55 שלב 2 (אפשרות א׳) | IMPLEMENTED, BRANCH-ONLY; ה"אחרי" לא נמדד | `post-document-freshness.js`, `test/post-document-freshness.test.mjs` |
| S-59 שני תיקונים | IMPLEMENTED; קהילה נמדדה במעבדה, הבית אחרי פריסה | `CommunityLive2029.jsx`, `WatchControl2029.jsx`, `test/community-chat-cls-2029.test.mjs` |
| `/start` "כאן מתחילים" | IMPLEMENTED, ממתין לאישור עיצובי; קומיט נפרד | `src/pages/Start2029Page.jsx`, `api/og.js`, `siteLinkRegistry.js` |
| S-60 מרווח תקציב | לא שונה; ניתוח ואפשרויות במפה | מפת המהירות S-60 |

## S-56 — איך זה עובד
`/wp-content/uploads/YYYY/MM/<name>` מקבל 308 בקפיצה אחת. הדפדפן לא שומר את ההפניה (`no-store`), ה־CDN שומר אותה 5 דקות (`Vercel-CDN-Cache-Control: max-age=300`). סדר ההחלטה:
1. **`closed`:** תמונה שמופיעה רק בטיוטה (פוסט 103), בשני השמות השמורים שלה, מקבלת 404.
2. **`archive`:** 7 תמונות ספרייה שאף פוסט לא משתמש בהן. הפניה ישירה.
3. **`keys`:** 3,448 תמונות שפוסט ציבורי מציג. הפניה רק אם פוסט ציבורי עדיין מציג את התמונה, לפי קריאה אנונימית עם `publicPostOnlyFilter`. כשל בבדיקה מוביל ל־404.
4. **כל השאר:** בקשת HEAD לעותק המוקדם בשם המקורי (ASCII). אם התשובה 200 עם סוג תמונה, מתבצעת הפניה. אחרת ה־404 הקיים.

**ממצאים פתוחים, לא תוקנו (כתיבה למסד או לאחסון דורשת אישור):**
- **פוסט 2:** לכתובת התמונה הודבק `&#038;ssl=1`, ולכן היא מחזירה 400.
- **תמונות חיצוניות מתות:** כ־16 תמונות ב־13 פוסטים ציבוריים, ממקורות zohar-war, jdn, jewsnews, har-habait, bhol, hwcdn, trekearth ו־sodtorah.
- **הדלי `media` ציבורי:** קובץ נגיש בכתובתו הישירה גם אחרי שהפוסט שלו הוסתר. זו החלטת הרשאות אחסון.

## S-55 — מה למדוד אחרי פריסה (אותן שאילתות)
- **Vercel observability:** `vercel.request.count`, `groupBy cache_result`, `filter route eq '/api/public-document'`, חלון של 24 שעות. לפני: MISS 86.7%, HIT 9.0%, STALE 4.4% מתוך 28,476.
- **Supabase `edge_logs`:** ספירת `request.path` שמכיל `post_document_recent_changes_v1`. לפני: 44 ביום. עלות קריאה: 1.46ms (`pg_stat_statements`).
- **עלות:** `vercel.function_invocation.function_duration_gbhr`, לפני 8.21 GB-h. `vercel.middleware_invocation.function_cpu_time_ms`, לפני 505 שניות.
- **שדה:** TTFB p75 לפוסטים, לפני 1,328ms בטלפון ו־1,470ms במחשב.

## שערי אישור פתוחים (כל אחד נפרד)
1. **מיזוג #1551** בראש המדויק. אם העיצוב של `/start` לא מאושר, מוציאים את הקומיט שלו ומציגים ראש חדש.
2. **פריסה מרוכזת** של קומיט ה־`main` שייווצר, לפי נוהל CLAUDE.md:
   - `create_deployment` עם ה־SHA המדויק;
   - המתנה ל־READY;
   - `assign_alias` לשלושת הדומיינים;
   - אימות וקנרית.
3. **#1549** (תגובות קבוצה פרטיות, `0a708cd`, draft, ללא קונפליקט, בסיס `70b3a29`). שלושה שערים לפי הסדר: מיזוג, החלת SQL v2 (md5 `79540e59…`), ופריסת `wa-channel-ingest`. הבעלים: CLAUDE, ממתין להחלטת ZURIEL.
4. **S-60:** בחירה בין שתי האפשרויות. (א) פיצול `razielNavigationButton` מתוך ה־seam של רזיאל, שמוציא 2.6KB. (ב) העברת כללי פאנל ה־workspace מה־CSS של המסגרת, שמוציאה כ־2.6KB. כל אחת דורשת החלטה.
5. **תיקוני תוכן:** פוסט 2 ושחזור תמונות חיצוניות. כתיבה למסד או לאחסון.

## דברים שלא נעשו בכוונה
- לא נגעתי ברזיאל, בהיכל, במנועי המחקר, בכתובות קנוניות קיימות, בפיקסלים או בעבודת סשן האנליטיקס.
- לא הוגדלו תקציבים או ספים.

## שאריות שנשארו
- **בדיקת `auth-lazy-2029`:** לא יציבה ב־CI (timeout, וקוד כניסה שלא מוכן בזמן). עוברת בהרצה חוזרת. לא קשורה לחבילה.
- **"the site map's 'still under construction' list has no Journey link":** נכשלת מקומית גם על `main`.
- **"Isolation browser guard":** נכשלת מקומית בגלל `@playwright/test` שחסר בסביבה.
- **בית בגלילה עמוקה:** ההשפעה של תיקון S-59 על הבית תימדד אחרי פריסה. נשארו מקורות קטנים: `thread-group` בקהילה ותווית התאריך של תמונה בבית.
