# גל תנועה מתחזה, 26.11.2026 — ראיות והצעה לתיקון סיווג (הצעה בלבד)

**מצב:** BRANCH-ONLY, תיעוד, הצעות SQL ובדיקות. **שום דבר אינו מוחל.** הגל מתועד כאן כחריגה מדידה (החלטת ZURIEL, 26.11.2026); אין שורה במסד שמתייגת אותו. ענף `ccr-traffic-wave-20261126`, בסיס `origin/main` = `f6f1051d33baa3e24e4e8a0e6f67e7b639081099`.
**ראיות:** [`EVIDENCE.md`](EVIDENCE.md) (סיכומים בלבד; ללא כתובות IP וללא מזהי מבקרים).
**חוזה שחל:** `traffic_intelligence_law` v12 (EXTEND_EXISTING; ללא מערכת מדידה שנייה) · `foundation_closure_protocol_law` v8 · CLAUDE.md סעיפים 0.4 ו־10 · חוק מהירות · חוק אינדוקס פתוח.

## 1. מה קרה, בקצרה
סריקה אלפביתית של רשימת הפוסטים בדפדפנים עם `HeadlessChrome/145` דרך רשת proxy ביתית בארה״ב (701 כתובות, 135 ארגוני רשת), החל מ־00:37 UTC ועדיין רצה בלכידה האחרונה. כל סשן: צפייה אחת בעמוד וצפייה אחת בתוכן, חציון 1.4 שניות, כמעט ללא פעולת המשך, `source=google` ו־`Referer: https://www.google.com/` על כל קריאות ה־API. העלות במסד זניחה (כ־2 MB, כ־60 MB יציאה). **הנזק הוא למדידה:** ב־`traffic_daily` של 26.11 נספרו 336 כניסות, מהן 331 ״engaged״ ו־5 נטישות, מול 130 ו־132 ביום קודם.

## 2. למה הסיווג הנוכחי מחמיץ (קוד חי, נקרא ב־26.11)
| # | פער | מקור |
|---|---|---|
| 1 | `engaged = views>=2`, ו־`views` ב־`fn_human_entrances` סופר כל `event_type='view'` בכל משטח. ביקור אחד בפוסט משדר צפיית עמוד (`surface='page'`) וצפיית תוכן (`surface='content'`), ולכן כל ביקור נחשב ״מעורב״. החוק (עדכון 7.9, v6) דורש ש־`page_engaged/page_bounce` ייגזרו מ־`page_views` ולא מכפילות משטחים. `fn_ti_session_metrics` כבר עושה זאת (`page_views`, `page_engaged`, `page_bounce`), אך `traffic_daily` נשען על `fn_human_entrances`. | `fn_human_entrances` (md5 `ace2b9fa0943d8f10aec96abb715f04c`), `fn_ti_session_metrics` |
| 2 | `suspected_bot` חל רק על `source='direct'` ובלי מדינה. תנועה שמצהירה `google` לעולם אינה חשודה (עדכון 7.8). | `fn_human_entrances` |
| 3 | `ingest_event` אינו בודק את ה־User-Agent או ה־Referer של קריאת ה־API. הוא כבר קורא `request.headers` (כתובת הלקוח לתקרת קצב), ולכן קריאת כותרת נוספת היא תבנית קיימת. סיווג בוט מסתמך רק על `p_is_bot` שהלקוח מסמן. | `ingest_event` (md5 `7c6e830f26697b27b95e9c192f7df1ee`) |
| 4 | בקשת ה־document לא נחסמה על ידי `BAD_BOT` (`headless`) ב־middleware, בעוד קריאות ה־API של אותו דפדפן נושאות `HeadlessChrome`. כלומר ה־User-Agent של ה־document שונה. **לא נפתר**: לוגי הבקשות של Vercel ל־document אינם נגישים בכלים שבידי. | `middleware-core.js` |

## 3. ההצעה (ארבעה חלקים נפרדים; כל אחד לאישור משלו; כולם קדימה בלבד)
עקרונות: תשתית מדידה אחת (`events`, `ingest_event`, `traffic_daily`); ללא טבלה, מנוע או אחסון חדשים; ללא שינוי היסטוריה (שורות קיימות ב־`traffic_daily` ו־`events` אינן נכתבות מחדש); ללא שינוי ב־middleware, ב־WAF או בנגישות Googlebot; ללא קוד ללקוח (אין השפעה על מהירות או על תקציב ה־shell).

### P1 — אות אוטומציה בצד השרת בקליטה (`ingest_event`)
קריאת `User-Agent` מ־`current_setting('request.headers')` (כמו הקריאה הקיימת של `cf-connecting-ip`). אם הוא מצהיר על אוטומציה (`headless`, `puppeteer`, `playwright`, `selenium`, `phantomjs`, `webdriver`), הבקשה מטופלת כבוט במסלול הקיים: חזרה לפני הכנסה, בדיוק כמו `if coalesce(p_is_bot,false) then return;`. תצפיתיות הבוטים נשארת בשכבה המשלימה לפי החוק (״BOT OBSERVABILITY BOUNDARY״): ספירה בלבד ב־`crawl_daily` באמצעות `log_crawl` הקיים, בלי שמירת אירועים (״אין להחזיר הצפת crawler ל־events רק כדי למלא Clean BOT״). נבחנה חלופה: שמירה עם דגל. נדחתה כברירת מחדל כי היא סותרת את מדיניות ״הבוט נשמט לפני הכנסה״ הקיימת; נשארת להחלטתך (סעיף 6).
**השפעת הגל הנוכחי:** כל 3,250 הקריאות היו `HeadlessChrome`, ולכן היו נשמטות. **מגבלה:** גל שישנה את ה־User-Agent של ה־API לא ייתפס ב־P1; לשם כך P3.

### P2 — ראיית בקשה מסווגת, ללא מחרוזות גולמיות
בקליטה נרשם ל־`props` (באותו אופן ש־`_measurement_verified` נרשם אחרי הוולידציה) שדה `_request_evidence` עם **ערכים סגורים בלבד**: `ua_class` ∈ {`browser`, `automation_declared`, `unknown`} ו־`referer_class` ∈ {`site`, `external`, `none`}. ה־Referer נחשב `site` רק לשלושת המארחים הציבוריים (`sod1820.co.il`, ‏`www.sod1820.co.il`, ‏`sod1820.vercel.app`); מארחי Preview מוגנים לפי הרשימה הקיימת. אין שמירה של ה־User-Agent, ה־Referer או כל כתובת. **זה ראיה בלבד: אינו מסווג ואינו מסנן.**

### P3 — ציר אנומליה מוצהר (לפי ״SESSION ANOMALY״ בחוק)
פונקציית קריאה (`STABLE`, ללא כתיבה) מעל `events`: דגלים לסשן — `external_api_referer` (מ־P2), `single_page_no_engagement` (צפיית עמוד אחת, בלי פעולה, פחות מ־3 שניות), `source_claim_without_site_referer` (`source=google` כשה־Referer של ה־API אינו אתר). **אנומליה אינה בוט** ואינה משנה את `clean_classification` ולא את `is_bot`; היא מוצגת לצד הסיווג (״Rank, Don't Hide״). משמשת בדוחות ובאזהרה, לא בסינון אוטומטי.

### P4 — הפרדה בין צפיית עמוד, צפיית תוכן ומעורבות אמיתית ב־`traffic_daily`
תוספת חמש עמודות nullable ל־`traffic_daily` (ללא שינוי העמודות הקיימות ומשמעותן): `page_views`, `page_engaged`, `page_bounces`, `engagement_sessions`, `anomalous`. `refresh_traffic_daily_range_v1` ימלא אותן **מהיום המלא הראשון אחרי ההחלה** (שורת חיתוך ב־`analytics_cache`, שעון ישראל) באמצעות `fn_ti_session_metrics` (שכבר מגדירה `page_engaged = page_views>=2` ו־`page_bounce = page_views=1 and interactions=0`). ימים קודמים נשארים NULL: ללא כתיבה מחדש של ההיסטוריה. הקוראים הקיימים ממשיכים לקרוא `engaged/bounces`; מעבר הדשבורדים לעמודות החדשות הוא החלטה נפרדת. **שבר סדרה:** שיעור ה־engaged החדש יהיה נמוך מהישן, כי הישן ספר כל ביקור כמעורב; חייב להיות מסומן בדשבורד.

## 4. מה לא נכלל
שינוי WAF · שינוי middleware או חסימת נתיב · חסימת גוגל או כל Googlebot · תיוג או מחיקה של שורות היסטוריות של הגל · טבלת הערות חדשה · שינוי בדגל או בסף · פריסה · מיזוג.

## 5. מה הוכן ונבדק (הצעות SQL ובדיקות; **לא הוחל דבר**)
החלטות ZURIEL (26.11.2026) שנקלטו: P1 השמטת אוטומציה מזוהה ממדידת המבקרים וספירתה בנפרד · P2 ראיות מסווגות בלבד · P3 ציר אנומליה נפרד, בלי סיווג אוטומטי של ביקורים קצרים כבוטים · P4 מדידת מעורבות מתוקנת מהיום המלא הראשון אחרי ההפעלה העתידית, בלי שינוי היסטוריה · הגל מתועד כחריגה.

| קובץ | מה הוא עושה | שחזור |
|---|---|---|
| `supabase/proposed/20261126190000_ingest_request_evidence_PROPOSAL.sql` | P1+P2: טלאי מעוגן (שלושה עוגנים, כל אחד פעם אחת) על ההגדרה החיה של `ingest_event`. User-Agent שמצהיר על אוטומציה ⇒ חזרה לפני הכנסה (כמו `p_is_bot`) וספירה ב־`crawl_daily` (בוט `automation-declared`). כל בקשה אחרת נקלטת כמו קודם, עם `props._request_evidence` בערכים סגורים. כל כשל קריאה/פרסור ⇒ fail-open. | `…_ROLLBACK.sql` מסיר בדיוק את שלושת הקטעים ודורש טביעת אצבע ידועה |
| `supabase/proposed/20261126190100_session_anomaly_axis_PROPOSAL.sql` | P3: פונקציית קריאה בלבד `fn_ti_session_anomaly_v1` (דגלים נייטרליים; מוחזרים רק סשנים עם דגל). לא נוגעת ב־`is_bot`, ב־`suspected_bot`, ב־`clean_classification` או בספירות. `service_role` בלבד. | `…_ROLLBACK.sql` |
| `supabase/proposed/20261126190200_traffic_daily_page_engagement_PROPOSAL.sql` | P4: חמש עמודות nullable ב־`traffic_daily` (`page_views`, `page_engaged`, `page_bounces`, `engagement_sessions`, `anomalous`), שורת חיתוך ב־`analytics_cache` (היום המלא הראשון אחרי ההחלה, שעון ישראל) ו־`refresh_traffic_daily_range_v1` שהמשפט הישן שלו נשאר זהה והעמודות החדשות מתמלאות רק מיום החיתוך. ימים קודמים נשארים NULL. | `…_ROLLBACK.sql` משחזר את טקסט הפונקציה המקורי (אותו md5), מוחק את העמודות ואת שורת החיתוך |
| `test/traffic-wave-classification-20261126-realpg.sh` (+ `test/fixtures/`) | 36 בדיקות על Postgres אמיתי מבודד, מול העתק מדויק של `ingest_event` החי (md5 `6dd7585345d10a3a323810fd768fcf3b` נבדק), `fn_human_entrances` והפונקציה המקורית של ה־refresh. | |

מה הבדיקות מוכיחות: שהשמטת האוטומציה לא כותבת אירוע ונספרת בנפרד; ש־Chrome רגיל נקלט ללא שינוי; שערכי הראיה סגורים ושאין User-Agent או Referer גולמיים ב־`props`; שוולידציית המעטפת הקיימת, ההרשאות ונתיבי הלקוחות הישנים לא השתנו; שכותרות חסרות או שבורות אינן שוברות קליטה; שהטלאי מורכב על טלאי #1528 ומתגלגל חזרה בדיוק; ש־P3 לא משנה כניסות, ‏`is_bot` או סיווג; ש־P4 לא נוגע בימים שלפני החיתוך, שהעמודות הישנות זהות לפלט הפונקציה המקורית, ושהגל נספר כנטישות עמוד ולא כמעורבות; ושכל אחד מהקבצים נכשל (P0001) בסחף ואינו מצליח בשקט.
**מגבלות שנשארות:** (1) הבדיקות רצו על PostgreSQL 16.15 מקומי; הצעד ב־CI מקבע 17. (2) המדידה על ה־DB החי היא קריאה בלבד. (3) גל ששינה את ה־User-Agent של קריאות ה־API לא ייתפס ב־P1; P2/P3 נותנים לו ראיה בלבד. (4) מיקום העוגנים נבדק על ההגדרה החיה בקריאה בלבד ב־26.11; סחף עד ההחלה ייתפס ב־guard.

## 6. חפיפה עם עבודה קיימת (נבדק ב־26.11.2026 מול 27 PRs פתוחים ו־`work_log`)
* **#1528** (`gpt/operational-client-failures-monitor-20261123`) כולל `supabase/proposed/app-health-incidents-20261123/ingest_event-apply.sql`, טלאי ל־`ingest_event` שה־guard שלו נועל `md5(pg_get_functiondef)` = `4006c82328aa8358a21ebdb5792024e3`. **ה־guard כבר אינו תקף**: טביעת האצבע החיה היא `6dd7585345d10a3a323810fd768fcf3b` (השינוי מ־#1545, traffic_intelligence v12, הוחל ב־25.11). כלומר הקובץ של #1528 ייכשל כיום, בטוח, אך דורש עדכון guard מבעליו. הצעתי מקבלת את שתי טביעות האצבע (לפני ואחרי #1528), ובדיקת ההרכבה מוכיחה ששני הסדרים עובדים. **הכרעה נדרשת: סדר ההחלה, וכותב אחד לתחום `ingest_event`** (CLAUDE.md §10). נוסף ב־#1528: שינוי ב־`src/lib/tracking.js` (לקוח) ובמסמך `measurement-20261113`; אין חפיפה עם הצעה זו, שאינה נוגעת בלקוח.
* **#1547 / #1548** (`fn_human_entrances` v2, התרעת הפסקת מדידה): מוזגו והוחלו; ההצעה נשענת על `fn_human_entrances` כפי שהוא עכשיו ואינה משנה אותו.
* **#1545** (`traffic_intelligence` v12, צירוף משפחות מדידה): הוחל ב־25.11; ההצעה נבנתה על ההגדרה שהוא הותיר.
* שאר ה־PRs הפתוחים (25) אינם נוגעים ב־`ingest_event`, ‏`traffic_daily`, ‏`fn_human_entrances`, ‏`refresh_traffic_daily_range_v1` או `crawl_daily`. אין כותב פעיל נוסף בתחום ב־`work_log` של 4 הימים האחרונים.
* עלות ה־P4: ‏`fn_ti_session_metrics` ל־7 ימים 1.08 שנ׳ ו־`fn_human_entrances` ל־8 ימים 0.42 שנ׳, פעם בשעה (cron ‏`traffic-daily-refresh`). `admin_entries_daily` מחזירה `SETOF traffic_daily` ולכן תחזיר גם את העמודות החדשות.

## 6א. החלטות שנותרו
1. סדר ההחלה מול #1528 וכותב יחיד ל־`ingest_event`.
2. אישור נפרד, לכל קובץ, להחלה (שלושה קבצים; P3 לפני P4).
3. אישור לסדרת engaged חדשה בדשבורדים בנפרד מהישנה (ללא החלפה ללא החלטה).

## 7. שאילתה לדיווח בלבד (קריאה, אינה נשמרת)
```sql
-- Sessions that fit the wave signature (reporting only; nothing is written or reclassified).
select count(*) as sessions, min(t0) as first_seen, max(t0) as last_seen
from (
  select session_id, min(ts) t0,
         count(*) filter (where surface='page' and event_type='view') page_views,
         count(*) filter (where event_type='engagement') engagement,
         max(extract(epoch from ts)) - min(extract(epoch from ts)) dur_s,
         max(props->>'source') filter (where event_type='source') src
    from public.events
   where ts >= timestamptz '2026-11-26 00:35+00' and session_id is not null
   group by session_id
) s
where src = 'google' and page_views = 1 and engagement = 0 and dur_s < 3;
```

**השפעה על התיעוד הקנוני:** אין (הצעה בלבד; לא נוצר חוזה או מנגנון חדש).

## 8. קבצים וגיבוב (sha256)
| קובץ | sha256 |
|---|---|
| `supabase/proposed/20261126190000_ingest_request_evidence_PROPOSAL.sql` | `08551c8ebe4f1697d42cb8069612aa61c85c2f950a2e71fdd896831853937da7` |
| `supabase/proposed/20261126190000_ingest_request_evidence_ROLLBACK.sql` | `b9e5cf75665603db03a040e2e2c0261f556c0dc7d9489135f709348ee0490ee5` |
| `supabase/proposed/20261126190100_session_anomaly_axis_PROPOSAL.sql` | `0a87cc3794f2c2dba81deb90115162bc8fa3b7514b123d7d09abbf4a54b1db09` |
| `supabase/proposed/20261126190100_session_anomaly_axis_ROLLBACK.sql` | `0cd2f948797c2f4dbc3511b3ae63e0508d6bfa72c62f4b13c98cd4d84fe0dbd7` |
| `supabase/proposed/20261126190200_traffic_daily_page_engagement_PROPOSAL.sql` | `26c474fc8ea817804998c1699fba86c8d2d6d6efa06450199192d22bfdca6226` |
| `supabase/proposed/20261126190200_traffic_daily_page_engagement_ROLLBACK.sql` | `d02b2de25bff9406e4887a040db1075ce2b2c8996403f97000af4cb5f7fe0e5b` |
| `test/traffic-wave-classification-20261126-realpg.sh` | `dd59b7bfc5a6732ee2fb2e7933cd227a1bdbde80b969dd8454d347bcbbdb71b1` |
| `test/fixtures/ingest_event_live_20261126.sql` | `adae2149813b8e76c3090be69da6fbc926827cc5a029e11af90a17bd3211bf6f` |
| `test/fixtures/traffic_fns_live_20261126.sql` | `f20ee4b525ee898a09331a84fe97c035b95d05433f78cb1995fcb9158cab399f` |
