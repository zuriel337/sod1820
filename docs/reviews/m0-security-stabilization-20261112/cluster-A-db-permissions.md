# M0-A · הרשאות מסד, פעולות ניהול, נתוני חשבון, Legacy, policies רדומים ו־cron

> הצעה בלבד. שום דבר לא הוחל על המסד החי. בסיס: `origin/main` 949c24ad5 (12.11.2026). המקור: מפת ההרשאות `SOD1820_PERMISSIONS_MAP_20261112` §3.4 ו־§6 (סעיפים 1, 5, 6, 8), וההחלטות של צוריאל מ־12.11 (״עולם ציבורי כברירת מחדל״, ״לסגור את כל השבע״).
> בעלים: תוכנית האבטחה `docs/2029-security-hardening-gate-plan-v1.md` (S2) ושרשרת ה־DEF ב־`docs/reviews/audit-remediation-20261106/README.md`. הכותב: CLAUDE, בסשן הזה.

## מה בחבילה

| קובץ (`supabase/proposed/`) | מה הוא עושה | rollback |
|---|---|---|
| `20261106131000_def005_…` (DEF-005, נוסח מעודכן) | 12 פונקציות המערכת של המפה הופכות לפונקציות של השרת בלבד (anon ו־authenticated מאבדים EXECUTE; service_role מקבל במפורש). נוסף `fn_edge_grant_audit`. `ai_quota_check` עובר לשרת בלבד | `ROLLBACK_20261106131000_def005.sql` |
| `20261112130000_m0a_admin_and_account_guards.sql` | בדיקת מנהל ל־`admin_resolve_translit` ול־`admin_ai_cost`. ‏`wa_msg_count` לשרת בלבד. ‏`link_visitor_identity` כבר לא דורס קישור של חשבון אחר. שורות פרטיות ב־`gematria_wall` מוסתרות מהציבור | `ROLLBACK_20261112130000_…` |
| `20261112130500_m0a_legacy_client_writes_close.sql` | שבע טבלאות ה־Legacy נסגרות לכתיבה מהלקוח. קריאת `lab_*` למנהל בלבד. אף שורה לא נמחקת | `ROLLBACK_20261112130500_…` |
| `20261112131000_m0a_dormant_write_policies_admin_only.sql` | שבעה policies רדומים של ״כל מחובר כותב״ נעשים מנהל בלבד, באותו שם | `ROLLBACK_20261112131000_…` |
| `20261112131500_m0a_cron_inactive_secret_jobs_unschedule.sql` | הסרת 4 משימות cron כבויות שהסוד מוטבע בכתובת שלהן | `ROLLBACK_20261112131500_…` (משחזר כבויות, בלי הסוד) |
| `20261112133000_m0a_add_contribution_client_address.sql` | מגבלת האורח (5 בשעה) ב־`add_contribution` הייתה לפי ה־hop הראשון ב־X-Forwarded-For, שהמבקש שולט בו. עכשיו `cf-connecting-ip` קודם, כמו ב־`add_guest_community_message` (נמצא ב־M0-B, §6 סעיף 7) | `ROLLBACK_20261112133000_…` |
| `20261112132000_def005b_…_OPTIONAL.sql` | **אופציונלי, דורש סימון נפרד:** 15 השמות הנותרים מרשימת 6.11. אין להם קורא בקוד המשלוח, ולכן הם עוברים לשרת בלבד | `ROLLBACK_20261112132000_def005b.sql` (מחזיר את ההרשאות המדויקות) |
| DEF-001b שלב 1 + שלב 2 (קיימים, נבדקו מול החי) | `feedback` לקריאת מנהל בלבד. ‏`visitor_id` יוצא מ־`els_records`. ‏`push_subscriptions` דרך שתי RPC, ואחר כך נעילת הגישה הישירה לאנונימי | `ROLLBACK_20261106121000_def001b.sql` |

## אימות מדויק מול המפה (12.11, קריאה בלבד)
- **12 פונקציות המערכת:** כולן SECURITY DEFINER בבעלות postgres, ובלי בדיקת קורא. ה־ACL שלהן הוא PUBLIC (NULL או `=X`). כל הקוראים ממשיכים לעבוד:
  - cron (`security_spike_hourly`, ‏`edge-grant-audit-daily`, ‏`rls-grant-audit-weekly`) רץ כ־postgres;
  - פונקציות SECDEF בבעלות postgres: `admin_candidate_decide`, ‏`fn_edge_grant_gaps`, ‏`fn_capability_execution_gate_v1`;
  - Edge עם service role: ‏wa-raziel/michael/gabriel/uriel/hatishbi, ‏field-router, ‏ai-analyze (`svcHeaders`);
  - אין שום קורא בקוד המשלוח.
- **נמצא באימות — `admin_ai_cost`:** אותה מחלקה B. כל מחובר יכול להפעיל אותה, והיא מחזירה עלות AI לכל מקור ומודל, וגם **מזהי צ׳אט וואטסאפ (טלפון או קבוצה) ושמות שולחים**. לכן נוסף לה אותו שומר. לעטיפה `getAiCostMetrics` אין מייבא בקוד.
- **`wa_msg_count`:** שני הקוראים שלה הם פונקציות SECDEF בבעלות postgres (`research_level_of`, ‏`my_research_level`), ולכן הם לא מושפעים.
- **`link_visitor_identity`:** בעבר `on conflict do update set user_id = excluded.user_id` איפשר לחטוף visitor_id של אחר. הקורא היחיד: `AuthContext`.
- **`gematria_wall`:** מתוך 28,950 שורות, 185 פרטיות. הקורא הציבורי (`getWallRecent`) כבר מסנן `private=false`, ולכן אין שינוי נראה לעין.
- **Legacy:** אין כותב בקוד 2029. ‏`lab_*` נכתבות ונקראות רק על ידי lab-reflect ו־wa-mora עם service role. ‏`sendChatMessage` בלי מייבא.
- **cron:** ‏4 המשימות (6, 7, 22, 24) כבויות, ונושאות ערך אחד בן 20 תווים כ־`?s=`. הערך לא הודפס ולא נשמר. אין משימה, פונקציה או קוד אחר שמכיל אותו או בודק אותו.
- **DEF-001b מול החי:** הפונקציות `push_subscription_*_v1` עוד לא קיימות. ‏`pushSubscriptionStore.js` (כבר בחי) קורא להן ונופל לכתיבה ישירה אם אינן. אין בקוד קריאה של `els_records` שבוחרת `*` או `visitor_id`.

## איך כתוב כדי שיהיה מדויק
גופי הפונקציות לא הוקלדו מחדש. כל גוף נקרא מהקטלוג החי ונבדק ב־md5 מול הטקסט שנסקר ב־12.11. אחר כך נוסף לו שינוי בעוגן אחד מדויק, והוא נוצר מחדש. ‏`CREATE OR REPLACE` שומר בעלות והרשאות. כל סטייה עוצרת את הקובץ. הרצה חוזרת אינה עושה דבר. ה־rollback מחזיר את הגוף המקורי ובודק את ה־md5 שלו.

## בדיקות שהורצו (מקומית, Postgres 16 זמני, לא CI)
- `bash scripts/run-m0a-db-permissions-sql-test.sh` → **ALL PASS**. ה־fixture זהה לחי: md5 של ארבעת הגופים שווה לחי. רצף הבדיקה:
  - לפני: החשיפות קיימות;
  - החלה לפי סדר;
  - אחרי: 60+ טענות;
  - הרצה חוזרת: idempotent;
  - עצירה על drift;
  - rollback בסדר הפוך, והשוואת תצלום קטלוג מלא (הרשאות פונקציה ל־3 תפקידים, md5 גופים, הרשאות טבלה, כל ה־policies, cron) — **זהה**;
  - DEF-005b: החלה ו־rollback להרשאות המדויקות.
- בדיקות מוטציה: ציפייה שגויה מכשילה את הבדיקה. שורת rollback חסרה מתגלה בהשוואה ("rollback is not exact").
- `SOD_SQL_TEST_SOCKET_DIR=… bash scripts/run-def001-sql-test.sh` → DEF-001, ‏001b, ‏004, ‏005 ו־003: **PASS**.
- `node --test test/def005-rpc-grants-contract.test.mjs test/m0a-db-permissions-contract.test.mjs` → ‏4/4 ו־5/5.

## סיכונים
- הסרת EXECUTE עם לקוח שלא נמצא בקוד: אחרי ההחלה מחזירה 42501. ה־rollback מיידי, ונבדק.
- `admin_ai_cost` דורש עכשיו מנהל מחובר. אין קורא שרת.
- cron: הסוד הישן לא חוזר ב־rollback (בכוונה). הסבב — ב־README של החבילה.
