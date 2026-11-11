# חבילת SQL 11b: אישור המלצה מתעד החלטה בלבד

**הצעה בלבד. שום דבר לא הורץ במסד החי.** החבילה מחליפה את `../../pack-v4/sql/11_admin_suggestion_decide_text.sql` (SHA-256 `a43b12ca…`). **את 11_ אין להריץ.**

## ההחלטה
ZURIEL, 11.11.2026: «קבלת המלצה מתעדת החלטה בלבד. התחלת עבודה דורשת הוראה מפורשת שלי לסוכן מסוים בשיחה.» ההחלטה מכריעה גם שלא מציעים עכשיו RPC או מסך ניהול חדשים.

החוק כבר אומר את זה בפסקת הפתיחה שלו (12.7.2026): «אין ביצוע אוטומטי של המלצה — קבלה = החלטה אנושית, המימוש ידני». ב־v3 (19.9.2026) נוסף ל־§17 חריג להצעות Upgrade Radar, וממנו נבעו הניסוחים ב־§18–§21. החבילה מבטלת את החריג. היא לא מוסיפה חוזה ולא מערכת חדשה.

## הבעיה במצב החי
נבדק בקריאה בלבד: 05:52 ו־11:18 UTC.
- כשמאשרים הצעת `dependency_upgrade_radar`, הפונקציה החיה (md5 `12961a8c…`) מכניסה ל־`work_log` רשומת ASSIGNMENT מסוג WRITE ל־CLAUDE, במצב QUEUED. הטריגר `work_log_dispatch_after_write` קורא אז ל־`agent_dispatch_emit`, כלומר מפעיל סוכן.
- מצב נוכחי: 26 הצעות radar ממתינות, 0 מאושרות, ו־0 רשומות `AUTO_DEP_UPGRADE_` ביומן.
- ה־RPC פתוח לכל מנהל (`authenticated` + `rd_is_admin`).

## ארבעת הקבצים
כולם ב־`supabase/proposed/`, לפי מוסכמת המאגר להצעות שעוד לא הוחלו.

| # | קובץ | SHA-256 | בתים | מה הוא עושה |
|---|---|---|---|---|
| 11b | `20261111120000_admin_suggestion_decide_decision_record_only_v1.sql` | `7423150b1224367829316018233e0fe7f59e5232fcde346cc9c92440dd4f584e` | 13,270 | הפונקציה: אישור כותב רשומה פסיבית ל־ZURIEL. בלי assignment ובלי dispatch |
| 11c | `20261111120100_system_suggestions_law_v7_decision_record_only.sql` | `aea081d8b5909ddd914338075784729fd1f196438050841823b228b6fd668777` | 11,856 | החוק: `system_suggestions_law` מ־v6 ל־v7, ‏§17 והסעיפים התלויים בו |
| 18c | `ROLLBACK_20261111120100_system_suggestions_law_v7.sql` | `2af1f39478f4203f4271201b0012b5acdc42461df0052d0482a5ea179926e79f` | 2,469 | ‏v7 → v6. שורת v7 נשארת כהיסטוריה לא פעילה |
| 18b | `ROLLBACK_20261111120000_admin_suggestion_decide.sql` | `027ad77cf11b1aa99b72ccae1c8c0fd0b1168a65c23abddcc4d22a5e4f056e90` | 8,357 | הפונקציה חוזרת לבסיס המדויק, כולל ההפעלה האוטומטית |

כל קובץ הוא פקודה אחת (בלוק DO): הכול או כלום. כל קובץ דורש אישור מפורש נפרד של ZURIEL, לפי ה־SHA-256 שלו, להרצה אחת (`CLAUDE.md` §0.4). אישור של קובץ אחד אינו אישור של אחר.

## סדר ההחלה
הסדר נאכף בתוך הקבצים עצמם, לפי בדיקות הגרסאות שבהם:

| שלב | קובץ | התנאי שבתוך הקובץ | המצב אחריו |
|---|---|---|---|
| 1 | 11b | ‏`system_suggestions_law` הוא **v6**; הפונקציה היא הבסיס `12961a8c…` | הפונקציה `f44dc42f…`; החוק עדיין v6 |
| 2 | 11c | הפונקציה היא **תוצאת 11b** (`f44dc42f…`); v6 מדויק | ‏v7 פעיל; v6 היסטוריה |
| rollback 1 | 18c | ‏v7 הוא בדיוק מה ש־11c כתב | ‏v6 פעיל; v7 היסטוריה |
| rollback 2 | 18b | ‏`system_suggestions_law` חזר ל־**v6**; הפונקציה היא תוצאת 11b | הפונקציה `12961a8c…` |

מה אוכף את הסדר:
- **11c לפני 11b:** ‏11c מסרב.
- **11b אחרי 11c:** ‏11b מסרב, כי הוא בודק v6.
- **18b לפני 18c:** ‏18b מסרב. הבדיקה הזו נוספה עכשיו ל־18b.

כך לא יכול להיווצר מצב שבו החוק אומר «החלטה בלבד» והפונקציה עדיין מפעילה סוכן. בחלון שבין 11b ל־11c, ‏v6 §17 רק **מתיר** assignment אוטומטי, והפונקציה לא משתמשת בהיתר. זה תקין.

## ייצוג במיגרציות
- **עכשיו:** ארבעת הקבצים נמצאים ב־`supabase/proposed/` ולא ב־`supabase/migrations/`. זו מוסכמת המאגר (ראו DEF-001), והיא נועדה לכך שהמאגר לא יציג מצב שלא הוחל. שמות הקבצים כבר כוללים את הסדר: `…120000` לפני `…120100`. כל ארבעת הקבצים זהים ביטים למה שיורץ.
- **ערוץ ההרצה המומלץ:** `apply_migration`, כשהשם הוא שם הקובץ בלי חותמת הזמן (`admin_suggestion_decide_decision_record_only_v1`, ואחריו `system_suggestions_law_v7_decision_record_only`). כך היסטוריית המיגרציות החיה תרשום את שני השלבים, כמו ב־DEF-001. הערוץ הזה מציג גם הודעת אישור של שרת Supabase. חלופה: `execute_sql`, כמו ב־SQL 10. בשני הערוצים מאמתים את ה־SHA-256 של הקובץ לפני ההרצה.
- **אחרי הרצה מאושרת:**
  1. אימות בקריאה בלבד: md5 של הפונקציה, ‏v7 פעיל ו־v6 לא פעיל.
  2. ב־PR נפרד: `git mv` של שני קובצי ההחלה ל־`supabase/migrations/`, עם אותם שמות ואותם בתים. שני קובצי ה־ROLLBACK נשארים ב־`supabase/proposed/`.
  3. קבלה (receipt), כמו `DEF-001-APPLY-RECEIPT`.
- **הרצה מחדש על מסד ריק:** הקבצים קפדניים, והם מסרבים אם הבסיס החי לא קיים. זה מכוון: הם רשומה של שינוי מוגן, לא מנגנון שמשחזר מסד. אם יידרש בעתיד נוסח שאפשר להריץ על מסד ריק, זו החלטה נפרדת.
- **בדיקות המאגר שקוראות את `supabase/proposed`** עוברות: `rpc-deploy-order-contract` ‏7/7, ‏`def001-email-exposure-contract` ‏5/5, ‏`def005-rpc-grants-contract` ‏3/3, ‏`push-subscription-rollout-order` ‏16/16. ‏`admin_suggestion_decide` מוגדרת גם ב־`supabase/migrations`, ולכן אין צורך ברישום ב־`APPLY-BEFORE-DEPLOY.json`.

## יישור `system_suggestions_law` (11c)
- **הגישה:** ‏EXTEND_EXISTING. אותו `rule_id`, גרסה 7. השורה של v6 נשארת כהיסטוריה לא פעילה, ושום דבר לא נמחק.
- **התוכן:** שש החלפות, כל אחת של מקטע שמופיע פעם אחת בדיוק. כל השאר זהה ביטים. הדיף המלא (hunk אחד, 12 שורות): [`system_suggestions_law_v6_to_v7.diff`](system_suggestions_law_v6_to_v7.diff). הטקסט המלא: [`new/rules/system_suggestions_law@v7.txt`](new/rules/system_suggestions_law@v7.txt).

| מקום | לפני (v6) | אחרי (v7) |
|---|---|---|
| כותרת בלוק v3 | ‏`… EXTEND_EXISTING]` | נוסף סימון: «§17–§21 aligned in v7 (ZURIEL, 11.11.2026)…» |
| ‏§17 | ‏ACCEPT = IMPLEMENTATION HANDOFF: «may automatically create one … CLAUDE maintenance assignment» | ‏ACCEPT RECORDS A DECISION ONLY: הסטטוס, ורשומה פסיבית אחת ל־ZURIEL עם הראיות וה־task_key. בלי assignment ובלי dispatch. עבודה מתחילה רק בהוראה מפורשת של ZURIEL בשיחה לסוכן מסוים |
| ‏§18 | «The maintenance assignment may…» | «Once instructed under §17, that agent may…». לא העבודה, לא ההצעה שאושרה ולא הרשומה מעניקות שחרור |
| ‏§19, משפט ה־major | «may be prepared after Human acceptance» | «may be prepared only after Human acceptance and an explicit instruction under §17» |
| ‏§20 | ‏the maintenance agent | ‏the instructed agent |
| ‏§21 | ‏work_log dispatch; assignment id | רשומת ההחלטה ב־work_log, שיחות הסוכנים הקיימות. העקיבות: מזהה ההצעה, רשומת ההחלטה וה־task_key, ההוראה של ZURIEL, ענף/PR/ראש |

- **המטא־דאטה:** של v6, ועוד מפתח אחד: `human_gate_v7_decision_record_only`. המפתח כולל מה השתנה, את נוסח ההחלטה, ‏`human_gate: ZURIEL 2026-11-11`, ‏`owner_check: EXTEND_EXISTING` ו־`no_new_system`. ‏`supersedes` מצביע על `v3_self_maintenance_2026_09_19.accepted_upgrade_auto_handoff` ועל `routine_release_owner`. הרשומות המתוארכות של v3 ושל v6 נשארות כמו שהן.
- **אין צרכן אחר:** אף פונקציה במסד ואף קובץ בקוד לא קוראים את `accepted_upgrade_auto_handoff`.
- **מחוץ לחבילה:** שתי פונקציות במסד, `admin_canonical_data_inventory_v1` ו־`fn_raziel_plan`, מציינות «system_suggestions_law v5» כתווית בעלים סטטית. התווית מיושנת כבר מ־v6. היא לא תלויה ב־§17 ולא נשברת עם v7. שינוי שלה דורש שינוי פונקציה.
- **ליטרלים:**

| | md5 | עוד |
|---|---|---|
| טקסט v7 | `a594e1fe21d41c644961771353b23934` | 18,606 תווים |
| מטא־דאטה v7 | `d2236c320e6b312b0bf57b5fb12a5582` | |
| שורת v6, נשארת היסטוריה | `98d4d88e…` | מטא־דאטה `f4e5216a…` |

## הפונקציה (11b)
- **מה לא משתנה:** כל מה שלפני בלוק הרשומה זהה ביטים לבסיס:
  - בדיקת המנהל ואימות הסטטוס;
  - נעילת השורה (`for update`);
  - אימות ה־payload, שומר החפיפה ועדכון הסטטוס.
- **הרשאות:** ההרשאות וה־SECURITY DEFINER לא משתנים.
- **הרשומה:** `to_actor=ZURIEL`, בלי שדות dispatch ובלי `assignment_mode`. הסטטוס הוא `SUGGESTION_ACCEPTED_NOT_ACTIVATED`.
- **הבעלים ברשומה:** נקבעים בזמן ההחלטה מהגרסאות הפעילות. אחרי 11c הם יציינו v7.
- **הדיף:** [`admin_suggestion_decide.diff`](admin_suggestion_decide.diff).
- **מה השתנה בקובץ בסבב הזה:** רק הכותרת (הסדר והשמות החדשים). ההגדרה המוטמעת זהה (md5 `f44dc42f…`).

## בדיקות מקומיות
הכול רץ מול שרתים מקומיים בלבד. אף בדיקה לא מתחברת למסד החי.

| חבילה | מנוע | תוצאה | מה מוכח |
|---|---|---|---|
| ‏`sim/run_11b_sim.mjs` | ‏PGlite 16.4 | **70/70** | נאמנות לחי לפי md5; הבסיס מפעיל סוכן; אחרי 11b אין הפעלה; סירובים; rollback; ‏**B8**: ‏18b מסרב כל עוד v7 פעיל |
| אותה חבילה | ‏PostgreSQL 17.7 אמיתי | **70/70** | אותן בדיקות, כל אחת במסד חדש |
| ‏`sim/run_order_concurrency_pg.mjs` | ‏PostgreSQL 17.7 אמיתי | **37/37** | ראו הפירוט מתחת לטבלה |

‏`run_order_concurrency_pg.mjs` כולל נאמנות לחי, סדר ההחלה וה־rollback, שורת v7 תחת שומר הגרסאות החי, סירובים ואטומיות, ובדיקת המקביליות.

**בדיקת המקביליות** (PostgreSQL 17.7, בכל חיבור סשן נפרד):

| # | תרחיש | תוצאה |
|---|---|---|
| C1–C3 | שני סשנים מאשרים את אותה הצעה (101) באותו זמן, פעם עם 11b בלבד ופעם עם 11b ו־11c. הסשן השני נראה ממתין לנעילת השורה (`wait_event_type=Lock`) כל עוד הטרנזקציה של הראשון פתוחה | שתי הקריאות מצליחות. **רשומה פסיבית אחת** ל־ZURIEL, **0 קריאות dispatch** ו־0 שורות dispatch. ההחלטה המאוחרת נשמרת |
| C4 | הסשן הראשון עושה rollback בזמן שהשני ממתין | השני כותב את הרשומה: אחת בדיוק, 0 קריאות dispatch |
| C5–C6 | הסשן השני ב־REPEATABLE READ | ‏`40001` (כשל serialization) במקום כפילות. הניסיון החוזר idempotent: רשומה אחת, 0 קריאות dispatch |
| C7 | שמונה סשנים באותו רגע | כולם מצליחים, רשומה אחת, 0 קריאות dispatch |
| C8 | שתי הצעות שונות באותו זמן | שתיהן מצליחות, רשומה לכל אחת, 0 קריאות dispatch. שומר החפיפה לא חוסם בטעות |
| C9 | להשוואה: הפונקציה החיה (בסיס) באותו מרוץ | ‏ASSIGNMENT אחד ל־CLAUDE, **קריאת dispatch אחת**. הסשן השני נדחה בשומר החפיפה |

ה־stub של `agent_dispatch_emit` מקדם גם רצף (sequence). רצף אינו טרנזקציוני, ולכן נספרת גם קריאה מתוך טרנזקציה שבוטלה.

**נבדק בחבילה הזו:** שתי קבלות מקבילות. **לא נבדק:**
- `agent_dispatch_emit` האמיתי: ב־stub.
- קריאה דרך PostgREST.
- השרת המקומי הוא 17.7 והחי 17.6. בדיקות הנאמנות (md5 של הפונקציות, הטריגרים, האינדקסים, האילוצים והשורות) תואמות.

**להרצה:**
```bash
cd docs/reviews/contract-governance-audit-20261110/gap-closure-20261111/sql11b/sim && npm ci
node run_11b_sim.mjs                                    # PGlite
# PostgreSQL 17 מקומי וזמני, רק על 127.0.0.1. למשל עם הבינארים של @embedded-postgres/linux-x64@17.7.0-beta.16, כמשתמש postgres:
#   initdb -D <dir> -U postgres --auth=trust -E UTF8 --no-locale
#   pg_ctl -D <dir> -o "-p 54917 -h 127.0.0.1" -w start
SOD_PG_URL=postgresql://postgres@127.0.0.1:54917/postgres node run_11b_sim.mjs
SOD_PG_URL=postgresql://postgres@127.0.0.1:54917/postgres node run_order_concurrency_pg.mjs
```
`local_pg.mjs` מסרב לכל שרת שאינו loopback. כל תרחיש רץ במסד `sod_sim_*` משלו, וכל המסדים נמחקים בסוף.

**יצירה מחדש:** `node gen_sql.mjs --write && node gen_law_sql.mjs --write` מפיקים את ארבעת הקבצים זהים ביטים (נבדק).
