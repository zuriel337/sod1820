# שיתוף אוטומטי לפייסבוק — share-to-facebook

מנגנון שמשתף אוטומטית פוסטים מהאתר אל **דף הפייסבוק**, דרך Supabase Edge Function + pg_cron.

## איך זה עובד
1. מסמנים פוסט לשיתוף: `posts.share_to_fb = true`.
2. **pg_cron** (job `share-to-facebook`, כל 5 דק') קורא ל-Edge Function `share-to-facebook`.
3. הפונקציה שולפת פוסטים עם `share_to_fb=true` ו-`fb_posted_at IS NULL` (ולא `ai_touched`), ושולחת אותם ל-**Facebook Graph API**:
   - יש `image_url` → פוסט-תמונה (`/{page}/photos`) עם כיתוב = כותרת + תקציר + קישור.
   - אין תמונה → פוסט-קישור (`/{page}/feed`).
4. בהצלחה: מסמנת `fb_posted_at`, `fb_post_id` (מונע שיתוף כפול). בכישלון: `fb_error` (ויינסה שוב בסבב הבא).

> **למה פוסט-תמונה ולא רק לינק?** האתר הוא SPA ותגיות ה-OG נטענות ב-JS — הסורק של פייסבוק לא מריץ JS. שליחת התמונה+הטקסט ישירות ב-API נותנת פוסט עשיר ומדויק בלי תלות בסריקה.

## עמודות שנוספו ל-`posts`
| עמודה | תפקיד |
|---|---|
| `share_to_fb` (bool) | סמן `true` כדי לשתף |
| `fb_posted_at` (timestamptz) | מתי שותף (null = טרם) |
| `fb_post_id` (text) | מזהה הפוסט בפייסבוק |
| `fb_error` (text) | שגיאת השיתוף האחרונה, אם הייתה |

## מה שנשאר להפעלה (פעם אחת) — צריך אותך
חובה להגדיר **Secrets** ל-Edge Function (Dashboard → Edge Functions → share-to-facebook → Secrets, או `supabase secrets set`):
- `FB_PAGE_ID` — מזהה הדף.
- `FB_PAGE_ACCESS_TOKEN` — Page Access Token עם `pages_manage_posts` + `pages_read_engagement` (דרך אפליקציית מטא; לרוב צריך App Review לפרודקשן. עדיף Token ארוך-טווח/לא-פג).

אופציונלי: `SITE_URL` (ברירת מחדל `https://sod1820.co.il`), `FB_GRAPH_VERSION` (`v21.0`), `FB_SHARE_BATCH` (`5`).

עד שהסודות מוגדרים — הפונקציה מחזירה `{"skipped":"no_fb_credentials"}` ולא עושה דבר (בטוח).

## שימוש יומיומי
- לשתף פוסט: `update posts set share_to_fb=true where id=<id>;` — תוך עד 5 דק' יעלה לפייסבוק.
- לשתף עכשיו (בלי להמתין): קריאה ידנית ל-Function עם Bearer של מפתח Supabase.
- לבדוק סטטוס: `select id,title,fb_posted_at,fb_post_id,fb_error from posts where share_to_fb;`

## להחליף ל"כל פוסט חדש אוטומטית"
לשנות ב-`index.ts` את התנאי כך שיכלול גם פוסטים שלא סומנו (למשל לפי `source`/קטגוריה), או להוסיף `default true` ל-`share_to_fb`. כברירת מחדל בחרנו **דגל ידני** לשליטה מלאה ולשמירה על חוק הפרדת הזרמים.

## כיבוי/כיוונון ה-cron
- לכבות: `select cron.unschedule('share-to-facebook');`
- לשנות תדירות: `select cron.schedule('share-to-facebook','*/10 * * * *', $$ ... $$);`
