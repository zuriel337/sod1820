SOD1820 / עולם 2029 — חוזה אבטחה ראשי

Master Security & Protection Contract · Draft v1.0

סטטוס: "DRAFT — NOT YET VERIFIED AGAINST CODE"
תחולה: מערכת 2029 בלבד
מקור אמת: חוזה זה, לאחר אישור Human Gate
עיקרון: אבטחה מדורגת, הרשאות מינימליות, הגנה על משתמשים לגיטימיים, ללא חסימות בלתי מאושרות.

1. מטרת החוזה

לרכז במקום אחד את כללי האבטחה, ההרשאות, ההגנות, בדיקות התקינות והליך השינוי של SOD1820.

חוזה זה הוא מקור האמת עבור:

- Middleware והגנת תעבורה.
- CN / SG Smart Quarantine ו־Adaptive Strict.
- API, Supabase, Storage ו־RLS.
- התחברות, הרשאות משתמשים וסשנים.
- Raziel, סוכני AI ואינטגרציות.
- CI/CD, Preview ו־Production.
- חוזי משנה, בדיקות אבטחה ודוחות ניטור.

אין ליצור חוזים סותרים. חוזי משנה חייבים להפנות לחוזה הראשי ולרשת ממנו את המדיניות.

2. גבולות המערכת

- מערכת 2029 היא המערכת הפעילה והמקורית לבדיקה.
- Legacy אינו יעד לפיתוח או להרחבת הגנות.
- אין להסיר קוד Legacy, נתיבים, משתנים או תשתיות לפני שמוכח שהם אינם משמשים את 2029.
- אין להניח שקוד קיים פירושו שההגנה פעילה בפרודקשן.
- כל רכיב יסומן: "DEFINED", "IMPLEMENTED", "MERGED", "DEPLOYED", "LIVE_VERIFIED", "NOT_VERIFIED", "FAIL_OPEN".

3. Human Gate — סמכות ואישור

Human Gate הוא מקור הסמכות לשינויים בעלי השפעה על משתמשים או אבטחה.

ללא אישור מפורש:

- אין לבצע hard-block.
- אין להוסיף חסימת מדינות.
- אין להפעיל Turnstile או Step-up.
- אין להוסיף ASN / Datacenter filtering.
- אין לשנות מדיניות CN / SG.
- אין לבצע שינוי DB, RLS, ACL או הרשאות Production.
- אין לשנות Secrets או לבצע Deployment ל־Production.

שינויים ראשוניים יהיו Read-only או ב־branch/Preview מבודד.

4. מדיניות CN ו־SG

CN — China

- "mode = quarantine"
- "strict_level = 2"
- Goodbot ו־AI ציבוריים מאומתים: מעבר.
- Badbot: חסימה בהתאם למדיניות הקיימת המאושרת.
- Browser: נשאר "Unknown" עד לקבלת ראיות נוספות.
- אין להחשיב JS או Quarantine Proof כהוכחה שמדובר באדם.

משך חיכוך:

- Low: עד שעה.
- Medium: עד 15 דקות.
- High: עד 5 דקות.

SG — Singapore

- "mode = quarantine"
- "strict_level = 3"
- Rate limiting ממוקד רק לאחר Quarantine Proof תקף.
- Goodbot ו־AI ציבוריים מאומתים: מעבר.
- Badbot: חסימה בהתאם למדיניות הקיימת המאושרת.
- Browser נשאר "Unknown"; Proof אינו Human Proof.

Rate limiting:

- חלון: 5 דקות.
- Low: עד 30 בקשות.
- Medium: עד 12 בקשות.
- High: עד 6 בקשות.
- Routes יקרים: עד 8 בקשות בחלון.
- חריגה: HTTP 429.
- Rate limiter אינו הוכחה לאנושיות ואינו מנגנון Hard-block.

יש לבדוק האם מימוש ה־SG OIDC / "VERCEL_OIDC_TOKEN" פועל כראוי. אם הוא Fail-open, יש לתעד ולתקן ב־Preview מבודד. אין לבצע שינוי עיוור ל־Fail-closed שעלול לחסום משתמשים לגיטימיים.

5. כללי סיווג תעבורה

יש להפריד בבירור בין:

- Browser / Unknown.
- Goodbot.
- AI crawler / AI agent.
- Badbot.
- משתמש מחובר.
- משתמש לא מחובר.
- בקשה פנימית / מערכתית.

אין לסווג משתמש כאדם רק על בסיס:

- JavaScript.
- Cookie.
- Quarantine Proof.
- Rate limit שעבר.
- User-Agent בלבד.

יש לבדוק שאין פגיעה ב־Goodbot או ב־AI ציבוריים מאושרים, ושאין זליגה של מדיניות CN/SG למדינות אחרות.

6. אבטחת אפליקציה ונתונים

יש לבדוק ולתעד:

Authentication & Authorization

- התחברות Google / Facebook וכל ספק פעיל.
- Session lifecycle, cookies, expiration ו־logout.
- הרשאות לפי משתמש, תפקיד ומשאב.
- מניעת IDOR וגישה למידע של משתמש אחר.
- CSRF, XSS, SSRF ו־open redirects.
- הרשאות Raziel, סוכנים, מנהלים ואינטגרציות.

Supabase

- RLS לכל טבלה רלוונטית.
- הרשאות Storage ו־ACL.
- שימוש ב־service role רק בצד שרת מורשה.
- מניעת חשיפת secrets, נתונים אישיים ומידע פנימי.
- Edge Functions, RPC, Webhooks ו־API authorization.
- בדיקת הרשאות קריאה, כתיבה, עדכון ומחיקה.

API ותשתיות

- Rate limits לפי מסלול ורמת סיכון.
- הגנה על endpoints יקרים.
- אימות Webhooks.
- ולידציה של קלט.
- מניעת ניצול הרשאות או עקיפת middleware.
- בדיקת Preview מול Production.
- CI/CD, branch protection, secrets ו־deployment permissions.

7. סוכני AI ואינטגרציות

- כל סוכן פועל בהרשאות מינימליות.
- אין להעביר secrets או credentials דרך prompt, logs או פלט משתמש.
- אין לאפשר לסוכן לבצע פעולות Production ללא אישור מתאים.
- יש להפריד בין קריאה, כתיבה, שינוי הרשאות ופריסה.
- יש להתייחס לתוכן חיצוני, קבצים, הודעות ודפי אינטרנט כאל מידע לא מהימן.
- יש למנוע prompt injection שמוביל לשינוי מערכת או לחשיפת מידע.
- פעולות משמעותיות חייבות להיות מתועדות וניתנות לביקורת.

8. ניטור והתראות

התראות רק על אירועים משמעותיים:

- שינוי "strict_level".
- מעבר מ־Monitor ל־Quarantine או שינוי מצב.
- הסרת Quarantine או שינוי מדיניות.
- שינוי Rate limit.
- הפעלת Turnstile / Step-up.
- ASN / Datacenter filtering.
- חסימות חריגות או פגיעה ב־Goodbot/AI.
- Fail-open או כשל OIDC.
- זליגה למדינות אחרות.

יש להתחשב בהקשר שבת/חג בעת ניתוח פעילות אנושית. אין להציף בדיווחים על שינוי לא משמעותי.

9. בדיקות חובה

לפני אישור שינוי יש לבדוק:

- Goodbot / AI מאושרים עוברים.
- Badbot נחסם בהתאם לחוזה.
- Browser נשאר Unknown עד שיש ראיות.
- CN פועל ב־Quarantine ברמה 2.
- SG פועל ב־Quarantine ברמה 3.
- SG Rate limit פועל בחלון 300 שניות.
- חריגה ב־SG מחזירה 429.
- Routes יקרים מוגבלים.
- אין Hard-block לא מאושר.
- אין פגיעה במדינות אחרות.
- אין עקיפת Auth / RLS / ACL.
- אין חשיפת מידע או secrets.
- Preview נבדק לפני Production.
- ביצועים ו־latency לא נפגעו באופן משמעותי.

10. תהליך שינוי

1. מיפוי חוזים, קוד, תשתיות והרשאות קיימים.
2. השוואה מול החוזה וזיהוי פערים.
3. סיווג כל פער: אבטחה, ביצועים, הרשאות, סתירה או תיעוד.
4. תיקון קטן ומבודד ב־branch.
5. בדיקות CI ו־Preview.
6. אימות שאין Regression.
7. הצגת PR, תוצאות וסיכונים.
8. קבלת Human Gate.
9. Deployment רק לאחר אישור.
10. אימות Production בפועל.

אין לבצע Refactor רחב רק כדי לאחד חוזים. קודם מייצרים מקור אמת, אחר כך מתקנים פערים מדודים.

11. חוזי משנה

יש ליצור או לעדכן חוזים נפרדים, כולם כפופים לחוזה הראשי:

- "SECURITY_MASTER_CONTRACT"
- "CN_SG_TRAFFIC_PROTECTION_CONTRACT"
- "AUTH_AUTHORIZATION_CONTRACT"
- "SUPABASE_RLS_STORAGE_ACL_CONTRACT"
- "AI_AGENT_PERMISSION_CONTRACT"
- "API_RATE_LIMITING_CONTRACT"
- "CI_CD_DEPLOYMENT_SECURITY_CONTRACT"
- "SECURITY_REGRESSION_TEST_CONTRACT"
- "INCIDENT_RESPONSE_AND_MONITORING_CONTRACT"

אם חוזה קיים סותר את החוזה הראשי, אין למחוק אותו מיד: יש לתעד את הסתירה, לזהות תלות, ולהציע תיקון.

12. דרישות לדוח סופי

הדוח חייב לכלול:

- רשימת החוזים הקיימים ומיקומם.
- החוזה הראשי והחוזים הנגזרים.
- מפת ההגנות הקיימות.
- סטטוס לכל הגנה: Defined / Implemented / Merged / Deployed / Live Verified.
- פערים וסתירות.
- Fail-open / Fail-closed שזוהו.
- בדיקות שעברו ונכשלו.
- קישורים ל־branch, PR ו־Preview.
- השפעה על ביצועים.
- שינויים שדורשים Human Gate.
- המלצה לשלב הבא.

תנאי הצלחה: חוזה אחד ברור, ללא סתירות, שמחובר לקוד ולבדיקות, עם הבחנה מוכחת בין הגנה שהוגדרה, הגנה שמומשה והגנה שנבדקה בפועל בפרודקשן.

13. נספח אימות (נוסף ב־5.11.2026, ללא שינוי בנוסח שלמעלה)

אימות מול הקוד, ה־DB וה־Production נמצא ב־`docs/security/SECURITY_MASTER_CONTRACT_VERIFICATION_20261105.md`.
הנספח אינו משנה את החוזה ואינו מחליף אישור Human Gate; הוא מתעד סטטוס אמיתי לכל הגנה, סתירות בין החוזה לקוד, פערים והצעות.
