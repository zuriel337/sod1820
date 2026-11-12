# M0 — מצבי ביניים בין SQL, ‏Edge ופריסת האתר; אמון בכותרות הכתובת; מגביל לא זמין (12.11.2026)

> שלושת השלבים מאושרים ומבוצעים בנפרד, ולכן המערכת צריכה להישאר תקינה בכל סדר חלקי. הבדיקות כאן קוראות רק קבצי מאגר והיסטוריית git. אין בהן שום קריאה לחי.
> **מבחן:** `node --test test/m0-intermediate-states.test.mjs` (מחובר ל־CI, שלב ״M0 Edge rollback package and intermediate states״).

## 1. מטריצת המצבים

| מצב | מה קורה | ראיה |
|---|---|---|
| **SQL הוחל, ‏Edge ישן** | הקוד הפרוס הישן קורא לפונקציות ש־DEF-005 / M0 מעבירות לשרת בלבד (`ai_quota_check`, ‏`router_rate_check`, ‏`fn_raziel_claim`, ‏`fn_outbox_bump`), אבל **תמיד עם מפתח service-role**: ‏`svcHeaders()` ב־`ai-analyze`, ‏`SERVICE_KEY` ב־`field-router`, וה־client של השרת `sb` ב־`wa-raziel`. לכן הוא ממשיך לעבוד. אף פונקציה פרוסה לא קוראת ל־`wa_msg_count` או לפונקציות הביקורת והגילוי שנסגרות. ‏SQL ‏M0-B עם Edge ישן מסרב רק לאורח בלי זהות, כלומר הוא **מחמיר** ולא מקל | מבחנים 5–16: לכל אחת מהתשע, על הקוד **הפרוס** (artifacts, או git לפי ה־manifest) |
| **Edge חדש, ‏SQL ישן** | הקוד המוצע קורא רק ל־RPC שקיימות בחי היום: 39 שמות ושש `els_matrix_reading_job_*_v1` (`pg_proc`, ‏12.11). המגבילים (`edge_rate_limit_check`, ‏`ai_quota_check`) נקראים רק דרך `serviceRpc`, כך שהם עובדים לפני ואחרי REVOKE. בלי SQL ‏M0-B, ‏`ai_quota_check` עדיין מאשר זהות ריקה, אבל Edge החדש לא שולח זהות ריקה (אורח → 401) | מבחן 17 |
| **אתר ישן, ‏Edge חדש** | ה־Service Worker הציבורי ב־Production מעביר את `ai-analyze`, ‏`journey-message`, ‏`number-researcher` ו־`lab-teacher` רק למנהל (`adminFunctions` ← ‏`verifyReadingAdmin`), ולכן אין שינוי גלוי לציבור. הקוראים בדפדפן שולחים את ה־JWT של המשתמש אוטומטית (`supabase.functions.invoke`) | מבחן 18; ‏`cluster-B` §6 (ראיה חיה: 7 ימים, כל עקבות ה־AI בתשלום של מנהל) |
| **אתר חדש, ‏SQL ו־Edge ישנים** | המדידה החדשה כותבת רק ל־sink הקיים `ingest_event`. התווית ״טרם אומת״ והשכבה החדשה בעולם קוראות טבלאות ציבוריות קיימות. דף התורם קורא את `world_contributor_research_v2`. כל עוד v2 לא קיים, הוא עובר ל־v1 ופשוט לא מציג מועמדים. שגיאת הרשאה או רשת **אינה** גורמת למעבר | מבחן 19; ‏`m0d-contributor-view-v2` (6); ‏`public-research-candidates-visible-2029` (12) |
| **v1 כפי שהוא היום** | הקורא של דף התורם ב־Production (‏`146f2f0e7`, וגם בבסיס `949c24ad5`) לא מסנן לפי status ואין בו פונקציית תווית. זו הסיבה ש־v1 לא משתנה | מבחנים 3–4 (״why v1 must never change״) |
| **לשונית ישנה שנשארה פתוחה אחרי פריסת האתר** (סבב 3) | ה־Service Worker מחליף את עצמו (`skipWaiting` + `clients.claim`), אבל **קוד הדף שכבר נטען לא נטען מחדש**. רענון קורה רק כשנכשלת טעינת chunk (`appRecovery2029`) או ידנית, ואין בטלמטריה מזהה build שיגיד מתי נסגרה הלשונית הישנה האחרונה. הקורא הישן מציג כל שורה של v1 כ״ממצא ציבורי״, בלי תווית סטטוס. **לכן שינוי v1 במקום (ההצעה של סבב 2) היה חושף מועמדים בלי ״טרם אומת״ בכל לשונית כזו.** התוכנית עודכנה: v1 לא משתנה, ומועמדים מגיעים רק מ־v2, שרק הקוד החדש קורא | `m0d-contributor-view-v2`: הקוד החי קורא רק v1; אף קובץ SQL ב־M0 לא משנה את v1; ‏SQL זמני: v1 זהה בבתים אחרי ההחלה, ושתי מוטציות נתפסות. **סבב 4, בדפדפן** (`m0d-contributor-stale-client.browser.mjs`, בנייה של `146f2f0e7` מול בנייה של הענף): A — לשונית ישנה קוראת רק v1; B — הקוד החדש קורא v2 ומציג ״טרם אומת״ אחרי ״מאושר״; C — ‏v2 הוסר → v1, בלי תקלה; D — שגיאת הרשאה לא גורמת למעבר |
| **סדר SQL ואתר** | בכל סדר בטוח. SQL לפני האתר: האתר הישן קורא v1, שלא השתנה. האתר לפני SQL: האתר החדש עובר ל־v1, בלי מועמדים. שלב 11 כבר אינו `mandatory-after-site` | מבחן ״any order of SQL and site״ |
| **rollback** | סדר מחייב (`rollback_order`): **(1)** להסיר את v2, **(2)** להחזיר את האתר, **(3)** ‏Edge, **(4)** שאר ה־SQL בסדר הפוך. עם v2 גם הסדר ההפוך בטוח (אתר ישן קורא v1 בלבד), אבל התוכנית מקבעת סדר אחד | אותו מבחן: v2 ראשון, האתר אחריו |
| **סדר ה־SQL** | `def001b` שלב 2 (`push_subscriptions`) רק אחרי שלב 1. כל קובץ ו־rollback תואמים ל־SHA-256 שב־`apply-plan.json`; קובץ שהשתנה מפיל את המבחן | מבחן 1 |
| **Edge drift** | הסיווג ב־manifest (שלוש זהות לבסיס, חמש ישנות או לא ניתנות לשחזור, אחת בלי מקור) נאכף | מבחן 20 |

**שומרי md5 ב־SQL:** ב־12.11 אחרי הסבב, קריאה בלבד: הגוף החי של `admin_resolve_translit`, ‏`admin_ai_cost`, ‏`link_visitor_identity`, ‏`add_contribution` וה־view `world_contributor_research_v1` עדיין תואם ל־md5 ״לפני״ שכל קובץ בודק. `ai_quota_check` עדיין בגוף הישן (fail-open). כלומר אף סשן אחר לא שינה אותם מאז ההכנה. כל קובץ בודק את זה שוב בעצמו ונעצר בסטייה.

## 2. אמון בכותרות כתובת הלקוח

ראיה: ‏`function_edge_logs`, ‏24 שעות, 4,593 בקשות (12.11, קריאה בלבד).
- `cf-connecting-ip` הופיע ב־**100%** מהבקשות. הוא תמיד שווה ל־`x-real-ip`, אף פעם לא מכיל פסיק, ויש לו 321 ערכים שונים. זו הכתובת ש־Cloudflare (שלפני Supabase) קובעת. לקוח לא יכול לקבוע אותה בבקשה שעוברת דרכו.
- `X-Forwarded-For` נרשם רק ב־28 בקשות, וכולן `/functions/v1/meta-capi`: שרת־לשרת מ־Vercel, קפיצה אחת, אף פעם לא שווה ל־cf. כלומר XFF הוא ערך **שהקורא שולח**, והקפיצה הראשונה בו נשלטת על ידי הקורא.
- הקוד (`_shared/edgeCallerLimits.js` → ‏`platformClientIp`): ‏`cf-connecting-ip`, ואם אין — **הקפיצה האחרונה** ב־XFF, לעולם לא הראשונה. הגיבוי לא קרה בפועל ב־24 השעות. ה־SQL של `add_contribution` עובר לאותו סדר: ‏`cf-connecting-ip` → ‏`x-real-ip` → הערך הישן, כמו ב־`add_guest_community_message` שכבר חי.
- **הנחה שנשארת:** כל בקשה מגיעה דרך Cloudflare. לא נצפתה בקשה בלי `cf-connecting-ip`. אם כזו תגיע, הקוד ישתמש בקפיצה האחרונה ב־XFF, שבמסלול כזה גם אותה הלקוח יכול לקבוע. במקרה הזה המפתח עדיין עובר HMAC ונשאר מוגבל בדלי הגלובלי.
- **קריאות פנימיות של אורח:** למשל `ai-analyze` → ‏`research-run` בלי JWT של משתמש. הן מגיעות מכתובת היציאה של Edge וחולקות דלי אחד בחישוב הציבורי. כך זה גם היום.
- מבחנים: ״public compute subject: platform address only; rotating user-agent, first XFF hop or visitor_id is the same bucket״ (cf מועדף, הקפיצה האחרונה כגיבוי, סיבוב הקפיצה הראשונה לא משנה דלי, המפתח ממולח בסוד השרת). ״per-address limit… a fake first XFF hop does not help״ (`contact-notify`).

## 3. כשהמגביל לא זמין

| משפחה | התנהגות | מבחן |
|---|---|---|
| AI בתשלום (כל נתיבי טבלה א ב־`ai-coverage.md`) | **נכשל סגור**: 503 `rate_limit_unavailable` או `quota_unavailable`, בלי trace, בלי שער ובלי ספק | ״quota/limiter infrastructure failure is a refusal (503) for paid AI״; ‏״bucket denial -> 429, limiter outage -> 503; neither reaches gate or model״; ״guide: limiter unavailable … -> 503, no provider call״; ‏field-router |
| ערוץ WhatsApp המהימן | נשאר פתוח (היסטורי, לא שונה) | ״trusted WhatsApp channel … fail-open (unchanged)״ |
| חישוב ציבורי (`els-search-bridge`, ‏`research-run`) | **נכשל פתוח**: הבקשה ממשיכה ל־trace ולשער הקנוני, שנשארים fail-closed כמו קודם. דחייה מפורשת → 429 | ״public compute fails OPEN on limiter failure but still returns 429 on an explicit denial״; ״els-search-bridge: limiter outage fails OPEN…״; ״research-run: limiter outage fails OPEN…״ |
| `contact-notify` | נכשל סגור: לא נשלח דוא״ל | ״fails closed: limiter down, missing recipient or provider key -> no e-mail״ |

**ההשלכה של fail-open בחישוב ציבורי:** בזמן תקלה במגביל, ELS ו־research-run פתוחים בלי גבול קצב. כך זה היום (research-run בלי מגבלה בכלל). הם לא קוראים לספק AI בתשלום, והעלות היא חישוב במסד בלבד.
