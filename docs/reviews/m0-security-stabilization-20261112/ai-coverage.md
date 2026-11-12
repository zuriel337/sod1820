# M0 — טבלת כיסוי לכל נתיבי ה־AI בתשלום (12.11.2026, סבב 2)

> **מצב:** COMMITTED · BRANCH-ONLY. שום דבר לא נפרס. הטבלה מתארת את הקוד בענף (״אחרי M0״) ואת מה שלא משתנה.
> **מקורות:** קוד הענף; ‏`list_edge_functions` (קריאה בלבד, 12.11): גרסה ו־`verify_jwt` של כל פונקציה; גוף `ai_quota_check` החי; ‏`fn_capability_execution_gate_v1` כפי שהקוד קורא לו. לא בוצעה אף קריאה חיה לנקודת קצה.
> **בעלים (Owner Index, בלי לשנות חוקים):** גישה וזכאות — `platform_tiers_law` **v5 ACTIVE** (entitlement/access seam). מטבע אחד — `unified_credit_system` (תחת Access). ‏`ai_quota_law` v3 ו־`journey_ai_guard_law` v1 **אינם פעילים** (`is_active=false`), כלומר היסטוריה בלבד. המנגנון החי של המכסה היומית הוא ה־RPC `ai_quota_check` (יום לפי Asia/Jerusalem). ההחלטה ״AI בתשלום — מחובר בלבד״ היא של ZURIEL מ־12.11.

## מכסת בקשות ≠ תקרת הוצאה

- **כל המגבלות כאן הן מכסות בקשות** (ספירת קריאות בחלון), לא תקרת הוצאה בכסף. **אין היום אף תקרת הוצאה** (₪ או $) שעוצרת קריאה לספק.
- ההוצאה נמדדת רק בדיעבד: `ai_token_log`, ‏`op_trace_link_ai_cost_v1` ולוח `admin_ai_cost`. בקריאת מטריצת ELS העלות נרשמת בשורת העבודה (`els_matrix_reading_job_cost_v1`), גם היא בלי תקרה.
- התקרה היומית הגלובלית (600 / 300 / 500) מגבילה את ההוצאה רק בעקיפין: מספר קריאות × מחיר מרבי לקריאה. תקרת הוצאה אמיתית היא החלטה נפרדת (M1, תחת `unified_credit_system`), ולא הוכנה כאן.

## א. הנתיבים ש־M0 משנה

| נתיב (גרסה פרוסה · `verify_jwt`) | זהות | מגבלות אחרי M0 (סוג: מכסת בקשות) | היקף המונה | פטור מנהל / שרת | דגל פתיחה | כשל | בדיקה שמוכיחה |
|---|---|---|---|---|---|---|---|
| `ai-analyze` גנרי, כולל `kind=number` (v91 · true) | JWT של משתמש שאומת בשרת. אורח → **401 `sign_in_required`** לפני כל I/O | 30 לשעה לחשבון · 120 לשעה גלובלי · 600 ליום גלובלי · ואז השער הקנוני: מכסה יומית לחשבון (`p_budget_kind: ai_quota`; בנתיב המהיר: 200 ליום למשתמש) | דלי חשבון: HMAC של `u:<id>` · דלי גלובלי: מפתח HMAC קבוע · יומי: `ai_quota_check` עם זהות `g:<hmac>` | מנהל: עובר את דליי השעה; לא נספר ולא נחסם בתקרה היומית; ‏`ai_quota` לא מוגבל למנהל. שרת (Bearer = מפתח service-role): הנתיב ההיסטורי, בלי שער כניסה ובלי דליים | `kind=number` → ‏`lock_number` (כבוי = פתוח; מנהל עוקף). שאר ה־kinds: אין | **סגור**: 503 `rate_limit_unavailable`; 429 `rate_limited` / `daily_cap_reached` + `Retry-After` | `test/m0b-paid-ai-handlers.test.mjs`: ‏״number path: guest -> 401״, ״verified user passes…״, ״bucket denial -> 429, limiter outage -> 503; neither reaches gate or model״, ״admin keeps working…״, ״trusted service-role server call…״ · `test/m0b-caller-limits.test.mjs` (8 מבחנים) |
| `ai-analyze` `kind=guide` (אותה פונקציה) | אותה זהות. אורח → **401** (שינוי של הסבב: קודם אורח היה מותר) | 20 לשעה לחשבון · 60 לשעה גלובלי · 300 ליום גלובלי · ואחריהם מכסת ״אנטי־לולאה״ הקיימת: 300 ליום לחשבון (`<זהות>:g`) | כמו בשורה הקודמת, ‏scope `ai-analyze:guide` | מנהל: עובר את דליי השעה, פטור מהתקרה היומית. שרת: ללא שינוי | אין | **סגור** (503 / 429) | ‏7 מבחני ״ai-analyze guide…״: אורח 401; משתמש עובר את ארבעת השלבים ומגיע לספק פעם אחת; חסימת דלי חשבון / גלובלי / יומי → 429 **בלי קריאה לספק**; מגביל לא זמין (HTTP, חריגה, 503 של המונה היומי) → 503 **בלי קריאה לספק**; אנטי־לולאה מסרב; מנהל. שימוש בפועל: 3 קריאות ב־60 יום, שיא 2 לשעה |
| `ai-analyze` רזיאל באתר (`persona=raziel`) | משתמש `u:`; אורח = HMAC של כתובת הפלטפורמה (לא `visitor_id`). בלי כתובת → אין ספירה ואין מודל | מכסה יומית לזהות דרך `ai_quota_check`: מהיר `:f` (אורח 30, משתמש 200), עמוק — ברירת המחדל של השער. **אין** דלי שעה ואין תקרה יומית גלובלית בנתיב הזה | לזהות | מנהל: ‏`ai_quota` לא מוגבל | **`lock_raziel_site` סגור היום לכולם חוץ מהמנהל** | **סגור** לכל קורא מהאתר (`quota_unavailable`) | ״Raziel guest quota: changed visitor_id -> same quota identity…״, ״Raziel site: quota RPC failure refuses the model call (fail CLOSED)״ |
| ↳ קריאת מטריצת ELS בתוך רזיאל | מנהל בלבד; כבוי כברירת מחדל (`ELS_MATRIX_READING_ENABLED`) | אין מכסה נוספת; העלות נרשמת | עבודה | — | env | — | חוזי `elsMatrixReading` הקיימים (לא שונו) |
| `ai-analyze` ערוץ WhatsApp מהימן (`trusted_channel` + מפתח service) | זהות WhatsApp שהשרת קבע | מכסה יומית לזהות, כמו קודם | לזהות | — | — | **פתוח** (היסטורי, לא שונה) | ״trusted WhatsApp channel: quota RPC failure keeps its historical fail-open (unchanged)״ |
| `number-researcher` (v12 · false) | משתמש מאומת; אורח → 401 בלי I/O | 20 לשעה לחשבון · 60 לשעה גלובלי · 300 ליום גלובלי · ואז השער הקנוני לחשבון | כמו ב־ai-analyze, ‏scope `number-researcher` | מנהל: פטור מהתקרה היומית | אין | **סגור** | ״number-researcher: a guest gets 401 sign_in_required with zero I/O…״ + `m0b-caller-limits` |
| `lab-teacher` (v3 · false) | כנ״ל | 30 / 60 / 300 · ואז השער הקנוני | scope `lab-teacher` | כנ״ל | אין | **סגור** | ״lab-teacher: a guest gets 401…״ |
| `journey-message` (v13 · false) | כנ״ל; אורח → 401 לפני כל מגביל | 40 לשעה לחשבון · 120 לשעה גלובלי (ללא שינוי) · **חדש:** 500 ליום גלובלי. תקציב השער נשאר `none` | scope `journey-message` | מנהל: פטור מהתקרה היומית | אין | **סגור** | ״journey-message: a guest gets 401…״ |
| `field-router` (v10 · false) | משתמש מאומת + `profiles.tier ≥ 3` (**לאף חשבון אין**, כולל המנהלים) | `router_rate_check`: ‏20 ליום לחשבון (`ROUTER_DAILY_CAP`). אין גלובלי | לחשבון | **אין פטור מנהל** (כמו היום) | אין | **סגור**: אין פרופיל / tier לא מספרי / מגביל לא זמין → סירוב | ״field-router: missing profile, unreadable profiles, missing tier or unavailable limiter all refuse before spend״ |
| `contact-notify` (v1 · false) — **דוא״ל בתשלום, לא AI** | אין (טופס ציבורי) | 5 לשעה לכתובת פלטפורמה · 30 לשעה גלובלי | HMAC של כתובת · גלובלי | — | — | **סגור**: בלי מגביל, נמען או מפתח ספק — לא נשלח דוא״ל | `test/m0e-contact-notify.test.mjs` (6) |
| `els-search-bridge` (v5 · true), `research-run` (v9 · true) — **חישוב ציבורי, לא AI** | משתמש, אחרת HMAC של כתובת הפלטפורמה | ELS: ‏60 לשעה לאורח / 120 למשתמש לכל פעולה, ‏batch ‏120 · ‏research-run: ‏120 לשעה · שניהם: 120 לדקה גלובלי | לנושא · גלובלי | — | `lock_els` (ELS) | **פתוח** בתקלת מגביל; 429 רק בדחייה מפורשת | ״els-search-bridge: limiter outage fails OPEN…״, ״research-run: limiter outage fails OPEN…״, ״public compute fails OPEN on limiter failure…״ |

## ב. נתיבי AI בתשלום ש־M0 לא משנה (מוגנים בזהות מנהל או שרת)

15 פונקציות פרוסות נוספות קוראות לספק AI. M0 לא נוגע בהן. הסיווג נעשה מקוד המאגר (זהה ב־`949c24ad5` וב־`146f2f0e7`). את הקוד הפרוס שלהן **לא השוויתי** למאגר; נרשמו רק הגרסה ו־`verify_jwt` מ־`list_edge_functions`.

| פונקציה (גרסה · `verify_jwt`) | בדיקת הקורא בקוד | מגבלה פנימית |
|---|---|---|
| `gallery-ocr` (v18 · true) | `x-run-key` = ‏`OCR_RUN_KEY` | `MAX_BYTES` |
| `post-to-storyboard` (v12 · false) | `x-run-key` = ‏`STORYBOARD_RUN_KEY` | — |
| `post-ai-edit` (v5 · true) | `rd_is_admin()` עם ה־JWT של הקורא | — |
| `raziel-attention` (v4 · true) | `users.role='admin'` לפרופיל היחיד שנתמך; כל פרופיל אחר → 400 | — |
| `claude-raziel` (v1 · true, בלי מקור במאגר) | JWT אמיתי של משתמש + `role='admin'` (אשכול E) | — |
| `lab-reflect` (v3), `research-extract` (v8), `wa-ocr` (v9) — כולן false | `x-fb-admin-key` = ‏`FB_ADMIN_KEY` | — |
| `research-nurture` (v9 · false) | כנ״ל | `MAX_NURTURES` |
| `video-transcribe` (v7 · false) | כנ״ל, **וגם** מסרבת כשהמפתח לא מוגדר | — |
| `wa-video-enrich` (v11 · false) | כנ״ל | `MAX_STT_BYTES` |
| `wa-gabriel` (v16), `wa-hatishbi` (v8), `wa-michael` (v7), `wa-uriel` (v18) — false | כנ״ל | `MAX_PER_HOUR` |
| `wa-mora` (v6 · false) | כנ״ל | `MAX_PER_RUN` |
| `wa-raziel` (v21 · false; בתוך M0 רק להוצאת מזהים אישיים) | כנ״ל; ה־AI עצמו עובר ב־`ai-analyze` בערוץ המהימן | — |

**סיכון שנשאר (לא שונה, M1):** ההשוואה `req.headers.get("x-fb-admin-key") !== ADMIN_KEY` (וכך גם `x-run-key`) מקבלת כותרת **ריקה** אם הסוד לא מוגדר, כי `"" === ""`. רק `video-transcribe` בודקת את זה. לא יכולתי לוודא שכל הסודות מוגדרים: הכלים שלי מציגים שמות של secrets רק דרך לוח הבקרה. ההקשחה המוצעת היא שורה אחת לכל פונקציה, `if (!ADMIN_KEY) return 403`. היא לא הוכנה כאן, כי היא מחוץ להחלטת M0.

## ג. מה עוד לא מכוסה, במפורש
- **רזיאל באתר כשהדגל ייפתח:** אורח יוכל להשתמש בו במכסה לזהות, בלי דלי שעה ובלי תקרה יומית גלובלית. לפי ההחלטה ״מחובר בלבד״, צריך לחייב כניסה ולהוסיף את המגבלות המשותפות באותו שינוי שפותח את `lock_raziel_site`. זה נדחה בכוונה (`apply-plan.json` → `deferred_not_in_m0`).
- **תקרת הוצאה בכסף:** אין בשום נתיב (ראו למעלה).
- **`field-router`:** גם מנהל לא יכול להשתמש בו (אין tier≥3). זה המצב גם היום, ולא נוסף פטור.
