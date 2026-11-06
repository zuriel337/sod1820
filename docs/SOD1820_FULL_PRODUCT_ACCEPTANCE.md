# SOD1820 — Full Product Integrity & Acceptance Audit

> **תאריך:** 2026-11-06 · **ענף עבודה:** `claude/sod1820-product-audit-g93w32` · **שלב:** אבחון הושלם (קריאה בלבד); תיקונים טרם בוצעו.
> **מסמך משלים:** [SOD1820_FULL_PRODUCT_DEFECT_REGISTER.md](SOD1820_FULL_PRODUCT_DEFECT_REGISTER.md) · **ראיות גולמיות:** [audit-evidence/20261106/](audit-evidence/20261106/)
> מסמך זה מחבר את החוזים הקיימים (לא יוצר תוכנית מקבילה); מפת החוזים המלאה (113 שורות) ב־`audit-evidence/20261106/contracts-inventory.md`.
> אין כאן מיזוג, פריסה או שינוי פרודקשן/DB/תוכן/DNS. ניסיון העלאה ל־Storage נחסם בכוונה ולא בוצע.

## 1. Executive Summary

**פסיקה: המוצר החי פועל ונגיש (כל הדומיינים, כל הנתיבים הציבוריים הראשיים, אפס שגיאות JS חוסמות בנתיבי הליבה), אבל הוא עדיין לא עומד בקריטריוני הקבלה הסופיים:** נמצא P0 אחד (חשיפת אימייל דרך RPC פתוח), חמישה P1, ו־13 P2. חלקים מהבקשה חסומים מבחינת גישה (Google Search Console, GA4, משתמש מחובר, Preview נקי) ולכן **אינם מסומנים PASS**.

| תחום | תוצאה |
|---|---|
| זמינות 3 דומיינים | PASS — alias אחד, 200 על `/` (דפדפן וגם Googlebot UA) |
| נתיבים ציבוריים ראשיים (27 נתיבים × נייד/דסקטופ) | PASS — 54/54 נטענו; אין גלילה אופקית, אין עמוד תקוע, אין תמונה שבורה |
| SEO טכני (מדגם 510 עמודים 200) | PARTIAL — canonical עצמי 510/510, description 510/510, og:image 510/510; **sitemap עם 1,177 כתובות מפנות (DEF-002)**; **אין `<h1>` בשרת (DEF-009)** |
| אינדוקס בפועל | **BLOCKED** (אין גישה ל־GSC; DEF-006) |
| שיתוף | PASS חלקי — מטא־דאטה זהה לכל 6 סורקים חברתיים; OG 120/120 נטענו; `/api/card` ללא cache ועם timeout (DEF-015) |
| ייצור תמונות AI | **NOT IMPLEMENTED** — אין מימוש ואין חוזה בקוד (ראו §10) |
| אבטחה | FAIL — DEF-001 (P0), DEF-004/005 (P1) |
| ביצועים | PARTIAL — `/gallery` CLS 0.263 מעל הסף הקבוע (DEF-008) |
| CI | PARTIAL — כל הריצות האחרונות על `main` ירוקות; השער `2029 Live Contracts` ישבר בריצה הבאה (DEF-007) |
| Auth (Google/Facebook), קהילה כמשתמש מחובר, שמירת נתונים | **BLOCKED** — אין אישורי בדיקה; לא נוסה |

## 2. Production SHA

| פריט | ערך | מקור |
|---|---|---|
| Alias `sod1820.co.il` / `www.sod1820.co.il` / `sod1820.vercel.app` | `dpl_7Hn7Lv4mhAVth3zBY3JHKsp4sahh` (עודכן 06:55:47Z) | Vercel `get_alias` ×3 |
| SHA פרוס | `1f0863938062d85757e93043f568ec5eeb0d72f2` — "Worker: /tzofen.html → /code…; community_search admitted; link-preview charset (#1254)" | `get_deployment`, `readyState=READY`, `target=production` |
| פריסה קודמת בתחילת הסשן | `dpl_8UabBobRVMxae7drpZkr2gW9mpAD` / `42ff15120b05…` (#1253) — הוחלפה באמצע האבחון | `get_alias` בשעה 06:5x |

> **שים לב:** הפריסה האוטומטית מ־`main` פעילה (שתי פריסות Production אוטומטיות בשעה הראשונה של האבחון), בניגוד לנוהל ב־CLAUDE.md ("Ignored Build Step מבטל כל בנייה של main"). זה נתון חי ולא מסמך; נדרש לוודא שהנוהל במסמך עדיין מדויק. ריצת הסריקה הראשונה חפפה למעבר ה־alias, ולכן נעשתה ריצה שנייה על ה־SHA היציב — כל ההשוואות להלן הן מהריצה השנייה.

## 3. Main SHA

`origin/main` = `1f0863938062d85757e93043f568ec5eeb0d72f2` (זהה לפרוס). CI על SHA זה: `Production Release and Legacy Compatibility` (push, 06:51) ✔ · `Post-Deploy Canary` (06:52) ✔.

## 4. Preview SHA

**NOT TESTED.** לא נוצרה פריסת Preview בסשן זה (נדרש לתיקונים בהמשך). בהיסטוריית הפריסות: Preview מענף `ccr-a2ed2dbb-c4lekp` (`5767dbb85`) ב־`ERROR` — אינו הפריסה החיה.

## 5. Full Inventory (סיכום)

פירוט מלא: [`code-inventory.md`](audit-evidence/20261106/code-inventory.md) ו־[`contracts-inventory.md`](audit-evidence/20261106/contracts-inventory.md). נתוני הספירה הם של סוכני המיפוי (קוד ב־`42ff15120`; ההפרש ל־HEAD = #1254 בלבד) ואומתו חלקית.

| רכיב | כמות | הערה |
|---|---|---|
| `<Route>` ב־`App2029.jsx` | 64 | כולל נתיבי preview מאחורי env flags |
| קבצי API בפריסה החיה (`public-reading-deploy/api`) | 11 | בשורש `api/`: 20 — 9 לא פרוסים (DEF-014) |
| Redirects חיים / rewrites | 589 / 7 | 94 ב־vercel.json שבשורש (אינו חי); אין לולאות |
| Edge Functions (Supabase) | 90 בתיקיית ה־repo; בפרויקט החי מפורסמות פונקציות מעט יותר (לא נספרו במדויק) | 19 stubs ב־repo; ~70 `verify_jwt=false`; אין `supabase/config.toml` |
| Migrations | 423 | |
| טבלאות / RPC / buckets מוזכרים בקוד | 74 / 296 / 3 | בבסיס: 302 טבלאות, כולן RLS מופעל |
| Storage buckets | `gallery` (1,370 אובייקטים, ציבורי), `media` (19,197, ציבורי), `magar` (0, ציבורי), `submission-inbox` (215, פרטי) | |
| Cron jobs | 41 (29 פעילים, 12 לא פעילים) | `cron.job` |
| חוזים ממופים | 113 שורות ב־17 תחומים | 12 סחפים (D-1…D-12) |
| אין חוזה | 15 מימושים | ראו §13 |
| קבצי בדיקה / מחוברים ל־CI | 855 / ~188 | `orphan-tests.txt` |

מזהה רכיב (`component_id`) = שם route או קובץ בטבלאות ב־audit-evidence; לכל route בטבלה: owner, חוזה, תלויות, מקור נתונים, הרשאות וכיסוי בדיקות מופיעים ב־`code-inventory.md` §1–§8.

## 6. Route Matrix

**סריקה:** 103 נתיבים (נתיבי Router, רשימת route-legitimacy, redirects, קבצים סטטיים, "לא קיימים"), פעמיים: UA של Googlebot ו־UA של Chrome. ראיות: `crawl-static-routes-*.json`.

| קבוצה | תוצאה | סטטוס |
|---|---|---|
| נתיבים ציבוריים ראשיים (`/`, `/post`, `/number`, `/world`, `/gematria`, `/code`, `/books`, `/gallery`, `/or-geula`, `/codes`, `/map`, `/privacy`, `/community*`, `/members`, `/verified`) | 200, canonical עצמי, `index, follow` | PASS |
| Aliases 308 | `/forum`, `/chat` → `/community/chat`; `/els` → `/code`; `/about` → `/contact`; `/home-classic`,`/home-new` → `/`; `/gallery-updates` → `/archive` (**שהוא 503**); `/gematria-3d` → `/spatial-gematria` (**503**); `/profile` (308 לדפדפן) | PARTIAL — שני יעדי redirect מובילים ל־503 |
| נתיבים noindex מכוונים | `/beit-midrash`, `/2029/journey`, `/2029/control`, `/2029/preview`, `/2029/home-preview`, `/2029/kingdom`, `/buy`, `/credits`, `/editor`, `/enter`, `/galaxy`, `/join`, `/lab`, `/meaning-lab`, `/research-viewer`, `/start`, `/stream`, `/sulamot*`, `/early-access`, `/melech-hamisparim/718`, `/contact`, `/unsubscribe` | PASS (ע״פ header + meta) — הצגת נתיבי preview/ניסוי בפרודקשן ללא הגנה = ראו הערה |
| 503 + `Retry-After: 259200` | `/heichal`, `/היכל`, `/archive`, `/broadcasts`, `/cross`, `/languages`, `/name`, `/name-lab`, `/numbers`, `/reality`, `/spatial-gematria`, `/research` | PARTIAL — מכוון, DEF-018 |
| 404 אמיתי | `/does-not-exist-xyz`, `/post/…`, `/topic/…`, `/tag/…` לא קיימים, `/updates`, `/book/x`, `/entity-hub-preview/x/y`, `/index.html`, `/2029.html`, `/api`, `/llms.txt`, `/manifest.*` | PASS (404 אמיתי, לא soft-404). `/updates` ב־Router אך 404 — סוכן המיפוי: חסר ב־allow-list של route-legitimacy |
| Googlebot-UA = 403 | `/login`, `/auth/callback`, `/admin`, `/experience`, `/journey`, `/numbers-report`, `/profile`, `/reveal`, `/research`, `/number/999999999` | לא הוכרע — UA מזויף ללא אימות DNS; כל הנתיבים האלה 200 לדפדפן. **UNKNOWN** אם Google האמיתי נחסם |
| נתיבי preview ללא הגנה | `/2029/preview`, `/2029/home-preview`, `/2029/kingdom`, `/galaxy`, `/lab`, `/stream`, `/sulamot*` — 200 לאנונימי | `noindex, nofollow, noarchive`; האם צריך להיות סגור — **לאישור בעלים** |
| Dead buttons / broken links | לא נבדקו אוטומטית מעבר לנתיבים; E2E לא גילה כפתור מת בנתיבי הליבה | PARTIAL |

פרוט נוסף: מדגם 772 URLs מה־sitemap (נתונים: `crawl-sitemap-sample-772.csv`):

| סוג | נדגם | 200 | אחר |
|---|---|---|---|
| `/number/*` | 120 | 120 | — |
| `/tag/*` | 60 | 60 | — |
| `/topic/*` | 60 | 60 | — |
| `/post/*` | 131 | 131 | — |
| `/category/*` | 37 | 37 | — |
| `/codes/*` | 50 | 50 | — |
| `/community*` | 24 | 23 | 1×404 (DEF-013) |
| `/video/*` | 40 | 24 | 16×503 (DEF-003) |
| root slug | 250 | 5 | 245×308 (DEF-002) |

זמני תגובה (מדגם, concurrency 5): p50 305ms, p95 8.3s (הזנב = דפי video).

## 7. SEO Matrix

| בדיקה | תוצאה | ראיה / סטטוס |
|---|---|---|
| `robots.txt` | `Allow: /`, `Disallow: /api/`, `Disallow: /unsubscribe`, `Sitemap: https://sod1820.co.il/sitemap.xml` | PASS |
| `sitemap.xml` | 16,761 URL ייחודיים (13,030 number · 1,913 tag · 1,184 root-slug · 204 topic · 132 post · 125 video · 106 codes · 37 category · 24 community · 12 ראשיים); 4.2MB, 14,772 `lastmod`; **>50,000? לא; פיצול ל־index — אין** | PARTIAL — DEF-002/013; אין sitemap תמונות; וידאו מוטמע (809 רשומות) |
| sitemap נוספים | `/sitemap-index.xml`, `/sitemap-video.xml`, `/sitemap-images.xml` → 404 | PASS (לא קיימים) |
| Canonical | 510/510 תואמים (בנורמליזציה של encoding); דף הבית ללא `/` | PASS |
| Title / Description | קיימים 510/510; כותרות כפולות ב־`/codes/*` (DEF-023) | PARTIAL |
| Open Graph / Twitter | `og:title/description/image/url`, `twitter:card=summary_large_image` קיימים | PASS |
| JSON-LD | 215/510; סוגים: `Article` (פוסט), `VideoObject` (וידאו), `BreadcrumbList/WebPage/WebSite/Organization/Thing` (topic). אין JSON-LD בדפי `/number/*`, `/tag/*`, `/codes/*`, בדפים הראשיים | PARTIAL; בלי אימות Rich Results (כלי חיצוני) — **NOT TESTED** |
| H1/H2 | 0/510 עם `<h1>` בשרת; אחרי הידרציה קיים ברוב; חסר ב־`/number/1820`, `/gallery` | FAIL/PARTIAL — DEF-009 |
| hreflang | 0 | N/A (אתר עברי יחיד) |
| noindex/robots | עקביים בין meta ל־`x-robots-tag` בנתיבים שנבדקו; `x-robots-tag: index, follow` גם על 503 (DEF-018) | PARTIAL |
| Redirect chains | 496/589 דו־שלביים; אין לולאות; 308 קבועים | PASS (לולאות) / DEF-020 |
| Duplicate / thin | `textlen` שרת 55–107 לכל דף (תוכן נטען ב־JS) | DEF-009 |
| Googlebot/אחרים | Googlebot-UA מקבל HTML זהה; 403 על שורת נתיבים (UNKNOWN אמיתי/מזויף) | PARTIAL |
| Search Console: Coverage/Indexing/Sitemaps/Canonical של Google | — | **BLOCKED** (DEF-006) |
| תוצאות חיפוש בפועל (עקיף) | `gsc_metrics` ב־DB: 20,117 קליקים / 291,841 חשיפות בין 17.6 ל־3.11; ~150 קליקים/יום, מיקום ~6–8; **אין נתונים אחרי 3.11** — הנתון אינו מכסה את המעבר ל־2029 | PARTIAL, עקיף בלבד |
| הפרדה | טכני: PARTIAL · אינדוקס: BLOCKED · תוצאות: PARTIAL (נתונים לפני המעבר) | — |

## 8. Social Sharing Matrix

| בדיקה | תוצאה |
|---|---|
| סורקים (WhatsApp, Facebook, Twitter, Telegram, LinkedIn, Slackbot) על פוסט / מספר / בית | 6/6 מקבלים 200, אותו `og:title`, אותו `og:image`, אותו `og:url` בלי redirect — **PASS** |
| פוסט | `og:image` = תמונת הפוסט ב־Supabase Storage; JSON-LD `Article` | PASS |
| מספר (`/number/1820`) | כותרת ייחודית, תמונה `/api/card?w=…` | PASS |
| `og:image` קיים ונגיש | 120 מתוך 498 ייחודיים נבדקו: 120/120 → 200 | PASS (מדגם) |
| ממדים | 72/120 בדיוק 1200×630; כל `/api/card` 69/69 = 1200×630; השאר: 1080×1080 ×5, 480×300 ×3, אנכיים… | PARTIAL — DEF-021 |
| Fallback / cache | `/api/card` ללא cache בכל התגובות; timeout 300s ×2 | PARTIAL — DEF-015 |
| עברית ו־RTL בכרטיס | כרטיסי PNG נוצרו עם טקסט עברי; **לא נבדק חזותית** | NOT TESTED (בדיקה ויזואלית) |
| URL עם slug/Unicode | `og:url` מתאים ל־URL שנסרק, כולל Unicode מקודד | PASS |
| `/api/og` | 404 בפריסה החיה — המטא־דאטה מוגש דרך `/api/public-document` | PASS/N-A (שינוי ארכיטקטורה; החוזה מדבר על `/api/og` — דרוש עדכון חוזה) |
| כפתורי שיתוף (WhatsApp/Facebook/Telegram/X/Copy/Web Share/ShareActions/WatchButton) | נבדק קיום ברכיבים בלבד; לחיצה בפועל — **NOT TESTED** |
| תמונה של פוסט אחר / תמונה ישנה מ־cache | לא נצפה במדגם; `no-store` מונע cache ישן בכרטיסים | PASS (מדגם) |

## 9. Image Matrix

| תחום | בדיקה | תוצאה |
|---|---|---|
| תמונות פוסט/OG | 120 נטענו | PASS |
| תמונות עמודי קטגוריה/תגית | `og:image` מ־`media/_thumb/p/*.jpg` ו־`/storage/v1/render/image` (10) | PASS (מדגם) |
| Thumbnails בדף הבית | בקשה אחת `ERR_FAILED` ל־`media/_thumb/p/5047.jpg` בדפדפן; `curl` מחזיר 200 (96KB) | UNKNOWN (לא משוחזר; כנראה ביטול) |
| גלריה ציבורית | `/gallery` 101 תמונות נייד / 14 דסקטופ, אין שבורות; CLS 0.263 | PARTIAL — DEF-008 |
| Storage — קריאה | `gallery`, `media`, `magar` ציבוריים; `submission-inbox` פרטי | PASS |
| Storage — הרשאות כתיבה | העלאה אנונימית מותרת ל־`gallery/community/**` ללא הגבלות; כל משתמש מחובר ל־`gallery` | **FAIL** — DEF-004 (לא נוסה) |
| CORS / content-type / cache | `content-type` תקין (png/jpeg); cache ב־Supabase: לא נבדק לכל bucket | PARTIAL |
| תמונות יתומות / כפולות / 404 בנפח | לא בוצעה השוואת Storage מול DB (דורשת קריאת 20K אובייקטים) | NOT TESTED |
| Vercel image optimization | לא בשימוש בנתיבים שנבדקו; `render/image` של Supabase (10) | NOT TESTED |
| lazy loading | לא נבדק | NOT TESTED |

## 10. AI Generation Matrix

| שלב | ממצא |
|---|---|
| UI / API / Provider | **לא נמצא מימוש יצירת תמונות.** חיפוש `gpt-image\|dall-e\|images/generations` ב־`api`, `src`, `supabase`, `scripts` — אפס תוצאות (סוכן המיפוי). התמונה היחידה "שנוצרת" היא כרטיס טקסט ב־`/api/card` (קוד, לא ספק AI). |
| Auth / Quota / Billing | אין. קיימים חוזי עלות/ספקים (`docs/2029-provider-orchestration-v1.md`, `docs/RAZIEL_NUMBER_AI_COST_POLICY_V1.md`) לטקסט (Raziel), לא לתמונות. `cardcom` (תשלום) לא פרוס חי (DEF-014). |
| ניסוי E2E (7 הוכחות מההוראה) | **BLOCKED/N-A** — אין מה לבדוק; לא בוצע ניסוי ולא נוצרה עלות |
| פער | אם ייצור תמונות AI הוא חלק מהמוצר החי — הוא חסר גם בחוזה וגם במימוש; **נדרשת החלטת בעלים** האם זה בתוכנית. |

## 11. World 2029 Matrix

בדיקת דפדפן (Chromium, נייד 390×844 ודסקטופ 1440×900, UA של Chrome, בקשות analytics נחסמו). ראיות: `e2e-playwright-key-routes.json`.

| מערכת | Route | נתון | סטטוס |
|---|---|---|---|
| Home | `/` | 200; 14 תמונות; LCP 2.6s; ‏GoTrueClient מרובה (אזהרה) | PASS |
| Posts | `/post` | 200; 34 תמונות; LCP 1.8s | PASS |
| Post detail | `/post/<slug>` | 200; JSON-LD Article; ‏403 על `page_views` | PARTIAL — DEF-012 |
| Number search | `/number` | 200; LCP לא נמדד ב־`/number` | PASS |
| Number page | `/number/1820` | 200; LCP 2.9s, CLS 0.063; ללא `<h1>` | PARTIAL |
| World | `/world` | 200; LCP 3.7s | PARTIAL — DEF-008 |
| Gematria / Calculator | `/gematria`, `/2029/calculator` | 200; LCP 1.9s | PASS (טעינה); **חישוב תקין מול מנוע — NOT TESTED בדפדפן**; חבילות `test:calculator-2029-*` קיימות |
| ELS / Code | `/code` | 200; LCP 2.0s; אזהרת iframe `web-share` | PASS (טעינה); חיפוש ELS — NOT TESTED |
| Community / Chat | `/community`, `/community/chat` | 200; 66 תמונות; **CSP חוסם OpenWeb; ‏pageerror**; long tasks 176ms | PARTIAL — DEF-010 |
| Researchers | `/community/researchers` | 200 | PASS |
| Books | `/books` | 200 | PASS |
| Gallery | `/gallery` | 200; CLS 0.263 | PARTIAL |
| Or-geula (וידאו) | `/or-geula`, `/video/<id>` | 200 | PASS (בקשה בודדת); DEF-003 |
| Codes | `/codes` | 200; 28 תמונות | PASS |
| Map | `/map` | 200 | PASS |
| Topic / Tag | `/topic/gapfill-363`, `/tag/…` | 200 | PASS |
| Beit Midrash | `/beit-midrash` | 200 (noindex, nofollow) | PASS |
| Journey | `/2029/journey` | 200 (noindex) — ללא GA | PARTIAL — DEF-011 |
| Heichal | `/heichal` | 503 (סגור מכוון) | PARTIAL — DEF-018 |
| Login | `/login` | 200 (noindex) | PASS (עמוד); Google/Facebook login — **BLOCKED** |
| Personal area | `/2029/me/*` | מפנה ל־login למשתמש אנונימי — noindex | PASS (גבול הרשאה לאנונימי); מחובר — **BLOCKED** |
| 404 | `/does-not-exist-xyz` | 404 אמיתי, מסך 2029 | PASS |
| נייד/דסקטופ | 27 נתיבים × 2 | ללא גלישה אופקית, ללא "opening" תקוע | PASS |
| Raziel, Search, Chat (פעולה), Now/Feed, Share | — | **NOT TESTED** (אינטראקציה מחייבת סשן/הרשאה/עלות AI) |

## 12. Legacy Matrix

Legacy **פרש** (CLAUDE.md, 5.11): אין להחיות. הבדיקה = ודאי שאין דליפה ותאימות.

| בדיקה | תוצאה |
|---|---|
| `scripts/test-legacy-retired.mjs` | קיים; רץ ב־`prebuild`; `Production Release…` ירוק על `1f086393` |
| כתובות Legacy ישנות (`/<slug>/` עם סלאש) | 308 → `/<slug>` ← 200, canonical עצמי (30/30 נבדקו מקצה לקצה) |
| `/tzofen.html` | 307 → `/code` ל־Googlebot-UA; 200 לדפדפן (Worker חדש #1254) — לא נבדק אצל מבקר חוזר |
| `/heichal.html` | 200 (קובץ סטטי ישן, title "היכל השערים"), מקביל ל־`/heichal` שהוא 503 | PARTIAL — כפילות/Legacy static |
| כתובות 2029 שהוסרו | לא נמצאו הפניות ל־URL שהוסר |
| איבוד תוכן | `/post/*` 131/131, root slug 5/5 הסופיים 200; **איבוד תוכן לא נבדק במלואו** (דורש השוואת DB מול URLs) | PARTIAL |
| מסמכים | `g3-2029-cutover-acceptance-checklist.md` עדיין מתאר Legacy rollback ללא באנר (D-2) | DEF-025 |

## 13. Contract Matrix

הטבלה המלאה: [`contracts-inventory.md`](audit-evidence/20261106/contracts-inventory.md) §1 (113 חוזים, 17 תחומים: Routing/URL, SEO, Share, Images, AI, Auth/RLS, Community, Posts, Numbers/World, ELS, Calculator, Analytics, Performance, Bot policy, Release gates, Design, Legacy-retired). **סטטוס חוזה לפי קוד בלבד** (IMPLEMENTED / PARTIAL / NO-IMPL-FOUND / OBSOLETE) — הסימון PASS/FAIL כאן מבוסס על בדיקות חיות שבוצעו בסשן זה:

| Contract | Source | Implementation | Tests | Status | Evidence | Gap | Remediation |
|---|---|---|---|---|---|---|---|
| C-SEO-sitemap (canonical URLs, 200) | `2029-search-indexing-closure-map-v1.md` | `api/sitemap.js` → `public-sitemap.js` | `test:2029-server-seo-ai` | **FAIL** | 245/250 root slugs → 308 | כתובות לא קנוניות | DEF-002 |
| C-SEO-robots | closure map | `public-robots.js` | באותו סקריפט | PASS | `robots.txt.live` | — | — |
| C-ROUTE-404 (בלי soft-404) | `url-continuity-plan-20261103` | `public-document.js`, `route-legitimacy.js` | `test:2029-route-seo-*` | PASS | 404 אמיתי ×15 | `/updates` ב־allow-list | DEF-025 |
| C-SHARE-OG | closure map | `public-document.js` + `/api/card` | `share-*` (לא ב־CI) | PARTIAL | 6/6 סורקים תואמים | cache/timeout | DEF-015 |
| C-PERF-CLS ≤ 0.1 | `CLAUDE.md` ספים קבועים | — | `test:web-vitals`/canary | **FAIL** (`/gallery`) | CLS 0.263 | מדידה בודדת | DEF-008 |
| C-AUTH-RLS | `docs/2029-security-hardening-gate-plan-v1.md` | RLS על 302/302 טבלאות | SQL tests | **FAIL** | DEF-001/004/005 | RPC ו־Storage פתוחים | ראו Register |
| C-LEGACY-RETIRED | `CLAUDE.md` | `test-legacy-retired.mjs` | `legacy-production-lock` workflow | PASS | CI ירוק | באנר חסר במסמכים | DEF-025 |
| C-ANALYTICS-GA | closure map / D37:12.57 | `initGA`, `tracking-*.js` | `analytics-2029-one-tree-contract` (לא ב־CI) | PARTIAL | G-V3H3E20FLY; חסר ב־5 נתיבים | consent, כיסוי | DEF-011 |
| C-AI-IMAGE | אין | אין | אין | **NO-CONTRACT/NO-IMPL** | חיפוש קוד | — | החלטת בעלים |
| C-CI-GATES | `Design V2 §13` | workflows | — | PARTIAL | 667 קבצי בדיקה לא ב־CI; DEF-007 | אכיפה | DEF-007/019 |

**סחף חוזים (12):** D-1 … D-12 ב־`contracts-inventory.md` §2 — חמשת המרכזיים: (1) צ׳קליסט ה־cutover עדיין מתאר Legacy rollback; (2) HTTP 404/301/200 מוגדר "החלטה פתוחה" ב־Roadmap אך ממומש; (3) שלושה מסלולי sitemap + workflow סטטי; (4) חוזי בדיקה לא נאכפים ב־CI; (5) קובץ בדיקה שנמחק מוזכר ב־workflow. **PLAN37 (doc37) אינו ב־repo** — הוא `project_codex.id=37` ב־Supabase; נקרא רק כותרות והחלטות DEC-*/HOME-* ולכן שורות שתלויות בו מסומנות UNKNOWN. **לא שונה אף חוזה.**

## 14. Supabase / Security Matrix

פרויקט `linswmnnkjxvweumprav`, קריאה בלבד (+3 קריאות REST אנונימיות ללא כתיבה).

| בדיקה | תוצאה | סטטוס |
|---|---|---|
| RLS | 302/302 טבלאות מופעל RLS; אפס טבלאות ללא RLS | PASS |
| `anon SELECT` על `users` | `permission denied` (401) | PASS |
| `admin_pulse` כ־anon | `P0001 admin only` | PASS |
| RPC `SECURITY DEFINER` פתוחים | 295 ל־anon / 466 ל־authenticated | **FAIL** — DEF-001/005 |
| Views `SECURITY DEFINER` | `redirect_map`, `topic_cards_public` (ERROR) | DEF-017 |
| `search_path` | 141 פונקציות | DEF-017 |
| INSERT אנונימי פתוח | 9 טבלאות | DEF-016 |
| Storage policies | DEF-004 | **FAIL** |
| Edge functions | ~90; ~70 ללא `verify_jwt`; נבדקו `storage-put-raw`, `raw-put` — שתיהן מוגנות ב־`FB_ADMIN_KEY` (מפתח משותף יחיד לכל ה־cron); **שאר ~68 לא נבדקו** | PARTIAL |
| Secrets בקוד / bundle | ב־bundle חי: רק anon JWT (`role=anon`, `exp 2096`); ב־repo: אין סוד מועדף (סוכן + grep) | PASS |
| Cron | 29 פעילים; הרצות אחרונות `succeeded` (סטטוס HTTP בלבד, לא תוצאת הפונקציה); 12 לא פעילים — כולל URL עם סוד בשאילתה בפקודות cron לא פעילות (`wa-*`) | PASS/הערה |
| UI מול Backend permissions | `/2029/me/*` ו־`/api/contributor-self` → login נדרש; `/api/ga-insights|search-console|vercel-insights` → 403 `admin_required` | PASS |
| רשומות יתומות / FK | **NOT TESTED** |
| Auth providers (Google/Facebook) | **NOT TESTED** (הגדרות ב־Dashboard, לא נבדקו) |

## 15. Analytics Matrix

| מערכת | ממצא | סטטוס |
|---|---|---|
| GA4 (`G-V3H3E20FLY`) | מוטמע ב־bundle הראשי; בקשות GA נרשמו (ונחסמו בכוונה) ברוב הנתיבים; **חסר** ב־`/code`, `/community/researchers`, `/login`, `/2029/journey`, `/heichal` | PARTIAL |
| הגעת נתונים ל־property הנכון, אירועים כפולים, SPA pageviews, Legacy מול 2029 | אין גישה ל־GA | **BLOCKED** |
| Consent | אין באנר הסכמה | DEF-011 |
| Search Console | סנכרון DB פעיל: `gsc-daily-sync` רץ 2026-11-06 05:17Z (נתונים עד 3.11); חיבור אל GSC עצמו — לא נבדק | PARTIAL |
| Vercel Analytics / Speed Insights | לא נמצאו ב־bundle הראשי | UNKNOWN |
| Clarity | לא נמצא | UNKNOWN |
| Supabase analytics | `events` מתעדכן (אחרון 07:07Z); `traffic_daily` עד 5.11; cron `traffic-daily-refresh` ו־`g4-kpi-funnel-hourly` מצליחים | PASS |
| `page_views` | 403 מהדפדפן (DEF-012) | FAIL |

## 16. Performance Matrix

מדידת מעבדה, Pixel-7 UA, 390×844, DPR2, **בלי throttling**, ריצה אחת לכל דף — אינדיקציה בלבד.

| Route | TTFB | LCP | CLS | long tasks | בקשות | KB | סטטוס |
|---|---|---|---|---|---|---|---|
| `/` | 464 | 2,644 | 0 | 0 | 123 | 472 | PASS |
| `/post` | 191 | 1,772 | 0 | 0 | 77 | 474 | PASS |
| `/number/1820` | 630 | 2,880 | 0.063 | 0 | 119 | 79 | PARTIAL (LCP) |
| `/world` | 153 | 3,748 | 0.035 | 0 | 110 | 379 | **FAIL** LCP |
| `/gematria` | 149 | 1,868 | 0 | 0 | 61 | 88 | PASS |
| `/code` | 159 | 1,988 | 0.035 | 10ms | 61 | 88 | PASS |
| `/community/chat` | 154 | 1,760 | 0 | 176ms | 131 | 402 | PASS |
| `/gallery` | 363 | 3,916 | **0.263** | 0 | 94 | 1,297 | **FAIL** CLS+LCP |

INP, שדה (CrUX), Speed Insights, latency Supabase, עלות/Anomalies: **NOT TESTED**. שגיאות Vercel runtime ב־24 שעות: אזהרת `url.parse()` (209) ו־2 timeouts של `/api/card`.

## 17. E2E Matrix

| # | מסע | תוצאה |
|---|---|---|
| 1 | כניסה מגוגל לפוסט (URL ישיר, Googlebot/Chrome) | PASS (טעינה, canonical, OG) |
| 2 | פתיחת דף מספר | PASS (`/number/1820`) |
| 3 | מעבר לעולם | PASS (`/world`) |
| 4 | מחשבון | PASS טעינה; חישוב — NOT TESTED |
| 5 | תוכן פנימי | PASS (`/topic/*`, `/codes/*`) |
| 6 | שיתוף פוסט | NOT TESTED (פעולה); מטא־דאטה PASS |
| 7 | פתיחת קישור משותף | PASS |
| 8 | הרשמה / התחברות | **BLOCKED** |
| 9 | כניסה לקהילה | PASS (צפייה אנונימית) · CSP/שגיאה DEF-010 |
| 10 | פעולה ושמירת נתונים | **BLOCKED** |
| 11 | חזרה לאתר (refresh / deep link) | PASS — כל הנתיבים נטענו כ־direct URL |
| 12 | מסלול Legacy (`/<slug>/`) | PASS (308 → 200) |
| 13 | כניסה ל־2029 | PASS |
| 14 | ייצור תמונה | **N/A** (לא קיים) |
| 15 | refresh + deep link | PASS |

Playwright נייד+דסקטופ בלבד ל־27 נתיבים; מסלולים מחוברים לא נבדקו.

## 18. Defect Register

ראו [SOD1820_FULL_PRODUCT_DEFECT_REGISTER.md](SOD1820_FULL_PRODUCT_DEFECT_REGISTER.md): 1×P0, 5×P1, 13×P2, 6×P3.

## 19. Remediation Plan

**עיקרון:** תיקוני DB/Storage/Vercel config דורשים אישור מפורש של ZURIEL; כל תיקון קוד יבוצע בענף נפרד, עם בדיקת מניעה, ללא merge/deploy עד אישור.

| שלב | תוכן | תלות |
|---|---|---|
| **A (P0/P1 — אבטחה)** | DEF-001 (REVOKE על `resolve_visitor_email`, בדיקת SQL), DEF-004 (Storage), DEF-005 (רשימת REVOKE) | אישור שינוי DB |
| **B (P1 — SEO)** | DEF-002 (sitemap קנוני + בדיקה), DEF-003 (cache/ביצועי `/video`), DEF-006 (גישה ל־GSC) | קוד + בעלים |
| **C (P2 — שערים)** | DEF-007 (תיקון נתיב ב־workflow), DEF-019 (השבתת `update-sitemap.yml`), DEF-008 (CLS בגלריה) | קוד |
| **D (P2 — פונקציונלי)** | DEF-010, 011, 012, 013, 014, 015, 018 | החלטות מוצר |
| **E (P3)** | DEF-020…025 | — |

## 20. Release Acceptance Criteria (סטטוס)

| קריטריון | מצב |
|---|---|
| כל routes ממופים | PARTIAL (Router + redirects; לא נתיבים דינמיים בלתי מקושרים) |
| כל המערכות הציבוריות והפנימיות נבדקו | PARTIAL (ציבורי כן; פנימי/מחובר — BLOCKED) |
| חוזים רלוונטיים מכוסים | PARTIAL (113 ממופים; UNKNOWN: PLAN37 ב־Supabase) |
| תהליכי משתמש קריטיים עברו | PARTIAL |
| SEO טכני תקין | **FAIL** (DEF-002, 009) |
| אינדוקס מאומת | **BLOCKED** |
| שיתופים תקינים | PARTIAL |
| תמונות תקינות | PARTIAL |
| ייצור תמונות נבדק | N/A — לא קיים |
| APIs תקינים | PARTIAL (DEF-014) |
| הרשאות תקינות | **FAIL** |
| אין P0/P1 פתוחים | **FAIL** (1+5) |
| CI ירוק | PARTIAL (ירוק היום; DEF-007 ישבור) |
| Regression tests | לא הורצו (אין תיקונים) |
| Preview acceptance | NOT TESTED |
| Production acceptance מתועד | המסמך הזה (אבחון) |

**מסקנה: לא מוכן לקבלה סופית.** התנאים לפתיחה מחדש: סגירת DEF-001/004/005/002/003, גישה ל־GSC, בדיקת משתמש מחובר ב־Preview.

---

## נספח א׳ — Test Matrix

Environment: **Prod** = `1f086393`/`dpl_7Hn7…`. Severity = חומרת תקלה אם FAIL.

| Test ID | Component | Route | Contract | Type | Env | Expected | Actual | Evidence | Sev | Status | SHA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-001 | alias דומיינים | 3 דומיינים | Release | API | Prod | alias→dpl אחד | אותו `dpl_7Hn7…` | Vercel get_alias | P0 | PASS | 1f086393 |
| T-002 | origin vs prod | — | Release | git/API | Prod | זהה | זהה | git rev-parse + deployment meta | P1 | PASS | 1f086393 |
| T-003 | דף הבית | `/` | C-ROUTE | HTTP | Prod | 200, canonical | 200 | static2.json | P0 | PASS | 1f086393 |
| T-004 | נתיבי ליבה ×27 | ראו §11 | C-ROUTE | Playwright | Prod | 200, בלי גלישה | 54/54 | e2e json | P1 | PASS | 1f086393 |
| T-005 | robots | `/robots.txt` | C-SEO | HTTP | Prod | Allow + Sitemap | כצפוי | robots.txt.live | P1 | PASS | 1f086393 |
| T-006 | sitemap — כתובות | `/sitemap.xml` | C-SEO | HTTP | Prod | כל loc 200 | 245/250 root → 308 | csv | P1 | **FAIL** | 1f086393 |
| T-007 | sitemap — video | `/video/*` | C-SEO | HTTP | Prod | 200 | 16/40 → 503 | csv | P1 | **FAIL** | 1f086393 |
| T-008 | sitemap — community | `/community/researcher/*` | C-SEO | HTTP | Prod | 200 | 1/24 → 404 | csv | P2 | FAIL | 1f086393 |
| T-009 | canonical | מדגם 510 | C-SEO | HTML | Prod | עצמי | 510/510 | csv | P1 | PASS | 1f086393 |
| T-010 | meta/OG | מדגם 510 | C-SEO | HTML | Prod | title+desc+og | 510/510 | csv | P1 | PASS | 1f086393 |
| T-011 | JSON-LD | מדגם 510 | C-SEO | HTML | Prod | לפי סוג | 215/510 | csv | P2 | PARTIAL | 1f086393 |
| T-012 | H1 בשרת | מדגם 510 | C-SEO | HTML | Prod | ≥1 | 0/510 | csv | P2 | FAIL | 1f086393 |
| T-013 | 404 אמיתי | 15 נתיבים | C-ROUTE | HTTP | Prod | 404 | 404 | static2 | P1 | PASS | 1f086393 |
| T-014 | Googlebot-UA | 10 נתיבים | C-BOT | HTTP | Prod | = דפדפן | 403 | static2 | P2 | UNKNOWN | 1f086393 |
| T-015 | 503 סגורים | 12 נתיבים | C-ROUTE | HTTP | Prod | מוגדר | 503/3d | static2 | P2 | PARTIAL | 1f086393 |
| T-016 | redirect loops | 589 | C-ROUTE | static | repo | אין | אין | code-inventory | P1 | PASS | 42ff1512 |
| T-017 | Legacy slug | 30 דגימות | C-LEGACY | HTTP | Prod | 308→200 | 30/30 | הרצה | P1 | PASS | 1f086393 |
| T-018 | שיתוף ×6 סורקים | 3 URL | C-SHARE | HTTP | Prod | זהה | זהה | הרצה | P1 | PASS | 1f086393 |
| T-019 | OG נגישות | 120 | C-SHARE | HTTP | Prod | 200 image | 120/120 | הרצה | P1 | PASS | 1f086393 |
| T-020 | OG ממדים | 120 | C-SHARE | HTTP | Prod | 1200×630 | 72/120 | הרצה | P3 | PARTIAL | 1f086393 |
| T-021 | `/api/card` cache | 69 | C-SHARE | HTTP | Prod | cacheable | `no-store` | הרצה | P2 | FAIL | 1f086393 |
| T-022 | `/api/og` | `/api/og` | C-SHARE | HTTP | Prod | קיים | 404 | הרצה | P3 | PARTIAL | 1f086393 |
| T-023 | RLS | 302 טבלאות | C-AUTH | SQL | Prod DB | הכל מופעל | 302/302 | SQL | P0 | PASS | — |
| T-024 | RPC anon | 295 | C-AUTH | SQL | Prod DB | רק ציבורי מכוון | חשיפת אימייל | SQL+REST | P0 | **FAIL** | — |
| T-025 | admin RPC | `admin_pulse` | C-AUTH | REST | Prod | נדחה | admin only | הרצה | P0 | PASS | — |
| T-026 | Storage כתיבה | `gallery/community` | C-AUTH | policy | Prod DB | נדחה | מותר | pg_policies | P1 | FAIL | — |
| T-027 | secrets ב־bundle | JS חי | C-AUTH | static | Prod | anon בלבד | anon בלבד | סריקה | P0 | PASS | 1f086393 |
| T-028 | API admin | 3 endpoints | C-AUTH | HTTP | Prod | 403 | 403 | הרצה | P1 | PASS | 1f086393 |
| T-029 | GA4 | נתיבים | C-ANALYTICS | Playwright | Prod | נשלח בכולם | חסר ב־5 | e2e | P2 | PARTIAL | 1f086393 |
| T-030 | GA בפועל/GSC | — | C-ANALYTICS | UI | Prod | — | אין גישה | — | P1 | BLOCKED | — |
| T-031 | page_views | פוסט | C-ANALYTICS | Playwright | Prod | 2xx | 403 | e2e | P2 | FAIL | 1f086393 |
| T-032 | CWV נייד | 8 דפים | C-PERF | Playwright | Prod | CLS ≤ 0.1 | `/gallery` 0.263 | perf run | P1 | **FAIL** | 1f086393 |
| T-033 | LCP | 8 דפים | C-PERF | Playwright | Prod | < 2.5s | 3 דפים מעל | perf run | P2 | PARTIAL | 1f086393 |
| T-034 | קהילה CSP | `/community` | C-COMM | Playwright | Prod | אין חסימות | 7 חסימות + pageerror | e2e | P2 | FAIL | 1f086393 |
| T-035 | Auth Google/Facebook | `/login` | C-AUTH | UI | Prod | התחברות | אין אישורים | — | P1 | BLOCKED | — |
| T-036 | משתמש מחובר | כל המערכות | — | E2E | Prod | — | — | — | P1 | BLOCKED | — |
| T-037 | ייצור תמונות AI | — | — | E2E | Preview | — | לא קיים | grep | P1 | N/A | — |
| T-038 | Preview acceptance | — | Release | E2E | Preview | — | לא נוצר | — | P1 | NOT TESTED | — |
| T-039 | CI על SHA | main | Release | CI | Prod | ירוק | ירוק | Actions | P1 | PASS | 1f086393 |
| T-040 | שער Live Contracts | workflow | Release | static | repo | נתיבים קיימים | קובץ נמחק | git log | P2 | FAIL | 1f086393 |
| T-041 | Regression | — | — | CI | repo | — | לא הורץ | — | P1 | NOT TESTED | — |
| T-042 | Search Console | — | C-SEO | UI | Prod | אינדוקס | אין גישה | — | P1 | BLOCKED | — |
| T-043 | Lighthouse/INP/CrUX | — | C-PERF | tool | Prod | — | לא הורץ | — | P2 | NOT TESTED | — |
| T-044 | Rich Results | — | C-SEO | tool | Prod | — | לא הורץ | — | P2 | NOT TESTED | — |
| T-045 | תמונות יתומות | Storage | C-IMG | SQL | Prod | — | לא הורץ | — | P2 | NOT TESTED | — |

## נספח ב׳ — גבולות הבדיקה (מה לא נעשה ולמה)

1. **פרודקשן:** נשלחו רק בקשות קריאה (GET/HEAD) + שלוש קריאות REST אנונימיות לא־כותבות (`resolve_visitor_email` עם מזהים פיקטיביים, `trusted_contributor_uids` — נספר בלבד, `admin_pulse` — נדחה). ניסיון העלאה ל־Storage נחסם על־ידי מערכת ההרשאות ולא בוצע.
2. **תעבורת בדיקה:** בקשות GA/Clarity/GTM נחסמו בדפדפן כדי לא לזהם אנליטיקה. ה־crawl השתמש ב־User-Agent של Googlebot/Chrome/סורקים חברתיים **ללא אימות DNS** — תוצאות 403 ל־Googlebot אינן מוכחות כחסימת Google אמיתי.
3. **UA של curl:** `curl` ברירת מחדל מקבל `403 Access denied` מהדומיין החי (נחסם לפי UA); כל המדידות בוצעו עם UA מלא.
4. **מדגמים:** 772 מתוך 16,761 URL ב־sitemap; 120 מתוך 498 תמונות OG ייחודיות; ביצועים — ריצה אחת לדף. אין להכליל מעבר לטווח.
5. **שני סוכני מיפוי** (קוד וחוזים) עבדו על `42ff15120` ולא על `1f086393` (ההפרש: #1254, 6 קבצים). הספירות שלהם הן אינדיקציה; הממצאים שמופיעים כ־`CONFIRMED` אומתו ידנית בסשן.
6. **לא נבדקו:** GA4, Search Console, Clarity, Vercel Speed Insights, Auth פעיל, פעולות מחוברות, Raziel/AI, כפתורי שיתוף בלחיצה, השוואת Storage מול DB, עלויות, rate limits ו־load.
