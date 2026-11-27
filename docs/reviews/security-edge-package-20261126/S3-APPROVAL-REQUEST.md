# S3 — פריסת Edge Function `security-probe-log` + סוד אחד (בקשת אישור נפרדת; לא נפרס)

**מצב:** מוכן לאישור. **לא נפרס, לא נקבע סוד, לא שונה כלום.** תלות: S2 הוחל ואומת (26.11.2026) — `log_security` עכשיו ל־`service_role` בלבד, ולכן המסלול המאומת שהפונקציה הזו מספקת הוא המסלול היחיד שיכול לרשום.
**בעלות (כותב יחיד):** שומר הקצה והאבטחה. **חוק פעיל:** decision 337 (מגדל הפיקוח), `inter_agent_coordination_law` v18.

## 1. מה נפרס בדיוק
פונקציה אחת חדשה: `security-probe-log`, `verify_jwt=false` (כמו `sg-rate-limit`: הקורא מזדהה בטוקן OIDC של Vercel, לא ב־JWT של Supabase). היא היחידה שקוראת ל־`public.log_security` (עם מפתח ה־service role שנשאר בתוך Supabase).

| קובץ | sha256 (מדויק, ראש `ccr-s1-security-edge-20261126`) |
|---|---|
| `supabase/functions/security-probe-log/index.ts` | `e1abef90cd4e86db58ea2ecdcc809cf0a7f190b2be9651df543da0ee7da63a93` |
| `supabase/functions/_shared/securityProbeLogCore.js` | `68ad5e2f716caafbe9422a6f92e768c3c7c97cf71a3ca7214bf49c0abc556990` |
| `supabase/functions/_shared/vercelProductionOidc.ts` | `aaa90b9400803fd7cdc4d69299bc851531da2fcb629008fdc7d77fe9b6c0a413` |

(שלושה קבצים בחבילת הפריסה; `sg-rate-limit` עצמו אינו משתנה ואינו נפרס מחדש, sha256 `a85eae2d…3ecb26`.)

## 2. הסוד
`SECURITY_CANARY_KEY` — מפתח HMAC. **הערך לא ייכתב בצ'אט ולא בריפו.** נקבע בסודות הפונקציה ב־Supabase וב־secret אחד של GitHub Actions (workflow ה־canary), בידי ZURIEL או בהרשאתו המפורשת. אופציונלי: בלעדיו אף שורה לא תישא סימון canary, וההתראה "שתיקה" ב־`check_security_spike` v2 אומרת זאת במפורש.

## 3. מה הוכח (לפני אישור)
- `test/security-probe-log-20261126.test.mjs` + `test/edge-security-probe-20261126.test.mjs`: **26/26 עוברות** (הרצה מקומית על הראש הזה): טוקן OIDC חובה (בלי טוקן, טוקן פגום, שיטה שגויה ו־JWT של Supabase — נדחים ואינם כותבים); קבועי המאמת זהים ל־`sg-rate-limit` (בדיקת אי־סטייה); canary דורש הוכחת HMAC (זיוף/מפתח שגוי/הוכחה ישנה נרשמים כ־`forged-canary`); פרטיות: רק כתובת גסה, נתיב בלי query, טקסט חסום באורך, ללא cookie/Authorization/query; התחברות, אזור אישי ו־`/2029/control` לעולם אינם probe; SEO: כתובות probe noindex ו־`robots`/`sitemap` מחוץ ל־middleware; מהירות: בדיקה סינכרונית זולה; תקרה: 10 דיווחים לדקה לאינסטנס ו־60 שורות בשעה גלובלית בבסיס.
- CI של הענף (שער Postgres 17 + שערי הצד) ירוק על ראש `a1453c329`.

## 4. הוכחת היעדר פגיעה
- פונקציה חדשה בשם חדש: אין קורא קיים. לא נוגעת באף מסלול חי ובלי שינוי DB.
- היום, אחרי S2, `api/honeypot.js` (ב־`main`) עדיין קורא ל־`log_security` במפתח הציבורי ונכשל בשקט (best-effort, 403 למבקר נשמר). ב־`security_log` אין שורה ב־30 השעות האחרונות, כלומר אין אובדן מדיד. המסלול המאומת (S3 ואז S4) הוא מה שמחזיר רישום.
- החזרה: מחיקת הפונקציה (`security-probe-log`) והסרת הסוד; אין תלות ממנה.

## 5. סדר ושער
S3 לפני S4 (מיזוג ופריסת הקצה) — הקצה החדש קורא לפונקציה הזו. אחרי S3: בדיקה שקריאה בלי טוקן מחזירה 401/403 וש־`security_log` לא השתנה. S4–S7 נשארים נפרדים.

**נוסח אישור לדוגמה:** ״מאשר פריסת `security-probe-log` (verify_jwt=false) משלושת הקבצים בגיבובים שלמעלה, וקביעת `SECURITY_CANARY_KEY` בסודות הפונקציה ובסוד ה־Actions. ללא שינוי ב־`sg-rate-limit`, ללא מיזוג/פריסת אתר/DB/WAF.״
