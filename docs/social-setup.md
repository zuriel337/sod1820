# הקמת שיתוף אוטומטי + DM — Facebook & Instagram

## חלקים שנבנו (קוד מוכן בריפו)
| רכיב | קובץ | מה עושה | סטטוס |
|---|---|---|---|
| שיתוף פוסטים לפייסבוק | `supabase/functions/share-to-facebook` | פוסט-תמונה + לינק בתגובה ראשונה + UTM | קוד מוכן · צריך redeploy |
| גנרטור כרטיסי הצלבות | `supabase/functions/cross-card` | PNG ממותג לחידוש | קוד מוכן · צריך deploy |
| DM אוטומטי באינסטגרם | `supabase/functions/ig-webhook` | על כל תגובה → DM פרטי למגיב | קוד מוכן · צריך deploy |

> פעולת `deploy_edge_function` דורשת אישור הרשאה. עד שתאושר — הפונקציות בריפו אך לא פרוסות.

---

## א. דרישות חשבונות (פעם אחת)
1. **דף פייסבוק** עסקי.
2. **חשבון אינסטגרם מקצועי** (Business/Creator) **מקושר לדף הפייסבוק** (דרך הגדרות הדף → Linked accounts).
3. **אפליקציית מטא** ב-developers.facebook.com (סוג Business), ומוסיפים מוצרים: *Facebook Login*, *Instagram Graph API*, *Webhooks*, *Messenger/Instagram*.

## ב. הרשאות (Permissions) — דורשות App Review לפרודקשן
- פייסבוק: `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`.
- אינסטגרם: `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_show_list`, `pages_manage_metadata` (ל-Webhook).
- במצב Development זה עובד למשתמשי-בדיקה/אדמינים מיד; לקהל הרחב צריך **App Review** עם הקלטת הדגמה.

## ג. טוקנים → Edge Function Secrets
שיתוף פייסבוק (`share-to-facebook`):
- `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN` (+ אופציונלי `FB_LINK_IN_COMMENT`, `FB_UTM`).

DM אינסטגרם (`ig-webhook`):
- `IG_VERIFY_TOKEN` — מחרוזת שתמציאו; אותה מזינים גם במסך ה-Webhook במטא.
- `IG_USER_ID` — מזהה חשבון האינסטגרם העסקי.
- `IG_PAGE_TOKEN` — Page/IG access token.
- `IG_APP_SECRET` — (מומלץ) לאימות חתימת Meta.
- `IG_DM_TEMPLATE` — **תוכן ה-DM** שיישלח לכל מגיב.
- אופציונלי: `IG_PUBLIC_REPLY` (תגובה ציבורית), `IG_GRAPH_VERSION`.

## ד. חיווט ה-Webhook לאינסטגרם
1. כתובת ה-Callback: `https://linswmnnkjxvweumprav.supabase.co/functions/v1/ig-webhook`
2. במטא → Webhooks → Instagram → Verify Token = ה-`IG_VERIFY_TOKEN`.
3. להירשם (Subscribe) לשדה **`comments`** (ובמידת הצורך `mentions`).
4. הפונקציה עונה אוטומטית ל-GET האימות (`hub.challenge`).
5. הפונקציה פרוסה עם `verify_jwt=false` (Meta לא שולחת JWT) — האבטחה דרך verify_token + חתימת `X-Hub-Signature-256`.

## ה. איך עובד ה-DM האוטומטי
- מישהו מגיב לפוסט/רילס באינסטגרם → Meta שולחת webhook.
- הפונקציה שולחת **תגובה פרטית (Private Reply)** ל-DM של המגיב — מותר **DM אחד לכל תגובה** (מדיניות מטא), לא ספאם.
- טבלת `ig_comment_dms` (primary key=comment_id) מונעת DM כפול ומתעדת סטטוס/שגיאות.
- אפשר גם תגובה ציבורית במקביל (`IG_PUBLIC_REPLY`).

> מדיניות: ה-Private Reply מיועד למענה ענייני לתגובה. אין לשלוח תוכן לא-קשור/פרסומי-המוני — מטא אוכפת.

## ו. מה שנשאר
1. לאשר את ה-deploy → אפרוס את 3 הפונקציות.
2. אתה: תקים אפליקציית מטא, תקשר IG↔דף, תפיק טוקנים, תגדיר Secrets, ותגיש App Review.
3. נחליט יחד את **תוכן ה-DM** (`IG_DM_TEMPLATE`).
