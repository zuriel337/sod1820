# חבילת אבטחת הקצה — ניטור, דיווח מאומת ו־canary חתום (26.11.2026)

**מצב:** BRANCH-ONLY. **שום דבר אינו מוחל.** ענף ייעודי `ccr-s1-security-edge-20261126`, שנבנה מ־`origin/main` = `f6f1051d33baa3e24e4e8a0e6f67e7b639081099` ומכיל **רק** את חבילת האבטחה. הצעות המסד (D-1..D-5) וסביבת הבדיקות (`scripts/live-browser-check.mjs`, ‏`CLAUDE.md`, ‏`AGENTS.md`) נמצאות בענפים נפרדים ואינן כאן. הקומיט המדויק נמסר בבקשת האישור בשיחה (קומיט המסמך אינו יכול להכיל את ה־SHA של עצמו).
**הכרעה:** מגדל הפיקוח 337. **בעלות (כותב יחיד):** שומר הקצה (`middleware-core.js`), ה־canary (G3 reliability), והאבטחה/הבריאות (`check_security_spike`); כל שינוי כאן הוא הצעה לבעלים אלה.

## 1. שני הפערים שנסגרו

| פער | לפני | אחרי (בענף) | מנגנון קיים שנעשה בו שימוש |
|---|---|---|---|
| `log_security` פתוחה ל־anon ול־authenticated ללא אימות מקור | ACL חי: `{=X/postgres,postgres,anon,authenticated}`: כל מי שמחזיק במפתח ה־anon הציבורי כותב ל־`security_log`, מזייף ספייקים ומנפח את הטבלה | **`service_role` בלבד.** הכותב היחיד הוא פונקציית הקצה `security-probe-log`, שמאמתת את אסימון ה־OIDC של פריסת ה־Production של הפרויקט (אותו מאמת, אותם קבועים, כמו `sg-rate-limit`; מבחן שמוודא שאין סחף ביניהם). מפתח ה־service role אינו יוצא מ־Supabase | אימות OIDC של Vercel (`sg-rate-limit`), הרשאות Postgres, `log_security` עצמה |
| זיהוי canary לפי User-Agent ניתן לזיוף | כל אחד יכול לשלוח UA כזה; שורה כזו הייתה מוחרגת מספירת ספייק (ויכלה להסתיר התקפה) ויכלה לנקות התראת שקט | **HMAC חתום**: `proof = <דקה>.<HMAC-SHA256(מפתח, "sod1820-security-canary:v1:<דקה>")>`, חלון ±10 דקות. המפתח (`SECURITY_CANARY_KEY`) נמצא רק בסודות הפונקציה וב־secret של ה־workflow; הקצה מעביר הוכחה אטומה ואינו מכיר את המפתח. הפונקציה בלבד מסמנת `sod1820-security-canary/1`; כל טענת canary אחרת נשמרת כ־`forged-canary:…` וסופרת כתקיפה. **שורות canary כבר אינן מוחרגות מספירת הספייק** (ספירה זהה לגמרי למקור) | HMAC (Web Crypto), `check_security_spike` |

המקור המאומת הוא פריסת Production בלבד: ב־Preview אסימון ה־OIDC הוא של סביבת `preview` והפונקציה דוחה אותו (`environment_mismatch`); ב־Preview ייבדקו ה־403 וה־matcher, והתיעוד יוכח בפריסה המאושרת.

## 2. שלוש שכבות, כל אחת נבדקת בנפרד

1. **מניעה:** 403 בקצה לרשימה סגורה של נתיבי סריקה, לפני כל קריאת מסד (`edge-security-probe.js`). WAF לא שונה.
2. **תיעוד:** דיווח אחד לכל סריקה, `waitUntil`, תקרה של 10 דיווחים לדקה לאינסטנס **ובנוסף תקרה גלובלית בבסיס הנתונים של 60 שורות לדקה** (נעילת `pg_advisory_xact_lock` — מדויקת גם תחת מקביליות). הכתובת נשמרת גסה (`/24`, או `/48` ל־IPv6) כפי שאישרת; בשורת canary אין כתובת.
3. **התרעה כשהניטור עצמו מפסיק:** ‏`check_security_spike` v2 — לוגיקת הספייק זהה בייט־בייט למקור; אם לא הגיעה שורת canary **מאומתת** 13 שעות (או מעולם) — שורה ב־`security_alerts` (נראית ב־`admin_system_health`), ‏`work_log` ו־`notify_admin`, פעם ב־12 שעות. ללא אסימון OIDC בקצה אין דיווח, ולכן אין שורות, ולכן התראה: כשל תצורה אינו שקט.

### תקרת הדיווח אינה משבשת ספייקים ואינה מאפשרת הצפה (נבדק על Postgres)
- 10,000 דיווחים בדקה אחת ← **60 שורות בדיוק**; 8 סשנים מקבילים (3,200 קריאות) ← **60 שורות בדיוק**.
- שטף של ארבע דקות ← 240 שורות; הגלאי המקורי מזהה ספייק (סף 150 לשעה). התקרה לשעה (3,600) גבוהה פי 24 מהסף, ולכן לא מסתירה התקפה.
- גידול מרבי של הטבלה: 60 שורות לדקה × עד 300 בייט ≈ 1 MB לשעה. הצפת **קריאות** לפונקציה (לא שורות): חסומה בכל אינסטנס ל־10 לדקה; מספר האינסטנסים אינו חסום, ולכן ההגנה האמיתית מפני נפח היא כלל WAF (אישור נפרד, לא כאן).

## 3. בדיקות החבילה (offline + Postgres זמני)

| תחום | מה נבדק | איפה |
|---|---|---|
| התחברות | אין נגיעה ב־`/login`, ‏`/auth*`, ‏`/2029/me/*`, ‏`/2029/control`, ‏`/profile`; אף אחד אינו נחשב סריקה, אינו מדווח, ואינו מקבל 403 או כותרת probe; עוגיות וכותרת Authorization של משתמש מחובר לא נקראות ולא נשלחות | `security-probe-log-20261126.test.mjs` |
| הרשאות | ללא אסימון, אסימון שגוי, שיטה שגויה ← 401/405 ולא נכתב דבר; מפתח anon אינו אישור; `log_security` סגורה ל־anon/authenticated/PUBLIC ופתוחה ל־service_role; דיווח מזויף במפתח הציבורי נכשל במסד | אותו קובץ + `test/security-edge-realpg-20261126.sh` |
| נתיבים | 30 צורות סריקה מזוהות; 23 כתובות רגילות וכל `KNOWN_SINGLE_SEGMENT_ROUTES` אינם; `/wp-content/uploads/…` (הפניית מדיה ישנה, S-56) ו־`/admin` אינם נחסמים; פענוח אחוזים; ה־matcher תופס כל צורת סריקה עם נקודה ואינו תופס נכסים סטטיים | `edge-security-probe-20261126.test.mjs` |
| SEO | תשובת probe: ‏403, ‏`noindex, nofollow`, ‏`no-store`; ‏`robots.txt`, ‏`sitemap*.xml`, ‏`favicon`, ‏`og.png`, ‏`/.well-known/*` מחוץ ל־matcher; ה־sitemap אינו מציג נתיב סריקה | `security-probe-log-20261126.test.mjs` |
| פרטיות | נשלחים רק מדינה, נתיב בלי query, UA קצר ללא תווי בקרה וכתובת גסה; כתובת מלאה נמחקת גם בצד הפונקציה; אין cookie, אין Authorization של משתמש, אין query או כתובת בגוף; הפונקציה אינה מדפיסה ואינה מחזירה את הדיווח | אותו קובץ |
| מהירות | אין ייבוא של שכבת הקצה ב־`src/` (אין השפעה על חבילת הכניסה או על שער ה־shell); בדיקה סינכרונית אחת לבקשה (200,000 בדיקות במאות מילישניות); אפס קריאות רשת חדשות לבקשה רגילה; המודול קטן מ־7 KB | אותו קובץ |
| שערי CI | לא הוחלש אף שער; נוסף שלב אחד ל־`live-contracts-2029.yml` (בדיקות offline + Postgres 17). בדיקות הקיימות של ה־canary (`g3-reliability-preclose`) עוברות ללא שינוי | `.github/workflows/live-contracts-2029.yml` |

### ה־canary: אוטומטי, אינו נשאר לא חוסם לצמיתות
בדיקה `security_probe_denied` חוסמת **אוטומטית** מהפריסה הראשונה שהקובץ `edge-security-probe.js` קיים ב־SHA הפרוס (ה־workflow בודק את ה־SHA המדויק דרך GitHub API ומעביר `SECURITY_PROBE_LAYER=present`). עד אז היא מתועדת כראיה (advisory) כי לא יכלה לעבור: אין צורך ב״מתג״ ידני, ואי אפשר לשכוח אותו. מבחן מוודא זאת.

## 4. מה לא אומת
1. **ה־matcher החדש לא נבדק מול Vercel** (הבדיקות מתרגמות אותו ל־RegExp). לכן ה־Preview המוגן הוא תנאי.
2. **הפונקציה לא נפרסה**; האימות מול ה־JWKS האמיתי של Vercel (`jose`) לא רץ כאן, רק לוגיקת הפונקציה עם מאמת מוזרק. מאמת ה־OIDC הוא אותו קוד כמו `sg-rate-limit` הפעיל.
3. הבדיקות על SQL רצו על Postgres 16.15; ה־workflow שנוסף מריץ אותן על 17 (הגרסה החיה), אך זה לא רץ כאן.
4. כמות הסריקות החיה ולוגי WAF לא נבדקו.
5. `log_edge` ו־`log_crawl` חשופות באותו אופן (anon) — נמצא, לא תוקן, החלטה נפרדת.
6. `api/honeypot.js` (שרשור Legacy) עדיין בשורש המאגר; אחרי ההגבלה הוא לא יכול לכתוב. הסרתו שייכת לשאריות `REMOVAL.md`.

## 5. סדר ההחלה (כל שלב באישור נפרד; בקשות S2–S7 יוצגו בנפרד, אחת אחת, אחרי S1)
| # | שלב | סוג אישור | למה בסדר הזה |
|---|---|---|---|
| S1 | Preview מוגן של הענף | שער Preview (patch מצורף) | מוכיח 403, כותרות וקומפילציית matcher בלי Production |
| S2 | SQL: הגבלת `log_security` | שינוי מסד | בטוח לפני הכול: אף קוד חי אינו קורא לה |
| S3 | פריסת `security-probe-log` + הסודות | Edge Function + סודות | חייבת להקדים את הקצה |
| S4 | מיזוג + פריסת Production | מיזוג, ואז פריסה לקומיט מדויק | משחרר 403, דיווח ו־canary |
| S5 | אימות: שורת canary מאומתת ב־`security_log` | קריאה בלבד | מוכיח את כל המסלול |
| S6 | SQL: `check_security_spike` v2 | שינוי מסד | לפני S5 הוא מתריע בצדק ללא הפסקה |
| S7 | כלל WAF (`log` תחילה) | הגדרת Production | נפרד לחלוטין |

## 6. בקשת האישור המדויקת ל־Preview מוגן (S1)

**המסמך אינו מחיל דבר.** מנגנון ה־Preview המוגן בונה רק ענפים שרשומים בקוד (`public-reading-deploy/review-admission.js`), ו״כל ענף נוסף דורש אישור מתועד משלו״.

- **הענף:** `ccr-s1-security-edge-20261126` (שם מדויק; לא תבנית ולא קידומת). ענף ייעודי שמכיל רק את קבצי החבילה. **דחיפתו ל־origin דורשת הרשאה מפורשת** (ההרשאה הקיימת מכסה רק את ענף הפיתוח של הסשן); בלי דחיפה אין מה לבנות ב־Vercel.
- **ה־SHA לבנייה:** קומיט S1 — הקומיט שמעל `818a33418c58…` ומכיל את ה־patch כבר מוחל (המזהה המלא נמסר בבקשת האישור בשיחה; מסמך זה אינו יכול להכיל את ה־SHA של עצמו). ה־Preview נבנה מ־SHA מדויק אחד (`--review-source`).
- **השינוי הנדרש (patch מצורף: `PREVIEW_GATE_APPROVAL.patch`, ‏`git apply --check` נקי):** הוספת `SECURITY_EDGE_PREVIEW_BRANCH = "ccr-s1-security-edge-20261126"` לרשימת `REVIEW_BRANCHES` ב־`review-admission.js`, ועדכון שתי בדיקות הרשימה המדויקת (`test/public-reading-protected-review.test.mjs`, ‏`scripts/test-public-reading-main-release-contract.mjs`) בלי החלשה: הרשימה נשארת בדיקת שוויון מדויקת. בדיקה: עם ה־patch אותן 4 בדיקות שנכשלות גם בלעדיו בסביבה זו (קבלה סטטית/מתאמי hosting) נכשלות, כל השאר עובר, וחוזה פרסום ה־main (`test-public-reading-main-release-contract`) עובר.
- **מה זה מתיר:** בנייה מוגנת (Preview בלבד), קבלה שנקשרת לענף, ל־SHA, ל־deployment ול־host, noindex, ללא Production, ללא alias או דומיין.
- **מה זה אינו מתיר:** מיזוג · פריסה ל־Production · alias/דומיין · שינוי DB/WAF/Edge · כל ענף אחר.
- **מה ייבדק ב־Preview:** (1) הפריסה עולה (ה־matcher מתקמפל); (2) `GET` ל־`/wp-login.php`, `/.env`, `/wp-admin/x`, `/a/b.php` ← 403 + `x-sod-probe: denied` + `noindex`; (3) `/`, `/world`, `/post/…`, `/wp-content/uploads/…` ללא שינוי; (4) `/login`, `/2029/me/profile` ללא שינוי; (5) כותרות `vb`/`x-sod-country-policy` זהות לייצור; (6) אין קריאה ל־`log_security` במפתח הציבורי. **לא ייבדק:** רישום שורה (נדרש אסימון Production).
- **ההפעלה לאחר האישור:** patch בקומיט נפרד; `create_deployment` (target preview, ללא alias) עם ה־SHA המדויק ו־Ignored Build Step ל־SHA הזה; ‏`get_deployment` אחרי ≈40 שניות (`CANCELED` = דילוג ה־Ignored Build Step); בדיקה חוזרת שה־aliases החיים לא זזו.

**נוסח אישור לדוגמה:** ״מאשר: (1) דחיפת הענף `ccr-s1-security-edge-20261126` ל־origin; (2) Preview מוגן לענף הזה בלבד, לקומיט המדויק שהוצג, כולל החלת `PREVIEW_GATE_APPROVAL.patch` בקומיט נפרד מעליו. ללא מיזוג, פריסה ל־Production, alias, שינוי מסד, Edge Function או WAF.״

## 7. קבצים וגיבוב (sha256 מדויק; מחושב על תוכן הענף הייעודי)
**קוד:**
| קובץ | sha256 |
|---|---|
| `edge-security-probe.js` | `39c0075f8b155b7689e9f18f9f88870e85ca70a2d82c2d6dac6f246500e13297` |
| `middleware-core.js` | `37794937a047d9b94b727ddec091b3388043963dcaf50c88bd968e5b3fd0d94e` |
| `middleware.js` | `181bf6bdba70657702b609549a42ddc32c7adcc32e9cb48919c9af0a28932c39` |
| `public-reading-deploy/middleware.js` | `dc2fb30fbbf2fad6fdc0f30ea0c42131a04fa6fb87898e88cf72fceb4f58dbac` |
| `route-legitimacy.js` | `62249ef4be058bfe2cae039f0d63570db69a1f533dc94c7dc1df831d45fb0f22` |
| `scripts/post-deploy-canary.mjs` | `2dc787b6167f169d68ac7d75aa631f65948f542ce9a66303210d477a730fbb69` |
| `.github/workflows/post-deploy-canary.yml` | `bc950351e76c4b4ceee3319f638dc7981d0886df188695fe106187bffc00cb48` |
| `.github/workflows/live-contracts-2029.yml` | `7983c015d616780b3254fc5057a5c1e1e93e8d46d84edd6d564e95d5660114ca` |
| `supabase/functions/security-probe-log/index.ts` | `e1abef90cd4e86db58ea2ecdcc809cf0a7f190b2be9651df543da0ee7da63a93` |
| `supabase/functions/_shared/securityProbeLogCore.js` | `68ad5e2f716caafbe9422a6f92e768c3c7c97cf71a3ca7214bf49c0abc556990` |
| `supabase/functions/_shared/vercelProductionOidc.ts` | `aaa90b9400803fd7cdc4d69299bc851531da2fcb629008fdc7d77fe9b6c0a413` |

**SQL (הצעות; לא הוחלו):**
| קובץ | sha256 |
|---|---|
| `supabase/proposed/20261126155000_log_security_lockdown_PROPOSAL.sql` | `ab2c07bdb984f3dde96800d79bc5d855a31eb2dca7013646f04238967a56c91e` |
| `supabase/proposed/20261126155000_log_security_lockdown_ROLLBACK.sql` | `40f3cb97bc1dba0e5c036a35d93ccd1879e6deb7c472d0a481a69134bb11560d` |
| `supabase/proposed/20261126160000_security_monitor_silence_PROPOSAL.sql` | `359a44fe6d8ba365a666b9418fddbdd4c8222a1724a7d95b0cfe9c197f3938d6` |
| `supabase/proposed/20261126160000_security_monitor_silence_ROLLBACK.sql` | `b34067519d2d5f62f50a989d467311a9553a33d42b149744f9ffd9071b81aea0` |

**בדיקות ו־patch:**
| קובץ | sha256 |
|---|---|
| `test/edge-security-probe-20261126.test.mjs` | `65a10c2a0cde9d71b062b644cc19fef13f189ec91d7a5a71c1c3d6fd1849e192` |
| `test/security-probe-log-20261126.test.mjs` | `396242d5bf0ce3b95caa5a2c589a7e3c45ec951cc338d443543ef2b55d472a35` |
| `test/security-edge-realpg-20261126.sh` | `f013cb93d4dd67d0fcc543fc954565afb64eaaa9a29eb055788d33de9749c706` |
| `docs/reviews/security-edge-package-20261126/PREVIEW_GATE_APPROVAL.patch` | `d3d0e0e95bb0bb819e72a61c46888380ed7e9b15d697a178551f76a9c21719af` |
