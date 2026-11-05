# SECURITY MASTER CONTRACT — נספח אימות · 5.11.2026

**סטטוס:** EVIDENCE · בדיקה בקריאה בלבד · אינו חוזה ואינו מקור סמכות.
**מצורף ל:** `docs/security/SECURITY_MASTER_CONTRACT.md` (Draft v1.0 — ממתין ל־Human Gate).
**מה המסמך הזה לא עושה:** לא משנה DB, policy, secrets, Edge Functions או פריסה; לא מנותב ב־`SOD1820_MASTER_OWNER_INDEX.md`; לא מחליף את `docs/2029-security-hardening-gate-plan-v1.md` (מפת התזמון) ולא את המסמכים הקיימים. כל שורה כאן היא מדידה, לא החלטה.

## 0. בסיס האימות

| פריט | ערך |
|---|---|
| `main` בזמן הכתיבה | `9a5afd72` (5.11.2026 07:26 שעון ישראל) |
| Production | `dpl_8wS3rP2YgbqSaapmYxa3SAk8jdFk`, READY, ענף main, קומיט `18c98fa6` |
| דומיינים | `sod1820.co.il`, `www.sod1820.co.il`, `sod1820.vercel.app` מוצמדים לפריסה הזו (list aliases) |
| פרויקט Vercel | יחיד: `sod1820` (`prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`); אין פרויקט Legacy נפרד |
| נתיב ה־middleware בפריסה | `public-reading-deploy/middleware.js` → `middleware.js` (עטיפת SG) → `middleware-core.js` |
| קבצי ה־middleware | `middleware.js`, `middleware-core.js`, `public-reading-deploy/middleware.js`, `supabase/functions/sg-rate-limit/index.ts` זהים בין `18c98fa6` ל־`9a5afd72`; ב־`middleware.js`, `middleware-core.js` ו־`sg-rate-limit/` אין גם commit מאז `a27d8d06` (הפריסה שצוינה בדו"ח הניטור) |
| Supabase | `linswmnnkjxvweumprav`, שאילתות SELECT ולוגים בלבד |

**מגבלות:** לא נשלחה בקשה ממקור סיני או סינגפורי (הכותרת `x-vercel-ip-country` נקבעת על ידי Vercel ואי אפשר לזייף אותה); לא בוצעה קריאה ל־limiter החי (היא כותבת bucket ב־Production); לא נבדקו Auth, RLS מלא, Storage ACL, webhooks, התחברות Google/Facebook ו־branch protection (ראו סעיף 7).

## 1. חוזים ומסמכי אבטחה קיימים

| מסמך | תפקיד | מצב / סטייה |
|---|---|---|
| `docs/2029-security-hardening-gate-plan-v1.md` | מפת תזמון S0–S6, סיווג הרשאות, Human Gate | פעיל כמסמך תכנון. הנתונים הכמותיים (284 פונקציות SECURITY DEFINER וכו') הם של 6.10 ולא רועננו |
| `docs/security/emergency-p0-containment-20261024.md` | בידוד P0: RPC פרטיים, `gallery_posts`, `journey-message` | **מיושן בסטטוס:** כתוב "branch-only", אך ה־DB כבר בפועל כך (סעיף 2, שורה 15) |
| `docs/perf-evidence-20261021/cn-sg-security/README.md` | ראיות לתיקון SG (מפתח anon שגוי, שרשרת limiter) | **מיושן בסטטוס:** כתוב "NOT MERGED · NOT DEPLOYED" ו־PR #1139 כטיוטה; הקוד נמצא ב־main (היסטוריית `middleware.js` כוללת `792a1b00`) |
| הערות הכותרת ב־`middleware-core.js` / `middleware.js` | הגדרת המדיניות בפועל (CN/SG, quarantine, Goodbot/AI) | אין מסמך נפרד; המדיניות קיימת רק בקוד, במיגרציות ובבדיקות |
| `supabase/migrations/20260911111343_edge_country_policy_mode_v1.sql`, `…111535_edge_country_policy_constraints_v1.sql`, `20260914140000_cn_smart_quarantine_2029.sql` | סכמת מדיניות המדינות | הוראות DDL קיימות; `…constraints_v1` לא נסקר כאן |
| `AGENTS.md`, `CLAUDE.md` | מתאמי ריצה, גבולות שחרור, Human Gate | מכילים בלוקים זהים של "מצב חי" (שני עותקים לסנכרון) ו**מצב חי מיושן:** `969b5142` / `dpl_xw7f…`, כשהחי הוא `18c98fa6` / `dpl_8wS3…` |
| `docs/reviews/public-foundation-20261101/evidence/security-boundaries.json`, `docs/reviews/public-url-exceptions-20261103/residual205/shared-security-proposal/*` | גבולות אבטחה והצעה משותפת | לא נסקרו לעומק |
| `docs/bot-read-no-side-effect-v1.md`, `docs/dead-bot-signal-adjudication-v1.md`, `docs/bot-resilient-experience-projection-v1.md` | סיווג בוטים ותצפיות | לא נסקרו; רלוונטיים לסעיף 5 בחוזה |
| `.github/workflows/legacy-production-lock.yml` ועוד 18 workflows | שערי שחרור | ראו G2 |

**חוזים חדשים שלא שולבו ב־main** (נסרקו 43 ענפים לפי שם מתוך 1,514, לכן הרשימה חלקית):
- `docs/2029-membership-credits-product-contract-v1.md` — ענף `codex/2029-membership-credits-contract-v1-20261026`
- `docs/raziel-action-contract-v1.md` — ענף `gpt/g3-raziel-action-contract-v1`

שאר הקבצים שנמצאו בענפים הם ראיות ביצועים, לא חוזים.

## 2. מפת הגנות וסטטוס

מקרא: DEFINED · IMPLEMENTED · MERGED · DEPLOYED · LIVE_VERIFIED · NOT_VERIFIED · FAIL_OPEN. "LIVE_VERIFIED" שמור להתנהגות שנצפתה בפועל, לא לקיום קוד.

| # | הגנה | סטטוס | ראיה |
|---|---|---|---|
| 1 | מדיניות מדינה מ־DB (`edge_blocked_countries`, cache של 5 דק') | LIVE_VERIFIED | CN = quarantine L2, SG = quarantine L3, שתיהן enabled; אין שורת `mode=blocked`. כשל קריאה: ראו סעיף 5 |
| 2 | CN Smart Quarantine, level 2 | MERGED · DEPLOYED | `middleware-core.js`. התנהגות אמיתית ממקור סיני לא נצפתה (NOT_VERIFIED) |
| 3 | SG Smart Quarantine, level 3 | MERGED · DEPLOYED | עטיפת `middleware.js` רצה ב־Production: לוג `[warn/middleware]` מ־`sin1`, 4.11 21:20:37Z |
| 4 | חיכוך CN: low=1h, medium=15m, high=5m | MERGED · DEPLOYED | `QUARANTINE_*_TTL`; ב־SG (level 3) תקרת ה־TTL היא שעה. תואם לחוזה |
| 5 | SG rate limiting אחרי quarantine proof | MERGED · DEPLOYED · **FAIL_OPEN** | לוג Production: `sg-rate-limit fail-open: missing VERCEL_OIDC_TOKEN`, `nodejs24.x`, `sin1`. תיקון: PR #1217 (טיוטה, BRANCH_ONLY) |
| 6 | חלון 300 שניות, תקרות 30/12/6, מסלול יקר 8 | MERGED · DEPLOYED | קוד + בדיקות fixture. ב־DB: `edge_rate_limit_check` ברירת מחדל 300, clamp 60–3600. **לא LIVE_VERIFIED:** 0 קריאות ל־`sg-rate-limit` ביומני Supabase ב־24 שעות; ב־`private.edge_rate_limit_buckets` 12 רשומות, כולן בחלוקה של 3600 שניות (ערכי bucket סביב 498k; חלון 300 היה נותן סביב 5.98M) |
| 7 | חריגה ⇒ HTTP 429 | IMPLEMENTED · MERGED · DEPLOYED | נבדק ב־fixture בלבד; לא נצפה 429 חי |
| 8 | 429 ו־quarantine proof אינם Human proof | IMPLEMENTED (נבדק ב־fixture) | תגובת 429 בלי `Set-Cookie`; ה־cookie `vb=browser` נשאר; "Unknown" במערכת ה־TI בהמשך — NOT_VERIFIED |
| 9 | Goodbot / AI ציבוריים עוברים | IMPLEMENTED · DEPLOYED | עם סייג — ראו D1 |
| 10 | Bad bot נחסם (403) | IMPLEMENTED · DEPLOYED | `classify()` ⇒ 403. לא בוצעה בקשה חיה |
| 11 | הפרדת CN/SG וללא זליגה למדינות אחרות | IMPLEMENTED (נבדק ב־fixture) | CN L2 לא נכנס ל־limiter; העטיפה פועלת רק כש־`country === 'SG'`. לא נבדקה תעבורה חיה |
| 12 | אין hard-block ללא Human Gate | LIVE_VERIFIED ברמת ה־DB | אין שורת `blocked`. המנגנון (`mode=blocked`) קיים בקוד; ההגנה עליו תהליכית (ראו G10) |
| 13 | חסימת 404 ל־slug לא קיים (Route legitimacy) | MERGED · DEPLOYED | מחוץ לחוזה; fail-open על כשל Supabase |
| 14 | `sg-rate-limit` Edge Function: אימות OIDC | DEPLOYED | ACTIVE v1, `verify_jwt=false`, בודקת issuer, audience, owner, project, `environment:production` |
| 15 | בידוד P0 מ־24.10 (RPC + `gallery_posts`) | LIVE_VERIFIED (5.11) | ל־`anon`/`authenticated` אין EXECUTE על `sod_fb_call` ו־`wa_add_vip_word`; על `edge_rate_limit_check` אין ל־`anon`; ב־`gallery_posts` נותרו רק admin ALL ו־SELECT למפורסמים; אין INSERT ל־anon. הגרסאות `journey-message` v13 ו־`capture-video-thumb` v2 פעילות — התנהגותן לא נבדקה |
| 16 | בדיקות CN/SG ב־CI | **לא קיים** | הבדיקות קיימות רק כסקריפט `npm run test:cn-sg-security`; אף workflow אינו מפעיל אותן (ראו G2) |
| 17 | התראות על fail-open, שינוי policy, זליגה (סעיף 8 בחוזה) | NOT_VERIFIED | הראיה היחידה שנמצאה היא שורת `console.warn` אחת לכל instance ב־Vercel; לא נמצאה התראה |
| 18 | Auth, session, CSRF, XSS, SSRF, IDOR, התחברות Google/Facebook | NOT_VERIFIED | לא נבדקו בסבב זה |
| 19 | RLS מלא, Storage ACL, webhooks, `service_role` | NOT_VERIFIED | נבדק רק בידוד ה־P0 (שורה 15) |
| 20 | הרשאות סוכני AI ואינטגרציות | NOT_VERIFIED | קיים בטקסט ב־`AGENTS.md`/`CLAUDE.md`; לא נבדקה אכיפה |
| 21 | CI/CD, branch protection, deployment permissions | NOT_VERIFIED | `GET branches/main/protection` ⇒ 403 (טוקן ללא הרשאה). ב־Vercel: SSO protection על כל הפריסות מלבד דומיינים מותאמים; ל־aliases מוצמדים קישורי bypass משותפים (shareable-link) עם תפוגה (הערכים לא נרשמו) |

## 3. סתירות בין החוזה לקוד, וסתירות בין מסמכים

| # | סתירה | הצעה (דורשת Human Gate) |
|---|---|---|
| D1 | חוזה §4: "Goodbot ו־AI ציבוריים: מעבר". בקוד הם עוברים **לתוכן ציבורי בלבד**: כל בוט, כולל Goodbot ו־AI, מקבל 403 במסלולים `journey`, `research`, `reveal`, `experience`, `auth`, `profile`, `login`, `admin`, `traffic`, `numbers-report`, `theme-preview`, וב־`/number/<5+ ספרות>` שאין לו תוכן ברשימת ה־allowlist | לנסח: "Goodbot ו־AI מאומתים עוברים לתוכן ציבורי; מסלולים יקרים/פרטיים ומספרים גדולים ריקים חסומים לכל בוט" |
| D2 | `GENERIC_BOT` מסווג כבוט כל UA שמכיל `bot`, `crawler`, `crawl`, `spider` או `scraper` (אחרי פטור Goodbot/AI) ⇒ 403. התאמת תת־מחרוזת עלולה לפגוע במשתמשים לגיטימיים | למדוד מול `edge_ua_seen` לפני כל שינוי; לא שונה כאן |
| D3 | חוזה §5/§9: "Browser נשאר Unknown". ה־middleware רק קובע `vb=browser`; המשמעות "Unknown" נקבעת במערכת ה־TI בהמשך | לציין בחוזה שהאימות הוא בשני שלבים, ולבדוק את השלב השני בנפרד |
| D4 | הערות הקוד כותבות "Vercel Edge"; הלוג מראה `runtime=nodejs24.x`. מנגנון הטוקן ל־limiter תלוי בסביבת הריצה | לנסח בחוזה "Routing Middleware (סביבת הריצה כפי שדווחה על ידי Vercel)" |
| D5 | מפתח ה־limiter הוא `sha256("sg:" + ההופ הראשון של x-forwarded-for)`. מסמך ה־P0 ל־`journey-message` נמנע בכוונה מההופ הראשון שנשלח מהלקוח. לא אומת ש־Vercel דורס את הכותרת הזו | לאמת לפני הסתמכות על ה־limiter; ייתכן שימוש ב־`x-real-ip` / `x-vercel-forwarded-for` |
| D6 | סטטוסים מיושנים: README של cn-sg-security, מסמך ה־P0, והמצב החי ב־`AGENTS.md`/`CLAUDE.md` | עדכון תיעודי בלבד (G7) |
| D7 | הבדיקה `sg-quarantine-rate-limit-chain` הזריקה את הטוקן דרך `process.env`, ולכן עברה בזמן שבפרודקשן ה־limiter פעל fail-open | נסגר בבדיקות החדשות ב־PR #1217 (4/8 נכשלות על ה־resolver הישן) |

## 4. פערים והצעות

| # | פער | הצעה | Human Gate |
|---|---|---|---|
| G1 | ה־SG limiter fail-open | PR #1217: קריאת `x-vercel-oidc-token` לפני `VERCEL_OIDC_TOKEN`; fail-open נשמר. **לא אומת:** שהכותרת קיימת ב־Routing Middleware בפועל; ש־Preview מסוגל להשלים proof→bucket→429 (הפונקציה מקבלת רק `environment:production`, ולכן טוקן Preview יחזיר 401); האם Vercel דורס כותרת שנשלחת מהלקוח | מיזוג; כל smoke חי כותב bucket ב־Production; כל שינוי בפונקציה |
| G2 | בדיקות CN/SG אינן ב־CI | להוסיף אותן ל־workflow קיים | שינוי CI |
| G3 | ה־DDL של `edge_rate_limit_check`, `private.edge_rate_limit_buckets` ושל המיגרציה החיה `sg_unknown_rate_limit_v1` אינו ב־`supabase/migrations` (חיפוש בקבצי SQL לא מצא התאמה) | ייצוא ההגדרות החיות לתיעוד provenance בלבד; בלי להחיל מיגרציה | כל מיגרציה |
| G4 | ב־`middleware.js` מועתקים מ־`middleware-core.js` ביטויי הסיווג (`GOOD_BOT`, `BAD_BOT`, `AI_BOT`, `EXPENSIVE_PATH`) וחישוב הסיכון; הבדיקות נועלות רק חלון ותקרות | בדיקת drift שמשווה את המקורות, או ייצוא מה־core. לא רפקטור רחב כרגע | שינוי קוד |
| G5 | אין התראות על fail-open, כשל OIDC, שינוי `strict_level`/mode או פגיעה ב־Goodbot/AI | לתכנן תחת ניטור קיים | כן |
| G6 | `edge_rate_limit_check` משותפת ל־SG, `journey-message` ו־`els-search-bridge` (חלונות שונים). המפתחות מגובבים; לא נבדק מרחב שמות | לתעד מרחבי שמות במפתחות | לא |
| G7 | סטטוסים מיושנים (D6) | PR תיעודי קטן | לא |
| G8 | Auth/RLS/Storage/webhooks/AI-agents לא נבדקו | הרצת Supabase security advisors וסיווג S1 לפי תוכנית ה־hardening | קריאה בלבד: לא |
| G9 | שני חוזים לא ממוזגים (credits, Raziel action) נוגעים בהרשאות סוכנים ובכסף | להתאים אותם לחוזה הראשי §7 ול־S4 לפני מיזוג | כן |
| G10 | `mode=blocked` נשאר מנגנון זמין בקוד; ההגנה עליו תהליכית | לבחון מגבלה טכנית (הוכחה ב־`…constraints_v1` טרם נסקרה) | כן |

## 5. מלאי fail-open / fail-closed

| נתיב | התנהגות |
|---|---|
| SG limiter: טוקן חסר, 401, תשובה לא תקינה, שגיאת רשת | מאפשר (FAIL_OPEN) — לפי הוראת החוזה, בלי הפיכה עיוורת |
| `sgPolicy()` נכשל | אין limiter ל־SG (FAIL_OPEN) |
| קריאת מדיניות מדינה נכשלה | cache ישן אם קיים; ב־cold start בלי cache — אין אכיפת מדינה (FAIL_OPEN, מתועד בקוד) |
| Route legitimacy: שגיאת Supabase | עובר (FAIL_OPEN) |
| allowlist מספרים גדולים לא זמין | בוט נחסם (FAIL_CLOSED) |
| `journey-message`: כשל limiter | 503 (FAIL_CLOSED, לפי מסמך ה־P0 והבדיקות שלו) |
| `sg-rate-limit`: טוקן לא תקף / backend נכשל | 401 / 503 — והצד הקורא מתרגם זאת ל"מאפשר" |

## 6. בדיקות

**עברו (מקומית, 5.11.2026):**
- `npm run test:cn-sg-security`: 8/8 לפני השינוי; 16/16 על הענף של PR #1217 (8 בדיקות חדשות)
- `middleware.test.js` + `test/public-reading-middleware-entry.test.mjs`: 12/12 על `9a5afd72` + התיקון
- `middleware.test.js`, `public-reading-middleware-entry`, `bot-read-no-side-effect`, `bot-read-sink-guard`: 14/14 על `18c98fa6`
- `scripts/test-route-legitimacy-2029.mjs`: PASS
- `git diff --check`: נקי

**נכשלו:** אין. 4 מתוך 8 הבדיקות החדשות נכשלות על ה־resolver הישן — בכוונה, להוכחת שהן בודקות.

**לא הורצו:** build מלא, Isolation/Visual/ELS, בדיקות Preview, production smoke, בדיקות RLS/ACL, 429 חי, בדיקת latency.

## 7. מה לא אומת בסבב זה
Auth ו־session, CSRF/XSS/SSRF/open redirect, IDOR בין משתמשים, התחברות Google/Facebook, RLS לכל טבלה, Storage ACL, שימוש ב־`service_role`, webhooks ו־Edge Functions מלבד `sg-rate-limit`, הרשאות סוכני AI ו־Raziel, branch protection, secrets ומשתני סביבה, התנהגות ממקורות CN/SG אמיתיים, והשפעת ביצועים.

## 8. מה נדרש מ־Human Gate
1. אישור (או תיקון) נוסח החוזה הראשי, ובפרט D1–D5.
2. החלטה כיצד לאמת את ה־resolver: בקשה אמיתית מסינגפור, או build אבחוני ל־Preview; מיזוג PR #1217 רק אחרי כך.
3. אישור לכל smoke חי של ה־limiter (כותב bucket ב־Production).
4. אישור לשינויי CI, התראות, DB, policy, או פונקציות Edge (G2, G3, G5, G10).
5. בדיקת branch protection על ידי בעל הרשאת admin.

## 9. תת־חוזים (סעיף 11 בחוזה) — מצב קיים והצעה
לא נוצרו תשעה קבצים ריקים. לכל אחד מצוין איפה התוכן קיים היום; יצירה — לאחר אישור החוזה הראשי.

| תת־חוזה | מצב היום |
|---|---|
| `SECURITY_MASTER_CONTRACT` | טיוטה זו |
| `CN_SG_TRAFFIC_PROTECTION_CONTRACT` | חסר כמסמך. התוכן בהערות `middleware-core.js`/`middleware.js`, במיגרציות ובבדיקות |
| `AUTH_AUTHORIZATION_CONTRACT` | חסר; חלקי: סיווג PUBLIC_READ…ADMIN_ONLY בתוכנית ה־hardening (S1) |
| `SUPABASE_RLS_STORAGE_ACL_CONTRACT` | חלקי: S2 בתוכנית ה־hardening, מסמך ה־P0, `shared-security-proposal` |
| `AI_AGENT_PERMISSION_CONTRACT` | חלקי: `AGENTS.md`, `CLAUDE.md` §11–13, ו־`docs/raziel-action-contract-v1.md` (לא ממוזג) |
| `API_RATE_LIMITING_CONTRACT` | חלקי: `sg-rate-limit`, `journey-message`, `els-search-bridge` (חלון 3600); אין מסמך אחד |
| `CI_CD_DEPLOYMENT_SECURITY_CONTRACT` | חלקי: גבולות שחרור ב־`AGENTS.md`/`CLAUDE.md`, `legacy-production-lock.yml` |
| `SECURITY_REGRESSION_TEST_CONTRACT` | חלקי: `test:cn-sg-security` (לא ב־CI), בדיקות ה־P0 |
| `INCIDENT_RESPONSE_AND_MONITORING_CONTRACT` | חסר; חלקי: `docs/reviews/main-live-state-reconciliation-20261104/public-observability/` |

## 10. קישורים
- PR #1217 (טיוטה): https://github.com/zuriel337/sod1820/pull/1217 — ענף `claude/sg-oidc-header-resolver-20261105`
- ענף המסמך הזה: `claude/security-master-contract-draft-20261105`
