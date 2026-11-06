# SOD1820 — Full Product Defect Register

> **סטטוס:** תוצר אבחון (read-only) מ־2026-11-06. אין בו תיקון, מיזוג או פריסה.
> **SHA:** Production = `1f0863938062d85757e93043f568ec5eeb0d72f2` (`dpl_7Hn7Lv4mhAVth3zBY3JHKsp4sahh`, אומת דרך alias של שלושת הדומיינים ב־Vercel בשעה ~06:56Z). `origin/main` = אותו SHA בעת הכתיבה.
> **מסמך האם:** [SOD1820_FULL_PRODUCT_ACCEPTANCE.md](SOD1820_FULL_PRODUCT_ACCEPTANCE.md). ראיות גולמיות: [docs/audit-evidence/20261106/](audit-evidence/20261106/).
> **כלל:** ממצא שלא הוכח מסומן `UNKNOWN` / `לאימות`. שום סעיף לא נוסה בכתיבה לפרודקשן (ראו §"גבולות הבדיקה" במסמך האם).

חומרה: P0 אבטחה/חשיפת מידע/אובדן · P1 SEO קריטי, הרשאות, מערכת מרכזית · P2 UX/ביצועים/metadata חלקי · P3 ליטוש.

## סיכום

| חומרה | כמות | מזהים |
|---|---|---|
| P0 | 1 | DEF-001 |
| P1 | 5 | DEF-002, DEF-003, DEF-004, DEF-005, DEF-006 |
| P2 | 13 | DEF-007 … DEF-019 |
| P3 | 6 | DEF-020 … DEF-025 |

---

## P0

### DEF-001 — `public.resolve_visitor_email` חושפת אימייל של משתמש ל־anon
- **חומרה:** P0 (חשיפת מידע אישי)
- **ראיה:**
  - `pg_proc`: הפונקציה `SECURITY DEFINER`, `search_path=public`, ללא בדיקת `auth.uid()` או admin. גוף הפונקציה: `select coalesce((select u.email from public.users u where p_uid ~ '^[0-9a-fA-F-]{36}$' and u.id = p_uid::uuid limit 1), (select np.email from notification_prefs …), …)`.
  - Supabase security advisor: `anon_security_definer_function_executable` כולל אותה.
  - קריאה חיה עם מפתח anon הציבורי ומזהים פיקטיביים (UUID אפסים, visitor לא קיים): `200 null` — כלומר הפונקציה נגישה ל־anon ומבצעת את החיפוש.
  - `public.trusted_contributor_uids()` נגישה גם היא ל־anon ומחזירה 3 UUID של משתמשים (נבדק מספר בלבד, לא הערכים).
- **השפעה:** מי שמחזיק את מפתח ה־anon (פומבי בצד לקוח) ויודע / מגלה UUID של משתמש יכול לקבל את האימייל שלו. שרשור עם `trusted_contributor_uids` מאפשר למנות אימיילים של תורמים מהימנים. **לא נוסה ערך אמיתי** — הפגיעות מוכחת מקוד + הרשאה, לא מנוצלת.
- **תיקון מוצע (דורש אישור — שינוי DB):** `REVOKE EXECUTE … FROM anon, authenticated, public` על הפונקציה; אם ה־UI צריך אותה — שליפה בצד שרת (service role) או בדיקת `auth.uid() = p_uid` / admin. לבדוק מי קורא לה (`grep resolve_visitor_email src supabase/functions`). בדיקת מניעה: SQL test שמוודא ש־`has_function_privilege('anon', …)` שלילי.

---

## P1

### DEF-002 — ה־sitemap מפרט 1,177 כתובות שמבצעות הפניה 308
- **ראיה:** `https://sod1820.co.il/sitemap.xml` = 16,761 URL (ייחודיים). מתוכם 1,184 כתובות "root slug" (פוסטים ישנים, `/<slug>/`); מדגם של 250 (`crawl-sitemap-sample-772.csv`): 245 מחזירים `308 → /<slug>` (בלי סלאש), הכתובת הסופית 200 עם canonical עצמי. 1,177 כתובות בקובץ מסתיימות ב־`/`.
- **השפעה:** ה־sitemap מכיל כתובות לא־קנוניות שמפנות; Google מצפה לכתובות קנוניות 200. הדפים האלה נושאים את עיקר התנועה (קבוצת "root slug" ב־GSC: 695 URL, 816 קליקים ב־14 יום).
- **תיקון מוצע:** `api/sitemap.js` / `public-reading-deploy/api/public-sitemap.js` — לפלוט את הצורה הקנונית ללא סלאש. בדיקה: assert שכל `<loc>` במדגם מחזיר 200 ללא redirect; להוסיף ל־`test:2029-server-seo-ai`.

### DEF-003 — דפי `/video/*` איטיים (~3.7 שנ׳) ומחזירים 503 תחת עומס קל
- **ראיה:** בריצה ראשונה (concurrency 12): 36/40 → 503; בריצה שנייה על SHA התייצב (concurrency 5): 16/40 → 503 (גוף 54 בתים "The page is temporarily unavailable. Please try again.", משך 8–17 שנ׳). בקשה בודדת: 200 ב־3.6–4.2 שנ׳ (`x-vercel-cache: MISS`). בקריאות סדרתיות/concurrency 8 על 25 כתובות: 25/25 → 200.
- **הסתייגות:** הריצה הראשונה חפפה מעבר alias (06:55:47Z); הריצה השנייה לא. סיבה: `UNKNOWN` — הקוד ב־`public-document.js` ממפה כשל מקור (`public_source_unavailable`) ל־503 + `Retry-After: 60`.
- **השפעה:** 125 דפי וידאו (809 רשומות `video:video`) ב־sitemap; קצב crawl של Googlebot עלול לראות 503 → דחיית אינדוקס.
- **תיקון מוצע:** הוספת cache (`s-maxage`) לדף הווידאו או הורדת זמן המקור; שחזור עם `autocannon` מוגבל ב־Preview; מעקב `get_runtime_logs` לאותה כתובת.

### DEF-004 — העלאה אנונימית ל־bucket `gallery` (מדיניות Storage)
- **ראיה:** `pg_policies` על `storage.objects`: `community_anon_upload` — `INSERT` ל־`anon, authenticated` כאשר `bucket_id='gallery'` ותיקייה ראשונה `community`. ל־bucket `gallery` אין `file_size_limit` ואין `allowed_mime_types`. המדיניות `community_authenticated_media_paths_v1` היא PERMISSIVE ולכן אינה מצמצמת (מדיניות permissive מחוברות ב־OR). בנוסף `public_upload` מתיר לכל משתמש מחובר `INSERT` לכל נתיב ב־`gallery`.
- **לא נוסה** (אין כתיבה לפרודקשן); ניסיון העלאה נחסם בכוונה.
- **השפעה:** תוכן שרירותי (כולל HTML/SVG/וידאו כבד) על דומיין האחסון הציבורי של הפרויקט, הוצאות אחסון/Egress, ספאם. נדרש לאשר אם העלאה אנונימית היא תכונה מכוונת בקהילה.
- **תיקון מוצע (DB, דורש אישור):** הגבלת mime/גודל ב־bucket; הפיכת הכלל ל־RESTRICTIVE או החלפתו; דרישת `authenticated` להעלאה.

### DEF-005 — RPC ציבוריים עם כתיבה/חישוב כבד ללא הרשאה
- **ראיה:** advisor: 295 פונקציות `SECURITY DEFINER` נגישות ל־anon, 466 ל־authenticated. בדיקת גוף (SQL read-only על `pg_proc`): פונקציות `admin_*` מגינות (קריאה אנונימית ל־`admin_pulse` החזירה `admin only`), אך נמצאו פונקציות ללא שום guard שמבצעות INSERT/UPDATE/חישוב: `snapshot_seo_wave`, `refresh_traffic_daily`, `fn_detect_patterns`, `fn_detect_pattern_contradictions`, `fn_scan_reeval`, `check_security_spike`, `fn_raziel_claims_gc`, `fn_outbox_bump`, `ingest_event`, `increment_post_share(_by_slug)`, `record_feedback`, `vote_translit`, `lang_link_add`, `propose_community_word`, `add_wall_word`, `save_wall_word_private`, `enqueue_word_review`, `log_*`, `router_rate_check`, `contrib_unlock` (אורקל בוליאני לקוד גישה).
- **השפעה:** כל מחזיק מפתח anon יכול להפעיל עבודות כבדות/לזהם נתונים/לנחש קודי גישה. (סיווג regex גס — "writes" מבוסס טקסט; כל פונקציה דורשת קריאה ידנית.)
- **תיקון מוצע:** inventory ל־REVOKE מ־anon לכל מה שאינו קריאה ציבורית מכוונת; rate-limit בשרת לשאר; `contrib_unlock` — הגבלת קצב + השוואה בזמן קבוע.

### DEF-006 — אין אימות מצב אינדוקס אמיתי (Google Search Console)
- **ראיה:** אין גישה ישירה ל־Search Console UI/API בסשן הזה. יש רק הנתונים שמסנכרן `gsc-daily-sync` ל־`gsc_metrics` (אחרון: 2026-11-03; כלומר **לפני** העלייה של 4.11 — אין עדיין השפעה מדידה של 2029).
- **נתונים:** 140 ימים; כ־150 קליקים/יום, 2,000–2,700 חשיפות/יום, מיקום ממוצע ~6.2–8.3, יציב עד 3.11.
- **סטטוס:** `BLOCKED` ל־Coverage / Page indexing / Sitemap processing / Canonical selected by Google. **אין לטעון שהאתר מאונדקס** על סמך sitemap תקין.
- **פעולה נדרשת מהבעלים:** ייצוא Page indexing + Sitemaps report מ־GSC, או הענקת גישה לקריאה. מסומן P1 כי זו הנקודה הקריטית ביותר להשפעת המעבר על SEO שלא ניתן לסגור כאן.

---

## P2

### DEF-007 — שער CI `2029 Live Contracts` יכשל: קובץ בדיקה נמחק
- **ראיה:** `.github/workflows/live-contracts-2029.yml:124` מעביר ל־`node --test` את `scripts/test-beit-midrash-methods-registry.mjs`. הקובץ נמחק ב־`623b8d38a` ("Remove the Legacy runtime"), שהוא אחרי הריצה הירוקה האחרונה (`9ea0c2c4`). ה־workflow לא שונה מאז `97bf00be`.
- **סטטוס:** `CONFIRMED` סטטית; ריצה בפועל לא בוצעה (Workflow רץ ב־`workflow_dispatch` בלבד, האחרון על `9ea0c2c4`).
- **תיקון מוצע:** להסיר/להחליף את הנתיב (לא להחליש את הבדיקה); להריץ את השער על HEAD.

### DEF-008 — חריגת CLS ו־LCP בדף `/gallery` ובדפים נוספים (סף קבוע)
- **ראיה (נייד 390×844 DPR2, Chromium, בלי throttling, ריצה אחת לכל דף):** `/gallery` CLS **0.263** (סף חוזי ≤ 0.1), LCP 3.9 שנ׳; `/world` LCP 3.75 שנ׳; `/number/1820` LCP 2.9 שנ׳, CLS 0.063; `/gallery` מעביר 1.3MB.
- **הסתייגות:** מדידת מעבדה בודדת; נדרשת חזרה ×5 וערכי שדה (CrUX/Vercel Speed Insights — לא נבדקו).
- **חוזה:** `CLAUDE.md` — "CLS נשאר ≤ 0.1"; אין להעלות סף. **תיקון:** שמירת מקום לתמונות/כרטיסים בגלריה (width/height/aspect-ratio).

### DEF-009 — ה־HTML מהשרת ריק מתוכן גלוי (אין `<h1>`, ~100 תווים)
- **ראיה:** 0/510 עמודים 200 במדגם כוללים `<h1>` בתגובת השרת; `textlen` בגוף 55–107 תווים (מעטפת `.sod29-opening`). מטא־דאטה (title/description/canonical/OG) ו־JSON-LD (215/510) כן קיימים. דפדפן אחרי הידרציה מציג טקסט (ראו E2E; `h1=0` נשאר ב־`/number/1820` ו־`/gallery` גם אחרי רינדור).
- **השפעה:** Googlebot מריץ JS, אך סורקים בלי JS ו־AI crawlers רואים רק מטא־דאטה. לא נמצא חוזה מחייב; דרישת הבדיקה "SSR/HTML visibility" בהוראה. **תיקון:** לבחון server-rendered snippet לבוטים (קיימת תשתית `bot-resilient-experience-projection`) והוספת `<h1>` בעמודים ללא כותרת ראשית.

### DEF-010 — CSP חוסם את OpenWeb בקהילה + שגיאת JS
- **ראיה (E2E, `/community`, `/community/chat`, נייד+דסקטופ):** 3× `ads-configs-cdn.openweb.com/.../web.json` ו־4× `realtime.openweb.com/v1.0.0/conversation/realtime/read` נחסמו ב־`connect-src` (הרשימה כוללת רק `spot.im`/`*.spot.im`); `pageerror: Uncaught Error: called without required arguments`; 6–7 בקשות שנכשלו (`metrics-logger.spot.im`).
- **השפעה:** חיווי בזמן אמת/תצורת מודעות של ווידג׳ט התגובות לא נטענים; בדיקת התנהגות מחובר נדרשת. **תיקון:** להוסיף `*.openweb.com` ל־CSP (החלטה/אישור) או להסיר את הקריאה.

### DEF-011 — GA4 לא נטען בכל המסלולים, ללא באנר הסכמה
- **ראיה:** מזהה `G-V3H3E20FLY` נמצא ב־bundle הראשי. ב־E2E (בקשות GA נחסמו בכוונה ונספרו): בקשות GA נרשמו ברוב הדפים, אך **0** ב־`/code`, `/community/researchers`, `/login`, `/2029/journey`, `/heichal`. אין מערכת Clarity / Vercel Analytics / Speed Insights ב־bundle הראשי (`UNKNOWN` אם נטענים בצ׳אנק עצל). אין באנר הסכמה (סוכן המיפוי). ה־CSP אינו כולל `analytics.google.com`.
- **לא ניתן לאמת:** שאירועים מגיעים ל־property הנכון ואין כפילות — אין גישה ל־GA. **תיקון:** `initGA` גלובלי ב־route change; החלטת consent.

### DEF-012 — `page_views` מחזיר 403 לשליחה מהדפדפן בדפי פוסט
- **ראיה:** E2E: `403 https://…supabase.co/rest/v1/page_views` בכל טעינת פוסט. בבסיס: `anon` בעל `INSERT`, מדיניות `pv_insert` (`WITH CHECK true`), מספר שורות 98,541, שורה אחרונה 2026-11-06 03:19Z (קצב עד ~7 לשעה).
- **סיבה:** `UNKNOWN` (לא נוסה INSERT). מקור הכתיבה: `src/lib/supabase.js:2235`. **תיקון:** לשחזר ב־Preview, לבדוק trigger/Prefer header.

### DEF-013 — כתובת `sitemap` מחזירה 404 (`/community/researcher/panzer`)
- **ראיה:** URL ב־sitemap (1 מתוך 24 בקבוצת community שנדגמה) → 404. **תיקון:** סינון ב־`sitemap` של כותבים ללא פרופיל ציבורי.

### DEF-014 — נקודות קצה אדמין/תשלום חסרות ב־deploy החי
- **ראיה (סוכן מיפוי + בדיקת GET חיה):** חסרים בשורש הפריסה החי: `api/contributor-curation`, `api/world-finding-review`, `api/cardcom-start`, `api/cardcom-webhook`, `api/honeypot`, `api/og` → 404. `POST /api/contributor-interactions` ממשק admin מקבל 405 מ־adapter של GET בלבד. `src/lib/visits.js:415` קורא `/api/ga-sync` שאין לו handler. הדף `/buy` (קרדיטים ותשלומים, noindex) חי (200).
- **השפעה:** כלי admin בפרודקשן מקבלים 404/405; זרימת תשלום אינה פעילה — `UNKNOWN` אם מכוון. 27 rewrites של honeypot לא פעילים חי.
- **תיקון:** החלטה האם להכניס ל־`public-reading-deploy/api`, או להסיר את הקריאות מהקוד.

### DEF-015 — `/api/card`: `no-store`, פרמטרי חופשי ו־timeout של 300 שניות
- **ראיה:** כל תמונת OG מ־`/api/card` מחזירה `cache-control: no-store` (69/69 במדגם). Vercel runtime errors: `Task timed out after 300 seconds` על `/api/card` — 2 אירועים, אחרון 2026-11-06T07:03Z. מקבל טקסט שרירותי (`?w=test` החזיר PNG).
- **השפעה:** WhatsApp/Facebook מושכים כרטיסים מחדש; עלות; תלות בזמן תגובה. **תיקון:** `s-maxage` + `stale-while-revalidate`, timeout מוגבל, הגבלת אורך פרמטרים.

### DEF-016 — מדיניות כתיבה אנונימית פתוחה (`WITH CHECK true`) ו־`page_content` ללא הגנה
- **ראיה:** `pg_policies`: INSERT לכל `anon` ללא תנאי ב־`lab_messages`, `lab_notes`, `metatron_beta_feedback`, `search_log`, `syncs`, `visitor_events` (472,222 שורות), `words`, `page_views`, `chiddush_submissions`. `page_content` (9 שורות; אין שימוש בקוד) — `ALL` לכל `authenticated`.
- **תיקון:** CAPTCHA/rate-limit דרך RPC; הגבלת אורך בטריגר/CHECK; הסרת `auth_write` מ־`page_content`.

### DEF-017 — Supabase advisors נוספים
- **ראיה:** 2 views מסוג `SECURITY DEFINER` (ERROR): `redirect_map`, `topic_cards_public`; 141 פונקציות עם `search_path` משתנה; 3 extensions ב־`public` (`pg_net`, `pg_trgm`, …); 171 טבלאות עם RLS בלי policy (INFO).
- **תיקון:** `security_invoker=on` ל־views או אישור מכוון; `SET search_path`.

### DEF-018 — משפחת נתיבים "סגורים זמנית" מחזירה 503 + `Retry-After: 259200`
- **ראיה:** `/heichal`, `/היכל`, `/archive`, `/broadcasts`, `/cross`, `/languages`, `/name`, `/name-lab`, `/numbers`, `/reality`, `/spatial-gematria`, `/research` → 503 יציב בשתי ריצות; `x-robots-tag: index, follow`. נבנה בכוונה (`public-document.js`: "feature area closed only until it reopens soon"), אך שלושה ימים של 503 על URL אינדקס — `UNKNOWN` אם כתובות אלה היו מאונדקסות / מקושרות מהתפריט.
- **תיקון:** החלטה: 404/410 למוצרים שפרשו (Legacy retired) במקום 503 ארוך. לא לשנות בלי החלטת בעלים.

### DEF-019 — כיסוי בדיקות: חוזים בלי אכיפה ו־workflow ישן עם הרשאת כתיבה
- **ראיה (סוכן המיפוי, אומת חלקית):** ~667 מתוך 855 קבצי בדיקה לא מוזכרים באף workflow/סקריפט (שם בלבד); 22 מתוך 48 סקריפטי `test:*` לא מחוברים (כולל `test:g3-community-*`). `Design V2 §13` מצהיר שבדיקה "מכשילה את הבנייה" — אף workflow לא מריץ אותה. `.github/workflows/update-sitemap.yml` רץ יומית עם `contents: write` ומיועד לדחוף `public/sitemap.xml` סטטי (הקובץ אינו קיים כעת; הבנייה מוחקת אותו בכוונה) — `UNKNOWN` אם ה־schedule פעיל.
- **תיקון:** הסרת/השבתת ה־workflow; חיבור בדיקות החוזה ל־CI בבקשה נפרדת.

---

## P3

| מזהה | ממצא | ראיה | תיקון |
|---|---|---|---|
| DEF-020 | שרשראות redirect דו־שלביות | 496 מתוך 589 redirects חיים עוברים דרך `/(.+)/ → /$1`; אין לולאות | להצביע ישירות ליעד הסופי |
| DEF-021 | תמונות OG בגודל לא אחיד | מדגם 120: 72 ב־1200×630; השאר 1080², 480×300, 640×1138…; שתיים >1.5MB (`squid-game-cover-20260626.png` 2.45MB) | יצירת OG מנורמל |
| DEF-022 | תווי bidi/ZWSP בסלאגים ב־sitemap | 2 כתובות מכילות `%E2%80%AA` / `%E2%80%8B` | ניקוי סלאגים |
| DEF-023 | כותרות כפולות ב־`/codes/*` | "יעקב שלמה · SOD1820" ×5, "ד. טראמפ · SOD1820" ×5 | להוסיף מזהה |
| DEF-024 | `GoTrueClient` מרובה בדף הבית | אזהרת קונסול בכל טעינה של `/` | singleton ל־supabase client |
| DEF-025 | סחף מסמכים (12 פריטים) ו־flags | `audit-evidence/20261106/contracts-inventory.md` §2 (D-1…D-12); 12 flags `lock_*` נצרכים ללא הגדרה במיגרציות; `allowAdminView` חסר אפקט (`MaintenanceLock.jsx:214,233`) | באנרים היסטוריים, לא מחיקה (CLAUDE.md §6) |

---

## סגירה ושיוך

| ממצא | בעלים מוצע | דורש אישור ZURIEL |
|---|---|---|
| DEF-001, 004, 005, 016, 017 | בעל Supabase/אבטחה | **כן** — שינוי DB/Storage |
| DEF-002, 003, 009, 013, 015, 021, 022 | קוד `public-reading-deploy` / `api` | כן — מיזוג ופריסה |
| DEF-007, 019 | CI | כן — שינוי שער |
| DEF-006 | בעלים (גישת GSC) | כן — גישה |
| DEF-008, 010, 011, 012, 014, 018 | קוד + החלטה | כן |
