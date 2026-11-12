# רשימת סגירה משותפת — ביקורת וסגירת יסודות רוחבית (12.11.2026, עדכון אחרי ביקורת Codex)

> **מעמד:** מסמך עבודה ומסירה לביקורת Codex. **אינו חוזה, אינו בעלים ואינו אישור.** אין בו שינוי חי, הרשאות, מיזוג או פריסה (CLAUDE.md 0.4).
> **בסיס:**
> - ‏`origin/main` = Production = `aa0f6bc82` (‏`dpl_FEzrHi2GLSpdHPN1cJDu6rhXtswZ`).
> - הענף `claude/sod1820-system-audit-roadmap-3793us`, ‏PR #1321. הראש בדוח המסירה וברשומת היומן.
> **ביקורת Codex על `6352be19d`:** ה־CI מאומת: 9 workflows ו־15 checks ירוקים. ‏M0 נשמר. חבילת האכיפה דרשה תיקון, והתיקון כאן.
> **מסירת סשן החוזים (מהיומן):**
> - רשומה `a3d65374-a73a-4131-a00f-d3a050851064`.
> - ענף `claude/laws-alignment-20261112`, ראש `0a5882774`, בסיס `aa0f6bc82`.
> - [השוואה](https://github.com/zuriel337/sod1820/compare/aa0f6bc82b8c94286374b1f51208037502994eab...0a5882774cf5dfbb37dd3162de27fb72c63f5457) · [README ‏§9, ‏CL-01..CL-18](https://github.com/zuriel337/sod1820/blob/0a5882774cf5dfbb37dd3162de27fb72c63f5457/docs/reviews/contract-governance-audit-20261110/laws-alignment-20261112/README.md).
> **חלוקת הכתיבה (ZURIEL, ‏12.11):**
> - **סשן הביקורת הראשית** (הסשן הזה) — הכותב הטכני **היחיד** של הרחבת G1, ושל המימוש והבדיקות הטכניות.
> - **סשן החוזים** — משלים את המיפוי ואת המשמעות החוזית.
> - **Codex** — מרכז ומבקר.

## 0. "שני הקוראים"

- **אצל סשן החוזים:** "שני הקוראים" הם שני סוכני הקריאה בלבד שסשן החוזים הפעיל.
  - לפי הרשומה שלהם, ממה שהם מצאו לא אומתו באופן עצמאי:
    - שורות ההקשר של רזיאל;
    - פירוק 470 שורות הזיכרון;
    - תוכן `fn_raziel_plan` / `fn_raziel_answer`;
    - גרסאות ה־Edge;
    - טבלת R1–R16 (מלבד השורות שהוצלבו).
  - אין להם בעלות כתיבה, ולא יופעלו שוב.
- **אצלי:** קוראי ה־workflow `wf_48e2be42-1d4`.
  - שישה הסתיימו. `visibility` נעצר.
  - המסכם לא הופעל.
  - אין להם בעלות כתיבה, ולא יופעלו עוד.

## 1. הרשימה

**מקרא:**
- **כותב:** `ביקורת` = הסשן הזה · `חוזים` = סשן החוזים · `ZURIEL`.
- **שער:** מיזוג · פריסה · DB · הגדרות · מוצר · Google · קריאה.
- **★ = חוסם סגירת בסיס.**
- **CL-xx** = השורה המקבילה ברשימה של סשן החוזים. כל שורה כאן מופיעה פעם אחת, עם כותב אחד.

### A. השלמת M0

הפירוט ב־`round5-decision-package.md` §7.3.

| # | ממצא | בעלים | כותב | תלות | מבחן קבלה | שער |
|---|---|---|---|---|---|---|
| A1★ | ‏CI ירוק על הראש הסופי | שערי CI | ביקורת | — | כל ה־workflows על אותו SHA | קריאה |
| A2★ | ‏SQL צעדים 1–10 (ו־12 אופציונלי) | אשכולות A–C | ביקורת | שלב 0 חוזר | שורות האימות `true` | DB לכל צעד |
| A3★ | ‏secrets ‏`CONTACT_NOTIFY_TO`, ‏`ZURIEL_WA` | B, ‏E | ZURIEL | — | השם קיים | הגדרות |
| A4a★ | ‏Edge: שמונה פונקציות (כל התשע מלבד `wa-raziel`) | B, ‏E | ביקורת | A2, ‏A3 | טבלת שלב 3 | פריסה לכל פונקציה |
| **A4b★** | ‏**Edge `wa-raziel`** | B; ‏**CL-13** | ביקורת | **מטריצת CL-13 (§1.H) והחלטת ZURIEL** | שורות המטריצה עוברות | פריסה |
| A5★ | בדיקת ההפניה החיה (‏N14) | D1 | ZURIEL | — | חמשת המקרים | קריאה |
| A6★ | מיזוג #1321 ופריסת האתר | ‏`deploy_on_request` v4 | ZURIEL | A1, ‏A5 | קנרית 15,000ms | מיזוג ← פריסה |
| A7 | ‏SQL צעד 11 (‏v2) | אשכול D | ביקורת | A6 | שורות D | DB |
| A8 | כתיבת בדיקה ב־Storage | אשכול C | ביקורת | A2 (צעד 8); חשבון בדיקה | ‏V10 = ‏V0 | אישור כתיבה |

### B. ממשל ואכיפה

ההוכחה ב־`enforcement-proof/README.md`.

| # | ממצא | מקור | בעלים | כותב | אובייקטים | מצב / תיקון | תלות | מבחן קבלה | שער |
|---|---|---|---|---|---|---|---|---|---|
| B1★ | אין שער נגד מבנה חדש: קובץ חוזה, חוק חדש או שהופעל מחדש, טבלה או MV | DG-3; ‏**CL-15** | v18 §28–31 · אינדקס §2 | ביקורת | `scripts/test-g1-agent-routing-smoke.mjs`, ‏`scripts/lib/g1LawsSnapshotRules.mjs`, ‏`audits/g1-agent-entry/*` | **IMPLEMENTED, BRANCH-ONLY.** הרחבה מאוחדת (§3) | — | ‏S1, ‏S3, ‏S10, ‏S11, ‏S12b, ‏S15 מסרבים; ‏S2, ‏S12 מתירים | מיזוג |
| B2★ | אין שער נגד בעלים שפרש או שאינו קיים | DG-2; ‏CL-15 | כמו B1 | ביקורת | כמו B1 | **IMPLEMENTED, BRANCH-ONLY** | ‏snapshot מתוארך חדש עם כל שינוי חוק | ‏S4, ‏S4b מסרבים; ‏S5 מתיר | מיזוג |
| B3★ | אין שער נגד שינוי חוזה קיים | CL-15 | ‏`foundation_closure_protocol_law` v8 | ביקורת | כמו B1 + שלב fetch בסיס ב־`live-contracts-2029.yml` | **IMPLEMENTED, BRANCH-ONLY.** השוואה בין **בסיס וראש אמיתיים** | ‏`G1_BASE_SHA`. בלעדיו נכשל ב־CI | ‏S6, ‏S9, ‏S13, ‏S14 מסרבים; ‏S7, ‏S8 מתירים | מיזוג |
| B4 | שער המסד: ‏D03, ‏D05–D07c, ‏D09a, ‏D10–D15 מותרים בחי | DG-1; ‏**CL-16** | v8 · v18 | ביקורת | `fn_rule_compaction_integrity_guard_v1` + רשימת העמודות של ה־trigger; trigger של TRUNCATE | אב־טיפוס מורחב (§3) | **אחרי A2** (§2); הצעת SQL ו־rollback טרם הוכנו | ‏24 מקרים כמצופה | DB / DDL |
| B5 | ל־`project_codex` אין שער | DG-4 | `project_codex._index` | ביקורת | הרחבת G1 (רשימת קטגוריות) | טרם מומש | — | ‏slug חדש מסוג master נכשל | מיזוג |
| B6★ | ‏CI מייעץ בלבד: אין required checks, ומנהל עוקף | CI-1 | ‏`deploy_on_request` v4 | ZURIEL | ruleset ‏`protect-main` | required checks | — | PR אדום לא ניתן למיזוג | הגדרות |
| B7 | ‏`execute_sql` רץ בלי הודעה | CLAUDE.md | 0.4 | ZURIEL | `.claude/settings.json` | אין שינוי מוצע. ההגנה היא אישור | — | — | — |
| B8★ | פתיחת סשן לא טוענת דבר באופן מכני | SS-1 | v18 | ביקורת | `.claude/settings.json`, ‏`scripts/live-sync-check.sh` | hook שמריץ את הסקריפט הקיים | — | הפלט מופיע | הגדרות + מיזוג |
| B9★ | "המפה" ניתנת לפירוש כמסמך 37 | SS-3, ‏SS-6 | Roadmap | חוזים | `MASTER_STATE`, ‏`AGENTS.md` | נוסח | החלטת ZURIEL | assert ב־G1 (ביקורת, אחרי הנוסח) | מוצר + מיזוג |
| B10 | ל־Roadmap אין שושלת מקורות | SS-4 | Roadmap | חוזים | Roadmap | שורת Lineage | — | — | מיזוג |
| B11 | ‏G1 לא נסגר: אין replay אמיתי | CI-3 | v18 | ZURIEL | — | replay | — | רשומה ביומן | מוצר |
| B12 | שער Legacy-retired | CI-4 | השער | ביקורת | `scripts/test-legacy-retired.mjs` | assert אחד | — | — | אישור נפרד לשינוי השער |
| B13 | מנוע גימטריה כפול | DG-5 | ‏`gematria_engine_law` v2 | ביקורת | wiring test | רשימה סגורה | — | — | מיזוג |
| B14 | ‏trackers ו־sitemap בלי בעלים יחיד; `update-sitemap.yml` | DG-6 | TI v11 · D1 | ביקורת | wiring test; workflow | רשימה סגורה; החלטה | ZURIEL | — | מיזוג + מוצר |

### C. מדידה — תיקון הקיים, בתוך העבודה הקיימת

**הבעלים:** `traffic_intelligence_law` v11.

**סדר הטיפול — פרטיות המדידה קודם:**
1. **C1**, נתיבים לא מוכרים.
2. אחריו **C2a**, בדיקת Meta Pixel.
3. ובנפרד **C2b**, בדיקת CAPI. לכל אחד יש מבחן משלו והחלטה משלו.
4. ‏C3 (P0) ו־C4 ממתינים להחלטה. גם הם נשענים על הנרמול של C1.

**חפיפה:** ‏`public-reading-deploy/transport.js` משותף ל־C2b, ל־CL-14 ול־#1321. לכן C2b מגיע **אחרי A6**, והכותב היחיד הוא הביקורת.

| # | ממצא | מקור / ראיה | בעלים חוזי | כותב | אובייקטים | תיקון | תלות | מבחן קבלה | שער |
|---|---|---|---|---|---|---|---|---|---|
| **C1** | נתיב בעל קטע אחד שאינו מוכר יוצא גולמי, כולל 404 | GA4-03 (‏`site_visits`: 38 נתיבים) | TI v11 | ביקורת | `readingTelemetryPath` (בעלים יחיד לנרמול) | קטע לא מוכר → `/:not-found` | — | מבחן יחידה, ובדיקת worker שלא יוצא שום נתיב גולמי לא מוכר | מיזוג → פריסה |
| **C2a** | ‏**Meta Pixel** קורא בעצמו את הכתובת המלאה של הדף, כולל `/number/<ביטוי>` ו־query. ניווט SPA שולח PageView נוסף | F04, ‏GA4-08 (bundle חי); `src/lib/marketing.js:41-47` | TI v11; פרטיות (C9) | ביקורת | `src/lib/marketing.js` | **קודם בדיקה:** לכידת `facebook.com/tr` בדפדפן, על נתיבי מספר, ביטוי ו־query. אחר כך, לפי החלטה: `disablePushState`, ואי־טעינה בנתיבים רגישים או נרמול. ל־Pixel אין דרך נתמכת להחליף את הכתובת שהוא קורא | C1; החלטת ZURIEL (מוצר ומשפט) | בדיקת דפדפן: אין ביטוי ואין query בבקשות `tr` | מוצר → מיזוג → פריסה |
| **C2b** | ‏**CAPI** מקבל `event_source_url = location.href` מלא. ה־relay מקבל כל מחרוזת עד 2,048 תווים, ופונקציית ה־Edge מעבירה אותה הלאה | `src/lib/marketing.js:117`; `public-reading-deploy/transport.js:384-388`; `supabase/functions/meta-capi/index.ts:43,64` | כמו C2a | ביקורת | שלושת הקבצים | הלקוח שולח origin + `readingTelemetryPath`. ה־relay ופונקציית ה־Edge דוחים כל ערך אחר | C1; **אחרי A6** (‏`transport.js`); החלטת ZURIEL, נפרדת מ־C2a | מבחן relay, מבחן Edge, ולכידת הבקשה | מוצר → מיזוג → פריסת האתר + פריסת Edge |
| C3 | ‏**P0 מדידה:** המדד הקנוני של TI v11 כמעט עיוור מאז 4.11 | F02, ‏LIVE-13. ‏events מסוג view/page ירדו מ־600–1,582 ביום ל־2–58; ‏sessions ירדו מ־183–493 ל־1–20 | TI v11 | ביקורת | בנייה ציבורית (`publicReadingTelemetry2029.js`, worker) | אחת משתיים, לפי החלטה: page/view עם session דרך משפחת ה־worker הקיימת, **או** הגדרת `site_visits` כקנוני (תוספת TI v12) | החלטת ZURIEL; תוספת ב־TI (חוזים); ‏M0-F; ‏C1 | שאילתות LIVE-13 אחרי שחרור: page/view וסשנים חוזרים | מוצר → מיזוג → פריסה |
| C4 | סנכרון GA4 לשרת מת: ה־cron חסר, והמיגרציות לא ב־ledger | GA4-11, ‏LIVE-12 (שורת `ga` אחרונה: 2026-09-06) | TI v11 (‏GA4_MEASURED) | ביקורת | `cron.job`, ‏`traffic_history`, ‏`ga-sync-server` | הצעת DB לשחזור ה־cron וליישור ה־ledger | — | שורת `ga` יומית חוזרת | DB |
| C5 | סיכון לא מאומת: ‏GA4 עשוי לשלוח page_view בניווט SPA לנתיבים שלא נמדדים | GA4-07 | TI v11 | ZURIEL | ‏GA4 Admin, ‏Enhanced measurement | כיבוי "Page changes based on browser history", ובדיקה ב־DebugView | — | ‏DebugView: ‏/ ← ‏/number/<ביטוי> ← ‏/login | Google |
| C6 | ‏Vercel Web Analytics מת מאז 25.10 | LIVE-15 | TI v11 | ZURIEL | פרויקט Vercel | הוצאה מכל KPI, או החלטה להפעיל מחדש | — | — | מוצר |
| C7 | ‏M0-F מפצל מקורות (content/view מול page_views) בלי רישום ב־TI | F13 | TI v11 | חוזים | תוספת TI | רשימת משטחים ציבוריים אנונימיים וצורות ה־props | לפני שחרור M0-F, או יחד איתו | הנוסח מאושר | מוצר |
| C8 | חוקי TI שכתובים אבל לא חיים: Journey Pulse, ‏GA4_MEASURED, ‏`searches` | F07 | TI v11 | חוזים | metadata של TI | סימון NON-OBSERVING ועדכון `implementation_state` | — | — | DB (חוק) |
| C9 | לפרטיות האנליטיקס אין בעלים | F05 | ‏`person_foundation_contract_law` v6 או TI v11 | חוזים | סעיף בבעלים קיים + הפניה באינדקס | ‏EXTEND_EXISTING: מה יוצא ל־GA4, ל־Meta ול־AdSense; שמירה 120 יום; consent; ייצוא ומחיקה | החלטת ZURIEL איזה בעלים | — | מוצר + DB |

### X. הרחבת אנליטיקס — מוצגת בנפרד, לא חלק מהסגירה, ורק אחרי C9

כל אחת דורשת החלטת ZURIEL.

| # | מטרת המדידה | נתונים שייאספו | מה **לא** נאסף | הרשאות וכלים | בעלים / כותב | שער |
|---|---|---|---|---|---|---|
| X1 | לראות אילו דפים ומחקרים ציבוריים ספציפיים נצפים (GA4-12) | נתיב אמיתי **רק** למזהים ציבוריים (slug של פוסט שפורסם, topic, video, book; מספר או ביטוי רק אם `is_number_indexable` / `is_phrase_indexable`); ‏page_title מה־SEO רק לדפי `index,follow`; ‏content_group = תבנית | חשבון, query, ביטוי אישי, דפים פרטיים או מנהל | ה־property הקיים, בלי כלי חדש. פונקציה אחות של `readingTelemetryPath` באותו קובץ | TI v11 / ביקורת | מוצר (אילו מזהים ציבוריים, כולל slug של כותב) → מיזוג → פריסה |
| X2 | ייחוס מקורות הגעה (GA4-04, ‏MM-12, ‏GCF §7) | origin של referrer חיצוני בלבד; טוקני `utm_*` מרשימה סגורה | כתובת מלאה של referrer; ‏query | כמו X1 | TI v11 / ביקורת | מוצר |
| X3 | פעולות ב־GA4 (GA4-05) | אוצר מילים סגור מ־`readingActionSpec` של M0-F (טוקנים, בוליאנים, מספרים קטנים) | ביטויים וערכים | כמו X1 | TI v11 / ביקורת | מוצר |
| X4 | ‏Consent mode (GA4-14) | מצב הסכמה | — | ‏gtag | פרטיות (C9) / ZURIEL | מוצר (משפט) |

### D. SEO ומפת אתר

| # | ממצא | מקור / ראיה | בעלים חוזי | כותב | אובייקטים | תיקון | תלות | מבחן קבלה | שער |
|---|---|---|---|---|---|---|---|---|---|
| D1★ | אין שורת בעלים ל־SEO / ‏sitemap / אינדוקס | F01, ‏SS-7 | ‏`experience_governance_foundation_v1_law` v10 §§6/9/11 (EXTEND_EXISTING) | חוזים | `SOD1820_MASTER_OWNER_INDEX.md` §L | שורה אחת שמפנה לבעלים הקיים ולמתאמי הקוד | החלטת ZURIEL | ‏S5 (הוכחה) עובר | מוצר + מיזוג |
| D2★ | לא ידוע אם Google רואה תוכן: הגוף מגיע רק דרך SPA שתלוי ב־SW | SEO-01, ‏LIVE-05 (22 נתיבים: shell בלבד) | D1 | ZURIEL | — | **קודם אימות:** ‏GSC URL Inspection על כ־10 כתובות | — | צילום ו־HTML מרונדר עם תוכן | Google |
| D3 | אינדוקס אמיתי לא נמדד (DEF-006) | SEO-05 (‏gsc_metrics = searchAnalytics) | D1 | ZURIEL | ‏GSC | ייצוא דוחות Pages ו־Sitemaps | — | — | Google |
| D4 | ‏1,177 פוסטים: canonical עם `/` בסוף, ו־308 | SEO-02 | D1 | ביקורת | `api/og.js` ‏`publicPostUrl` | canonical בלי `/` בסוף + מבחן | — | ‏canonical == loc == 200 | מיזוג → פריסה |
| D5 | ‏9 locs שלא נגישים (8 תגיות, DEF-013) | SITEMAP-01, ‏-02 | D1 | ביקורת | `api/sitemap.js`, ‏`og.js` | מסנן כתובות; כלל כתובת אחד לכותב | — | כל loc → 200 | מיזוג → פריסה |
| D6 | ‏`/2029`, ‏`/2029/posts` ושאר ה־aliases עונים 200, ו־shell מקשר אליהם | F08, ‏SEO-07, ‏MM-04, ‏LIVE-06 | D1 + החלטת 11.11 | ביקורת | `middleware-core.js`, shell, ‏`HomeComposition2029` | 308 או קישורים קנוניים | החלטת ZURIEL (b) | אין `/2029` בקישורים פנימיים | מוצר → מיזוג → פריסה |
| D7 | ‏`/api/card` חסום ב־robots, אבל משמש og:image ו־thumbnail | SEO-03 | D1 | ביקורת | `public-robots.js` | ‏`Allow: /api/card` או נתיב אחר | החלטה | — | מוצר → פריסה |
| D8 | ‏7 קובצי html סטטיים, 200 בלי canonical | SEO-04 (חופף לפריט 15 של סשן החוזים) | CLAUDE.md כלל 1 | חוזים | `public/*.html` | החלטה: הסרה מה־artifact, או noindex | פריט 15 | — | מוצר |
| D9 | ‏sitemap אחד של 16,780 כתובות, 14 שניות בקר, 75% ביטויים | SITEMAP-03/04, ‏LIVE-04 | D1 | ביקורת | `api/sitemap.js` | sitemap index לפי סוג; ‏s-maxage; סף קבלה לביטויים | החלטה על הסף | כל child פחות מ־50k; ‏TTFB חם | מוצר → פריסה |
| D10 | ‏43 דפים מובילים ב־GSC חסרים ב־sitemap | LIVE-10 | D1 | ביקורת | `api/sitemap.js` | הכללה, או 301 לקנוני | D9 | — | מיזוג → פריסה |
| D11 | ‏14 נתיבים סגורים עונים 503 עם `index,follow` | SEO-10 | D1 · ‏`site_flags_lock_law` v3 | ZURIEL | — | תאריך פתיחה, או 200 noindex | — | — | מוצר |
| D12 | ‏JSON-LD חסר במספרים, בכותבים ובספרים | SEO-09 | D1 | ביקורת | `api/og.js` | הקרנות קיימות (DefinedTerm, ‏ProfilePage) | — | מבחן og | מיזוג → פריסה |
| D13 | חלק ממבחני ה־SEO בודקים קונפיגורציה שלא מוגשת | TEST-01 | D1 | ביקורת | `scripts/test-2029-server-seo-ai-parity.mjs` ועוד | כיוון ל־public-document ו־og בפרודקשן; חיבור שני המבחנים היתומים | — | המבחן נכשל על שינוי בפרודקשן | מיזוג |
| D14 | שתי כתובות לכותב: `/community/researcher` ו־`/researcher` | MM-06 | D1 | חוזים | — | החלטה על הכתובת הקנונית | — | — | מוצר |
| D15 | אין עמודי תנאים והצהרת נגישות (404) | LIVE-07, ‏MM-17 | פרטיות / Experience | ZURIEL | — | החלטה (ייתכן שמשפטית) | — | — | מוצר |

### E. נראות לפני כניסה

הקורא `visibility` נעצר. השורות כאן נבדקו בקריאה ישירה שלי.

| # | ממצא | מקור / ראיה | בעלים חוזי | כותב | אובייקטים | תיקון | תלות | מבחן קבלה | שער |
|---|---|---|---|---|---|---|---|---|---|
| E1 | מועמדים ציבוריים מוסתרים ב־`main`: Design V2 §8.1 אוסר | F09 | Design V2 · ‏`truth_axes_foundation_law` v3 | ביקורת | חבילת M0 (אשכול D) | שחרור M0 (‏A6, ‏A7) | A6 | "טרם אומת" בעולם ובדף ממצא | מיזוג → פריסה → DB |
| E2 | דף התורם מציג רק ממצאים קנוניים שקודמו לעץ | `contributorFindingsProjection.js` (‏SOURCE_LIBRARY) | Design V2 | ZURIEL | — | החלטה R1 (`round5` §8) | — | — | מוצר |
| E3 | ‏`lock_galleries` ו־`lock_research` דולקים במצב anon, אבל **אין להם צרכן בקוד 2029** | ‏`site_flags` (קריאה בלבד); ‏`git grep` ב־`aa0f6bc82` | ‏`site_flags_lock_law` v3 | חוזים | שורות `site_flags` | החלטה: לפרוש את השורות (בלי השפעה חיה) או להשאיר כהיסטוריה | — | — | DB |
| E4 | תכונות סגורות (היכל, רזיאל, פורום, הצלבות, עץ התכנסויות ועוד) מוצגות כ"בבנייה" אמיתי, לא כהסתרה | MM-03; ‏`site_flags` | ‏`site_flags_lock_law` v3 | — | — | אין שינוי (החלטות מוצר קיימות) | — | — | — |
| E5 | **לא נבדק:** רינדור לאורח, נתיב אחר נתיב, בחי | הקורא נעצר; ‏HTML חסום ל־curl | — | ביקורת | — | בדיקת דפדפן מאושרת, או ZURIEL | D2 | — | קריאה |

### F. מיפוי חוזי — הכותב הוא סשן החוזים

אין שינוי מכאן. השורות מועברות לכותב שלהן.

| # | ממצא | מקור | מה נדרש | מבחן קבלה |
|---|---|---|---|---|
| F1 | ‏18 קבצים דמויי־חוזה לא מנותבים | ה־baseline ‏`audits/g1-agent-entry/G1_CONTRACT_FILES_BASELINE_20261112.txt` (מחליף את `enforcement-proof/baseline.json`) | לכל קובץ: ניתוב, `OWNER-ROUTING`, או סימון היסטורי. אין מחיקה | ה־baseline מצטמצם, והבדיקה "REAL base vs head" עוברת |
| F2 | הפניות ישנות: גרסאות ישנות, קבצים שהוסרו, באנרים | F11, ‏MM-19, ‏SS-5 | באנרי supersession בלי מחיקה; ‏OI:36 | ‏G1 עובר |
| F3 | רישום ההחלטה שהפעילה אינדוקס ב־4.11 | F12 | רשומה מתוארכת | — |
| F4 | סתירות נתיב: מסמך 37 מול תוכנית־האב (`/2029`, ‏`/posts`, ‏`/researcher`, גלריה) | MM-04/05/06/11 | דיווח ל־ZURIEL. החלטה מאוחרת גוברת | — |
| F5 | היתרה הפתוחה של סשן החוזים (19 פריטים) | `HANDOFF-20261111.md` §7 | אצל הכותב שלהם. ההשפעה על M0 ב־`round5` §7.4 | — |
| CL-01, ‏CL-02, ‏CL-04, ‏CL-05, ‏CL-09, ‏CL-10, ‏CL-18 | אצל סשן החוזים, לפי README §9 שלהם | README §9 | אין השפעה על M0 | — |
| CL-03 | הקרנת קבוצה לצ'אט v2 מעתיקה גוף הודעה, מול `writer_material_home_law` v6 §23 | README §9 | החלטת ZURIEL. חוסם רק את ההחלה של v2 | — |

### G. שורות CL שבהן הכותב הוא הביקורת — חפיפות בקוד

| CL | פריט | חפיפה עם #1321 | כותב | מתי | מבחן קבלה | שער |
|---|---|---|---|---|---|---|
| CL-06 | צרכני DB של מזהים שפרשו (`fn_metatron_status`, ‏`fn_number_dossier`, ‏`admin_candidate_from_researcher`, ‏`fn_generate_convergence_candidates`, ‏`fn_rls_grant_audit`) | `fn_rls_grant_audit` נמצאת בצעד 2 של M0 (‏DEF-005, ‏revoke). **לא בגוף הפונקציה** | ביקורת | אחרי A2 | ‏md5 לפני ואחרי לכל פונקציה | DB |
| CL-07 | תווית `unified_graph_law` ב־`researchW2ExecutorsBase.js` | אין | ביקורת | כלשהו | מבחן | מיזוג |
| CL-08 | שני `extends_rule` לחוקים שפרשו | אין | ביקורת | — | — | DB |
| CL-11 | פרסונת רזיאל מצטטת שלושה חוקים שפרשו; `addon_wa` ריק | ‏`wa-raziel` / ‏`ai-analyze` הם קבצים ב־M0 | ביקורת | **אחרי** A4 | — | DB / Edge |
| CL-12 | מחרוזות `owner_ref` ישנות ב־`ai-analyze`, ‏`research-run`, ‏`materialGate.js`, ‏`razielRouteGrammar.js` | **כן:** ‏`ai-analyze` ו־`research-run` בשלב Edge של M0. `materialGate.js` משותף לכמה פונקציות | ביקורת | **אחרי** A4 (כותב אחד; לא בתוך M0) | grep אחרי הפריסה | Edge |
| CL-14 | ‏RPC של staff-chip חסום לאורח ב־`public-reading-deploy/transport.js` | **כן:** אותו קובץ ב־#1321 | ביקורת | **אחרי** A6. תיקון קטן נפרד, או בתוך #1321 אם יוחלט | ‏worker: ‏`community_staff_user_ids_v1` עובר לאורח | מוצר ← מיזוג ← פריסה |
| CL-15 | בדיקות אכיפה ב־CI | **כן:** ‏`scripts/test-g1-agent-routing-smoke.mjs` ו־`scripts/lib/g1LawsSnapshotRules.mjs` | **ביקורת (יחיד)** | עכשיו (B1–B3) | ‏§3 | מיזוג |
| CL-16 | פערי שער המסד: DELETE, ‏TRUNCATE, ‏description, קיום הבעלים | אין | ביקורת | B4 | D12, ‏D13, ‏D14, ‏D15 | DB / DDL |
| CL-17 | `live-contracts-2029.yml` | **כן:** ‏#1321 משנה אותו (fetch ‏M0, ושלב בסיס של G1). לפי סשן החוזים, ארבעה ענפים פעילים נוגעים בו | ביקורת | מיזוג מסודר | ‏`ci-workflow-references-exist` | מיזוג |

**תיאום כותב יחיד:**
- הענף `claude/laws-alignment-20261112` מכיל עותק משלו של `scripts/test-g1-agent-routing-smoke.mjs` ושל `scripts/lib/g1LawsSnapshotRules.mjs`, בקומיטים `649ad4875` ו־`87d77ade1`.
- **אין למזג את העותק הזה בנפרד.** הקוד ממוזג רק דרך #1321.
- קובצי `audits/` שלהם זהים בבתים לאלה שנכנסו כאן (אותו blob), ולכן אין בהם התנגשות.
- המסמכים שלהם (README, ‏HANDOFF, ‏ledger) נשארים אצלם.

### H. ‏CL-13 — מטריצת הרשאה והסכמה, **לפני** החלטה על שינוי `wa-raziel` (חוסם את A4b)

**העובדות בקוד** (`supabase/functions/wa-raziel/index.ts` ב־#1321; ההתנהגות זהה לגרסה הפרוסה v21, לפי שער הסטייה 9/9. ממצא הכתיבה אומת על ידי Codex):
- **`handleAllDMs`** (שורות 922–941): לכל הודעה ישירה ב־3 השעות האחרונות, ממספר שאינו של המערכת, נקראות:
  - `savePersonalData` ← `fn_raziel_fact`: תאריכים וימי הולדת לפרופיל, `visibility: private`;
  - `remember` ← `fn_raziel_remember`: השיחה, עד 3,000 תווים, ‏`scope: personal`, ‏`visibility: private`.
- **המזהה:** חשבון מקושר, ואם אין — **`wa:<phone>`**. כלומר, גם שולח שאינו מקושר נשמר לפי מספר הטלפון.
- **בקבוצה** (שורה 796): ‏`remember` נקרא רק לשולח מקושר.
- **‏M0 לא משנה את המסלולים האלה.** ה־diff של M0 ב־`wa-raziel` הוא העברת מזהים ל־env בלבד.

| מחלקת שולח | חיבור חשבון | הרשאת שמירה | הסכמה | נראות פרטית (מי קורא) | היום (קוד) | צפוי (בעלים) | מבחן קבלה |
|---|---|---|---|---|---|---|---|
| ‏DM, חשבון מקושר | כן | ? | ? | ‏`fn_raziel_context` לפי `user_ref` | זיכרון ופרופיל נשמרים | **ZURIEL** | ‏handler אמיתי: כתיבה כן או לא לפי הצפוי |
| ‏DM, לא מקושר | לא (`wa:<phone>`) | ? | ? | לפי `wa:<phone>` | זיכרון ופרופיל נשמרים | **ZURIEL** | כמו למעלה; ‏PII בטלפון |
| ‏DM, מספר של המערכת | — | — | — | — | מדולג | — | — |
| קבוצה, מקושר | כן | ? | ? | כמו DM | זיכרון נשמר | **ZURIEL** | — |
| קבוצה, לא מקושר | לא | — | — | — | לא נשמר | — | — |

- **המטריצה מתמלאת בערכים צפויים שנגזרים מהבעלים.** החוזים מציינים את הבעלים; ZURIEL מכריע. אחר כך כותבים מבחנים על ה־handler האמיתי.
- **רק אחרי שהמבחנים עוברים** מחליטים על פריסת `wa-raziel`.
- שמונה הפונקציות האחרות של M0 **לא** תלויות בזה.

### I. דרישות עתידיות — נשמרות ומתועדפות, לא חוסמות

1. מדידת מסע (גילוי ← חקירה ← מקורות ← שמירה ← חזרה; MM-13). אחרי C3 ו־X3.
2. ממצאים כדפי נחיתה בחיפוש, עם כתובת ומשפחת sitemap משלהם (SEO-08).
3. ‏RSS או JSON Feed, ‏IndexNow, תמונות גדולות ל־Discover, ומדיניות סורקים לפי מטרה (MM-16).
4. ‏snapshot של גל SEO אחרי המעבר (LIVE-19); תצוגה ציבורית של גודל קהל (TI: נדחה).
5. הפניה ברמת דומיין מ־www ל־apex (SEO-13); ‏AdsBot ו־Storebot, אם יידרשו (SEO-12).
6. ניסיון AI לאורח, מנויים והרחבות: **מחוץ לסבב.**

## 2. סדר החלה — בלי תלות מעגלית

**תיקון:** בגרסה הקודמת B4 הופיע לפני M0, אבל הוגדר "אחרי A2". זה מעגל. עכשיו B4 **אחרי** SQL של M0, **ואינו תנאי לשום חלק ב־M0**.

| מסלול | צעדים (כל אחד באישור נפרד) | תלוי ב־ | אף אחד ב־M0 לא תלוי בו? |
|---|---|---|---|
| **M — M0** | A1 ← A2 (SQL 1–10) ← A3 ← A4a (שמונה Edge) ← A5 ← A6 (מיזוג ופריסה) ← A7 (SQL 11) ← A8 | — | — |
| **M′ — ‏wa-raziel** | מטריצת CL-13 ← החלטה ← A4b | A2, ‏A3 | כן: A4a, ‏A6 ו־A7 לא תלויים בו |
| **G — אכיפה ב־CI** | B1–B3 ממוזגים עם #1321 (או ב־PR נפרד, אם יוחלט) ← B6 required checks | — | כן |
| **G′ — אכיפה במסד** | **אחרי A2:** הצעת SQL ו־rollback ל־B4 ← אישור DDL ← החלה | A2 | כן |
| **P — פרטיות מדידה** | C1 ← C2a (Pixel: בדיקה ← החלטה) ← C2b (CAPI: בדיקה ← החלטה). ‏C3 אחרי C1 ולפי החלטה. ‏C4 עצמאי | C2b אחרי A6 (`transport.js` משותף). השאר בלי תלות ב־M0 | כן |
| **X — הרחבה** | ‏C9 ← X1–X4 | C9 | כן |

**שחזור (בסדר הפוך):**
- ‏M0: לפי `apply-plan.json`.
- ‏G: revert של קומיט.
- ‏G′: ‏`CREATE OR REPLACE` לגוף החי (md5 ‏`56b90b0a…`), והחזרת רשימת העמודות של ה־trigger. ה־ROLLBACK יוכן עם ההצעה.
- ‏B6: הסרה ב־ruleset.

## 3. האכיפה — הפתרון המאוחד (B1–B4)

**בסיס הקוד:** של סשן החוזים, ב־`0a5882774`. **יובא ללא שינוי**, והחותמות תואמות לרשומת היומן:

| קובץ | sha256 |
|---|---|
| `scripts/lib/g1LawsSnapshotRules.mjs` | `e813c422…` |
| `scripts/test-g1-agent-routing-smoke.mjs` | `fdeb88ed…` |
| `G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt` | `a545a6b6…` |
| `G1_MIGRATION_TABLES_BASELINE_20261112.txt` | `513bd89a…` |

**ההרחבה**, באותם קבצים, בלי מנגנון חדש:
- בעלים שהשתנה באותה גרסה;
- הפעלה מחדש של חוק שפרש;
- רשומת אישורים (`G1_LAW_APPROVALS.txt`);
- קובצי חוזה וה־baseline שלהם (רק מצטמצם);
- בעלים באינדקס (שפרש או שאינו קיים; כל צורת טבלה, גם בלי רווחים);
- שינוי חוזה רשום רק עם רשומה **חדשה**;
- תחביר מבנים: הערות, ‏UNLOGGED, ‏PARTITION OF, ‏AS, ‏MV, ‏RENAME, ‏EXECUTE;
- **קובצי ה־SQL של חבילות ההחלה** (`docs/reviews/*/apply-plan.json`): 23 קבצים;
- **בסיס מול ראש אמיתיים.**

**תוצאות:**
- 37/37 מקומית.
- **18 תרחישי CI ו־24 מקרי מסד כמצופה.** המריצים נכשלים על כל תוצאה לא צפויה.
- הפירוט, וטבלת "מה טכני ומה שער אנושי": `enforcement-proof/README.md`.

## 4. מסירה לביקורת Codex

- **מה לבדוק:**
  - הפתרון המאוחד: אין כפילות מול הענף של סשן החוזים (§1.G, תיאום כותב יחיד).
  - שלב הבסיס ב־CI: שהבדיקה נכשלת בלי `G1_BASE_SHA`.
  - שני המריצים, כולל הבדיקה העצמית שלהם.
  - שההיתר ב־D13d (בעלים שהוא קובץ) מכוסה על ידי ה־CI.
  - מטריצת CL-13 ושורות A4a/A4b.
  - ושסדר ההחלה בטבלה אכן בלי מעגל.
- **מה לא נבדק:**
  - השער המוצע מול המסד החי.
  - כפילות סמנטית.
  - שינוי ישיר במסד שלא עובר ב־Git.
  - הערכים הצפויים של CL-13: בידי הבעלים.
  - ‏GA4 ו־GSC.

## 5. מסירה לסשן הבא (12.11.2026, ערב): נעצר בנקודה בטוחה

**הוראת ZURIEL:** העבודה עוברת לסשן Claude חדש, בתיאום וביקורת של Codex. לא נפתח סבב תיקונים נוסף. אין כאן אישור למיזוג, לפריסה, להחלת SQL, לשינוי הרשאות או למחיקה. סעיפים 1–4 למעלה מתארים את מצב `c45dd3740`. השינויים מאז מרוכזים כאן.

### 5.1 מצב Git

| פריט | ערך |
|---|---|
| ענף / PR | `claude/sod1820-system-audit-roadmap-3793us` · ‏#1321 (טיוטה, לא למיזוג) |
| בסיס | `origin/main` = Production = `aa0f6bc82b8c94286374b1f51208037502994eab` (0 מאחור) |
| הראש האחרון שנבדק | `c45dd3740e4db5c5a6d83d4c15728e95078e1ff7`. ‏CI ירוק (15/15) וביקורת Codex |
| קומיט המסירה | ההורה: `c45dd3740`. ה־SHA המלא נמצא ברשומת היומן ובדוח השיחה. ‏CI על הראש הזה: ראו שם |
| חומר מקומי בלבד (לא נדחף) | (1) ענף `claude/guest-ai-trial-20261112` @ `f9bb91a68` (בסיס `a41b149d8`, ניסיון AI לאורח). דחיפה דורשת אישור; בלעדיה הוא יאבד עם המכולה. (2) worktree ‏`wt-live` בתיקיית ה־scratchpad (‏`aa0f6bc82` במצב detached, עם התוצר המקומי). (3) `gtag.js`, ‏`fbevents.js` ותצורת הפיקסל שהורדו: קוד צד שלישי, לא נשמר במאגר. (4) הפלט הגולמי של קוראי `wf_48e2be42-1d4` (‏`audit/*.json`): המסקנות כבר ברשימה הזו. (2) ו־(3) נוצרים מחדש לפי `measurement-audit/README.md` |

### 5.2 ארבע קבוצות הממצאים של Codex (סבב 2, על `c45dd3740`)

| קבוצה | מצב | מה מומש / נבדק | מה פתוח |
|---|---|---|---|
| **1. ‏G1** | **IMPLEMENTED, BRANCH-ONLY** | **מומש:** <br>• התצלום החדש ביותר הוא המצב הנוכחי (fixtures נשענים על התצלום המתוארך 12.11); תצלום חדש נבדק גם מול הקודם וגם לעצמו. <br>• `project_codex.<slug>` נבדק מול רשומה מתוארכת `G1_PROJECT_CODEX_SLUGS_20261112.txt` (35, קריאה בלבד). פריט חדש צריך `C|slug|work_log:<uuid>|date`. <br>• `GENUINELY_NEW_DOMAIN` ו־`SUPERSEDE_EXISTING` אינם אישור, וצריכים `APPROVAL:work_log:<uuid>`. <br>• ניתוב עצמי של מסמך חדש מזוהה (האינדקס נקרא כפי שהיה בבסיס). <br>• "Legacy" בתווית אינו היסטוריה; רק סטטוס מפורש בתא הבעלים. <br>• lexer ‏SQL מבחין מחרוזת מהערה; מקרה הרגרסיה `SELECT '--'; CREATE TABLE public.g1_probe` מכוסה. <br>• טבלה חדשה: קיום בעלים והיתר מאגר הן בדיקות נפרדות. <br>**נבדק:** <br>• smoke ‏44/44, מקומית ובמצב CI מול בסיס אמיתי. <br>• החבילה הקשורה 139/139. <br>• `run-ci-scenarios.sh` ‏34/34 כמצופה (‏S0–S15 ו־R1–R9). רץ לפני קובצי CL-16, ולא רץ שוב על הראש הסופי | • **אישור סשן החוזים לכלל היתר המאגר.** המימוש הנוכחי: Intake v13 §10 (סיווג) ועוד `APPROVAL:work_log:<uuid>`. <br>• שתי fixtures של סשן החוזים (ok1/ok2) מסורבות עכשיו, וזה מתועד במבחן. <br>• ‏CI של GitHub על הראש הזה |
| **2. שער המסד (CL-16)** | **PROPOSAL. לא הוחל** | **הקבצים:** ‏`supabase/proposed/20261112200000_g1_rule_guard_cl16.sql`, ‏`ROLLBACK_…`, ‏`docs/reviews/g1-rule-guard-cl16-20261112/apply-plan.json` (מסלול G′, אחרי SQL של M0). <br>**החי, בקריאה בלבד:** md5 ‏`56b90b0a…`, טקסט ה־trigger, PG 17.6, בעלים postgres. <br>**AFTER:** md5 ‏`8a75cb63…`. <br>**נבדק מקומית:** <br>• מחזור חיים (`scripts/run-g1-rule-guard-sql-test.sh`): חסר ⇒ עצירה, סטייה ⇒ עצירה בשני הקבצים, החלה מדויקת, no-op חוזר, rollback מדויק, החלה מחדש. <br>• מטריצה של 40 מקרים × 2 (חי מול מוחל), עם **סיבת סירוב** צפויה; בדיקה עצמית מחזירה exit 1. <br>• אף קובץ M0 לא נוגע ב־`nodes` או בשער (23 קבצים) | • שני השלבים חוברו ל־`security-sql-contracts`, ועדיין **לא רצו ב־GitHub**. <br>• אחרי החלה, חותמות `rule_guard` נשארות גם אחרי rollback; זה מתועד. <br>• החלה חיה: אחרי M0, באישור נפרד |
| **3. מדידה** | **ביקורת חלקית. אין תיקון** | לכידה מקומית של תוצר `aa0f6bc82` עם הגדרות ה־GA החיות: ממצאים M1–M11 ב־`measurement-audit/README.md` (בהם page_view כפול עם URL אמיתי, `search_term` גולמי, ו־CAPI עם URL מלא) | • דוחות GA4 ו־GSC (אין גישה; רשימת הייצוא ב־5.5). <br>• שידור הפיקסל לא דטרמיניסטי. <br>• דף הבית עם נתונים אמיתיים. <br>• הסיבה לכפילות `track_visit` |
| **4. רציפות כתובות** | **התחיל בלבד** | • נמצא המלאי הקיים מ־3.11: ‏`docs/reviews/url-continuity-plan-20261103/` (33,667 מחרוזות, 36 שורות מעבר, 376 לא מסווגות) ו־`public-url-exceptions-20261103/residual205/`. <br>• **195 הכשלים** (193 אודיו ושני פוסטים) **נדחו בידי ZURIEL** ברשומה `776d2d04-19ec-43f2-aee2-f85e06a5894f` (3.11, ‏`DEFERRED_AFTER_LAUNCH_BY_ZURIEL_NO_ACTIVE_WRITER`); מצבם הנוכחי לא נבדק. <br>• ‏GSC במסד: 17.6–10.11.2026, ‏15,563 דפים, 21,795 קליקים, 379,398 חשיפות; המלאי של 3.11 לא קרא GSC. <br>• חי: ‏robots ו־sitemap ‏200, ‏HTML ‏403 ל־curl (לא נעקף). <br>• ה־middleware בלי הפניות: slug חסר ⇒ 404 ‏noindex | כל העבודה לכל כתובת: ‏GSC מול המלאי, יעד ושרשרת, canonical, אינדוקס, מדיה וקישורים, מפות ישנות מול חדשות, פורום, מעבר מהשורש ל־`/post/` |

**סעיף 3 בהוראה (חלוקת אחריות):**
- **מטריצת CL-13 לא התקבלה עדיין** מסשן החוזים. הבקשה רשומה ביומן; הפירוק הטכני ב־5.3.
- **Required checks:** הצעה ב־5.4. ה־ruleset לא שונה.

### 5.3 ‏CL-13: פירוק טכני לפי מסלול כתיבה (קוד #1321, זהה לפרוס)

| כתיבה | DM מקושר | DM לא מקושר | קבוצה, מקושר | קבוצה, לא מקושר |
|---|---|---|---|---|
| `remember` ← `fn_raziel_remember`: ‏conversation, עד 3,000 תווים, ‏scope personal, ‏private (`wa-raziel/index.ts:249–251`) | כל הודעה של 2 תווים ומעלה, ב־3 השעות האחרונות (`handleAllDMs`, ‏922–940) | אותו דבר, תחת `wa:<phone>` (938) | טקסט שאינו תמונה (796) | לא נכתב |
| `savePersonalData` ← `fn_raziel_fact`: תאריכים וימי הולדת, ‏private (197–215) | כשנמצאת עובדה (939) | אותו דבר, תחת `wa:<phone>` | לא נקרא | לא נקרא |
| בדיקת הסכמה או הרשאת שמירה לפני הכתיבה | אין | אין | אין | — |

- **ממלא הערכים הצפויים:** סשן החוזים, לכל כתיבה בנפרד, לפי `raziel_whatsapp_access_adapter_law` (פריטים 3 ו־5) ו־`raziel_group_privacy_law`. הערכים: זהות, הרשאת שמירה, הסכמה ונראות.
- **ZURIEL** רק בבחירה מוצרית שאין לה הכרעה קיימת.
- **A4b** (‏`wa-raziel`) נשאר חסום.

### 5.4 הצעת Required checks (‏B6). לא בוצעה

**המצב:** ה־ruleset ‏`protect-main` (id ‏19635630) נקרא ב־12.11 בידי קורא הממשל, ולא נקרא שוב:
- כללים: deletion, ‏non_fast_forward, ‏required_linear_history, ‏pull_request עם 0 אישורים;
- bypass ‏`always` ל־RepositoryRole 5 (admin);
- אין required_status_checks.

**ההצעה:** להוסיף `required_status_checks` (‏integration: GitHub Actions; ‏strict=false) עם הבדיקות שרצות **תמיד** ב־PR ל־main:
- `legacy-production-lock`;
- `live-contracts-2029`, ‏`security-sql-contracts`, ‏`release-contracts-2029`, ‏`perf-contracts-2029`, ‏`marketing-browser-2029`, ‏`auth-browser-acceptance-2029`;
- `route-seo-decision-2029`;
- `Mobile + Accessibility Acceptance`.

**מה לא לדרוש:**
- `Production Canary Gate`: תלוי במצב פריסת Production החי, ולכן החלטה.
- `gate` של Observability: השם מתנגש עם `gate` של media-release. צריך לשנות שם קודם.
- כל בדיקה עם סינון נתיבים (`hard-isolation`, ‏`public-core`, ‏`els-core-compatibility`, ‏`isolated-postgres17-auth-rls` ועוד). בדיקה נדרשת שלא רצה משאירה PR תקוע ב־"Expected — Waiting".

**עקיפת מנהל:** כל עוד היא `always`, מיזוג בזהות admin (כולל סוכן שפועל בחשבון של ZURIEL) עוקף הכול. האפשרויות:
- להשאיר כך;
- להסיר, עם נוהל חירום: השבתה זמנית של ה־ruleset, מתועדת.

**חזרה:** הסרת הכלל מ־`protect-main`. לשמור את ה־JSON של ה־ruleset לפני השינוי. הכול באישור ZURIEL (הגדרות אבטחה).

### 5.5 רשימת ייצוא קצרה ל־ZURIEL (‏GA4 ו־GSC)

- **GA4:**
  - Admin ← Data streams ← Enhanced measurement: צילום של ההגדרות.
  - Explore, ‏28 יום: ‏`page_location`, ‏`page_title`, ‏`event_name` (‏page_view, ‏view_search_results), ‏`session_source/medium`, ‏hostname.
  - DebugView: ניווט פוסט ← פוסט אחד.
- **GSC:**
  - דוח Pages (מאונדקס / לא מאונדקס, לפי סיבה) — ייצוא.
  - דוח Sitemaps.
  - URL Inspection על כ־10 כתובות: פוסט, מספר, תגית, slug ישן בשורש, ‏`/2029/posts`, קובץ אודיו, ‏www.

### 5.6 אישורים ופעולות פעילות

- **אושר בסבב:** רשומת יומן פסיבית **אחת**, ‏CLAUDE ← ZURIEL, בלי dispatch. מזהה הרשומה בדוח השיחה.
- **עדיין דורש אישור מפורש** (לכל פעולה ולקומיט מדויקים):
  - SQL של M0, צעדים 1–12;
  - פריסות Edge;
  - secrets;
  - מיזוג #1321 ופריסת האתר;
  - החלת CL-16;
  - שינוי ה־ruleset;
  - דחיפת ענף האורח;
  - שינויים ב־GA4;
  - שחרור כל תיקון מדידה.
- **פעיל:**
  - אין תהליך רקע;
  - אין מנוי ל־PR;
  - אין משימה מתוזמנת שהסשן הזה יצר. שלוש משימות מתוזמנות קיימות בחשבון קודמות לו ואינן חלק מהעבודה;
  - ה־worktree ‏`wt-live` רשום במאגר המקומי בלבד.

### 5.7 קישורים נעוצים

- **‏`c45dd3740` (הראש שנבדק):**
  - [רשימת הסגירה](https://github.com/zuriel337/sod1820/blob/c45dd3740e4db5c5a6d83d4c15728e95078e1ff7/docs/reviews/m0-security-stabilization-20261112/foundation-closure-list.md)
  - [הוכחת האכיפה](https://github.com/zuriel337/sod1820/blob/c45dd3740e4db5c5a6d83d4c15728e95078e1ff7/docs/reviews/m0-security-stabilization-20261112/enforcement-proof/README.md)
  - [חבילת ההחלה של M0](https://github.com/zuriel337/sod1820/blob/c45dd3740e4db5c5a6d83d4c15728e95078e1ff7/docs/reviews/m0-security-stabilization-20261112/apply-plan.json)
  - [סדר rollback ובקשת השחרור](https://github.com/zuriel337/sod1820/blob/c45dd3740e4db5c5a6d83d4c15728e95078e1ff7/docs/reviews/m0-security-stabilization-20261112/release-request.md)
- **מסירת סשן החוזים:** רשומה `a3d65374-a73a-4131-a00f-d3a050851064` · [README בראש `0a5882774`](https://github.com/zuriel337/sod1820/blob/0a5882774cf5dfbb37dd3162de27fb72c63f5457/docs/reviews/contract-governance-audit-20261110/laws-alignment-20261112/README.md)
- **מלאי הכתובות הקיים:** [`url-continuity-plan-20261103` ב־`aa0f6bc82`](https://github.com/zuriel337/sod1820/tree/aa0f6bc82b8c94286374b1f51208037502994eab/docs/reviews/url-continuity-plan-20261103)
- **קובצי הסבב** (בקומיט המסירה; הקישורים ב־SHA נמצאים ברשומת היומן):
  - `scripts/lib/g1LawsSnapshotRules.mjs`, ‏`scripts/test-g1-agent-routing-smoke.mjs`
  - `supabase/proposed/20261112200000_g1_rule_guard_cl16.sql` ו־`ROLLBACK_20261112200000_g1_rule_guard_cl16.sql`
  - `tests/sql/g1_rule_guard_cl16_v1.sql`, ‏`scripts/run-g1-rule-guard-sql-test.sh`
  - `measurement-audit/`

### 5.8 הצעד הבא המומלץ (לסשן החדש, אחרי ביקורת המסירה)

1. ‏CI על ראש המסירה.
2. ביקורת Codex על G1 סבב 2 ועל קובצי CL-16.
3. סשן החוזים: כלל היתר המאגר ומטריצת CL-13.
4. הכרעות מדידה: C1, ‏C2a, ‏C2b, ‏M1 ו־M2. הגדרות EM ב־GA4 הן בידי ZURIEL.
5. רציפות כתובות, לפי קבוצה 4 בטבלה.
