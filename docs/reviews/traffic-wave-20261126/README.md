# גל תנועה מתחזה, 26.11.2026 — ראיות והצעה לתיקון סיווג (הצעה בלבד)

**מצב:** BRANCH-ONLY, תיעוד והצעה. **שום דבר אינו מוחל.** ענף `ccr-traffic-wave-20261126`, בסיס `origin/main` = `f6f1051d33baa3e24e4e8a0e6f67e7b639081099`.
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
תוספת עמודות nullable ל־`traffic_daily` (ללא שינוי העמודות הקיימות ומשמעותן): `page_views`, `page_engaged`, `page_bounces`, `anomalous`. `refresh_traffic_daily_range_v1` ימלא אותן **מיום חיתוך שייקבע** באמצעות `fn_ti_session_metrics` (שכבר מגדירה `page_engaged = page_views>=2` ו־`page_bounce = page_views=1 and interactions=0`). ימים קודמים נשארים NULL: ללא כתיבה מחדש של ההיסטוריה. הקוראים הקיימים ממשיכים לקרוא `engaged/bounces`; מעבר הדשבורדים לעמודות החדשות הוא החלטה נפרדת. **שבר סדרה:** שיעור ה־engaged החדש יהיה נמוך מהישן, כי הישן ספר כל ביקור כמעורב; חייב להיות מסומן בדשבורד.

## 4. מה לא נכלל
שינוי WAF · שינוי middleware או חסימת נתיב · חסימת גוגל או כל Googlebot · תיוג או מחיקה של שורות היסטוריות של הגל · טבלת הערות חדשה · שינוי בדגל או בסף · פריסה · מיזוג.

## 5. אימות מוצע לפני אישור (לא בוצע; ההצעה אינה כוללת עדיין קובצי SQL)
* מבחן Postgres אמיתי (17) על העתק מדויק של `ingest_event` החי עם guard על ה־md5: UA של Chrome/Firefox/Safari רגיל נקלט; `HeadlessChrome`, ‏`Playwright`, ‏`Selenium` נשמטים ונספרים ב־`crawl_daily` בלבד; Googlebot אינו משתנה (לא עובר דרך הקליטה); ערכי `_request_evidence` סגורים (בדיקה שאין מחרוזת חופשית); כותרת חסרה אינה שוברת קליטה (fail-open).
* מבחן `fn_ti_session_metrics` על סשן של הגל (צפיית עמוד אחת, ללא פעולה) ⇒ `page_bounce=true`; על סשן אמיתי עם שתי צפיות עמוד ⇒ `page_engaged=true`.
* מבחן ש־`traffic_daily` לימים לפני יום החיתוך אינו משתנה (ערכים זהים לפני ואחרי, העמודות החדשות NULL).
* מדידת עלות: קריאת כותרת אחת לכל קליטה (מיקרו־שניות); אין שינוי ב־RTT של הלקוח.
* יישור מול עבודה פתוחה: כל PR או ענף שנוגע ב־`ingest_event`, ב־`fn_human_entrances` או ב־`refresh_traffic_daily_range_v1` (כולל המשך `traffic_intelligence_law` v12→v13) חייב להיבדק לחפיפה לפני כתיבת SQL; כותב אחד לכל תחום.

## 6. החלטות הנדרשות מצוריאל
1. **P1:** האם אירוע שהצהיר על אוטומציה נשמט (מומלץ, כמו בוט מסומן היום) או נשמר עם דגל?
2. **P4:** יום החיתוך, ואישור לשבר הסדרה של שיעור ה־engaged.
3. האם לתאר את הגל הנוכחי בדוח מדידה כ״חריגה מתועדת״ (בלי לשנות שורות) באמצעות השאילתה הקריאה בלבד שבסעיף 7.
4. האם להמשיך לקובצי SQL (PROPOSAL ו־ROLLBACK עם guard על md5) לכל חלק לאחר ההחלטות לעיל.

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
