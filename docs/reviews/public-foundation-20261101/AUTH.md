# Google / Facebook — מה ידוע ומה לא הוכח

בדיקה ציבורית עדכנית: GoTrue `v2.197.0`; Google, Facebook ודוא״ל מופעלים; הרשמה אינה מושבתת. זוהי בדיקת הגדרות ציבוריות בלבד — לא הוכחת התחברות או הרשאת callback.

החזרה נבדקה מול קוד אותה גרסה:

- `internal/utilities/request.go` — `GetReferrer` בוחר redirect_to רק אם כתובת האתר/רשימת ההפניות מתירה אותו; אחרת Referer מותר, ואז Site URL.
- `internal/api/external.go` — מזהה UUID של flow_state שומר Referrer; callback בוחר External.RedirectURL אם הוגדר, אחריו Referrer של הזרימה, ואחריו Site URL.
- `internal/api/external_oauth.go` — שגיאת טעינת state מפנה אל Site URL. הזרימה הזאת קוראת state מהמסד; היעדר cookie אינו כשלעצמו הוכחה לסיבת התקלה.

מקור: https://github.com/supabase/auth/tree/v2.197.0/internal/api

בדיקות הפתיחה והביטול השמורות בבסיס חזרו ל־Production, לעומת בקרת canonical-origin שחזרה ל־/auth/callback. אינן שומרות את כל פרטי שגיאת ה־state; לכן לא ניתן לייחס את התוצאה בוודאות ל־allowlist, לשגיאת state או להגדרת שרת אחרת. לא שונתה Site URL ולא הוגדרה wildcard.

נדרשת בדיקה בדשבורד https://supabase.com/dashboard/project/linswmnnkjxvweumprav/auth/url-configuration של כתובת `/auth/callback` המדויקת בענף הפריוויו החדש. יש לשמור את Site URL וכל הכתובות האחרות. החיבור הנוכחי אינו כולל ניהול Auth configuration. כתובת ההחזרה של Google/Facebook אל שרת Auth היא עדיין https://linswmnnkjxvweumprav.supabase.co/auth/v1/callback ; אין להחליפה בכתובת הפריוויו אצל הספקים ללא ראיה.

אחרי אישור הרשאת הכתובת: בדיקת פתיחה וביטול של OAuth, ללא יצירת משתמש, פרופיל או דיוור, יכולה לבדוק את מסלול החזרה בלבד. הצלחה בה אינה הוכחת הרשמה, כניסה, יציאה או החלפת חשבון. רק Origin מדויק שהוכח יכול להיכנס להגדרת `VITE_AUTH_VERIFIED_PREVIEW_ORIGINS` הקיימת. עד אז נשמרת חסימת יציאה שקטה אל Production.

החזרה המקומית לאחר כניסה שומרת כתובת, query ועוגני מקור תמימים; מקטעי אסימונים מוסרים. גם ניסיון חוזר אחרי callback שלא הושלם נושא את יעד הגלישה המקורי.
