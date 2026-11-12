# M0 — חבילת אבטחה וייצוב מאוחדת · בקשת אישור אחת (12.11.2026)

> **מצב:** COMMITTED · BRANCH-ONLY. לא מוזג, לא נפרס, לא הוחל על המסד, ולא שונו secrets או דגלים.
> **מאגר / ענף:** `zuriel337/sod1820` · `claude/sod1820-system-audit-roadmap-3793us`. בסיס: `origin/main` = Production = `949c24ad5`. הראש מופיע בדוח המסירה.
> **מקור הסמכות:** מפת ההרשאות `SOD1820_PERMISSIONS_MAP_20261112` §6 (עשר ההגנות) ואישור הבעלים המאוחד מ־12.11. הוא כולל את ההחלטות: AI בתשלום — מחובר בלבד; Legacy — לסגור את כל השבע; גלריה — נתיבים ותקרת 120MB עם החרגת מנהל; סעיף 9 בתוך M0, ועמו כלל הברזל ״תוכן גלוי לפני כניסה״; ״גם תתקן מדידה״.
> **מה האישור הזה לא כולל:** הרשאה גורפת להרצת SQL, למיזוג, לפריסה, למחיקת נתונים או לשינוי מערך התשלומים. כל פעולה כאן מפורטת בנפרד ומחכה לאישור מפורש.

## 1. התאמה מדויקת לסעיף 6 במפה

| §6 | ההגנה | אשכול | מה הוכן |
|---|---|---|---|
| 1 | 12 פונקציות מערכת לשרת בלבד; בדיקת מנהל ל־`admin_resolve_translit`; ‏`wa_msg_count` לשרת או לבעלים | **A** | DEF-005 בנוסח M0 (בדיוק 12) · ‏admin guard · ‏`wa_msg_count` לשרת. **נוסף באימות:** `admin_ai_cost` (חשף מזהי צ׳אט ושמות לכל מחובר) |
| 2 | `push_subscriptions` | **A** | DEF-001b שלב 1 ושלב 2 (קיימים, נבדקו מול החי) |
| 3 | AI בתשלום: זהות שרת, מכסה שנכשלת סגור, שער דגל לניתוח המספר | **B** | מחובר בלבד; מכסה לחשבון, שעתית גלובלית ויומית; `visitor_id` לא זהות; הנתיב `guide` נסגר לאורח |
| 4 | גלריה: תפקיד, נתיב, סוג וגודל | **C** | DEF-004 בנוסח M0 + תקרת דלי 120 MiB + החרגת מנהל — ראו `cluster-C-gallery.md` |
| 5 | טבלאות Legacy | **A** | שבע הטבלאות נסגרות לכתיבת לקוח; `lab_*` לקריאת מנהל בלבד; אף שורה לא נמחקת |
| 6 | `feedback` למנהל; ‏`gematria_wall` פרטי מוסתר | **A** | ‏DEF-001b שלב 1 (`feedback`) · ‏policy חדשה ל־`gematria_wall` |
| 7 | גבולות קצב לכתיבות מוצר ולחישובים הכבדים | **B + A** | ELS ו־research-run (נכשלים פתוח) · ‏`add_contribution` לפי כתובת הפלטפורמה · מלאי כתיבות־אורח (`cluster-B` §7) |
| 8 | policies רדומים; cron וסוד; מידע אישי בקוד Edge | **A + B** | 7 policies → מנהל · 4 משימות cron כבויות מוסרות · טלפון וקבוצות ב־`wa-raziel` ודוא״ל בהערות `ai-analyze` → env |
| 9 | ממצא ציבורי במצב ״מועמד״ מוצג עם ״טרם אומת״ + כלל הברזל | **D** | קוראים, חוזה (Design V2 §8.3, §12) ובדיקות קבלה — ראו `cluster-D-visible-content.md` |
| 10 | בירור 8 ה־Edge ב־UNKNOWN | **E** | 6 מוגנות או כבויות, 1 טריגר חסום, 1 פתוחה (`contact-notify`) → הוכנה הגנה |
| — | ״גם תתקן מדידה״ | **F** | פעולות מוצר וצפיות בתוכן נמדדות שוב בבנייה הציבורית, בהקרנת הפרטיות הקיימת |

**הבדל מהרשימה שבהודעה:** הרשימה לא הזכירה את §6 סעיף 7 (גבולות קצב) ואת ״policies רדומים״ שבסעיף 8. שניהם נכללו, כי האישור חל על עשר ההגנות של סעיף 6 המקורי.

**תיקון למספר:** ״5,662 מועמדים״ במפה כלל גם **913 פרטיים**. הממצאים הציבוריים במצב מועמד: **4,574** (`privacy_scope=public`), ועוד 175 בתחום `public_candidate`, שנשלטים על ידי ה־dossier. הפרטיים נשארים פרטיים.

## 2. אשכולות ובעלים

| אשכול | תחום | בעלים קנוני (Owner Index) | כותב | מסמך |
|---|---|---|---|---|
| A | הרשאות מסד, ניהול, חשבון, Legacy, cron | תוכנית האבטחה S2 + שרשרת DEF | CLAUDE (הסשן) | `cluster-A-db-permissions.md` |
| B | AI בתשלום, מכסה, גבולות קצב, PII ב־Edge | `ai_quota_law` / `platform_tiers_law` (דרך `materialGate`) | CLAUDE (worktree מבודד) | `cluster-B-ai-limits.md` |
| C | העלאות לגלריה | ספריות העלאת המדיה + DEF-004 | CLAUDE (worktree מבודד) | `cluster-C-gallery.md` |
| D | ממצאים גלויים + תוכן לפני כניסה | `SOD1820_DESIGN_CONTRACT_V2.md` · `truth_axes_foundation_law` v3 · `canonical_ui_components_law` v12 | CLAUDE (worktree מבודד) | `cluster-D-visible-content.md` |
| E | 8 Edge לא מסווגות | תוכנית האבטחה (S2) | CLAUDE (הסשן) | `cluster-E-edge-unknown.md` |
| F | מדידה | `traffic_intelligence_law` v11 | CLAUDE (הסשן) | `cluster-F-measurement.md` |

כל אשכול נבנה בנפרד (worktree מבודד או קבצים נפרדים), בלי חפיפת כתיבה. השילוב נעשה בענף אחד.

## 3. בקשת האישור — הפעולות המדויקות לפי סדר

סמנו מה מאושר. כל צעד עוצר את הבא אם בדיקה שלו נכשלה.

### שלב 0 — לפני (קריאה בלבד, בלי אישור)
- `tests/live/m0_post_apply_verification.sql`: ריצת ״לפני״ על החי ב־12.11. כל ההגנות `false`, וכל השמורות (קריאה ציבורית, קוראים בבעלות, משימות פעילות, שום שורה לא נמחקה) `true`.
- `node scripts/m0-public-readonly-smoke.mjs`: על החי ב־12.11 — **ALL OK (11/11)**.
- **שער סטייה ל־Edge:** לפני כל פריסת Edge קוראים את הקוד הפרוס (`get_edge_function`) ומשווים לבסיס `949c24ad5`. סטייה = עצירה ודיווח. ל־`ai-analyze` (v91, 31.10) ול־`wa-raziel` (v21, 26.10) ב־`main` יש שינוי מאוחר יותר (4.11, #1191). לא אומת שהם זהים.

### שלב 1 — מסד (`apply_migration`, קובץ אחר קובץ, ואחרי כל אחד שאילתת האימות)
| # | קובץ (`supabase/proposed/`) | rollback | לסמן |
|---|---|---|---|
| 1 | `20261106121000_def001b_visitor_id_exposure_step1.sql` | `ROLLBACK_20261106121000_def001b.sql` | ☐ |
| 2 | `20261106131000_def005_revoke_internal_rpcs_from_clients.sql` (נוסח M0) | `ROLLBACK_20261106131000_def005.sql` | ☐ |
| 3 | `20261112130000_m0a_admin_and_account_guards.sql` | `ROLLBACK_20261112130000_…` | ☐ |
| 4 | `20261112130500_m0a_legacy_client_writes_close.sql` | `ROLLBACK_20261112130500_…` | ☐ |
| 5 | `20261112131000_m0a_dormant_write_policies_admin_only.sql` | `ROLLBACK_20261112131000_…` | ☐ |
| 6 | `20261112133000_m0a_add_contribution_client_address.sql` | `ROLLBACK_20261112133000_…` | ☐ |
| 7 | `20261112120000_m0b_ai_quota_fail_closed.sql` | `ROLLBACK_20261112120000_…` | ☐ |
| 8 | `20261106130000_def004_gallery_storage_upload_policies.sql` (נוסח M0) | ‏ROLLBACK DEF-004 (ראו C) | ☐ |
| 9 | `20261106121500_def001b_push_subscriptions_lockdown.sql` (שלב 2; ה־frontend שמשתמש ב־RPC כבר חי) | `ROLLBACK_20261106121000_def001b.sql` | ☐ |
| 10 | `20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql` | `ROLLBACK_20261112131500_…` (בלי הסוד) | ☐ |
| 11 | **אופציונלי:** `20261112132000_def005b_…_OPTIONAL.sql` (15 שמות בלי קורא) | `ROLLBACK_20261112132000_def005b.sql` | ☐ |

### שלב 2 — secrets (שמות בלבד; הערכים לא נכתבים במאגר)
- `CONTACT_NOTIFY_TO` ל־`contact-notify`. **חובה לפני פריסתה**; בלעדיו הפונקציה מחזירה 503.
- `WA_RAZIEL_CHRISTINA_PHONE`, ‏`WA_RAZIEL_AMIT_GROUP`, ‏`WA_RAZIEL_GILUI_GROUP`, ‏`WA_RAZIEL_OPEN_GROUPS`, ובנוסף אימות ש־`ZURIEL_WA` קיים. לא חוסם: הענפים האלה כבויים (`GROUPS_ENABLED=false`).
- סבב הסוד של 4 משימות ה־cron במקורו, אם הוא משמש בשירות אחר (השוואת digest ב־Supabase Secrets).

### שלב 3 — Edge (לכל אחת: שער הסטייה ← פריסה ← בדיקה בלי קריאת AI בתשלום)
`els-search-bridge` (v5) · `research-run` (v9) · `ai-analyze` (v91) · `number-researcher` (v12) · `lab-teacher` (v3) · `journey-message` (v13) · `field-router` (v10) · `wa-raziel` (v21) · `contact-notify` (v1) — ☐.
`verify_jwt` ללא שינוי. עם כל אחת נשלחים `_shared/edgeCallerLimits.js`, ומי שמייבאת גם `_shared/materialGate.js`. Rollback: פריסה חוזרת של הגרסה הקודמת.

### שלב 4 — קוד האתר (מיזוג ל־`main` ופריסה של ה־SHA המדויק בנוהל המתועד)
המדידה (F), הממצאים הגלויים וכלל הברזל (D), ושינוי ה־Service Worker. מיזוג ☐ · פריסה ☐ · קנרית 15,000ms ללא override.

### שלב 5 — אימות אחרי
- שאילתת האימות: כל השורות `true`.
- smoke: ‏ALL OK.
- בדיקת התקרה בגלריה (כתיבה מבוקרת לפי C §7, ☐).
- אירועי `events` החדשים מופיעים (surface `content` / `share` / `arrival` / `calculator_2029`).
- ‏E2E ״תוכן גלוי לפני כניסה״ מול האתר החי.

## 4. בדיקות (מקומית; CI ירוץ על ה־PR כשייפתח)
- **SQL זמני:** M0-A **ALL PASS** (לפני, אחרי, idempotent, עצירה על drift, rollback זהה בתצלום קטלוג מלא; בדיקות מוטציה תופסות) · M0-B PASS · ‏DEF-001/001b/004/005/003 PASS · ‏DEF-004 (C) — ראו C.
- **Node:** M0-A contract 5/5 · ‏DEF-005 4/4 · ‏M0-B 23 · ‏contact-notify 6/6 · מדידה 6/6 + חבילות האנליטיקה, ה־worker וה־bot-sink הקיימות (25/25) · ‏Legacy retired PASS · ‏module boundary PASS · בנייה ציבורית exit 0.
- **חיווט CI:** `live-contracts-2029.yml` — שלב ״M0 security contracts״, מבחן המדידה בשלב האנליטיקה, ושני רצי SQL ב־`security-sql-contracts`.
- **ידוע, לא קשור ל־M0:** 4 מבחנים שנכשלים גם על `main` נקי בסביבה הזאת: `doc37-mixed-page-readiness`, ‏`posts-public-reading-seo`, ‏`posts-taxonomy-ui-2029`, ‏`release-visual-egress-guard`.

## 5. החלטות שנשארו לצוריאל (לא חוסמות את החבילה)
1. **DEF-005b (אופציונלי)** — 15 פונקציות בלי קורא, לשרת בלבד. המלצה: כן.
2. **רזיאל באתר** סגור היום לכולם חוץ מהמנהל (`lock_raziel_site`). כשייפתח, אורח עדיין יוכל להשתמש בו במכסת שרת. לפי ההחלטה (״מחובר בלבד״), מומלץ לחייב כניסה באותו שינוי שיפתח את הדגל. לא בוצע עכשיו, כי זה משכתב 12 בדיקות מכסה ו־trace.
3. **התקרה היומית** ל־AI בתשלום משתמשת במונה היומי הקיים `ai_quota_check`, כי ל־`edge_rate_limit_check` יש חלון מרבי של שעה. לא נוצר מנגנון חדש.
4. **ניתוח AI בדף המספר כפוף ל־`lock_number`.** נעילת הדף תנעל גם את הניתוח.
5. **לוחות הניהול:** דוחות שקוראים `visitor_events` / `page_views` צריכים לקרוא את `events` החדשים (M1).
6. **PR #1283** (טיוטת GPT ישנה, מדידה) — מומלץ לסגור כמוחלף. **PR #1318** («עכשיו», פתוח) — לא נגענו בקובץ שלו. הוא ו־M0 עורכים שורות שונות ב־`live-contracts-2029.yml`.
7. **יומן התיאום** (`work_log`): לא נכתבו שורות BEFORE/AFTER, כי האישור אינו הרשאה גורפת להרצת SQL על המסד החי. אכתוב אותן ברגע שתאשר.
