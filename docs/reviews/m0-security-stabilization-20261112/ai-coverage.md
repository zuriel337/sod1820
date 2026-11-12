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

## ב. נתיבי AI בתשלום ש־M0 לא משנה (מוגנים בזהות מנהל או שרת) — לפי הקוד הפרוס

**תיקון סבב 3 (ביקורת Codex):** בסבב 2 נכתב כאן שההשוואה למפתח מקבלת כותרת ריקה כשהסוד לא מוגדר. **הטענה הייתה שגויה.** נבדקה מקוד המאגר בלבד, ושורת החסימה שלפני ההשוואה נעלמה מעיניי. עכשיו כל שורה נבדקה **בקוד הפרוס** (`get_edge_function`, ‏12.11, קריאה בלבד). בכל אחת קיימת חסימה של סוד חסר לפני ההשוואה, או שער מחמיר ממנה. **לא נוספה אף הגנה.**

| פונקציה · גרסה · `verify_jwt` · ‏`ezbr_sha256` | הסדר בקוד הפרוס (לפני כל קריאה לספק) | בלי הסוד | מגבלה פנימית |
|---|---|---|---|
| `gallery-ocr` · v18 · true · `470c1167…` | **חריג:** עם `OCR_RUN_KEY` — ‏`x-run-key` חייב להיות שווה לו (אחרת 401). **בלי** `OCR_RUN_KEY` — רק סשן מנהל מאומת (`caller.verified && tier === "admin"`, מ־`users.role`), אחרת 401. אחרי זה מפתח הספק, ואז `fn_capability_execution_gate_v1` | מנהל מאומת בלבד | `MAX_BYTES` ‏4.5MB לתמונה · עד 50 תמונות לקריאה |
| `post-to-storyboard` · v12 · false · `5f85c49c…` | `if (!RUN_KEY) → 503 not_configured`; ‏`x-run-key` שונה → 401 | 503 | — |
| `post-ai-edit` · v5 · true · `e9d042c5…` | **חריג:** אין מפתח. ‏`rd_is_admin()` עם ה־JWT של הקורא (`requireCanonicalAdmin`) → אחרת 403 | — | — |
| `raziel-attention` · v4 · true · `931386e3…` | **חריג:** ‏`op: "history"` מחזיר רק את השיחה של המשתמש המאומת עצמו, בלי מודל. כל השאר: פרופיל `ZURIEL_RESEARCH` דורש `users.role = 'admin'` (אחרת 403); כל פרופיל אחר → 400 | — | — |
| `claude-raziel` · v1 · true · `50882540…` (בלי מקור במאגר) | JWT אמיתי של משתמש + `role = 'admin'` (אשכול E, נקרא מהקוד הפרוס ב־12.11) | — | — |
| `lab-reflect` · v3 · false · `75c4793f…` | `if (!ADMIN_KEY) → 503`; ‏`x-fb-admin-key` שונה → 403 | 503 | — |
| `research-extract` · v8 · false · `7d645942…` | כנ״ל (503 / 403) | 503 | עד 20 אובייקטים לקריאה |
| `research-nurture` · v9 · false · `1475732b…` | **חריג:** בקשת `?unsub=<token>` מטופלת קודם: עדכון `unsub` לפי האסימון בלבד, בלי AI ובלי מפתח. אחריה 503 / 403 כמו השאר | 503 | `MAX_NURTURES` ‏3 · ‏`BATCH` ‏15 |
| `video-transcribe` · v7 · false · `8e957ab3…` | `if (!ADMIN_KEY || כותרת שונה) → 401` (בדיקה אחת) | 401 | — |
| `wa-video-enrich` · v11 · false · `876989e2…` | 503 / 403. תמלול רק עם `allow_stt=true` מפורש, אף פעם לא מה־cron | 503 | `MAX_STT_BYTES` ‏24MiB · עד 10 שורות |
| `wa-gabriel` · v16 · false · `2d45c6a0…` | 503 / 403 | 503 | `MAX_PER_HOUR` ‏20 |
| `wa-hatishbi` · v8 · false · `d027d923…` | 503 / 403 | 503 | `MAX_PER_HOUR` ‏8 |
| `wa-michael` · v7 · false · `63fa75cf…` | 503 / 403 | 503 | `MAX_PER_HOUR` ‏30 · ‏`MAX_TOOL_LOOPS` ‏10 |
| `wa-uriel` · v18 · false · `832270a3…` | 503 / 403 | 503 | `MAX_PER_HOUR` ‏6 |
| `wa-mora` · v6 · false · `fe6c11db…` | 503 / 403 | 503 | `MAX_PER_RUN` ‏20, קריאת AI אחת לריצה |
| `wa-ocr` · v9 · false · `4dbc2ee4…` | 503 / 403 | 503 | — |
| `wa-raziel` · v21 · false · `61677665…` (index = ‏`b4d5ec47`) | 503 / 403. ה־AI עצמו עובר ב־`ai-analyze` בערוץ המהימן | 503 | — |

**ראיה:** לכל שורה, הקוד הפרוס בגרסה הרשומה, כפי שהוחזר מ־`get_edge_function` ב־12.11, וה־`ezbr_sha256` מ־`list_edge_functions` באותו יום. המגבלות הפנימיות הן קבועים בקוד, לא מכסה של שרת.

**שנשאר, דיווח בלבד (לא M0, לא שונה):** ב־`wa-gabriel`, ‏`wa-hatishbi`, ‏`wa-michael` ו־`wa-uriel` הפרוסים (וגם במאגר) יש מזהי טלפון וקבוצה אישיים כמחרוזות בקוד. זה אותו סוג ש־M0 הוציא מ־`wa-raziel` למשתני סביבה. הערכים לא מועתקים לכאן. ההחלטה אם לטפל בהם (M1) היא שלך.

## ג. מה עוד לא מכוסה, במפורש
- **רזיאל באתר כשהדגל ייפתח:** אורח יוכל להשתמש בו במכסה לזהות, בלי דלי שעה ובלי תקרה יומית גלובלית. לפי ההחלטה ״מחובר בלבד״, צריך לחייב כניסה ולהוסיף את המגבלות המשותפות באותו שינוי שפותח את `lock_raziel_site`. זה נדחה בכוונה (`apply-plan.json` → `deferred_not_in_m0`).
- **תקרת הוצאה בכסף:** אין בשום נתיב (ראו למעלה).
- **`field-router`:** גם מנהל לא יכול להשתמש בו (אין tier≥3). זה המצב גם היום, ולא נוסף פטור.
