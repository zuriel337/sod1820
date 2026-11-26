# ביקורת נפח מסד — חלק 3: הכרעת מגדל הפיקוח 337 (26.11.2026)

**מצב:** BRANCH-ONLY. אישור: הכנה בענף בלבד. **לא בוצע** שינוי מסד, שינוי WAF, מיזוג, פריסה או מחיקה. כל קובצי ה־SQL הם `PROPOSAL`/`ROLLBACK` שלא הוחלו; כל הבדיקות רצו על Postgres 16 זמני ועל קוד מקומי.
**בסיס:** נכתב מעל `origin/main` = `ce408e5a3`; הענף הנוכחי מפוצל מחדש מעל `f6f1051d3` (ראו README, ״פיצול הענפים״). **כותב יחיד:** התחום ״ביקורת נפח 26.11״ (`docs/reviews/db-capacity-audit-20261126/`) נשאר של סשן זה; ראו סעיף 8 לכל התחומים האחרים.

> **המשך (חלק 4, 26.11):** בקשות אישור מדויקות לכל הצעה: [`APPROVAL-REQUESTS-20261126.md`](APPROVAL-REQUESTS-20261126.md); חבילת האבטחה הנפרדת נמצאת בענף משלה `ccr-s1-security-edge-20261126` (`docs/reviews/security-edge-package-20261126/README.md` שם; אינה בענף זה); שער 14 יום: [`MEASUREMENT-PARITY-GATE.md`](MEASUREMENT-PARITY-GATE.md). בהתנגשות, חלק 4 גובר: שכבת הקצה מדווחת דרך פונקציה מאומתת (לא `log_security` במפתח ציבורי), ה־canary חתום ואוטומטית חוסם, קובץ האינדקס נכשל במקום להצליח, והגנת ההיסטוריה אוסרת מחיקה ומאפשרת מחיקה אישית רק כ־redaction.

## 0. תיקון לדיווחים קודמים (נבדק מול המסד)

| טענה קודמת (שלי) | המצב בפועל | מקור |
|---|---|---|
| ״`measurement_silence_watch` הוצע ולא הוחל״ | **הוחל חי ב־24.11**: מיגרציות `20261124212329` ו־`20261124215054`; `fn_reliability_watch` חי עם md5 `db5e1827…` (לא `3cc04b93…`); הוא כולל `site_visits` כמד | `supabase_migrations.schema_migrations`, `pg_get_functiondef` |
| ״`traffic_daily` עם באג פתוח, דדליין 15.3.2027״ | **תוקן ב־24.11** (`human_entrances_v2_source_fix_20261124192629`, #1547); ערכי 16–25.11 אינם עוד NULL (`suspected` מלא) | מיגרציה + `traffic_daily` + רשומה `6f3a0089` ביומן |
| ״ל־`fn_reliability_watch` שתי הצעות החלפה מתחרות באותו guard״ | רק PR #1528 (`app-health-incidents-20261123/apply.sql`) נשאר, וה־guard שלו (`3cc04b93…`) **ישן** ויכשל ב־apply | md5 חי |
| ״ה־`supabase/proposed/20261124230000_*` הם הצעות״ | הקבצים עדיין מסומנים ״NOT APPLIED״ אבל הוחלו: **סחף תיעוד** | מיגרציות לעיל |

**מקור הטעות:** הסקתי מצב מקבצי `supabase/proposed` ולא בדקתי `schema_migrations` ויומן. הכלל שהוחל מכאן: מצב DB נקרא מ־`schema_migrations` ומה־md5 החי, לא מכותרת קובץ. התיקון בוצע ב־README וב־`measurement-root-cause-20261124/README.md`.

## 1. עדיפות ראשונה: שיקום ניטור האבטחה

### 1.1 שלושה דברים נפרדים (הבחנה שביקשת)

| שכבה | מה היא עושה | מצב היום | מה הוכן בענף |
|---|---|---|---|
| **מניעה** | חוסמת ניסיון סריקה לפני שהוא מגיע לאתר | **אין.** ‏WAF: `firewallEnabled`, כללי OWASP ו־bot במצב `log` בלבד, 0 כללים מותאמים. כל נתיב סריקה בלי נקודה (`/wp-admin/`) עובר ב־middleware כדפדפן רגיל ומקבל תשובת SPA/404; נתיב עם נקודה (`/wp-login.php`, `/.env`) **כלל לא מגיע** ל־middleware (נבדק בקשת GET אחת לכל אחד דרך כלי Vercel: ‏`/wp-admin/` חזר עם כותרות middleware ‏`vb=browser` ו־`x-sod-country-policy`, ‏`/wp-login.php` חזר בלי אף אחת מהן; שתי התשובות היו `308` של הפניית הדומיין) | `edge-security-probe.js` + `middleware-core.js`: 403 מיידי לרשימה סגורה של נתיבים שלא יכולים להיות באתר, לפני כל קריאת מסד. כלל WAF **לא** נגע (הגדרת Production נפרדת) |
| **תיעוד** | רושמת את הניסיון כדי שנדע מי/מאיפה | **שבור מאז 4.11**: הכותב היחיד (`api/honeypot`) לא בשורש 2029; `security_log` ללא שורות 22 יום | אותו middleware קורא ל־RPC הקיים `log_security` (`waitUntil`, ללא השהיה), עם תקרה של 20 שורות לדקה לאינסטנס |
| **התרעה כשהניטור עצמו מפסיק** | מזהה ש״אין התרעות״ אינו ״אין תקיפות״ | **אין.** ‏`check_security_spike` רץ ומצליח כל שעה, אבל עיוור | `check_security_spike` ‏v2 (SQL, לא הוחל) + בדיקת canary מתוזמנת בסקריפט ה־canary הקיים |

### 1.2 עקרונות שנשמרו
- **שכבת הקצה והתשתיות הקיימות בלבד:** ‏`middleware-core.js` (השומר הקיים), ‏`log_security`/`security_log`/`security_alerts` (קיימים), ‏`post-deploy-canary` (מתוזמן כל 6 שעות, קיים), ‏`admin_system_health` (קורא `security_alerts`). אין טבלה, cron, פונקציית שרת או workflow חדשים.
- **ללא Legacy:** אין `api/honeypot`, אין rewrite ל־`/api/honeypot`, אין החייאת הקוד ההיסטורי (הנתיבים והסיבות נגזרו מהמלאי בלבד).
- **ללא הכבדה:** אין קוד לקליינט ואין קובץ בחבילת הכניסה (שער ה־shell לא רלוונטי). לגלישה רגילה: אפס קריאות מסד נוספות, אפס עלות (הבדיקה: ״ordinary requests never touch security_log״; ה־matcher אינו תופס נכסים סטטיים). נתיב הסריקה עצמו נענה ב־403 בקצה ולא בפונקציה או ב־SPA.
- **מה לא נחסם בכוונה:** ‏`/wp-content/*` (S-56 מפנה ב־308 את מדיה ישנה משם) ו־`/admin/*` (כתובת ישנה שייתכן שהבעלים משתמש בה). בנוסף: מבחן שעובר על כל `KNOWN_SINGLE_SEGMENT_ROUTES` ומוודא שאף אחד אינו נחשב סריקה.

### 1.3 קבצים
- `edge-security-probe.js` (חדש, פונקציות טהורות). ‏`middleware-core.js`: שורת ייבוא, תקרת קצב, בלוק אחד אחרי חישוב ה־path ולפני כל קריאת מדיניות מדינה/slug/מספר; ‏`config.matcher` בשלושת הקבצים (`middleware-core.js`, ‏`middleware.js`, ‏`public-reading-deploy/middleware.js`) מקבל שלוש רשומות לצורות הסריקה עם נקודה: ‏`.php` (גם באותיות גדולות), ‏`/.env|.git|.aws|.ssh|.vscode|.DS_Store` בשורש ומתחת לתיקייה. הרשומה הראשונה זהה לחלוטין לקודמת.
- `scripts/post-deploy-canary.mjs`: בדיקה `security_probe_denied` (פנייה אחת ל־`/wp-admin/sod-security-canary` עם `User-Agent: sod1820-security-canary/1`, בלי עקיבה אחרי הפניות). ברירת מחדל: **`report`** (נרשם כראיה ב־`advisory`, אינו חוסם); ‏`SECURITY_CANARY_MODE=enforce` הופך אותו לבדיקה חוסמת. הסיבה: ‏״Failure blocks the NEXT release״; מיזוג לפני פריסה היה חוסם את הפריסה של עצמו.
- `supabase/proposed/20261126160000_security_monitor_silence_{PROPOSAL,ROLLBACK}.sql`: ‏`check_security_spike`: ספי הספייק (150 בשעה / 100 ממדינה) **ללא שינוי**, שורות canary אינן נספרות כתקיפה; ואם לא הגיעה שורת canary 13 שעות (או מעולם) — שורה ב־`security_alerts` (נראית ב־`admin_system_health`), ‏`work_log` ב־`alert` ו־`notify_admin`, פעם ב־12 שעות. סף 13 שעות = שתי ריצות מתוזמנות שהוחמצו ועוד מרווח.
- בדיקות האבטחה (`test/edge-security-probe-20261126.test.mjs`, ‏`test/security-probe-log-20261126.test.mjs`, ‏`test/security-edge-realpg-20261126.sh`) נמצאות בענף האבטחה הנפרד.

### 1.4 תוצאות בדיקה
- **קוד קצה (מקומי):** ‏30 צורות סריקה מזוהות; 23 כתובות רגילות וכל הנתיבים הידועים (`KNOWN_SINGLE_SEGMENT_ROUTES`) אינם נחשבים סריקה; נכסים סטטיים אינם מפעילים middleware; כל סריקה עם נקודה מכוסה ב־matcher; סריקה ← 403, ‏`x-sod-probe: denied`, שורת `log_security` אחת (מדינה, נתיב בלי query, UA, כתובת **גסה** `/24`), ללא קריאת מדיניות מדינה, ללא `log_crawl`; ‏40 סריקות רצופות ← 40 תשובות 403 ו־≤20 שורות; בוט רע וכתובת רגילה ללא שינוי.
- **SQL (Postgres 16 זמני):** ללא canary ← התרעה אחת (פעם אחת בלבד בתוך 12 שעות); canary טרי ← שקט; canary בן 14 שעות ← התרעה עם הגיל; ‏400 שורות canary אינן ספייק; ‏160 שורות סריקה ממדינה אחת ← ספייק אמיתי עדיין מזוהה; ה־rollback משחזר md5 `052ef520…` בדיוק.
- **הרצה רחבה:** ‏25 קבצי בדיקה שנוגעים ב־middleware/canary/route-legitimacy: ‏142 עברו, ‏4 נכשלו וכולם קדומים (שלושה דורשים `public-reading-deploy/.generated/protected-review-build.js`, תוצר build שלא קיים בסביבה זו; הרביעי הוא קובץ fixture של SQL שהרצת `node --test` תופסת בטעות). נבדק גם עם `git stash`: אותה תוצאה בלי השינוי.

### 1.5 מה **לא** אומת (חשוב)
1. **ה־matcher החדש לא נבדק מול Vercel.** הבדיקות מתרגמות אותו ל־RegExp; ‏Vercel מקמפל אותו עם path-to-regexp. נדרש **Preview מוגן** של הענף לפני כל פריסה; אם הקומפילציה נכשלת, מחזירים רק את שלוש הרשומות הנוספות (הכל כבוי חוץ מתיעוד הנתיבים בלי נקודה).
2. כתובת IP: ה־honeypot המקורי שמר כתובת מלאה; כאן נשמרת כתובת **גסה** (`203.0.113.0/24`) ואין כתובת ל־canary. זו החלטה של ZURIEL (פרטיות מול ערך משפטי של כתובת מלאה).
3. אין מדידה של כמות הסריקות החיה (אין מקור). ההיקף ההיסטורי: ≈0.9–1.8 אלף שורות ביום.
4. ה־canary המתוזמן רץ מ־GitHub; ריצה חד־פעמית של `workflow_dispatch` על ענף אינה אפשרית לפני מיזוג.

### 1.6 סדר החלה מומלץ (כל שלב באישור נפרד)
1. Preview מוגן של הענף; בדיקת 403 + `x-sod-probe` ל־`/wp-login.php`, `/.env`, `/wp-admin/x`, וש־`/`, `/post/..`, `/wp-content/uploads/..` ללא שינוי.
2. מיזוג + פריסה (אישורים נפרדים). הריצה המתוזמנת הראשונה תכתוב שורת canary.
3. אימות: שורה עם `ua like 'sod1820-security-canary%'` ב־`security_log`; הבדיקה `security_probe_denied` ב־`advisory` עברה.
4. רק אז: החלת `20261126160000` (אחרת הפונקציה מתריעה, ובצדק, כל 12 שעות שהניטור שותק) ואז `SECURITY_CANARY_MODE=enforce`.
5. בנפרד: כלל WAF מותאם לנתיבי הסריקה, תחילה `log`.

## 2. מטריצת איחוד המדידה (יכולות שאסור לאבד)

**עיקרון:** ‏`events`/`ingest_event`/`traffic_daily` הוא הבעלים הקנוני (`traffic_intelligence_law` v12). ‏`site_visits` נשארת **נכתבת** עד שכל שורה במטריצה עברה את שער ההוכחה שלה. אין עצירת כתיבה ואין מחיקה במסגרת זו.

| יכולת | מקור נוכחי | מקור קנוני מוצע | הוכחה שנמצאה (26.11) | פער | שער לפני שינוי |
|---|---|---|---|---|---|
| **מבקרים חיים** (`admin_live_visitors`, ‏`admin_realtime_now`) | `site_visits` לפי `visitor`, מסנן בוטים לפי קידומת | `events` (`surface='page'`, ‏`event_type='view'`, ‏`not is_bot`) לפי `sod_id`/`session_id`, חלון N דקות | 24 שעות: 274 מבקרים (`site_visits`) מול 266 `sod_id` ו־344 סשנים (`events`); פער ‏−3% ב־`sod_id` | זהות שונה (`visitor` ממושך מול `session_id` קצר); `admin_live_visitors` מצרף אימייל מ־`visitor_identity` | שכתוב שני ה־RPC מעל `events`, הרצה במקביל 14 יום ובדיקת שוויון ±5% לפני מעבר |
| **זמני שהייה** (`admin_page_dwell`) | `lead(ts)` לכל `visitor` | אותו חישוב על `events`, לכל סשן, תקרת 30 דקות | 7 ימים: חציון שהייה לפי עמוד **כמעט זהה**: `/number/:value` 19/18 שנ׳, `/` 19/19, `/post/:item` 46/46, `/community/chat` 200/200, `/gematria` 20/20, `/world` 25/25, `/code` 87/84; מספר צפיות זהה (625/621, ‏561/559, ‏305/305) | הקטגוריות לפי `?tool=` שב־`admin_page_dwell` הן של Legacy: בשני המקורות הנתיב כבר תווית פרטית (`/number/:value`) ללא query | שכתוב מעל `events` עם אותן תוויות; בדיקת חציון ±2 שנ׳ |
| **מסעות מבקרים** (`admin_visitor_journeys`) | רצף נתיבים לכל `visitor` | רצף `events` לכל סשן | 24 שעות: מסעות של ≥4 צפיות: 23 מול 20 | `events.journey_id` ו־`depth_reached` ריקים (0 שורות); מסע = רצף סשן, לא מזהה מסע | הגדרה אחת למסע (סשן) ובדיקה על 14 יום |
| **בוטים לפי נתיבים** | `site_visits` (שורות `is_bot`, 15,218 ב־7 ימים, **89 תוויות** נתיב, 14.3 אלף מזהים) + `crawl_daily` (קצה, **כל** הבוטים, 194,243 פגיעות ב־7 ימים, אבל רק **13 דליים**, מהם `other` ≈30%) | `crawl_daily` בקצה, עם תווית נתיב במקום דלי גס | `events` אינו מכיל בוטים כלל (0). ‏`crawl_daily` מלא יותר בכמות (13× יותר פגיעות) אך גס; ‏`site_visits` מדויק בנתיב אך רואה רק בוטים שמריצים JS (≈8%) | **זה הפער האמיתי.** שני המקורות משלימים זה את זה | להרחיב את `bucketOf` (או עמודת `path_label` ב־`crawl_daily`, שינוי מסד) לאותן תוויות פרטיות; ריצה מקבילה 14 יום; רק אחריה אפשר להפסיק לכתוב בוטים ל־`site_visits` |
| **צמיחה/תשתית** (`admin_growth_center`, ‏`admin_infra_load`, ‏`vercel_usage_estimate`) | `site_visits` | `traffic_daily` + `events` | לא נבדק ברמת מספרים | תלות בשורות גולמיות לא בדוקות | מטריצת התאמה לפי RPC |
| **גלאי שקט מדידה חי** (`visit_meter_stopped`) | קורא `site_visits` | אותו גלאי על `events`/`traffic_daily` | הוחל חי ב־24.11 (md5 `db5e1827…`) | **תלות Production** ב־`site_visits` | שינוי הגלאי הוא שינוי `fn_reliability_watch` (כותב יחיד: סשן המדידה) |
| **תמונת יום בהיסטוריה** (`refresh_site_visits_history_v1` ← `traffic_history`) | `site_visits` | נשארת עד תום חלון 120 הימים | פועל לפני כל מחיקה | — | אין שינוי |

**מסקנה:** שלוש מארבע היכולות שדרשת (חיים, שהייה, מסעות) ניתנות לשחזור מ־`events` עם שוויון מוכח או כמעט־שוויון, אבל הן דורשות שכתוב של 5–6 RPC ושער הרצה מקבילה. **הרביעית (בוטים לפי נתיב) אינה ניתנת להחלפה היום** ללא הרחבת `crawl_daily`. לכן ההמלצה: **`site_visits` נשארת כמות שהיא** עד שער 14 יום עבר לכל שורה. אין טענת חיסכון נפח או מהירות על איחוד זה (ראו README סעיף 12).

**שאילתות ההשוואה (לקריאה בלבד)** מופיעות בסעיף 9 כדי שאפשר יהיה לחזור עליהן בשער.

## 3. SIZE_INFO — הכנה בענף

- קבצים: `supabase/proposed/20261126130000_capacity_size_info_{PROPOSAL,ROLLBACK}.sql`. הפונקציה היחידה שמשתנה: `fn_capacity_growth_guard_v1` (guard: md5 של `prosrc` החי `89e85b88…`, אומת שהגוף בקובץ `20260930170000` זהה בייט־בייט).
- **ללא שינוי ספים:** ‏`c_watch_bytes` (75 MiB), `c_alert_bytes` (150 MiB), 5%/10% ו־`c_warn_size` (1,400 MiB) נשארו; ערך הסף מופיע ב־payload כפי שהיה.
- **שינוי:** ‏`CAPACITY_WARNING` ← `SIZE_INFO`, שלא כותב `work_log` ולא `suggest_add`. **WATCH ו־ALERT נשארים בעדיפות ובאותן תופעות לוואי.**
- **זיהוי חריגה מול הקצב הרגיל (נשמר ומוגבר, ללא התראה חדשה):** ה־payload מקבל `baseline_weekly_growth_bytes` (חציון הגידול השבועי של התמונות הקודמות), ‏`growth_vs_normal_ratio` ו־`anomaly_vs_normal` (יחס ≥2 ו־≥25 MiB). זה מידע; הפיכתו ל־WATCH היא החלטה על סף ולכן לא נעשתה. בחישוב חי לקריאה בלבד ב־26.11 (אותה שאילתה): בסיס שבועי ‏27.2 MiB (חציון, 26 דגימות), גידול 7 ימים ‏65.9 MiB, יחס **2.42** ← היה מסומן `anomaly_vs_normal=true` בעוד ש־WATCH לא הופעל (65.9 < 75).
- **הוכחה (Postgres זמני; ספי הבייטים הוקטנו פי 1,024 בעותק בדיקה כדי שמסד קטן יגיע לכל מצב):** מצב גודל בלבד: הישן כותב `work_log` והצעה, החדש כותב 0/0/0 ומשאיר `size_warning=true`; WATCH — זהה (`WATCH 1/1/0` בשניהם); ALERT — זהה כולל `notify_admin` (`ALERT 1/1/1`); בלי היסטוריה — אותה עדיפות כמו קודם; אחרי rollback ה־md5 חוזר ל־`89e85b88…`; ה־rollback מסרב על פונקציה שסחפה.
- **נוגעים:** `maintenanceAttention2029.js` (דירוג לפי כותרת: ‏`SIZE_INFO` לא יוצר שורות חדשות, ושורות ישנות ב־`CAPACITY_WARNING` ממשיכות להיות מוצגות עד שאדם סוגר אותן), ‏`test/g3-capacity-growth-runtime.test.mjs` (קורא את המיגרציה ההיסטורית, אינו משתנה), ‏PR #1528 (משנה את `maintenanceAttention2029.js`). אין התנגשות בקבצים.
- **מצב ההצעות הממתינות:** 43 `CAPACITY_WARNING` (30.9–25.11), 14 WATCH ו־6 ALERT (אוקטובר) — **לא נסגרות** על ידי השינוי.

## 4. הסרת האינדקס הכפול — בדיקות מלאות, כולל ״שני האינדקסים חסרים״

הקבצים עודכנו (`20261126120000_drop_duplicate_idx_tv_words_{PROPOSAL,ROLLBACK}.sql`). **באג שנמצא בגרסה הקודמת:** כשהיה `idx_tv_words` חסר הסקריפט חזר מיד ב־NOTICE **לפני** שבדק אם `tv_words_gin` קיים, כלומר ״שני האינדקסים חסרים״ היה נראה כהצלחה שקטה. התיקון: מצב ה־keeper נבדק ראשון.

**התנהגות עכשיו:** כל מצב לא צפוי ← אין DROP, שורת `work_log` אחת ב־`alert` (נושא `🚨 הסרת אינדקס כפול נעצרה (אוטומטי)`), `notify_admin` אחד (מוגן: כשל התראה לא מסתיר את השורה), ו־`WARNING` בפלט. הסקריפט מסתיים בלי שגיאה בכוונה כדי שרשומת ההתראה תישמר (חריגה הייתה מבטלת אותה); הוא מסתיים עם שאילתת אימות. **הצלחה שקטה** רק במצב הרצוי (`idx_tv_words` חסר ו־`tv_words_gin` תקין).

| מצב | תוצאה (נבדק) |
|---|---|
| שניהם קיימים וזהים | נמחק רק `idx_tv_words`, בלי התראה |
| כבר נמחק, ה־keeper תקין | NOTICE, בלי שינוי, בלי התראה |
| **שני האינדקסים חסרים** | אין פעולה; ‏alert + notify אחד; ההודעה מציינת ״אין אינדקס GIN על `tanach_verses.words`״ ואת פקודת השחזור `create index tv_words_gin …`; ‏WARNING בפלט |
| ה־keeper חסר, `idx_tv_words` קיים | לא נמחק (הוא האינדקס היחיד); התראה |
| ה־keeper `invalid` | לא נמחק; התראה |
| אפשרויות שונות (`fastupdate=off`) | לא נמחק; התראה |
| נעילה על הטבלה | מוותר אחרי 3.0 שנ׳ (`lock_timeout`), לא נמחק; התראה |
| ‏rollback | יוצר מחדש (גם כשהשני חסר: ההודעה מציינת לשחזר את `tv_words_gin`) |

11 בדיקות בקבוצה ״idx״ ב־`test/db-capacity-audit-20261126-realpg.sh`.

## 5. מניעת כתיבות no-op, בלי לאחד שלבי מחקר

- קבצים: `20261126140000_research_revision_noop_skip_{PROPOSAL,ROLLBACK}.sql` (guard: md5 של `prosrc` ‏`c57e6d38…`, אומת שהגוף נבנה בייט־בייט מהחי). שינוי יחיד: `if array_length(v_changed,1)=0 then return NEW`. ‏18 העמודות שנעקבות הן כל עמודות הטבלה חוץ מ־`id` ו־`created_at` שאינן משתנות.
- **מה נשמר (נבדק):** שני שלבי מחקר על אותו אובייקט (`meta.ext.corpus_batch` ואחריו `meta.ext.wa_channel_intake`) נשארים **שתי גרסאות**, כל אחת עם ה־preimage המלא של השלב שלה; שינוי סטטוס/תורם נרשם; מחיקה נרשמת; ה־guard של שינוי מהותי (`app.allow_claim_correction`) ממשיך לחסום עריכה ישירה של עובדה מאושרת.
- **מה נחסך:** רק true no-op. 1,565 גרסאות היסטוריות (3.6%, מהן 1,180 ב־21.10). **לא נמחקו ולא יימחקו.**
- **איחוד כתיבות meta:** **לא בוצע ולא מוצע** לשלבים שונים. זוגות 20.11 הם שני תהליכים שונים. מה שמתאפשר הוא תיאום מצד הכותב (שורה אחת לכל אובייקט כשהתהליכים רצים יחד), ורק כשמדובר באותה פעולה לוגית; ההחלטה בידי בעלי הצנרות.
- **משלים בלי DB:** ‏`UPDATE … WHERE col IS DISTINCT FROM new` אצל הכותבים מונע מהטריגר לרוץ.

## 6. מה יאבד במחיקה היומית של `visitor_events`, והאם נדרש ארכוב לפני מרץ 2027

**מה קורה היום:** ‏`fn_telemetry_retention_120d` מוחק עד 10,000 שורות ביום; מאז 28.10 נמחקו 124,422. בטבלה 382,625 שורות: 2,287 כבר מעל 120 יום, 263,384 יגיעו ל־120 יום בין 60 ל־120 יום מהיום, 116,954 צעירות מ־60 יום. השורה האחרונה: 20.11.

**מה יאבד (קונקרטי):**
1. **שורות גולמיות** לכל אירוע: ‏`visitor_id` (מזהה פסבדונימי; 94,019 מזהים בחלון), ‏`section`, ‏`event_type`, ‏`meta`. הגדולים: `arrival` ‏101,691 (78,792 מזהים), ‏`post_exp` ‏82,146 (20,168), ‏`or-geula` ‏46,431 (Legacy `story_*`, עד 4.11), ‏`number` ‏41,864, ‏`post_experience` ‏32,553, ‏`app` ‏24,417, ‏`gematria` ‏19,879.
2. **דוחות שנשענים עליהן:** ‏22 פונקציות (20 קוראות). **כולן עם חלון ברירת מחדל ≤30 יום** (`arrival_sources` 30, ‏`admin_ambassadors` 30, ‏`els_analytics` 30, ‏`admin_research_map` 30, ‏`journey_pulse`, ‏`viral_report`, ‏`admin_post_sidebar_*` 48 שעות ועוד; הארוך ביותר `admin_ai_usage` 720 שעות). מכיוון שהטבלה סגורה לכתיבה מ־20.11, **כל הדוחות האלה כבר יחזירו ריק מ־20.12 בכל מקרה**, בלי קשר למחיקה. מה שהמחיקה פוגעת בו בפועל הוא רק ניתוח עומק ידני בחלון ארוך.
3. **נתיב ההיסטוריה של 2029:** ‏`events` אינו מחליף משפחות Legacy (`or-geula`, `post_exp` וכו׳); ‏`traffic_intelligence_law` v12 קובע שהן ״historical provenance … not migrated, not merged״.

**מה לא יאבד:** ‏`traffic_daily`/`traffic_history`/GA4/GSC (נבנים מ־`events` ו־`site_visits`, לא מ־`visitor_events`), וכל תוכן, מחקר ונתוני משתמשים אחרים.

**האם נדרש ארכוב:** ההמלצה היא **לא ארכוב גולמי, כן ארכוב מצרפי אחד**, מוקדם ככל האפשר:
- **ארכוב גולמי אינו מומלץ:** הוא מארך פסבדונימיים (`visitor_id`) מעבר ל־120 יום שאושרו, ודורש בסיס פרטיות והחלטה (`foundation_closure_protocol_law` v8, ‏E: privacy lifecycle). אין לעשות זאת בלי אישור מפורש.
- **ארכוב מצרפי (ללא מזהים):** ספירות לפי יום × `section` × `event_type` ומספר מזהים ייחודיים ליום: **3,654 שורות** (116 ימים, 47 סקציות, 107 צירופים), כ־100 KB. **עודכן 26.11 (החלטת ZURIEL, D-1):** קבוצה (יום × סקציה × סוג אירוע) עם פחות מ־5 מבקרים ייחודיים **אינה נשמרת כלל** (גם לא ספירת האירועים שלה); בבדיקה חיה נשמרות ≈1,677 קבוצות (371,657 מתוך 382,625 אירועים, 97.1%) ו־1,957 קבוצות (10,968 אירועים) מוסתרות. המספר 3,654 לעיל הוא הסכום לפני ההסתרה. הוא שומר את המגמות והמבנה של Legacy בלי שום מזהה. **כל יום שעובר מוחק שורות ישנות מ־28.7, לכן מצרף שנלקח עכשיו שומר 116 ימים וכל השהיה מאבדת יום.** הוא לא נוצר כאן (תוצר נתונים שמגיע למסד/מאגר דורש אישור יעד), והשאילתה מצורפת בסעיף 9.
- **יעד אפשרי (EXTEND_EXISTING, לבחירתך):** שורת `analytics_cache` אחת לחודש (`cache_key='visitor_events_rollup:2026-08'` וכו׳, כמו תמונות הקיבולת) או קובץ CSV במאגר. אין טבלה חדשה.
- **נקודת אישור (נשארת):** האם סוף המסלול של היסטוריית Legacy הוא מחיקה אחרי 120 יום (כפי שאושר) או מצרף + מחיקה.
- **אין מחיקה יזומה:** המחיקה היומית היא ה־cron המאושר הקיים; לא נגעתי בו ולא בנתונים.

## 7. הגנת היסטוריית המחקר מפני מחיקה בלתי מורשית

**מצב חי (נבדק):**
- `research_object_revisions` (44,084 שורות): ‏RLS (קריאה ל־admin בלבד), אבל **`service_role` מחזיק `DELETE`/`UPDATE`/`TRUNCATE`**; אין אף טריגר על הטבלה; ‏`authenticated` — `SELECT` בלבד; ‏`anon` — כלום.
- `research_objects`: ‏`service_role` מחזיק `TRUNCATE` (טריגרי שורה לא רצים ב־TRUNCATE, ולכן ה־snapshot של מחיקה עוקף). ‏`anon`/`authenticated`: `SELECT` בלבד עם RLS.
- מי כותב ל־revisions: טריגר ה־snapshot (SECURITY DEFINER) וכתיבה אחת מורשית: `fn_research_object_correct` מעדכן `successor_id` מ־NULL לערך. אין פונקציה שמוחקת revisions.
- המחיקה היחידה של אובייקטים שקוראת לה משתמש: `fn_remove_family_member` (בעלות + הרשאה נבדקות; כתובת פרמטר מוגבלת ל־namespace של הבעלים).
- לא קיים trigger אירועי (event trigger) שמגן על DROP/TRUNCATE.

**הצעה (לא הוחלה):** `20261126150000_research_history_protection_{PROPOSAL,ROLLBACK}.sql`
1. פונקציית טריגר אחת (`fn_research_history_protect`), ושלושה טריגרים: ‏UPDATE/DELETE על revisions (שורה), ו־TRUNCATE על revisions ועל `research_objects` (משפט).
2. מותר: ‏**רק** קישור `successor_id` מ־NULL לערך כשכל שאר העמודות זהות, וטרנזקציה שהגדירה `app.allow_revision_erasure='on'` (שמור לנתיב מחיקת פרטיות שיאושר בנפרד; לא נוצר כאן).
3. ‏`REVOKE UPDATE, DELETE, TRUNCATE` על revisions ו־`TRUNCATE` על `research_objects` מ־`service_role`.
4. **נשמר:** מחיקת אובייקט נשארת מותרת וממשיכה לכתוב גרסת `delete`; ‏`fn_research_object_correct` ו־snapshot (SECURITY DEFINER) לא מושפעים.

**נבדק (Postgres זמני, 11 בדיקות):** גם בעל הטבלה לא יכול למחוק או לשכתב revision; ‏TRUNCATE על שתי הטבלאות נדחה והשורות נשמרות; ‏`service_role` נדחה גם ברמת ההרשאה; הקישור `successor_id` מותר, החלפתו או שינוי נוסף לצידו — נדחים; מחיקת אובייקט עדיין כותבת revision; רק `app.allow_revision_erasure='on'` מאפשר מחיקה; ה־rollback משחזר בדיוק את ההרשאות ומסיר את הטריגרים. **באג שנתפס בבדיקה** (והתוקן): התנאי המקורי בפונקציה הפנה ל־`OLD.successor_id` גם בטבלה שאין בה עמודה כזו, כי plpgsql לא מבטיח short-circuit; התנאי עבר למבנה מקונן.

**זיהוי:** ניסיון חסום מחזיר SQLSTATE `42501` עם `research_history_protected` ב־Postgres log (לא נשמר בטבלה: הטרנזקציה מתבטלת). **שארית סיכון:** בעל הטבלה/superuser יכול להשבית טריגר או למחוק את הטבלה (מכוסה רק בהוכחת שחזור, `system_suggestions_law` v7 סעיף 39). **סיכון פרטיות שנמצא:** ‏`delete_my_account` מסתמך על FK `SET NULL` ואינו נוגע ב־revisions, כלומר נתונים אישיים עלולים להישאר ב־snapshots; זו החלטה נפרדת.

## 8. כותב אחד לכל תחום, ושילוב בתוכנית האיחוד

| תחום | כותב יחיד | מה נעשה כאן | מה לא נעשה |
|---|---|---|---|
| ביקורת נפח 26.11 (`db-capacity-audit-20261126/`) | **סשן זה** | כל המסמכים והקבצים | — |
| `middleware-core.js`, ‏`middleware.js`, ‏`public-reading-deploy/middleware.js`, ‏`edge-security-probe.js` | בעל שומר הקצה (בעלי `edge-country-*`, ‏`edge-big-number-*`); ענף זה הוא הצעה | שינוי מצומצם ומכוסה בבדיקות | לא מוזג; ה־matcher לא אומת ב־Vercel |
| `scripts/post-deploy-canary.mjs`, ‏`.github/workflows/post-deploy-canary.yml` | בעל ה־canary (G3 reliability) | בדיקה אחת, מצב `report` כברירת מחדל | ה־workflow לא שונה; ההפעלה של `enforce` היא שינוי משתנה סביבה נפרד |
| `fn_reliability_watch` | סשן המדידה (הוחל חי 24.11) ו־PR #1528 (נדרש בסיס חדש) | **לא נגעתי** | גלאי האבטחה הועבר ל־`check_security_spike` כדי לא ליצור הצעה שלישית |
| `check_security_spike`, ‏`security_log`, ‏`security_alerts` | בעל האבטחה/הבריאות | הצעה (`…160000`) | לא הוחלה |
| `fn_capacity_growth_guard_v1` | G3 קיבולת | הצעה (`…130000`) | לא הוחלה; לא שונו ספים |
| `fn_snapshot_research_object_revision`, טריגרי היסטוריית מחקר | `research_intake_foundation_contract_law` v14 | הצעות (`…140000`, ‏`…150000`) | לא הוחלו |
| `docs/reviews/unified-performance-consolidation-20261031.json` (מפת המהירות) | כותבי סשן המהירות (S-60, ‏S-61 עודכנו ב־25.11) | **לא נערך**; נוסח מוצע בסעיף 10 | הכותב הפעיל מכניס |
| `docs/reviews/measurement-root-cause-20261124/README.md` | סשן המדידה | נספח קצר + תיקון שורת התיקון המוחל | — |

**כללי המשך:** ‏`supabase/proposed/` מכיל כעת קבצים בסטטוס לא אחיד (חלקם הוחלו וכותרתם ״NOT APPLIED״). הקבצים שלי נושאים guard מבוסס `md5(prosrc)` ולכן לא יוחלו על פונקציה ששונתה.

## 9. שאילתות להרצה חוזרת (קריאה בלבד)

```sql
-- שוויון זרם האדם (7 ימים): site_visits מול events
select (select count(*) from public.site_visits where ts >= now()-interval '7 days' and not is_bot) sv_human_rows,
       (select count(*) from public.events where ts >= now()-interval '7 days' and surface='page' and event_type='view' and not coalesce(is_bot,false)) ev_page_views,
       (select count(*) from public.site_visits where ts >= now()-interval '7 days' and is_bot) sv_bot_rows,
       (select sum(hits) from public.crawl_daily where day >= current_date-7) edge_bot_hits;

-- מצרף ללא מזהים של visitor_events (3,654 שורות היום), לפני כל יום מחיקה נוסף
select created_at::date as day, section, event_type, count(*) as events, count(distinct visitor_id) as visitors
from public.visitor_events group by 1,2,3 order by 1,2,3;

-- ההוכחה שהטריגר לא נכתב על no-op (אחרי החלה): אמור לרדת ל־0 חדשים
select count(*) from public.research_object_revisions
where occurred_at > now()-interval '24 hours' and (changed_fields is null or changed_fields='{}');
```

## 10. נוסח מוצע למפת המהירות ולתוכנית האיחוד (לכותב הפעיל; לא הוכנס)

- **`not_merged[]`:** ענף `ccr-db-capacity-proposals-20261126`, ‏BRANCH-ONLY: חמש הצעות SQL של המסד (אינדקס, SIZE_INFO, no-op, הגנת היסטוריה, מצרף `visitor_events`) ושער ההשוואה. חבילת האבטחה (שכבת הקצה, canary, `log_security`, ניטור השקט) בענף נפרד `ccr-s1-security-edge-20261126`. אין קוד לקליינט ואין טענת שיפור מהירות.
- **פריט פתוח:** ‏`crawl_daily` צריך תווית נתיב (13 דליים, `other` ≈30%) לפני כל שינוי ב־`site_visits`; הגדרת הצעד הבא בבעלות שומר הקצה.
- **אזהרה:** ‏`bidim` (173 MiB, 17.9M סריקות על האינדקס הראשי) הוא נתיב קריאה חם; אין לגעת באינדקסים שלו בלי EXPLAIN.

## 11. החלטות ממתינות לך

1. תוכן שכבת הקצה: רשימת הנתיבים (בלי `/wp-content`, בלי `/admin`), כתובת גסה מול מלאה, תקרת 20 שורות לדקה, ו־Preview מוגן לפני פריסה.
2. כלל WAF (`log` תחילה) — הגדרת Production.
3. סדר ההחלה בסעיף 1.6 והפעלת `SECURITY_CANARY_MODE=enforce`.
4. ‏`SIZE_INFO` (סעיף 3) וסגירה ידנית של 43/14/6 ההצעות הממתינות; האם להפוך את `anomaly_vs_normal` להתראה (סף חדש).
5. ‏DDL להסרת `idx_tv_words` (סעיף 4).
6. ‏no-op: הצעת הטריגר (סעיף 5) ותיאום הצנרות `corpus_batch` ו־`wa_channel_intake`.
7. מצרף `visitor_events` — כן/לא, ובאיזה יעד; ואישור שמחיקה אחרי 120 יום היא הסוף הרצוי להיסטוריית Legacy.
8. הגנת היסטוריית מחקר (סעיף 7) והחלטה נפרדת על מחיקת פרטיות מול snapshots.
9. מטריצת האיחוד: אישור שער 14 יום והרחבת `crawl_daily` לפני כל שינוי ב־`site_visits`.

## 12. מה לא נבדק

- ה־matcher מול Vercel; ביצועי קצה בפועל; כמות סריקות חיה; WAF logs.
- הטקסט המלא של החוקים (נקראו קטעים מסוננים בחלק 2).
- שאר ה־RPC ב־`site_visits` (צמיחה/תשתית) ברמת מספרים; קוראי UI.
- ההשפעה של שינוי ה־matcher על חשבון הקריאות של middleware ב־Vercel (לא נמדד).
- נתיב ה־guard של constraint תלוי באינדקס (GIN אינו יכול לתמוך ב־constraint).
- ריצת ה־realpg של המסד מחווטת ל־`live-contracts-2029.yml` בענף הזה (PostgreSQL 17, הגרסה החיה).

## 13. קבצים ובדיקות

| קובץ | סוג |
|---|---|
| `edge-security-probe.js`, ‏`middleware-core.js`, ‏`middleware.js`, ‏`public-reading-deploy/middleware.js`, ‏`route-legitimacy.js` (הערה בלבד), ‏`scripts/post-deploy-canary.mjs` | קוד |
| `supabase/proposed/20261126120000…` אינדקס · `…130000` SIZE_INFO · `…140000` no-op · `…150000` הגנת היסטוריה · `…160000` ניטור אבטחה (כל אחד PROPOSAL + ROLLBACK) | SQL שלא הוחל |
| `test/db-capacity-audit-20261126-realpg.sh` (59 בדיקות; בדיקות האבטחה בענף האבטחה) | בדיקות |

הרצה: `bash test/db-capacity-audit-20261126-realpg.sh` (דורש `PG_BIN` ל־PostgreSQL 16; מדלג אם אין).
