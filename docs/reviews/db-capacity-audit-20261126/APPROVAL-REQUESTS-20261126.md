# בקשות אישור מדויקות — ביקורת נפח מסד, הכרעה 337 (26.11.2026)

**המסמך אינו מחיל דבר.** כל בקשה היא נפרדת, לקובץ מדויק (sha256) ולקומיט מדויק, ואינה מורחבת לבקשה אחרת. אישור אינו עובר בין סשנים (CLAUDE.md 0.4). כל ההצעות נבדקו על Postgres זמני (גרסה 16.15 כאן; ה־CI שנוסף מריץ 17, הגרסה החיה) ב־`test/db-capacity-audit-20261126-realpg.sh` (59 בדיקות; בדיקות האבטחה — 19 — נמצאות בענף האבטחה הנפרד).
**ענף:** `ccr-db-capacity-proposals-20261126` (נפרד מחבילת האבטחה ומסביבת הבדיקות). **קומיט הקבצים:** `645e5b9b69d0e1404ae60b542dad8a08d3fa6d4c` (קומיט המסמך הזה בא אחריו ואינו משנה אף קובץ הצעה). **בסיס:** `origin/main` = `f6f1051d33baa3e24e4e8a0e6f67e7b639081099`. ה־sha256 קובע, לא שם הענף.
**בקשות האבטחה (S1–S7)** נמצאות בענף נפרד `ccr-s1-security-edge-20261126` (`docs/reviews/security-edge-package-20261126/README.md` שם) ואינן חלק ממסמך זה.
**כלל ההחלה המשותף:** `apply_migration` כטרנזקציה אחת על `linswmnnkjxvweumprav`. כל אחד מהקבצים נפתח ב־guard שמשווה `md5(prosrc)` החי לזה שנקרא ב־26.11.2026 ונכשל בסחף. אחרי ההחלה: `list_migrations` חייב להציג את הגרסה; אם ההחלה נכשלה — היא **לא** תופיע שם.

## סיכום והעדפות

| # | בקשה | דחיפות | אפשר להפריד | תלות |
|---|---|---|---|---|
| D-1 | מצרף אנונימי של `visitor_events` ל־`traffic_history` | **גבוהה: המחיקה הליליה כבר רצה (03:10 UTC)** | כן | אין |
| D-2 | `SIZE_INFO` | נמוכה | כן | אין |
| D-3 | הסרת `idx_tv_words` (PRECHECK ואז הסרה) | נמוכה | כן | PRECHECK נקי |
| D-4 | דילוג על גרסאות no-op | נמוכה | כן | אין |
| D-5 | הגנת היסטוריית המחקר + מחיקת מידע אישי ב־redaction | בינונית | כן, אבל מומלץ אחרי החלטת פרטיות | החלטת בעלי פרטיות |

## D-1. מצרף אנונימי של `visitor_events` לשימור בהיסטוריה הקיימת (דחוף)

| קובץ | sha256 |
|---|---|
| `supabase/proposed/20261126170000_visitor_events_history_rollup_PROPOSAL.sql` | `dd8f88ba626b62300f6e9080a787120df9598db921cebf02b950e14defe0e0df` |
| `supabase/proposed/20261126170000_visitor_events_history_rollup_ROLLBACK.sql` | `84cec25b48823f92f69f9d4002eeeab443d255b77a1262f1976cc5790e5726cf` |

**מה מבוקש:** יצירת `refresh_visitor_events_history_v1(date,date)` (service_role בלבד) והרצה חד־פעמית לכל הימים הקיימים, שכותבת ל־`public.traffic_history` (הטבלה והמפתח הייחודי של `site_visits_legacy`) שורה לכל **יום (שעון ישראל) × section × event_type**: `views` = מספר אירועים; `visitors` = מספר מבקרים ייחודיים; `sessions` = NULL; `source = 'visitor_events_legacy:<section>:<event_type>'`. **כלל הסתרה (החלטת ZURIEL, 26.11): קבוצה עם פחות מ־5 מבקרים ייחודיים אינה נשמרת כלל — לא ספירת המבקרים ולא ספירת האירועים שלה** (`having count(distinct visitor_id) >= 5`; `views` הוא NOT NULL ולכן הסתרה היא השמטה של השורה, לא NULL). היום הראשון מסומן חלקי.
**מה נשמר בפועל (הרצה יבשה, קריאה בלבד על הטבלה החיה, 26.11.2026 01:57 UTC, ספירה לפי יום בשעון ישראל, אותה תוצאה כמו בספירת UTC):** 3,634 קבוצות; **1,677 נשמרות** (371,657 מתוך 382,625 אירועים, 97.1%); **1,957 מוסתרות** (10,968 אירועים, 2.9%). טווח ימים 28.7–20.11. מספרי האמת במועד ההחלה יהיו דומים אך לא זהים (ימים נמחקים בכל לילה).
**מה לא כלול:** אין `visitor_id`, כתובת, slug, `meta`, UA, referrer, נתיב או טקסט חופשי; **אין ארכוב של שורה גולמית או של מזהה אישי**; אין שינוי של המחיקה הליליה, של מדיניות 120 הימים או של `visitor_events`; אין cron; אין שינוי סכימה; כל קוראי `traffic_history` הקיימים מסננים לפי source מפורש (נבדק בהגדרות החיות) ולכן אינם רואים את המשפחה החדשה.
**תנאי מוקדם:** אין. (בטוח לפני כל דבר אחר.)
**דחיפות:** המחיקה הליליה רצה ב־03:10 UTC ומסירה עד 10,000 שורות ביום; כל לילה שעובר מוחק את הימים הישנים ביותר לפני שנספרו.
**אופן ההחלה:** `apply_migration` כטרנזקציה אחת על `linswmnnkjxvweumprav`. הקובץ אינו מחיל DDL מלבד יצירת הפונקציה וההרצה החד־פעמית; הוא נכשל כולו (ולא נרשם) אם משהו נכשל. אחרי ההחלה: `list_migrations` חייב להציג את הגרסה; אם ההחלה נכשלה — היא **לא** תופיע שם. הרצה חוזרת אינה מורידה ערך של יום קיים.
**אימות אחרי ההחלה (קריאה בלבד):** `select count(*) as rows, sum(views) as events_total, min(period), max(period), count(*) filter (where visitors < 5 or visitors is null) as visitors_below_5 from public.traffic_history where source like 'visitor_events_legacy:%'` — צפוי: שורות כ־1.7 אלף, ‏`events_total` כ־371 אלף, ‏`visitors_below_5` = 0. בדיקה שאין מזהה: `select count(*) from public.traffic_history where source like 'visitor_events_legacy:%' and (source||coalesce(note,'')) ~* '(vid|@|[0-9a-f]{8}-[0-9a-f]{4})'` = 0. ‏`select count(*) from public.visitor_events` ממשיך לרדת רק לפי המחיקה הליליה הקיימת.
**שחזור:** `…170000…_ROLLBACK.sql` מוחק רק שורות עם הקידומת `visitor_events_legacy:` ואת הפונקציה. הסיכום מתבטל; השורות הגולמיות ממשיכות להימחק.
**סיכון:** נמוך. הוספת שורות בלבד לטבלה קיימת. פרטיות: אין תא קטן — לא נחשף מספר אירועים ולא מספר מבקרים של קבוצה עם פחות מ־5 מבקרים. מחיר: 2.9% מהאירועים (מקבוצות קטנות) לא יישמרו בהיסטוריה; הם נמחקים עם שאר השורות הגולמיות לפי המדיניות הקיימת.

**נוסח אישור מדויק:** ״מאשר החלת supabase/proposed/20261126170000_visitor_events_history_rollup_PROPOSAL.sql (sha256 dd8f88ba626b62300f6e9080a787120df9598db921cebf02b950e14defe0e0df, קומיט 645e5b9b6) על מסד linswmnnkjxvweumprav כטרנזקציה אחת: קבוצה עם פחות מ־5 מבקרים ייחודיים אינה נשמרת כלל. ללא ארכוב גולמי או מזהים אישיים, ללא שינוי המחיקה הליליה ומדיניות 120 הימים.״

## D-2. `SIZE_INFO`: סף 1,400 MiB כמידע תפעולי

| קובץ | sha256 |
|---|---|
| `supabase/proposed/20261126130000_capacity_size_info_PROPOSAL.sql` | `c28dcc4cfb57381e5e24ae9370717755289265a9e231c1a84e7447b748d5e126` |
| `supabase/proposed/20261126130000_capacity_size_info_ROLLBACK.sql` | `fec0d8ba1e6877e7cf04585880b1d9892dfb7a8b1b1acd0b6348b90409774a39` |

**מה מבוקש:** החלפת הגוף של `fn_capacity_growth_guard_v1` בלבד: המצב `CAPACITY_WARNING` נקרא `SIZE_INFO` ואינו כותב `work_log` או `suggest_add`. נוספים שלושה שדות מידע ב־payload (`baseline_weekly_growth_bytes`, ‏`growth_vs_normal_ratio`, ‏`anomaly_vs_normal`).
**מה לא כלול:** אין שינוי ב־WATCH (5% או 75 MiB) וב־ALERT (10% או 150 MiB), באותו 12 שעות dedupe או ב־`notify_admin`; אין שינוי בערך הסף 1,400 MiB; אין סגירה של 43/14/6 ההצעות הממתינות; אין התראה חדשה על `anomaly_vs_normal`.
**תנאי מוקדם:** אין.
**אופן ההחלה:** `apply_migration` כטרנזקציה אחת על `linswmnnkjxvweumprav`. כל אחד מהקבצים נפתח ב־guard שמשווה `md5(prosrc)` החי לזה שנקרא ב־26.11.2026 ונכשל בסחף. אחרי ההחלה: `list_migrations` חייב להציג את הגרסה; אם ההחלה נכשלה — היא **לא** תופיע שם.
**אימות אחרי ההחלה (קריאה בלבד):** `select payload->>'state', payload->>'size_info', payload->>'anomaly_vs_normal', payload->>'growth_vs_normal_ratio' from analytics_cache where cache_key='capacity_guard:latest'` אחרי הריצה הבאה של `fn_reliability_watch`: מצב `SIZE_INFO`, ‏`size_info=true`, יחס כ־2.4 (חריגה מוכרת, אינפורמטיבית). ‏`work_log` ללא רשומת `Capacity/Growth` חדשה ב־12 שעות.
**שחזור:** `…130000…_ROLLBACK.sql` (guard על ה־md5 החדש).
**סיכון:** נמוך. ההתראה על גידול חריג (WATCH/ALERT) נשארת זהה; נבדק מול הגרסה הישנה בעותק בדיקה: אותה תוצאה בשני המצבים.

**נוסח אישור מדויק:** ״מאשר החלת supabase/proposed/20261126130000_capacity_size_info_PROPOSAL.sql (sha256 c28dcc4cfb57381e5e24ae9370717755289265a9e231c1a84e7447b748d5e126, קומיט 645e5b9b6) על מסד linswmnnkjxvweumprav כטרנזקציה אחת. ללא שינוי ספים.״

## D-3. הסרת האינדקס הכפול `idx_tv_words`: בדיקת-טרום ואז הסרה שנכשלת כשהמצב אינו תקין

| קובץ | sha256 |
|---|---|
| `supabase/proposed/20261126120000_drop_duplicate_idx_tv_words_PRECHECK.sql` | `0bfaded8e0c2315f60c1fd35f84cad50ece95423e1a3f9ab5709c80b690e5cd0` |
| `supabase/proposed/20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql` | `70be11d49840cdd20644dc1ba119e0606d2093e32aaf0a604d24c909e0d94e6d` |
| `supabase/proposed/20261126120000_drop_duplicate_idx_tv_words_ROLLBACK.sql` | `01fe8dc899bdf6a8b7d967dd2d11c9cbe6336afd57ddbf839a5aa04b9c25824e` |

**מה מבוקש:** שני צעדים נפרדים: (1) ‏PRECHECK דרך `execute_sql` — לא משנה דבר; בכל מצב לא תקין כותב התראה אחת ל־`work_log` + `notify_admin` ומדפיס WARNING (כולל ״שני האינדקסים חסרים״ עם פקודת השחזור); (2) הקובץ הראשי דרך `apply_migration`. **כל מצב לא צפוי מעלה חריגה (SQLSTATE P0001) ולכן הקובץ נכשל, אינו נרשם כמיגרציה שהוחלה ואינו משנה דבר**; הצלחה שקטה רק במצב הרצוי (האינדקס כבר חסר וה־keeper תקין). נבדק ב־11 מצבים כולל שני חסרים, keeper חסר/לא תקין, אפשרויות שונות, נעילה (נכשל אחרי 3 שניות).
**מה לא כלול:** אין שינוי בטבלה, בנתונים, ב־`tv_words_gin` או בפונקציות; אין `DROP … CONCURRENTLY` (אסור בתוך טרנזקציה).
**תנאי מוקדם:** PRECHECK נקי (`PRECHECK OK` ללא התראה).
**אופן ההחלה:** `apply_migration` כטרנזקציה אחת על `linswmnnkjxvweumprav`. כל אחד מהקבצים נפתח ב־guard שמשווה `md5(prosrc)` החי לזה שנקרא ב־26.11.2026 ונכשל בסחף. אחרי ההחלה: `list_migrations` חייב להציג את הגרסה; אם ההחלה נכשלה — היא **לא** תופיע שם. אם הקובץ הראשי נכשל — אין לנסות שוב ללא קריאת השגיאה והתראת ה־PRECHECK.
**אימות אחרי ההחלה (קריאה בלבד):** `select exists(select 1 from pg_class where relname='idx_tv_words' and relkind='i')` = false; ‏`tv_words_gin` תקין; ‏`EXPLAIN` על `words @> array['אברהם']` ממשיך להשתמש ב־`tv_words_gin` (4.1 ms לפני).
**שחזור:** `…120000…_ROLLBACK.sql` יוצר את האינדקס מחדש (שניות; גם כשהשני חסר).
**סיכון:** נמוך. חיסכון 9.05 MiB. הסרה לא תורמת לביצועים; לא נגרמת פגיעה בביצועי קריאה, כי ה־planner כבר בוחר ב־`tv_words_gin`.

**נוסח אישור מדויק:** ״מאשר הרצת PRECHECK (sha256 0bfaded8e0c2315f…) ואז, רק אם נקי, החלת 20261126120000_drop_duplicate_idx_tv_words_PROPOSAL.sql (sha256 70be11d49840cdd2…, קומיט 645e5b9b6) כטרנזקציה אחת.״

## D-4. מניעת גרסאות no-op עתידיות

| קובץ | sha256 |
|---|---|
| `supabase/proposed/20261126140000_research_revision_noop_skip_PROPOSAL.sql` | `8df9e1df6849354afc00f9b9af15b09c068f2024c8b61b5870c43243b93905d1` |
| `supabase/proposed/20261126140000_research_revision_noop_skip_ROLLBACK.sql` | `61430692bcbcb19eca5773b0952cf2606ec4957c08fc1a4ceb0915d510eae2b7` |

**מה מבוקש:** החלפת הגוף של `fn_snapshot_research_object_revision` בשורת דילוג אחת: אם אף אחת מ־18 העמודות הנעקבות לא השתנתה, לא נכתבת גרסה.
**מה לא כלול:** לא נמחקת ולא מאוחדת אף גרסה (גם לא ה־1,565 הקיימות); כל שלב מחקר שמשנה עמודה — כולל שני שלבי `meta` של צנרות שונות — ממשיך להיכתב עם preimage מלא (נבדק); ה־guard של שינוי מהותי ושחזור המחיקה לא משתנים. אין שינוי בצנרות `corpus_batch` ו־`wa_channel_intake` (תיאום כותבים: החלטה נפרדת).
**תנאי מוקדם:** אין.
**אופן ההחלה:** `apply_migration` כטרנזקציה אחת על `linswmnnkjxvweumprav`. כל אחד מהקבצים נפתח ב־guard שמשווה `md5(prosrc)` החי לזה שנקרא ב־26.11.2026 ונכשל בסחף. אחרי ההחלה: `list_migrations` חייב להציג את הגרסה; אם ההחלה נכשלה — היא **לא** תופיע שם.
**אימות אחרי ההחלה (קריאה בלבד):** אחרי יום עבודה: `select count(*) from research_object_revisions where occurred_at > now()-interval '24 hours' and (changed_fields is null or changed_fields='{}')` = 0.
**שחזור:** `…140000…_ROLLBACK.sql`.
**סיכון:** נמוך. הפונקציה חיה על כל עדכון של `research_objects`; הוכח על Postgres זמני עם אותו גוף. אם יתגלה כותב שנשען על קיום גרסה ל־no-op — ההשפעה היחידה היא שורה פחות.

**נוסח אישור מדויק:** ״מאשר החלת supabase/proposed/20261126140000_research_revision_noop_skip_PROPOSAL.sql (sha256 8df9e1df6849354afc00f9b9af15b09c068f2024c8b61b5870c43243b93905d1, קומיט 645e5b9b6) על מסד linswmnnkjxvweumprav כטרנזקציה אחת.״

## D-5. הגנת היסטוריית המחקר, ומחיקת מידע אישי ב־redaction בלבד

| קובץ | sha256 |
|---|---|
| `supabase/proposed/20261126150000_research_history_protection_PROPOSAL.sql` | `eb7dfdc7f7b58a9e2ef4f1e911a54266e87072ff0ce1eb27bb62f0498382c895` |
| `supabase/proposed/20261126150000_research_history_protection_ROLLBACK.sql` | `17e044885abce42f264cd1f17665dfb970f2319bdbc73b6e0f63d5ebe5d0301a` |

**מה מבוקש:** (1) טריגר שאוסר `DELETE` ו־`TRUNCATE` על `research_object_revisions`, ‏`TRUNCATE` על `research_objects`, ו־`UPDATE` של revision מלבד קישור `successor_id` היחיד המורשה; (2) `REVOKE UPDATE, DELETE, TRUNCATE` על revisions ו־`TRUNCATE` על `research_objects` מ־`service_role`; (3) הפונקציה `fn_research_history_erase_person_v1(person, בסיס כתוב)` — **הדרך היחידה** לשנות נתונים אישיים: היא **משמיטה** את התוכן האישי של גרסאות אדם (גוף ה־snapshot, טקסט, גיבובים, actor) ומשאירה stub; השורות, המזהים, סוגי השינוי והחותמות נשמרים, ואין שום נתיב למחיקה.
**מה לא כלול:** אין חיבור ל־`delete_my_account` ואין הפעלה בפועל של מחיקה; אין שינוי ב־`fn_remove_family_member` (מחיקת אובייקט נשארת ונרשמת); אין החלטה שה־redaction עומד בבסיס החוקי של הפרטיות. **הוא אינו ניתן להפעלה בלתי מורשית:** נדרשים ביחד הגדרת טרנזקציה שרק הפונקציה קובעת, **מחסנית קריאה שמכילה את הפונקציה המאושרת**, ו־`service_role`/אדמין/סשן postgres, ו־EXECUTE ל־`service_role` בלבד, ובסיס כתוב ≥20 תווים; פונקציה אחרת שמעתיקה את ההגדרה נדחית (נבדק); `DELETE` ללא עקיפה בכלל.
**תנאי מוקדם:** החלטת בעלי הפרטיות שמחיקה ב־redaction (stub) מספקת מידע אישי כדין, או דרישה אחרת. מומלץ להכריע לפני ההחלה.
**אופן ההחלה:** `apply_migration` כטרנזקציה אחת על `linswmnnkjxvweumprav`. כל אחד מהקבצים נפתח ב־guard שמשווה `md5(prosrc)` החי לזה שנקרא ב־26.11.2026 ונכשל בסחף. אחרי ההחלה: `list_migrations` חייב להציג את הגרסה; אם ההחלה נכשלה — היא **לא** תופיע שם.
**אימות אחרי ההחלה (קריאה בלבד):** `select tgname from pg_trigger where tgname in ('trg_research_revisions_append_only','trg_research_revisions_no_truncate','trg_research_objects_no_truncate') and not tgisinternal` — בדיוק 3 טריגרים (לא `like 'trg_research_%'`: שני טריגרים אחרים שאינם שלי, `trg_research_item_hint_media_guard` ו־`trg_research_contribution_hint_media_exclusion`, מתאימים לתבנית); `select has_table_privilege('service_role','public.research_object_revisions','DELETE')` = false; בדיקת SELECT על אותה טבלה כאדמין ממשיכה לעבוד; יצירת עדכון על `research_objects` ממשיכה לכתוב revision.
**שחזור:** `…150000…_ROLLBACK.sql` (שורות שכבר עברו redaction נשארות כך: זו מחיקה כדין ואינה מבוטלת).
**סיכון:** בינוני־נמוך. שינוי הרשאות וטריגרים על טבלאות חיות. סיכון עיקרי: כותב לא מוכר ש־UPDATE/DELETE על revisions הוא חלק מהצנרת שלו; הבדיקה שערכתי מצאה רק את `fn_research_object_correct` (SECURITY DEFINER, ללא השפעה). אין הוכחה על כותבי עבר.

**נוסח אישור מדויק:** ״מאשר החלת supabase/proposed/20261126150000_research_history_protection_PROPOSAL.sql (sha256 eb7dfdc7f7b58a9e2ef4f1e911a54266e87072ff0ce1eb27bb62f0498382c895, קומיט 645e5b9b6) על מסד linswmnnkjxvweumprav כטרנזקציה אחת. ללא חיבור ל־delete_my_account.״

## מה שלא מבוקש כאן
שינוי WAF · מיזוג · פריסה · מחיקת נתונים כלשהי · העלאת סף · התקנת הרחבה · שינוי מנוי · סגירת ההצעות הממתינות · עצירת כתיבה ל־`site_visits` · ארכוב גולמי של `visitor_events`.
