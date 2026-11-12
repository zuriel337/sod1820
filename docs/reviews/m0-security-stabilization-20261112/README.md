# M0 — חבילת אבטחה וייצוב מאוחדת · בקשת אישור אחת (12.11.2026)

> **מצב:** COMMITTED · BRANCH-ONLY. לא מוזג, לא נפרס, לא הוחל על המסד, ולא שונו secrets או דגלים.
> **סבב 4 (12.11, אחרי החלטות הבעלים):**
> - ‏`round4-review-package.md` — חבילת הביקורת: שינויים מאז `349db7ee1`, בדיקות CI, מקומיות, דפדפן וחי בנפרד, מלאי כשלים וממצאים.
> - ‏`n6-n14b-whatsapp-package.md` — רזיאל בוואטסאפ.
> - ‏`owner-questionnaire.md` — ההחלטות הפתוחות.
> - ‏`release-request.md` — בקשת ביצוע מרוכזת ומדורגת.
> - **תיקון:** תווית ״טרם אומת״ בדף התורם (M0-D).
> - **מצב חי מעודכן (12.11, 14:38 UTC):** Production ו־`main` הם `ed30dc05b` (`dpl_8wFDbWJmUPWCF7Gm5fBuFFyzMRkK`, מסשן אחר). הענף עודכן מולו. כל אזכור של "Production = `146f2f0e7`" מכאן והלאה הוא מצב קודם.
> **סבב 3 (ביקורת Codex על `349db7ee1`):** ‏`ai-coverage.md` תוקן לפי הקוד הפרוס (הטענה על מפתח ריק בוטלה). השינויים שאינם M0 בחמש הפונקציות פורטו בנפרד (`non-m0-edge-deltas.md`). חבילת השחזור דויקה. ה־view של התורם הוא עכשיו **v2 חדש** במקום שינוי של v1, בגלל לשוניות ישנות שנשארות פתוחות. נקבע סדר rollback מחייב. בקשת השחרור המדורגת: **`release-request.md`**.
> **מאגר / ענף:** `zuriel337/sod1820` · `claude/sod1820-system-audit-roadmap-3793us`. **בסיס הבנייה:** `949c24ad5` (היה Production מוקדם יותר ב־12.11; הפריסה של `146f2f0e7` נוצרה ב־12.11 ‏10:30 UTC בערך). **`origin/main` ו־Production עכשיו:** `146f2f0e7` (#1318; ‏Vercel: ‏`sod1820.co.il` ← ‏`dpl_9sJPZEwhbu7a13cakoeTbjXasm3A`, נקרא ב־12.11). הוא מוזג לענף בקומיט `2a9753287`, והענף ‏0 קומיטים מאחורי `main`. בין שני הבסיסים לא השתנה אף קובץ שבתחום M0. **הראש המדויק** מופיע בדוח המסירה ובטיוטת ה־PR. אין לכתוב אותו כאן, כי כל קומיט משנה אותו.
> **מקור הסמכות:** מפת ההרשאות `SOD1820_PERMISSIONS_MAP_20261112` §6 (עשר ההגנות) ואישור הבעלים המאוחד מ־12.11. הוא כולל את ההחלטות: AI בתשלום — מחובר בלבד; Legacy — לסגור את כל השבע; גלריה — נתיבים ותקרת 120MB עם החרגת מנהל; סעיף 9 בתוך M0, ועמו כלל הברזל ״תוכן גלוי לפני כניסה״; ״גם תתקן מדידה״.
> **מה האישור הזה לא כולל:** הרשאה גורפת להרצת SQL, למיזוג, לפריסה, למחיקת נתונים או לשינוי מערך התשלומים. כל פעולה כאן מפורטת בנפרד ומחכה לאישור מפורש.

## 1. התאמה מדויקת לסעיף 6 במפה

| §6 | ההגנה | אשכול | מה הוכן |
|---|---|---|---|
| 1 | 12 פונקציות מערכת לשרת בלבד; בדיקת מנהל ל־`admin_resolve_translit`; ‏`wa_msg_count` לשרת או לבעלים | **A** | DEF-005 בנוסח M0 (בדיוק 12) · ‏admin guard · ‏`wa_msg_count` לשרת. **נוסף באימות:** `admin_ai_cost` (חשף מזהי צ׳אט ושמות לכל מחובר) |
| 2 | `push_subscriptions` | **A** | DEF-001b שלב 1 ושלב 2 (קיימים, נבדקו מול החי) |
| 3 | AI בתשלום: זהות שרת, מכסה שנכשלת סגור, שער דגל לניתוח המספר | **B** | מחובר בלבד; מכסה לחשבון, שעתית גלובלית ויומית; `visitor_id` לא זהות. **הנתיב `guide`:** אורח → 401, ומשתמש עובר את המגבלות המשותפות (20 / 60 / 300) לפני הספק (סבב 2). טבלת הכיסוי המלאה: `ai-coverage.md` |
| 4 | גלריה: תפקיד, נתיב, סוג וגודל | **C** | DEF-004 בנוסח M0. אורח: תמונות raster בנתיב הקהילה בלבד. משתמש וכותב: קובץ מצורף לקהילה תחת המזהה שלו, אווטאר וכרטיס צופן. מנהל: כל נתיב. תקרת דלי של 120 MiB (הקובץ הקיים הגדול ביותר: 109.6 MiB). קבצים קיימים, קריאה ציבורית ושאר הדליים ללא שינוי. מנהל מעל 120 MiB: דרך `media-upload-intent` הקיים לדלי `media` (בלי תקרה, עד 2 GiB), בלי שינוי Edge |
| 5 | טבלאות Legacy | **A** | שבע הטבלאות נסגרות לכתיבת לקוח; `lab_*` לקריאת מנהל בלבד; אף שורה לא נמחקת |
| 6 | `feedback` למנהל; ‏`gematria_wall` פרטי מוסתר | **A** | ‏DEF-001b שלב 1 (`feedback`) · ‏policy חדשה ל־`gematria_wall` |
| 7 | גבולות קצב לכתיבות מוצר ולחישובים הכבדים | **B + A** | ELS ו־research-run (נכשלים פתוח) · ‏`add_contribution` לפי כתובת הפלטפורמה · מלאי כתיבות־אורח (`cluster-B` §7) |
| 8 | policies רדומים; cron וסוד; מידע אישי בקוד Edge | **A + B** | 7 policies → מנהל · 4 משימות cron כבויות מוסרות · טלפון וקבוצות ב־`wa-raziel` ודוא״ל בהערות `ai-analyze` → env |
| 9 | ממצא ציבורי במצב ״מועמד״ מוצג עם ״טרם אומת״ + כלל הברזל | **D** | פונקציית תווית אחת (`researchPublicStatusPresentation`). המאומתים קודם, בסדר הקיים, והמועמדים בשכבה אחריהם, עד שליש מחלון העולם. ממצא בודד נפתח, כרטיס שיתוף ו־OG נושאים את התווית, noindex נשמר. תוקן באג ש״אישר״ מועמדים בכרטיסי המספר. תמונות אמיתיות בכרטיסי ״עדכונים״, תמונה שבורה לא מוצגת, ממצאי המספר נטענים בלי לחיצה, וקישורי נושא מתים תוקנו. חוזה: Design V2 §8.3 + §12 פריט 10. שערי אמת מכוונים נשמרו (רשימות צבי, בית המדרש, `humanApproved`). **הצעת view** לדפי תורם |
| 10 | בירור 8 ה־Edge ב־UNKNOWN | **E** | 6 מוגנות או כבויות, 1 טריגר חסום, 1 פתוחה (`contact-notify`) → הוכנה הגנה |
| — | ״גם תתקן מדידה״ | **F** | פעולות מוצר וצפיות בתוכן נמדדות שוב בבנייה הציבורית, בהקרנת הפרטיות הקיימת |

**הבדל מהרשימה שבהודעה:** הרשימה לא הזכירה את §6 סעיף 7 (גבולות קצב) ואת ״policies רדומים״ שבסעיף 8. שניהם נכללו, כי האישור חל על עשר ההגנות של סעיף 6 המקורי.

**תיקון למספר:** ״5,662 מועמדים״ במפה כלל גם **913 פרטיים**. הממצאים הציבוריים במצב מועמד: **4,574** (`privacy_scope=public`), ועוד 175 בתחום `public_candidate`, שנשלטים על ידי ה־dossier. הפרטיים נשארים פרטיים.

## 2. אשכולות ובעלים

| אשכול | תחום | בעלים קנוני (Owner Index) | כותב | מסמך |
|---|---|---|---|---|
| A | הרשאות מסד, ניהול, חשבון, Legacy, cron | תוכנית האבטחה S2 + שרשרת DEF | CLAUDE (הסשן) | `cluster-A-db-permissions.md` |
| B | AI בתשלום, מכסה, גבולות קצב, PII ב־Edge | `platform_tiers_law` **v5 ACTIVE** (גישה וזכאות) · `unified_credit_system` (מטבע). ‏`ai_quota_law` v3 ו־`journey_ai_guard_law` **אינם פעילים** (היסטוריה). המנגנון החי: ה־RPC `ai_quota_check`. לא שונה אף חוק | CLAUDE (worktree מבודד) | `cluster-B-ai-limits.md` · `ai-coverage.md` |
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
- **שער סטייה ל־Edge (הושלם בסבב 2, ראו `edge-drift-and-rollback.md`):** ההשוואה בוצעה לכל התשע. שלוש זהות לבסיס, שלוש ישנות ממנו (`number-researcher`, ‏`wa-raziel`, ‏`els-search-bridge`), שני bundles שלא ניתנים לשחזור מההיסטוריה (`ai-analyze`, ‏`research-run`), ופונקציה אחת בלי מקור (`contact-notify`). ה־rollback נשמר מהקוד **הפרוס בפועל**. לפני הפריסה: ‏`list_edge_functions` חייב להראות לכל אחת אותה גרסה ואותו `ezbr_sha256` שב־manifest. כל הבדל: עוצרים.

### שלב 1 — מסד (`apply_migration`, קובץ אחר קובץ; אחרי כל אחד `tests/live/m0_post_apply_verification.sql`)
מקור אחד לרשימה: **`apply-plan.json`**. ה־SHA-256 נבדק במבחן `m0-intermediate-states`, וקובץ שהשתנה מפיל את ה־CI. ב־12.11 אחרי הסבב נבדק בקריאה בלבד שה־md5 ״לפני״ של כל גוף שמתוקן עדיין תואם לחי.

| # | מצב | קובץ (נתיב מלא) · SHA-256 | rollback (נתיב מלא) · SHA-256 | תלות | אימות | לסמן |
|---|---|---|---|---|---|---|
| 1 | חובה | `supabase/proposed/20261106121000_def001b_visitor_id_exposure_step1.sql`<br>`6d4afa5e8cb38e02d2ece0e7c3d37c7963304a518f3c8fe5ae38abf5494cac07` | `supabase/proposed/ROLLBACK_20261106121000_def001b.sql`<br>`6ebdaca92701505136bac8ca624b3a2563d0ec6ea988a756ee70d549445cc1f0` | — | P push RPCs exist; P feedback admin-only; P els_records visitor_id hidden | ☐ |
| 2 | חובה | `supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql`<br>`d87e236981a5e44166003eab04d154a1e6ceab088552bf2df90c91b61e9681d2` | `supabase/proposed/ROLLBACK_20261106131000_def005.sql`<br>`205b76f706f2abbbff0a425e4c5b6f744b69c7fd8478040b2e8cd94341667566` | — | A1 (12 rows + wa_msg_count) | ☐ |
| 3 | חובה | `supabase/proposed/20261112120000_m0b_ai_quota_fail_closed.sql`<br>`1a382f6e1cf5322d093296ec81605dcf6c63f5b6156724a0e56ce9fb002112aa` | `supabase/proposed/ROLLBACK_20261112120000_m0b_ai_quota_fail_closed.sql`<br>`11117fdf3129854cfef6c6389b54eee3fa1e72afbbe0ab01602e0fa79b15722f` | — | B | ☐ |
| 4 | חובה | `supabase/proposed/20261112130000_m0a_admin_and_account_guards.sql`<br>`ad34d69e55c8414c892b19de219727c3176e91e49880d8c77f4ea636cc1b8b9f` | `supabase/proposed/ROLLBACK_20261112130000_m0a_admin_and_account_guards.sql`<br>`2cdecea692457a30533bd1be01262cadbbba7152ab574e695c84d7227e1c35b5` | — | A2, A3, A4 | ☐ |
| 5 | חובה | `supabase/proposed/20261112130500_m0a_legacy_client_writes_close.sql`<br>`818c350110b12b1a0b22066aa73c6fb950a3532c4c086c1e208a272fe30e28c1` | `supabase/proposed/ROLLBACK_20261112130500_m0a_legacy_client_writes_close.sql`<br>`51190d4d20605682448acee7c4bee58eb90a71c924feaa0f358ad142da22b38a` | — | A5 | ☐ |
| 6 | חובה | `supabase/proposed/20261112131000_m0a_dormant_write_policies_admin_only.sql`<br>`0ed383b016bf9a3f63351a8fe327143112b163ded91c58a87a6b72158921bf4a` | `supabase/proposed/ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql`<br>`015de4c2836b8eca81e713ca0d1596704a97d29b2e3d340f747a73063e355dff` | — | A6 | ☐ |
| 7 | חובה | `supabase/proposed/20261112133000_m0a_add_contribution_client_address.sql`<br>`a8da6c8572b1a0eb5741dd54052d5b085a432cb4fc9c620195037f2118dc7d11` | `supabase/proposed/ROLLBACK_20261112133000_m0a_add_contribution_client_address.sql`<br>`bdf305917ca92fe70a2bd44b77c4402b0186dd30f33d03a5dd4429e8c16ba850` | — | A8 | ☐ |
| 8 | חובה | `supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql`<br>`15d2eb42433ceaf43fdddfec6760979365f10611eca4437966127c12c0a76b89` | `supabase/proposed/ROLLBACK_20261106130000_def004_gallery_storage_upload_policies.sql`<br>`44b81f03249be344c5145501578ffd6ef5e359e30c9223ea62b62f25d514bff9` | — | C (3 rows) | ☐ |
| 9 | חובה | `supabase/proposed/20261106121500_def001b_push_subscriptions_lockdown.sql`<br>`e299af193952d796ec2002381f2d5ac5b7c9444344b28a485cfaf825fb132667` | `supabase/proposed/ROLLBACK_20261106121000_def001b.sql`<br>`6ebdaca92701505136bac8ca624b3a2563d0ec6ea988a756ee70d549445cc1f0` | 1; frontend that calls push_subscription_*_v1 is live (true since 949c24ad5) | P push_subscriptions anon table access removed | ☐ |
| 10 | חובה | `supabase/proposed/20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql`<br>`cd7e57e604103c8c759f49c59ef09ad67d4c9dbf0034d4a7039ba62ab345b1b2` | `supabase/proposed/ROLLBACK_20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql`<br>`2cc82bc32a2553dbc1196bafdaefe6dde01a93ce9c658249604b9df255479a8a` | — | A7 | ☐ |
| 11 | חובה | `supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql`<br>`242511115878f3ff0f8e6ebdf7a68cb2c8052df571e00a5a62f399c7bbf2bfce` | `supabase/proposed/ROLLBACK_20261112134000_m0d_world_contributor_research_candidates.sql`<br>`77ccd15cfb0c2d136ee93ad89b511f1c1a9bd5f73857df747d2e1c99e1c1100f` | — | D (v2 exists, admits public candidates, same ACL/options as v1; v1 definition md5 unchanged) | ☐ |
| 12 | אופציונלי | `supabase/proposed/20261112132000_def005b_revoke_uncalled_client_rpcs_OPTIONAL.sql`<br>`265c8ab92f5252408b3094e57fa923ac5d0f96985b0b738ffa45823fbd8ed80b` | `supabase/proposed/ROLLBACK_20261112132000_def005b.sql`<br>`dbafeabfea62486f47b6d09af527e61a6989c6e23a5789160476100e581e1889` | — | (def005b: has_function_privilege for the fifteen names) | ☐ |

**מצב ה־view של דף התורם (שלב 11) — במפורש:** ‏PROPOSAL, NOT APPLIED. **סבב 3:** הקובץ כבר לא משנה את `world_contributor_research_v1`. הוא יוצר `world_contributor_research_v2`: ההגדרה החיה של v1 ועוד מילה אחת (`'candidate'`), עם אותן אפשרויות, אותו בעלים ואותן הרשאות. הוא בודק את כל אלה אחרי היצירה, ונעצר אם v1 השתנה. **v1 נשאר בדיוק כמו היום** (md5 ‏`81581396…`, נבדק שוב ב־12.11), ולכן לשונית שעדיין מריצה את הקוד הישן לא תקבל מועמד. האתר החדש קורא v2, ועובר ל־v1 רק כש־v2 לא קיים. לכן הסדר מול פריסת האתר לא משנה. בחי היום v2 לא קיים (בדיקת "לפני" ב־12.11: שורת D של v2 ‏`false`, שורת v1 ללא שינוי ‏`true`).
**נדחה, לא ב־M0:** site Raziel guest sign-in (lock_raziel_site keeps it closed to all but the admin; changing it rewrites 12 quota/trace tests; decide with the flag opening) · admin dashboards reading the new public events (M1 reader change (visitor_events/page_views -> events)) · per-route upload size caps below 120 MiB (Storage RLS cannot see size; needs client uploads through media-upload-intent (M1)).

### שלב 2 — secrets (שמות בלבד; הערכים לא נכתבים במאגר)
- `CONTACT_NOTIFY_TO` ל־`contact-notify`. **חובה לפני פריסתה**; בלעדיו הפונקציה מחזירה 503.
- `WA_RAZIEL_CHRISTINA_PHONE`, ‏`WA_RAZIEL_AMIT_GROUP`, ‏`WA_RAZIEL_GILUI_GROUP`, ‏`WA_RAZIEL_OPEN_GROUPS`, ובנוסף אימות ש־`ZURIEL_WA` קיים. לא חוסם: הענפים האלה כבויים (`GROUPS_ENABLED=false`).
- סבב הסוד של 4 משימות ה־cron במקורו, אם הוא משמש בשירות אחר (השוואת digest ב־Supabase Secrets).

### שלב 3 — Edge (לכל אחת: שער הסטייה ← פריסה ← בדיקה בלי קריאת AI בתשלום)
`els-search-bridge` (v5) · `research-run` (v9) · `ai-analyze` (v91) · `number-researcher` (v12) · `lab-teacher` (v3) · `journey-message` (v13) · `field-router` (v10) · `wa-raziel` (v21) · `contact-notify` (v1) — ☐.
**השינויים שאינם M0** בחמש הפונקציות שמפגרות אחרי `main` (N1–N13 ב־`non-m0-edge-deltas.md`, ו־N14: קישורים ציבוריים `/number/<n>` ב־`ai-analyze` וב־`wa-raziel`) **אינם חלק מאישור M0**. כל אחד דורש החלטה בשלב 3 של `release-request.md`.
`verify_jwt` ללא שינוי. עם כל אחת נשלחים `_shared/edgeCallerLimits.js`, ומי שמייבאת גם `_shared/materialGate.js`. **Rollback:** מהמקור הפרוס בפועל, דרך `node scripts/m0-edge-rollback-assemble.mjs <slug> <dir>`: בדיקת SHA-256 לכל קובץ, אותו entrypoint ואותו `verify_jwt`. הסקריפט לא פורס. בחמש פונקציות, פריסה מהענף מעלה גם קוד מ־`main` שעוד לא נפרס (`edge-drift-and-rollback.md` §1).

### שלב 4 — קוד האתר (מיזוג ל־`main` ופריסה של ה־SHA המדויק בנוהל המתועד)
המדידה (F), הממצאים הגלויים וכלל הברזל (D), ושינוי ה־Service Worker. מיזוג ☐ · פריסה ☐ · קנרית 15,000ms ללא override.
(סבב 3: שלב 11 כבר לא תלוי בסדר מול האתר; ראו למעלה.)

### סדר rollback מחייב (`apply-plan.json` → `rollback_order`)
1. **SQL שלב 11:** הסרת `world_contributor_research_v2` (v1 לא נגעים בו) — **תמיד לפני החזרת האתר**.
2. **האתר:** החזרת ה־alias לפריסת 2029 הקודמת. קוראים אותה מ־`get_alias` לפני ההזזה קדימה.
3. **Edge:** פריסה חוזרת מ־`edge-rollback/` (מקור זהה / צנזור הערות / שחזור התנהגותי — `edge-drift-and-rollback.md` §2). אותו entrypoint ואותו `verify_jwt`. ל־`contact-notify` נדרש `CONTACT_NOTIFY_TO`.
4. **שאר ה־SQL** בסדר הפוך לרשימת ההחלה, כל אחד עם קובץ ה־ROLLBACK שלו.

### שלב 5 — אימות אחרי
- שאילתת האימות: כל השורות `true`.
- smoke: ‏ALL OK.
- בדיקת התקרה בגלריה: **כתיבה מבוקרת ל־Storage של Production**, לפי `cluster-C-gallery.md` §10, ☐. כוללת:
  - העלאה של 1KB לנתיב מותר;
  - יצירת TUS שמצהירה 121 MiB בלי לשלוח בתים (צפוי 413);
  - נתיב אסור (צפוי 403);
  - מנהל 1KB;
  - בקשת 130 MiB לשער (מחזיר נתיב `media`);
  - מחיקה של אובייקטי הבדיקה בלבד.
- אירועי `events` החדשים מופיעים (surface `content` / `share` / `arrival` / `calculator_2029`).
- ‏E2E ״תוכן גלוי לפני כניסה״ מול האתר החי (`BASE_URL=https://sod1820.co.il node scripts/test-content-visible-before-entry-e2e.mjs`). לפני (נמדד מול Production ‏`949c24ad5`, לפני ש־`146f2f0e7` נפרס): 46/54, והכשלים הם בדיוק החלקים שטרם נפרסו. ענף מקומי: **58/58** (מחשב + iPhone 13).

## 4. בדיקות — סטטיות, התנהגות, וחיות (סבב 3)

תוצאת ה־CI נמסרת לפי SHA בדוח המסירה ובטיוטת ה־PR. כאן לא נכתב SHA, כי כל קומיט משנה אותו. מבחן שלא רץ לא נספר כהצלחה.

**א. בדיקות סטטיות** — קוד וקבצים נקראים, לא מורצים כהתנהגות:
- חוזי M0: אילו קבצים נוגעים במה; ‏DEF-005 בדיוק 12 שמות; אין מזהים אישיים במקור; ‏`ai-coverage` מול הקוד.
- שלמות `apply-plan.json`: כל קובץ ו־rollback קיימים ותואמים ל־SHA-256; אף קובץ M0 לא משנה את v1.
- manifest ה־rollback: סוג מקור לכל פונקציה, חותמות, צנזור בהערות בלבד.
- מצבי ביניים: קריאות service-role בקוד הפרוס הישן, RPC קיימים, ה־worker הישן, ‏sink המדידה.
- הקוד החי (`146f2f0e7`) קורא רק v1; קוראים עם שער סטטוס משלהם נשארים על v1.
- שערי בנייה: Legacy retired, ‏module boundary (927 מודולים), ‏first-load graph, ‏realtime entry split, ‏workflow references.

**ב. בדיקות התנהגות** — קוד שמורץ מקומית או ב־CI מול תלויות מדומות או מסד זמני, אף פעם לא מול החי:
- handlers של Edge (M0-B ‏22, ‏M0-B limits ‏8, ‏contact-notify ‏6). כולל `guide`: אפס קריאות לספק כשדלי או מגביל חוסם.
- שחזור `contact-notify` (בדיקת `CONTACT_NOTIFY_TO` עם ערכי דמה).
- קוראי האתר מול v2 (6): נפילה ל־v1 רק כשהיחס חסר; שגיאת הרשאה לא נבלעת.
- מסלול הממצאים הציבוריים (12), ‏E2E ״תוכן גלוי לפני כניסה״ (58/58 מקומית, סבב 1).
- SQL זמני (Postgres): ‏M0-A, ‏M0-B, ‏DEF-004 ‏(27+108 מקרים), ו־M0-D v2. האחרון: לפני → החלה → אחרי → הרצה חוזרת → rollback → בקרה שלילית. שתי מוטציות נתפסו (בלי `revoke` → ההרשאות שונות; שינוי v1 → עצירה).
- בדיקות הקבלה של השינויים שאינם M0 (`non-m0-edge-deltas.md`).

**ג. בדיקות חיות** — **קריאה בלבד**, 12.11, בלי שום כתיבה ובלי קריאה לנקודת קצה בתשלום:
- `tests/live/m0_post_apply_verification.sql` (״לפני״). כל ההגנות `false`. כל מה שצריך להישמר `true`: קוראי owner-rights, קריאות ציבוריות, שורות lab_notes, cron פעיל, קריאה ציבורית בגלריה, v1 ללא שינוי, מחקר ציבורי.
- md5 ״לפני״ של כל גוף שמתוקן תואם לחי; ‏`ai_quota_check` עדיין בגוף הישן.
- תשע גרסאות ה־Edge ו־`ezbr_sha256` שלהן ללא שינוי. הקוד הפרוס של 15 פונקציות ה־AI שמוגנות במפתח נקרא.
- ACL ו־default privileges של `public` (בשביל v2); ‏Vercel: ‏`sod1820.co.il` ← ‏`146f2f0e7`.
- **לא נבדק בחי:** האם `CONTACT_NOTIFY_TO` ושאר ה־secrets מוגדרים (אין לי כלי שמציג secrets); כל התנהגות אחרי החלה או פריסה (שלב 5, אחרי אישור בלבד).

## 5. החלטות שנשארו לצוריאל (לא חוסמות את החבילה)
1. **DEF-005b (אופציונלי)** — 15 פונקציות בלי קורא, לשרת בלבד. המלצה: כן.
2. **רזיאל באתר** סגור היום לכולם חוץ מהמנהל (`lock_raziel_site`). כשייפתח, אורח עדיין יוכל להשתמש בו במכסה לזהות, בלי דלי שעה ובלי תקרה יומית גלובלית (`ai-coverage.md` §ג). לפי ההחלטה (״מחובר בלבד״), מומלץ לחייב כניסה ולהוסיף את המגבלות המשותפות באותו שינוי שיפתח את הדגל. לא בוצע עכשיו, כי זה משכתב 12 בדיקות מכסה ו־trace.
3. **התקרה היומית** ל־AI בתשלום משתמשת במונה היומי הקיים `ai_quota_check`, כי ל־`edge_rate_limit_check` יש חלון מרבי של שעה. לא נוצר מנגנון חדש.
4. **ניתוח AI בדף המספר כפוף ל־`lock_number`.** נעילת הדף תנעל גם את הניתוח.
5. **לוחות הניהול:** דוחות שקוראים `visitor_events` / `page_views` צריכים לקרוא את `events` החדשים (M1).
6. **PR #1283** (טיוטת GPT ישנה, מדידה) — מומלץ לסגור כמוחלף. **PR #1318** («עכשיו», פתוח) — לא נגענו בקובץ שלו. הוא ו־M0 עורכים שורות שונות ב־`live-contracts-2029.yml`.
7. **גלריה — שינוי התנהגות לאישור:** שלושה נתיבים נעשים מנהל בלבד: תמונת רמז, תמונת poster ותמונה מוחלפת. לאף אחד מהם אין קורא; תיקיית `hints/anon` המשותפת הייתה פתוחה לכל חשבון. גם SVG, ‏HTML ו־HEIC נדחים לתמונת דיווח ולאווטאר (המרת HEIC→JPEG ב־iOS לא נבדקה). **עוד ממצא:** ה־worker הציבורי כבר חוסם היום את תמונת הדיווח של אורח ואת כרטיס הצופן של מי שאינו מנהל. ההחלטה אם לפתוח אותם ב־worker היא החלטת מוצר נפרדת.
8. **מגבלת גודל לכל מסלול מתחת ל־120 MiB** נאכפת רק בלקוח וב־worker, כי RLS לא רואה גודל. אכיפה מלאה בשרת = ניתוב העלאות הלקוח דרך `media-upload-intent` (M1).
9. **ממצאים גלויים:** הטקסט של מועמדים נקלט אוטומטית ולא נבדק על ידי אדם. השומרים הקיימים חלים: פרטי קשר, אזכור הבעלים, חומר מוחרג, מקור חי. האם גם רשימות צבי הייעודיות ודוגמאות בית המדרש יציגו מועמדים? נשארו סגורות כשער מכוון. בכרטיס המלא ״טרם אומת״ (ציר הממשל) מופיע ליד ״מצב בדיקה: אומת״ (ציר המנוע), וזה עלול לבלבל — הצעה לניסוח ב־M1. כמו כן נדרש מצביע ב־`canonical_ui_components_law` (במסד) ל־§8.3 (מצביע בלבד).
10. **יומן התיאום** (`work_log`): לא נכתבו שורות BEFORE/AFTER, כי האישור אינו הרשאה גורפת להרצת SQL על המסד החי. אכתוב אותן ברגע שתאשר.
11. **אין תקרת הוצאה בכסף** באף נתיב AI. כל המגבלות הן מכסות בקשות, וההוצאה נמדדת רק בדיעבד (`ai-coverage.md`). תקרה אמיתית תחת `unified_credit_system` היא החלטת M1.
12. **(תוקן בסבב 3)** הטענה מסבב 2, ש־15 פונקציות שמוגנות במפתח מקבלות כותרת ריקה כשהסוד לא מוגדר, **שגויה**. בקוד הפרוס של כולן יש חסימה של סוד חסר (503/401) לפני ההשוואה. ב־`gallery-ocr`, בלי `OCR_RUN_KEY`, נדרש מנהל מאומת. ב־`post-ai-edit` וב־`raziel-attention` השער הוא זהות מנהל. הפירוט, עם גרסה וראיה לכל אחת: `ai-coverage.md` §ב. לא נוספה הגנה.
13. **תוויות owner ישנות בקוד:** ‏`owner_ref` ו־`ownerRuleRefs` ב־trace של `ai-analyze`, ‏`research-run` ו־`els-search-bridge` מזכירים את `ai_quota_law` v3 ואת `platform_tiers_law` v4. אלה נתוני replay שנרשמים בכל trace, ולכן לא שיניתי אותם. תיקנתי רק את ההערה בראש `journey-message`, שנגעתי בה. ה־DRIFT מדווח; אם לעדכן את התוויות — החלטה שלך.
14. **מזהים אישיים בקוד** של `wa-gabriel`, ‏`wa-hatishbi`, ‏`wa-michael` ו־`wa-uriel` (פרוס ובמאגר). אותו סוג ש־M0 טיפל בו ב־`wa-raziel`; לא בתחום M0. החלטה ל־M1.
15. **מבחן `raziel-canonical-navigation-actions` #6** נכשל גם בבסיס `949c24ad5`, ואינו בתוך CI. לא נגעתי בו.

## 6. ראיות סבב 2 וסבב 3
- `ai-coverage.md` — כל נתיבי ה־AI בתשלום: זהות, מגבלות, היקף המונה, פטורים, דגל, כשל, והמבחן שמוכיח. כולל ההבחנה בין מכסת בקשות לתקרת הוצאה.
- `edge-drift-and-rollback.md` — השוואה של תשע הפונקציות הפרוסות לבסיס ולהצעה, ו־rollback מהמקור הפרוס עם תלויות והגדרות. אין secrets במאגר.
- `intermediate-states.md` — מצבי הביניים בין SQL, ‏Edge והאתר, אמון בכותרות הכתובת, והתנהגות כשהמגביל לא זמין.
- `apply-plan.json` — רשימת ההחלה האחידה (שלב 1 למעלה).
- `non-m0-edge-deltas.md` — סבב 3: כל שינוי שאינו M0 שייכנס בפריסת חמש הפונקציות, עם התנהגות, תלות ובדיקת קבלה.
- `release-request.md` — סבב 3: בקשת השחרור המדורגת, שלב אחר שלב, עם שערים, אימות ו־rollback.
