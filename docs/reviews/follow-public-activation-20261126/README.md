# חבילת הפעלה נפרדת: מעקבים ציבוריים בפוסט ומעקב סדרות (26.11.2026)

מצב: **חבילה מוכנה לאישור; כלום לא הופעל.** לא הוחל SQL, לא שונה דגל חי, לא מוזג, לא נפרס. המנוע הקיים (`WatchButton`, `watch_toggle`, `getNotificationPrefs`, `EmailVerify`), ההרשאות והמנויים הקיימים נשארים; החבילה לא בונה מערכת מעקב חדשה, ולא מפעילה ערוץ דיוור אוטומטי.

מקורות שנקראו: `subscription_funnel_law` v22 (פעיל), `docs/reviews/follow-series-release-20261031.md` ותיקיית החבילה שלו (`manifest.json`, `preflight.sql`, `rollback.sql`, `run-follow-series-release-acceptance.sh`), Design V2 §14.4/§14.13.

## מה נעול היום ולמה
בגרסה הציבורית כל מעקב נעול (`publicReadingActionsLocked`: סגור לציבור, פתוח למנהל). חלונית המעקב של הפוסט מכבדת את הנעילה: היא אומרת "ייפתחו בהמשך", שורת ההזמנה מוסתרת ולא נשלחות בקשות יעדים. **שני חלקי הפתיחה (קוד ומסד) כאן, בנפרד:**

## א. צעד הקוד (מוכן, רדום)
בענף נוסף מתג **רדום** אחד: `POST_FOLLOW_PUBLIC_2029 = false` ב־`src/lib/research/postFollowOpenStore2029.js`. כל עוד הוא `false`, ההתנהגות זהה לקודמת (נבדק: `test/post-follow-panel-2029.test.mjs`). היפוכו ל־`true` הוא **שורה אחת** ו:
- פותח את חלונית המעקב, שורת ההזמנה ובדיקת היעדים לציבור (`postFollowLocked`);
- מתיר ל־`WatchButton` רק את המקור `post_follow_panel_2029` ורק נושאים `cat:` / `author:` / `series:` (`postPanelFollowAllowed`); כל מעקב אחר נשאר נעול כמו קודם.
בחלונית מוצעים רק יעדים במצב `ready` (מסלול עדכונים מאומת, ראו למטה): קטגוריה וכותב כבר כאלה; **סדרה לא תוצע עד שמיגרציית הסדרות מוחלת** (המצב `unsupported`), בלי לשנות קוד.

## ב. צעד המסד: מעקב סדרות (לא הוחל)
`supabase/migrations/20261031091248_follow_content_series_only_v1.sql` (SHA-256 `fcdc20284b6d824b6b6b20aeaec7a63e517fb3a59dcde2adfda7e87178b7df19`, זהה לרשום ב־`manifest.json`). מרחיבה את `canonical_follow_subject`, מוסיפה matcher פנימי לסדרות (`dimension-five`, `mah-kore-habora`, `sod-hashmal`) ומרחיבה את `notify_on_post_publish` וה־trigger הקיים. `external_delivery: false`, `preference_backfill: false`. ההודעה היא In-App בלבד, אחת לנמען ולפרסום (dedupe בדיספצ'ר הקיים).

### בדיקה חיה שבוצעה היום (קריאה בלבד, 26.11.2026)
| בדיקה | תוצאה |
|---|---|
| המיגרציה בהיסטוריית המסד (`schema_migrations`) | **אינה** (לא הוחלה; הגרסה האחרונה במסד `20261125000322`) |
| תמונות־קדם (md5 של `pg_get_functiondef`) מול `manifest.json`: `canonical_follow_topic`, `follow_topic_aliases`, `canonical_follow_subject`, `notify_on_post_publish`, `resolve_topics`, `dispatch` | **תואמות (6 מתוך 7)** |
| `watch_toggle` | **לא תואמת**: חי `807aaccbb3b7f8d8ed412eb0b3dbea3e`, ב־manifest `fa41495b802bbd75155fc1ab74c5cb39`. הפונקציה השתנתה מאז 31.10 (כנראה בעקבות `20261104135237_community_thread_follow_notifications.sql`). |
| הרשאות | `watch_toggle`: anon + authenticated; `notification_prefs_guest_get_v1`: anon; `canonical_follow_subject`: PUBLIC (resolver קריאה בלבד); `notify_on_post_publish`: אין קריאה ללקוחות |
| `post_content_series_keys_v1` | אינה קיימת (תיווצר במיגרציה) |

**מסקנה: צריך להריץ מחדש את `preflight.sql` ואת הקבלה (`run-follow-series-release-acceptance.sh`) מול תמונת `watch_toggle` הנוכחית לפני כל אישור החלה.** המיגרציה אינה נוגעת ב־`watch_toggle` ("`watch_toggle` נשאר ללא שינוי"), אך אישור מדויק לא יינתן על preflight שנכשל. הקבלה דורשת PostgreSQL זמני (קיים בסביבה: psql 16) ולא תתחבר לפרויקט.

## ג. סדר ההפעלה המוצע (כל שלב באישור מדויק נפרד)
1. **מסד, קריאה בלבד:** `preflight.sql` מול החי + הקבלה המקומית המחודשת; דוח תוצאות.
2. **אישור ל־SHA המיגרציה** והחלה (מעקב סדרות). `rollback.sql` מוכן (SHA-256 `b1b96654b4637d159e9b20e5a7fc0fe2055cb629e6604f5dcd482d8cdcd41bfc`; לא מופעל אוטומטית).
3. **אישור לקומיט הקוד** שהופך `POST_FOLLOW_PUBLIC_2029` ל־`true`, מיזוג, ואחריו פריסה (אישורים נפרדים).
4. **אימות חי** עם חשבונות בדיקה מורשים בלבד: אורח (מעקב נשמר כ־follow intent ואז בקשת אימות זהות, בלי הצעת ערוץ, לפי החוק v22), חשבון רשום (שמירה וביטול), חשבון ותיק + אורח, מכשירים מרובים, OTP שגוי וכשל רשת. בלי משלוח לקוראים.
5. **ניטור:** ירידה בשגיאות `watch_toggle`, אין הודעות כפולות, מרכז העדכונים הקיים מציג את המעקב פעם אחת.

## ד. מה נשמר ללא שינוי
המנוע והזהות הקיימים; כל המעקבים והמנויים השמורים (אין `backfill` ואין העברת `cat` ל־`series`); מעקב קטגוריה ישן אינו מוצג כאילו נבחרה הסדרה; כשנשמרו גם הסדרה וגם הקטגוריה הישנה באותו שם יוצג יעד אחד (חוק v22 ו־`follow-series-release-20261031.md`). אין הפעלת מייל/Push/WhatsApp בעקבות מעקב; ערוץ דורש בחירה מפורשת נפרדת. מעקב רזיאל, העולם והקהילה לא נוגעים.

## ה. החזרה לאחור
קוד: להחזיר את `POST_FOLLOW_PUBLIC_2029` ל־`false` (פריסה קודמת, באישור). מסד: `rollback.sql` של החבילה. ההעדפות, ההיסטוריה וההודעות נשמרו בבדיקות החבילה המקורית (72 בדיקות SQL) וחייבות לרוץ מחדש.

## ו. מה לא נבדק
אימות Auth/OTP אמיתי, מעבר חשבון ותיק/חדש בדפדפן, וקליטת הודעה בנתיב ה־API החי; ביקורת חיצונית עצמאית (החוק v22 מחייב challenge עצמאי לפני שחרור); התאמת `watch_toggle` החדשה לקבלה (ראו ב).
