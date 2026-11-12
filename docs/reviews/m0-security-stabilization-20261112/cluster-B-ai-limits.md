# M0 — אשכול B: זהות ומכסה ל-AI בתשלום, מגבלות קצב למחשוב ציבורי, הסרת מידע אישי מקוד Edge — 12.11.2026

> ענף עבודה מבודד (worktree), בסיס `origin/main` `949c24ad549ae9e95ced528a4ee8159670b52678`.
> **שום דבר כאן לא מוזג, לא נפרס ולא הוחל.** לא שונו Production, מסד נתונים, Edge Functions, secrets, Vercel או דגלים.
> קריאות חיות שבוצעו: SELECT בלבד על קטלוג (`pg_proc`, `pg_policies`, `information_schema`, `cron.job`), ספירות מצרפיות, `query_logs` ו-`list_edge_functions` — קריאה בלבד. לא הופעלה אף נקודת קצה חיה.
> **סבב 2 (12.11.2026):** ‏`kind=guide` עובר עכשיו את המגבלות המשותפות, ואורח מקבל 401 (§2). השורה הישנה ״אורח עדיין מותר״ בוטלה. בעלים לפי ה־Owner Index: ‏`platform_tiers_law` v5 ACTIVE (גישה וזכאות) ו־`unified_credit_system`. ‏`ai_quota_law` v3 ו־`journey_ai_guard_law` אינם פעילים, והמנגנון החי הוא ה־RPC `ai_quota_check`. לא שונה אף חוק. טבלת הכיסוי לכל נתיבי ה־AI: `ai-coverage.md`. השוואת הפריסות וה־rollback: `edge-drift-and-rollback.md`.
> ההחלטה המחייבת: ZURIEL, 12.11.2026 — קריאות AI בתשלום רק למשתמש מחובר ומאומת בשרת, מכסה לכל חשבון ותקרה יומית גלובלית; `visitor_id` מהדפדפן לעולם אינו זהות מכסה; אורח מקבל סירוב "התחברו" עם קוד יציב; WhatsApp רזיאל ונתיבי שרת-לשרת מהימנים נשארים בדיוק כפי שהם.

## 0. לוח מצב

| נושא | מצב | מה קיים | מה נדרש מצוריאל |
|---|---|---|---|
| AI בתשלום רק למחובר (ניתוח דף המספר ב-`ai-analyze`, `number-researcher`, `lab-teacher`, `journey-message`) | **IMPLEMENTED + COMMITTED (ענף בלבד)** | `_shared/edgeCallerLimits.js`, `_shared/materialGate.js`, ארבע הפונקציות, בדיקות | אישור פריסה (§8) |
| זהות מכסה שאינה טענת דפדפן (שורש הבעיה) | **IMPLEMENTED** | `materialGate.resolveCaller`, `ai-analyze resolveIdentity` | אותה פריסה |
| מכסה נכשלת סגור ל-AI בתשלום | **IMPLEMENTED** | `ai-analyze checkQuota` (חוץ מערוץ WhatsApp המהימן), `field-router` | אותה פריסה |
| `ai_quota_check` מסרב לזהות ריקה | **PROPOSAL, NOT APPLIED** | `supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql` + ROLLBACK + `tests/sql/m0b_ai_quota_fail_closed_v1.sql` (עבר מקומית). **סבב 5 (ביקורת Codex):** השומר בודק עכשיו התאמה מלאה של הגוף (md5 של `pg_get_functiondef`): לפני = `7981f2a5…` (נקרא מהחי ב־12.11, וקובץ ה־ROLLBACK משחזר אותו בית בבית), אחרי = `17e71b6f…`. שינוי בכל סעיף אחר עוצר את ההחלה ואת ה־rollback בלי לדרוס. נבדקו גם הרצה כפולה (no-op) ושמירת בעלים והרשאות | אישור החלה (§8) |
| מגבלות קצב למחשוב ציבורי (`els-search-bridge`, `research-run`) | **IMPLEMENTED**, נכשל פתוח בתקלת מגביל | שתי הפונקציות + בדיקות | אישור פריסה |
| מידע אישי בקוד Edge (`wa-raziel`, הערות ב-`ai-analyze`) | **IMPLEMENTED** | מספרים ומזהי קבוצות עברו למשתני סביבה | הגדרת secrets (§8, לא חוסם) |
| מלאי כתיבות-אורח (§3.3 במפת ההרשאות) | **INVENTORY ONLY** | §7 | הכרעה M0/M1 |
| חיווט CI לבדיקות החדשות | **בוצע** (בענף המשולב) | `live-contracts-2029.yml`: שלב ״M0 security contracts״ ו־`security-sql-contracts` | — |

## 1. מה נמצא בקריאה החיה (לפני השינוי)

1. **שורש הבעיה.** `materialGate.resolveCaller` ו-`ai-analyze resolveIdentity` זיהו אורח לפי `body.visitor_id`, ואם אין — לפי הערך **הראשון** ב-`X-Forwarded-For` (שהלקוח שולט בו). החלפת `visitor_id` פתחה מכסה חדשה; בלי שניהם הזהות הייתה ריקה.
2. **`checkQuota` ב-`ai-analyze` נכשל פתוח**: כשל רשת/HTTP החזיר `allowed: true`.
3. **`public.ai_quota_check`** (גוף חי, `pg_get_functiondef`) מחזיר `allowed: true` לזהות `NULL`/ריקה. ההרשאה הנוכחית היא `PUBLIC` (`=X/postgres`), כלומר גם anon יכול לקרוא לה ישירות — את זה סוגר M0-A (REVOKE).
4. **המגביל האטומי מוגבל בגוף החי:** `edge_rate_limit_check` מצמיד חלון ל-60..3600 שניות ומגבלה ל-1..120 לכל דלי, והוא זמין ל-`service_role` בלבד. משמעויות:
   - "תקרה יומית" אינה ניתנת לביטוי ב-`edge_rate_limit_check` (חלון מקסימלי שעה). לכן התקרה היומית הגלובלית נבנתה על המונה היומי האטומי הקיים `ai_quota_check` (יום לפי Asia/Jerusalem), עם זהות אטומה שנגזרת בשרת (`g:<HMAC>`). אין מגביל חדש ואין טבלה חדשה. זו סטייה מכוונת מהניסוח "שתיהן דרך `edge_rate_limit_check`" — ראו §10.
   - הערכים 600/240 שהיו כתובים ב-`els-search-bridge` עבור `verify_batch` היו בפועל 120 (ההצמדה ב-SQL). הקוד החדש כותב 120 במפורש — הערך האפקטיבי לא השתנה.
5. **`field-router`**: שער tier≥3 עבר כשאין שורת `profiles` או כשהקריאה נכשלה, ו-`router_rate_check` שנכשל לא חסם. בקריאה החיה: 230 משתמשים, ל-230 יש שורת `profiles`, **לאף אחד אין tier≥3** (כולל שני המנהלים), השימוש האחרון ב-`ai_router_usage` ב-14.7.2026. כלומר הפונקציה סגורה בפועל לכולם, והחורים היו פתוחים רק לזהות בלי פרופיל.
6. **מידע אישי:** ב-`wa-raziel` היו מספר טלפון, שלושה מזהי קבוצות ומספר ברירת-מחדל לצוריאל כמחרוזות בקוד; ב-`ai-analyze` היו כתובות דוא"ל אישיות בהערות לרשימת הבטא הסגורה. (ההיסטוריה של Git עדיין מכילה אותם — לא בתחום.)
7. **כותרת הפלטפורמה:** ב-`function_edge_logs` של 24 השעות האחרונות `cf-connecting-ip` קיים ב-100% מבקשות ה-POST ושווה תמיד ל-`x-real-ip`. זו הכתובת שהקוד משתמש בה; גיבוי — הקפיצה **האחרונה** ב-XFF, לעולם לא הראשונה.

## 2. לפני / אחרי לכל נקודת קצה

| נקודת קצה (גרסה פרוסה) | לפני | אחרי |
|---|---|---|
| `ai-analyze` נתיב גנרי — ניתוח דף המספר וכל ה-kinds הגנריים (v91, `verify_jwt=true`) | אורח מותר; מכסה לפי `visitor_id`/IP; `p_flag_key: null` | אורח → **401 `sign_in_required`** לפני כל I/O נוסף. משתמש מאומת: דלי חשבון 30/שעה, דלי גלובלי 120/שעה, תקרה יומית גלובלית 600 — כולם נכשלים סגור (503 `rate_limit_unavailable`, 429 `rate_limited`/`daily_cap_reached` עם `Retry-After`). אחר כך השער הקנוני כרגיל (מכסה יומית לכל חשבון ב-`ai_quota`). `kind=number` עובר גם את דגל הזמינות הקיים `lock_number` (כיום כבוי=פתוח; מנהל עוקף). קריאה פנימית עם מפתח service-role — ללא שינוי. |
| `ai-analyze` persona=raziel (אתר) | זמינות לפי `lock_raziel_site` (כיום סגור לכולם חוץ ממנהל); מכסה fail-open; זהות אורח `visitor_id` | הזמינות לא השתנתה. זהות המכסה לאורח = HMAC של כתובת הפלטפורמה; זהות ריקה → אין ספירה ואין מודל. כשל מכסה → `quota_unavailable` (תשובות דטרמיניסטיות ממשיכות כרגיל, בלי מודל). |
| `ai-analyze` ערוץ WhatsApp המהימן (`trusted_channel` + מפתח service) | — | **ללא שינוי**, כולל fail-open של המכסה. |
| `ai-analyze` kind=guide | מכסה לפי `visitor_id`, fail-open | **סבב 2:** אורח → **401 `sign_in_required`**. משתמש מאומת: דלי חשבון 20 לשעה, גלובלי 60 לשעה ותקרה יומית גלובלית 300 (`enforcePaidAiLimits`, ‏scope `ai-analyze:guide`; נכשל סגור: 503 / 429 + `Retry-After`). אחריהם מכסת האנטי־לולאה הקיימת (300 ליום לחשבון). מנהל פטור מהתקרה היומית; קריאת service-role — ללא שינוי. שימוש: 3 קריאות ב־60 יום. |
| `number-researcher` (v12, `verify_jwt=false`) | אורח מותר, מכסה לפי `visitor_id` | אורח → 401. משתמש: חשבון 20/שעה, גלובלי 60/שעה, יומי גלובלי 300, ואז השער הקנוני (300/יום לחשבון). `op: "interview"`/`"history"` — ללא שינוי (אין מודל). |
| `lab-teacher` (v3, `verify_jwt=false`) | אורח מותר | אורח → 401. משתמש: חשבון 30/שעה, גלובלי 60/שעה, יומי גלובלי 300, ואז השער הקנוני. |
| `journey-message` (v13, `verify_jwt=false`) | אורח 12/שעה לפי IP, מאומת 40/שעה, גלובלי 120/שעה, נכשל סגור | אורח → 401 לפני כל limiter. מאומת 40/שעה וגלובלי 120/שעה — **ללא שינוי**; נוספה תקרה יומית גלובלית 500 (נדרשת בהחלטת הבעלים). תקציב השער נשאר `none`. |
| `field-router` (v10, `verify_jwt=false`) | חורי fail-open | אין פרופיל / tier לא מספרי / קריאה נכשלה → `tier`/`tier_unavailable`; `router_rate_check` לא `true` → `rate`/`rate_unavailable`. tier≥3 עדיין התנאי היחיד. |
| `els-search-bridge` (v5, `verify_jwt=true`) | מפתח `anon:<XFF ראשון>:<user-agent>` (ניתן לסיבוב), כשל מגביל → 503 | נושא = משתמש מאומת, אחרת HMAC של כתובת הפלטפורמה (בלי UA). אותן מגבלות לנושא (page/verify 60 אורח / 120 משתמש לשעה; batch 120). **חדש:** דלי גלובלי 120/דקה לכל סוג פעולה. כשל מגביל → **ממשיך (fail-open)**; דחייה מפורשת → 429. |
| `research-run` (v9, `verify_jwt=true`) | ללא מגבלה | נושא (משתמש או HMAC כתובת) 120/שעה + גלובלי 120/דקה, לפני trace/gate/executors. כשל מגביל → ממשיך; דחייה → 429. `visitor_id` נשאר תווית trace/gate בלבד. |
| `wa-raziel` (v21) | מזהים אישיים בקוד | `WA_RAZIEL_CHRISTINA_PHONE`, `WA_RAZIEL_AMIT_GROUP`, `WA_RAZIEL_GILUI_GROUP`, `WA_RAZIEL_OPEN_GROUPS`, `ZURIEL_WA` (בלי ברירת-מחדל). ענפי הקבוצות מאחורי `GROUPS_ENABLED=false`, כך שגם בלי ה-secrets ההתנהגות החיה זהה. |

מפתחות הדליים הם HMAC-SHA256 תחת מפתח ה-service-role (שקיים בכל פונקציה): כתובת IP, מזהה משתמש ו-user-agent לעולם אינם נשמרים בטבלת הדליים, והמפתח הגלובלי אינו ניתן לניחוש מהקוד הפתוח.

## 3. מפת קוראים

| פונקציה | קוראים | מצב אחרי השינוי |
|---|---|---|
| `ai-analyze` | דפדפן: `src/lib/supabase.js` (`getAiAnalysis`, `askRaziel`, רזיאל מתקדם), `NumberAiAnalysis2029.jsx`, `CommunityCalculatorPage.jsx`; שרת: `wa-raziel` (מפתח service + `trusted_channel`) | `supabase.functions.invoke` שולח אוטומטית את ה-JWT של המשתמש המחובר (`fetchWithAuth`, supabase-js 2.116.0) — **אין צורך בשינוי דפדפן**. `wa-raziel` — ללא שינוי. |
| `els-search-bridge` | דפדפן (ELS 2029, צופן, ResearchProvider, מסע חיים); שרת: `ai-analyze verifyElsMatrixAxis` עם הכותרת של הקורא | עובד לכולם. קריאה פנימית של אורח מגיעה מכתובת היציאה של Edge (דלי משותף — כמו היום). |
| `research-run` | דפדפן: `Heichal2029Page.jsx`; שרת: `ai-analyze` (רזיאל, עם JWT הקורא) | עובד; קריאה פנימית מקודדת לפי המשתמש כשיש JWT. |
| `journey-message` | `src/lib/supabase.js` | אורח מקבל 401 (ממילא חסום ב-SW, §6). |
| `number-researcher` | `src/lib/visits.js` | כנ"ל. |
| `lab-teacher` | אין קורא ב-`src/` | כנ"ל. |
| `field-router` | אין קורא ב-`src/`, ה-SW חוסם | סגור (כמו בפועל היום). |
| cron / `net.http_post` | `cron.job`: 21 משימות לפונקציות, אף אחת לא לפונקציות האלה (רק `wa-raziel` כל 2 דקות). אין פונקציית SQL שקוראת להן. | ללא שינוי. |
| קריאות "canary" ידניות | ב-`op_trace_roots` יש 3 קריאות אורח עם surface `canary*` (22–25.10) | יקבלו 401 — מכוון; אימות אחרי פריסה לא יקרא ל-AI בתשלום (§9). |

## 4. המגבלות שנבחרו ולמה

ראיות (קריאה בלבד): `op_trace_roots` ל-60 יום (שורש trace אחד לכל קריאה) ו-`function_edge_logs` ל-24 שעות.

| משפחה | שיא לשעה (60 יום) | שיא לדקה | שיא ליום | מגבלה שנבחרה |
|---|---|---|---|---|
| ELS (`els:*`) | 289 | 29 | 876 | נושא: כפי שהיה; גלובלי 120/דקה (≈7,200/שעה, פי 4 מהשיא לדקה) |
| research-run (`research-w2:*`) | 55 | 7 | 154 | נושא 120/שעה (מעל השיא של כל האתר יחד); גלובלי 120/דקה |
| ai-analyze גנרי | 44 | — | 98 | חשבון 30/שעה; גלובלי 120/שעה (המקסימום של המגביל); יומי 600 (פי 6 מהשיא) |
| journey-message | 6 | 3 | 17 | 40/שעה ו-120/שעה ללא שינוי; יומי 500 |
| number-researcher / lab-teacher | 0 ב-60 יום | — | — | חשבון 20 / 30 לשעה; גלובלי 60/שעה; יומי 300 |

ב-24 השעות האחרונות: `els-search-bridge` 94 קריאות מ-8 כתובות (שיא לכתובת 21/שעה), `research-run` 7 מ-7 כתובות, אפס קריאות ל-AI בתשלום, אפס תשובות 429.

## 5. כללי כשל

- **AI בתשלום נכשל סגור:** מפתח שרת חסר, מגביל לא זמין או תשובה לא תקינה → 503 בלי trace, בלי שער ובלי ספק. זהות ריקה → אין מונה ואין מודל.
- **מחשוב ציבורי נכשל פתוח:** תקלת מגביל אינה חוסמת את מנועי הגימטריה וה-ELS; השער הקנוני וה-trace (שנכשלים סגור) נשארים כמו שהיו.
- **מנהל:** עובר את דליי השעה כמו כולם, ולא נספר/נחסם בתקרה היומית הגלובלית (אותו פטור ש-`ai_quota_check` נותן לו לכל חשבון). אורח מנהל אינו קיים — מנהל תמיד מאומת.
- **נתיבים מהימנים:** בקשה שהנושא שלה הוא בדיוק מפתח ה-service-role נשארת בהתנהגות הקודמת (WhatsApp, וכל קריאת שרת-לשרת בנתיב הגנרי).

## 6. אימות הטענה על ה-Service Worker

`public-reading-deploy/transport.js`: `adminFunctions` כולל את `ai-analyze`, `research-run`, `els-search-bridge`, `journey-message`, `number-researcher`, `lab-teacher`, והם מועברים ב-`adminFetch` רק אחרי `verifyReadingAdmin`. **חריג:** ל-`els-search-bridge` יש ענף ציבורי מפורש לפני כן (שלוש פעולות, גוף מוגבל) — הוא פתוח לכל מבקר. `field-router` אינו ברשימה ונחסם לכולם.
הראיה החיה תואמת: ב-7 הימים האחרונים כל עקבות ה-AI בתשלום הם של מנהל (3 ניתוחי מספר, 2 רזיאל, 1 מלווה); קריאות אורח/משתמש ל-`ai-analyze:number` נעצרו ב-3–4.11 (מעבר ל-2029). **לכן לא צפוי שינוי גלוי לציבור.** לא נבדק: Preview, דפים לפני שה-SW תופס שליטה, וקריאות ישירות ל-API (ההגנה בשרת היא שמכסה אותן). תצפית: `research-run` קיבל 7 קריאות מ-7 כתובות ב-24 שעות למרות שה-SW מעביר אותו רק למנהל — מקורן לא בורר (Preview, קריאה פנימית או ישירה).

## 7. מלאי כתיבות-אורח (מפת ההרשאות §3.3) — מלאי בלבד, ללא שינוי

הקוד כבר קורא כותרות PostgREST ב-SQL: `add_guest_community_message` (`cf-connecting-ip` → `x-real-ip` → XFF ראשון, נכשל סגור בלי כתובת) ו-`add_contribution` (XFF ראשון בלבד). לכן מגבלה ברמת מסד ישימה בלי מנגנון חדש: `current_setting('request.headers', true)` + `public.edge_rate_limit_check(encode(sha256(...),'hex'), …)` מתוך פונקציית SECURITY DEFINER.

| יעד | הגנה היום (קריאת גוף/מדיניות חיה) | נפח | המלצה |
|---|---|---|---|
| `add_guest_community_message` | דגל הפעלה, תגובות בלבד, honeypot, אורך, בלי קישורים, 3/שעה ו-10/יום לכתובת, ספירה גלובלית לשעה | — | קיים. M1: להוריד את גיבוי ה-XFF הראשון |
| `add_contribution` | אורך/intent; לאורח 5/שעה לכתובת לפי **XFF ראשון — ניתן לזיוף** | — | **M0 מומלץ (זול):** אותו סדר כותרות כמו `add_guest_community_message` |
| `toggle_contribution_reaction` | מפתח `auth.uid()` או `p_visitor` מהלקוח; אין קצב | — | M1 (ניפוח תגובות; ה-SW מצמצם ל-`p_visitor` קבוע) |
| `community_hints` insert | מדיניות ל-anon קיימת אך **אין GRANT INSERT ל-anon** | 0/30 יום | סגור לאורח בפועל; אין פעולה |
| `propose_community_word` | אורך, עברית, ערך, כפילויות; אין קצב | — | M1 (הצפת תור אישור) |
| `add_wall_word` | אורך/עברית/ערך, upsert מונה; אין קצב | — | M1 (ניפוח מונה) |
| `save_wall_word_private` | אורך, upsert; אין קצב | — | M1 |
| `save_els_matrix_anon` | עד 20 ממתינים לכל `visitor_id` (ניתן לסיבוב) | — | M1: מגבלת כתובת |
| `contact_messages` | RLS: אורכים בלבד; ה-SW מאמת צורה; אין קצב | 5/30 יום | M1 (אם `contact-notify` שולח דוא"ל לכל הודעה — לשקול M0; הפונקציה פרוסה v1 ואין לה מקור בריפו — DRIFT לבדיקה) |
| `research_leads` | RLS: דוא"ל תקין ואורך | 1/30 יום | M1 |
| `owner_note_requests` | RLS: אורך שדות | 0/30 יום | M1 |
| `subscribers` | RLS: רק מטרה כללית בלי הסכמות | 59/30 יום | M1 |
| `notification_prefs_guest_save_v1` | אורך, upsert לפי `p_visitor`; כולל דוא"ל | — | M1 |
| `increment_post_share` | upsert מונה; אין בדיקות | — | M1 (שלמות אנליטיקה בלבד) |
| `ai_signal` | מעדכן מוני הצבעה ב-`ai_analysis_log` לכל id; אין בדיקות | — | M1 (או REVOKE אם אין קורא) |
| `track_visit` | אורך נתיב; ה-SW מצמיד לנתיב החלון | — | M1 (גידול טבלה בקריאה ישירה) |
| `ingest_event` | ה-SW מאמת צורה; בשרת אין קצב | — | M1 |

כל אחת מאלה היא וקטור ספאם/שלמות נתונים בנפח נמוך, לא וקטור עלות. M0 נשאר ממוקד ב-AI בתשלום ובמחשוב; החריג המומלץ ל-M0 הוא תיקון סדר הכותרות ב-`add_contribution` (שורה אחת, תבנית קיימת) — לא הוכן כאן.

## 8. פעולות Production מדויקות (כולן דורשות אישור מפורש של צוריאל, CLAUDE.md 0.4)

סדר מומלץ:

1. **Secrets ל-`wa-raziel` (לא חוסם):** `WA_RAZIEL_CHRISTINA_PHONE`, `WA_RAZIEL_AMIT_GROUP`, `WA_RAZIEL_GILUI_GROUP`, `WA_RAZIEL_OPEN_GROUPS` (שני מזהי הקבוצות הפתוחות הנוספות, מופרדים בפסיק), ולוודא ש-`ZURIEL_WA` מוגדר (הוסרה ברירת המחדל מהקוד). הערכים נמצאים ב-`git show 949c24ad5:supabase/functions/wa-raziel/index.ts`; לא נכתבו בשום מקום. כל הענפים שמשתמשים בהם מאחורי `GROUPS_ENABLED=false`.
2. **SQL:** `supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql` (עצמאי; בטוח לפני או אחרי הפריסה). מומלץ יחד עם REVOKE של M0-A על `ai_quota_check`/`router_rate_check`.
3. **פריסת Edge** (כל אחת עם `_shared/edgeCallerLimits.js`, ואלה שמייבאות את `_shared/materialGate.js` — גם אותו), בלי לשנות `verify_jwt`:
   - מחשוב ציבורי: `els-search-bridge` (`verify_jwt=true`), `research-run` (`verify_jwt=true`, דרך `npm run package:research-run`).
   - AI בתשלום: `ai-analyze` (`verify_jwt=true`, דרך `node scripts/package-ai-analyze.mjs` — נבדק מקומית: 19 מקורות כולל הקובץ החדש), `number-researcher`, `lab-teacher`, `journey-message`, `field-router` (כולן `verify_jwt=false`).
   - `wa-raziel` (`verify_jwt=false`).
   - `gallery-ocr` ו-`raziel-attention` מייבאות את `materialGate` אך אין להן שינוי התנהגות; אין צורך לפרוס.

## 9. Rollback לכל פעולה

| פעולה | חזרה |
|---|---|
| SQL | `supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql` (הגוף החי המדויק מ-12.11.2026; נבדק בבדיקת ה-SQL) |
| Edge | **סבב 2:** מהמקור **הפרוס בפועל**, לא מהבסיס: `node scripts/m0-edge-rollback-assemble.mjs <slug> <dir>` (`edge-rollback/manifest.json`). חמש מהתשע אינן זהות לבסיס (`edge-drift-and-rollback.md`). לפני הפריסה: אותה גרסה ואותו `ezbr_sha256` ב־`list_edge_functions`. |
| Secrets | הקוד הישן אינו קורא אותם; אין צורך בחזרה. |

## 10. סיכונים, סטיות והחלטות פתוחות

1. **תקרה יומית דרך `ai_quota_check` ולא `edge_rate_limit_check`** — המגביל החי אינו מחזיק חלון של יום. החלופה: להרחיב את ההצמדה ב-SQL (משנה פונקציה משותפת, וגם מחיקת הדליים אחרי שעתיים תשבור חלון יומי). ההחלטה שלי: מונה יומי קיים; ממתין לאישור.
2. **CGNAT:** הסרת ה-user-agent מהמפתח ב-ELS מאחדת משתמשים אנונימיים שמאחורי אותה כתובת (נפוץ ברשתות סלולר). מגבלת אורח 60/שעה לעמוד נשארה; בשיא שנצפה כתובת אחת הגיעה ל-21/שעה. אם יופיעו 429 — להעלות חלון/מגבלה בהחלטה מפורשת.
3. **`journey-message`** קיבל תקרה יומית גלובלית (500) — מעבר ל"מחובר בלבד", כי ההחלטה דורשת תקרה כזו לכל AI בתשלום.
4. **`kind=number` נקשר ל-`lock_number`.** אם הדגל יינעל במצב `all`, גם הניתוח ייסגר (מנהל עוקף). שאר ה-kinds הגנריים נשארים בלי דגל.
5. **`field-router`** נשאר סגור לכולם (אין tier≥3), כולל מנהלים — כפי שהוא היום. לא נוסף עקיפת מנהל.
6. **מפתח service-role הוא מלח ה-HMAC:** סיבוב המפתח מאפס את הדליים (פעם אחת, לא מזיק).
7. **ה-SQL החי עדיין מאפשר ל-anon לקרוא ל-`ai_quota_check`** עד ש-M0-A יוחל. התקרה הגלובלית מוגנת כי הזהות אטומה (HMAC).
8. **`contact-notify`** פרוס בלי מקור בריפו. נבדק באשכול E: המקור הוכנס, הנמען עבר ל־env ונוספו גבולות קצב. ה־rollback הוא שווה־ערך פונקציונלי.
9. **ניתוח AI בדף המספר לחבר רגיל:** בשרת הוא כעת פתוח למחובר; ה-SW עדיין חוסם לא-מנהלים. פתיחה ציבורית היא החלטה נפרדת על ה-SW.

## 11. אימות אחרי פריסה (בלי שום קריאת AI בתשלום)

1. `list_edge_functions`: גרסה עלתה ב-1 לכל פונקציה שנפרסה, `verify_jwt` ללא שינוי.
2. `get_edge_function` (קריאה): הקוד הפרוס מכיל `sign_in_required` ו-`edgeCallerLimits`. רק אחרי זה מותרת בדיקת אורח.
3. בדיקת אורח (אחרי 2 בלבד): POST בלי session ל-`number-researcher`/`lab-teacher`/`journey-message`/`ai-analyze` (kind=number) → 401 `sign_in_required`. הקוד החדש מסרב לפני כל I/O, ולכן אין הוצאה.
4. מחשוב ציבורי: חיפוש ELS (פעולת `verify` למופע ידוע) מהדומיין החי → 200; `research-run` דרך ההיכל כמנהל → 200.
5. `wa-raziel`: הריצה הבאה של ה-cron מחזירה 200 (`function_edge_logs`), בלי שגיאות ב-trace.
6. לוגים: אין 5xx חדשים; 429 רק בהתאם לדליים; `op_trace_roots` בלי עקבות אורח חדשות ליכולות בתשלום.
7. SQL: `pg_get_functiondef` מכיל `missing_identity` (קריאה בלבד; לא לקרוא לפונקציה).
לא לבצע: קריאה כמחובר שמגיעה לספק, כל קריאה ל-`field-router`, שינוי דגל.

## 12. בדיקות

- חדשות: `node --test test/m0b-caller-limits.test.mjs test/m0b-paid-ai-handlers.test.mjs` (8 + 22, כולל 7 מבחני `guide` בסבב 2), `bash scripts/run-m0b-ai-quota-sql-test.sh` (Postgres 16 זמני, פורט 55442).
- קיימות שעודכנו מינימלית (מקודדות התנהגות שהבעלים שינה): `test/helpers/ai-analyze-handler.mjs`, `test/helpers/research-run-handler.mjs`, `test/helpers/raziel-ordinary-stages.mjs`, `test/raziel-ordinary-route-contract.test.mjs`, `test/fixtures/raziel-interview-787.mjs`, `test/emergency-p0-containment-20261024.test.mjs`, `test/els-search-bridge-resolve-user.test.mjs`, `test/els-search-bridge.test.mjs`, `test/raziel-quota-trace.test.mjs`, `test/raziel-ai-analyze-generic-numeric-guard-runtime.test.mjs`, `src/lib/research/razielPhaseEToolResearch.test.js`, `scripts/test-g3-d2-public-material-path.mjs`.
- חיווט CI: **בוצע** ב־`live-contracts-2029.yml` (הנוסח המקורי, להיסטוריה:) ב-`.github/workflows/2029-isolation-gate.yml`, בשלב "AI-Analyze early paid paths trace coverage acceptance", להוסיף `node --test test/m0b-caller-limits.test.mjs test/m0b-paid-ai-handlers.test.mjs`; ב-`.github/workflows/live-contracts-2029.yml` ליד בדיקות ה-SQL הקיימות להוסיף `bash scripts/run-m0b-ai-quota-sql-test.sh`; ולהוסיף את `supabase/functions/_shared/edgeCallerLimits.js` לרשימות `paths` שמכילות את הפונקציות המושפעות.
- `deno` אינו מותקן בסביבה — לא בוצע type-check של Deno. הקוד הורץ במלואו בבדיקות דרך `stripTypeScriptTypes`/rolldown.
