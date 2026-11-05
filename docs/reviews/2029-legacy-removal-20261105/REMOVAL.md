# הסרת Legacy מהקוד הפעיל — דוח ביצוע, מחושב מחדש (5.11.2026)

> **סטטוס: BRANCH-ONLY.** הענף `claude/2029-legacy-separation-e8j9tf` לא מוזג ל־`main`, לא נפרס, אין לו PR ואין לו Preview. מתועד ≠ ממוזג ≠ פרוס. מצב חי נקרא מ־Vercel (alias ← deployment ← `sourceSha`) ומ־`origin/main` בזמן הפעולה, לא מהמסמך הזה.
>
> **מה המסמך הזה.** הוא מחליף את הגרסה הקודמת, שנכתבה לפני המיזוגים עם `main` ושנתוני ה־CI והבסיס שבה התיישנו. כל המספרים כאן חושבו מחדש על ראש הקוד **`6847e6799`**, מול `origin/main` = **`2500ec56`**. הקומיטים שאחריו מוסיפים רק כלי מדידה, קובצי ראיות ותיעוד (בלי קוד מוצר). מסמכי `docs/reviews/2029-legacy-separation-20261105/*` ו־`AUDIT.md` הם תצלומים היסטוריים.

## החלטה והיקף
- החלטת צוריאל (5.11.2026): **Legacy פרש. אין חזרה.** הקוד נשמר בהיסטוריית Git בלבד, ושחזורו הוא `git show <sha>:<path>`.
- ההיקף: הסרת קוד Legacy מהעץ הפעיל, ושערים ותיעוד בהתאם. לא בוצעו כאן merge, פריסה, שינוי alias, שינוי DB או דגלים, מחיקת ענף או PR, ולא נוצר Preview.
- לא נגעתי ב־`middleware-core.js`, ב־`public-reading-deploy/`, ב־`api/og.js` וב־`api/public-document`: הם **זהים ל־`origin/main`** (נבדק ב־`git diff`). התנהגות ELS והיכל לא שונתה (ראו להלן). מסוף ניהול חדש לא נבנה.

## מצב הענף (נמדד מחדש)
| | |
|---|---|
| בסיס | `origin/main` = `2500ec56`, מוזג ב־merge רגיל (בלי rebase ובלי force push) |
| ראש קוד המוצר | `6847e6799`: 34 קומיטים לפני `main`, 0 מאחוריו (2 קומיטי merge). `2db83d565` ו־`a95b8170c` מוסיפים רק כלי מדידה, קובצי ראיות ואת הדוח (ראש הענף בזמן ריצות ה־CI: `a95b8170c`, 36 קומיטים); הקומיט שאחריהם משנה רק את המסמך הזה |
| קבצים לעומת `main` | על `6847e6799`: 630 (**415 נמחקו**, 187 שונו, 25 נוספו, 3 הועברו). על `a95b8170c`: 635 (+5 שנוספו: ארבעה קובצי ראיות וסקריפט הבידוד; `deleted-files.txt` חושב מחדש). אין שינוי בקוד המוצר בין שני הראשים (`git diff --name-status 6847e6799 a95b8170c` מציג רק `docs/` ו־`tools/`) |
| שורות | על `6847e6799`: +2,943 / −85,199. על `a95b8170c`: +4,591 / −85,199 (ההפרש הוא קובצי הראיות והדוח) |
| `src` שנמחק | 394 קבצים, כ־5.2MB מקור |
| בדיקות שנמחקו | 18 קבצי בדיקה (הרשימה למטה; הם בדקו קוד שנמחק) |
| `npm run build` | build אחד (2029) במקום שניים: 4.6 שניות במקום 8.2 באותה מכונה; `dist` 60MB במקום 69MB |

לשחזור: `git diff --shortstat origin/main HEAD`, `git diff --name-status origin/main HEAD`; רשימת הקבצים שנמחקו: [`deleted-files.txt`](deleted-files.txt) (415 שורות, חושבה מחדש).

## קומיטים (כל אחד ניתן ל־`git revert` בנפרד)
| קבוצה | קומיטים |
|---|---|
| Audit, כלי מיפוי, בסיס ביצועים | `295381f7d`, `1c0029c3d`, `28ab3aaea` |
| הפרדה לפני המחיקה: חילוץ מנוע הגימטריה (`gematriaCore.js`), ערכת theme עצמאית ל־2029, `FeatureClosedNotice`/`NotFound` של 2029, הוצאת פאנלי האזור האישי מקליפת Legacy | `b71326e80`, `bdd7649a9`, `df4616850`, `422769560`, `b564dd267` (ניסיון שבוטל: `978db7979` ← `9411dfde7`) |
| **שערי שחרור** (קומיט נפרד, באישור): `test-legacy-production-lock` ← `test-legacy-retired`; הוסר rollback worker של Legacy מה־artifact; catch-all ב־`vercel.json` ← `/2029.html`; rewrites מפורשים ל־`/code`, `/community/chat`, `/login` | `11fd78a8b` |
| **הסרת ריצת Legacy**: `index.html`, `src/main.jsx`, יעד הבנייה, adapters של ה־host; כתובת לא מוכרת מסתיימת ב־404 של 2029 בלי hand-off | `623b8d38a` |
| 43 קבצי UI מתים שאין להם הפניה כלל | `872db6de7` |
| הסרת חוזי theme/palette של Legacy | `f0b541f43` |
| ניקוי CI: שער ה־SEO הישן של Legacy וסקריפטי אימות של Legacy בלבד; ה־visual gate מגיש את מסמך 2029; ניסיון Lightbox שבוטל; שחזור קבצי `public/` | `2ca718f03`, `b02dcb548`, `fb6598c2b`, `0a860350d`, `e9ed34893`, `70cdadcf9` |
| מיזוגי `main` | `c1cc7ef1e` (`b0a752c66`), `414f31e4b` (`2500ec56`); בין לבין `2c8cdab52`: `presence.js` הוחזר כי חוזה ה־Realtime ב־`main` (#1228) מונה אותו כצרכן |
| שערי SEO: החלטה מפורשת לכל נתיב; התנהגות השרת לכל נתיב | `5585c7539`, `faa112e4d` |
| כלי ELS: הבדיקה לא משכתבת קבצי `public/` | `746b6e6f0` |
| תיקוני בדיקות אחרי המיזוג | `4a47a36d4`, `6847e6799` |
| תיעוד | `969162de6`, `7bdffee35`, `97800b811`, `3966fa637`, `1a3bd6b58`, `2b011a1d8` |

## מה הוסר
- **ריצת Legacy** (כל מה שנגיש רק מ־`src/main.jsx`): `App`, routes, `legacy.jsx` (265KB), layout/Navbar/BottomBar/טיקרים, `UserCenter`, דפי תוכן ציבוריים שיש להם מקבילה ב־2029.
- **מסוף הניהול והעורך הישנים**, באישור מפורש: `AdminPage`, 9 מ־10 קבצי `components/admin/*` (`RoadmapMap3D.jsx` נשאר), `PostEditorPage`, `AdvancedPostEditor`, `ContributorStudio`, `UploadFindings`, `LeadOrderEditor`, `CreditsBuyPage`, `WaInboxPage`/`WaChatWindow`, `FileAnalyzer`. סגור הקשר המחושב מחדש על `main` (`capability-closure.mjs`): מסוף ניהול 60 קבצים (1,405KB), עריכת פוסטים 5 (112KB), קרדיטים 1 (18KB), תיבת WhatsApp 2 (13KB). סך הכול 68 קבצים (1,548KB). **ה־artifact החי לא הגיש אותם מאז המעבר ל־2029** (נבדק חי ב־5.11: `/admin` מציג ״האזור ייפתח בהמשך״, `/post-editor` ו־`/wa-inbox` ״העמוד לא נמצא״, ובחבילת הכניסה החיה אין `AdminPage` או `PostEditorPage`). לכן ההסרה מהעץ אינה מורידה יכולת מהפרודקשן; היא מורידה מהעץ את מקור הקוד לפרסום והעלאה.
- **43 קבצי UI מתים** (טיקרים, ווידג׳טי פורום/פיד, פופאפים, דפי מחשבון והיכל ישנים), **חוזי theme/palette** (`palette.js` הפך ל־`paletteTokens2029.js`, `themeMode.js`, `lightRoutes.js`, `chromeTheme.js`, `stream.js`, ה־bridge ב־vite).
- **הגדרות:** יעד build של Legacy, `build:legacy`, שער ה־Legacy lock, rollback worker, שורות workflow לקבצים שנמחקו.
- **18 קבצי בדיקה** של קוד שנמחק (גם ב־`main` הם בדקו קוד Legacy): `test-beit-midrash-methods-registry`, `test-legacy-home-recent-gematria`, `test-legacy-production-lock`, `test-legacy-research-containment`, `test-whatsapp-kod-hametsiut-join`, `coreEngine.test`, `explorerAccess.test`, `researchDnaDimensions.test`, `bot-observability-no-false-volume`, `code-page-els-launch-gate`, `convergence-tree-closure`, `dead-bot-signal-adjudication`, `legacy-build-meter-80-honesty`, `live-whatsapp-feed-projection` ו־4 בדיקות `research-viewer-*`. בדקתי שהחלקים של שלוש מהן שהגנו על דברים שעדיין חיים (זרע מטריצת ELS 2029, החרגת `/numbers` מה־sitemap, פונקציות ה־WhatsApp) נשמרו ב־`scripts/test-2029-live-contracts.mjs` (נכנס ל־`main` ב־#1225).

## מה נשמר, ולמה
| פריט | סיבה |
|---|---|
| `supabase/functions/*`, מיגרציות, RLS, Storage/TUS | תשתית משותפת; זהה ל־`main` |
| `src/lib/AuthContext.jsx` (`isAdmin`), `auth.js`, `oauthReturn.js` | Auth של 2029 ושל מסוף הניהול החדש; זהים ל־`main` |
| `/2029/control` (`ControlPlane2029Page`), `/2029/me/*` (`WriterPersonal2029Page`) | משטחי 2029 קיימים. ב־`WriterPersonal2029Page` שונו רק שלוש שורות import: הפאנלים עברו ל־`src/features/personalPanels/*` |
| `researchViewerProjection.js`, `useUniversalWorkspace.js` | הקרנות וסביבת עבודה למסוף החדש; זהים ל־`main` |
| `mediaResumableUpload.js`, `lifeJourneyHintMedia.js`, `communityAttachments.js` | העלאת מדיה; זהים ל־`main` |
| `docs/admin-command-blue-slice-v1.md`, `docs/reviews/admin-full-access-auth-20261103/` | תיעוד המסוף החדש; זהים ל־`main` |
| `src/lib/presence.js` | חוזה ה־Realtime ב־`main` מונה אותו כצרכן |
| `src/lib/analysisFlow.js`, `triage.js` | מיובאים ע"י edge function `expression-extract` וסקריפטי audit (שני קובצי ה־`legacy-only` היחידים שנשארו) |
| `src/theme.js` | מקור קנוני בבדיקת provenance וב־packaging של `expression-extract`; אין לו צרכנים ב־`src`. מועמד למחיקה יחד עם עדכון ה־packaging (נוגע בפונקציית Supabase חיה, דורש אישור) |
| `public/sw.js` | ה־2029 רושם `/sw.js` להתראות; ב־artifact החי נדרס ע"י ה־worker של ה־public-reading |
| libs ללא צרכנים (`richScore`, `systemEvents`, `wizard`, `nameCard`, `worldAnchorProjection`...) ו־46 קבצי foundation/2029 עם בדיקות | לוגיקת Foundation, לא Legacy; דורשים החלטת בעלים |

**מה בדיוק נמחק, לפי סיווג ה־import graph (חושב מחדש על `main`):** מתוך 394 קבצי `src` שנמחקו, 334 היו נגישים רק מכניסת Legacy, 50 היו יתומים בלי שום הפנייה מסקריפטים או מבדיקות, ו־**10** היו "משותפים" (נגישים גם מכניסת 2029): `MyTreeCard`, `userCenter/HintsPanel`, `userCenter/UserCenter`, `userCenter/UserCenterContext`, `userCenter/useWaLink`, `hintTypes`, `chromeTheme`, `lightRoutes`, `stream`, `themeMode`. 2029 הועבר מהם קודם (`features/personalPanels/*`, `palette2029`, `TYPEFACE`, `themePreset2029`), ורק אחר כך הם נמחקו; הוכחה: ה־build, שער ה־boundary (861 מודולים, הגרף סגור) ושער ה־isolation עוברים.

## בדיקת בידוד Legacy מול 2029
הכלי `tools/legacy-removal/isolation-scan.mjs` (ללא רשת), פלט מלא ב־[`isolation-scan-branch.json`](isolation-scan-branch.json) וב־[`isolation-scan-main.json`](isolation-scan-main.json). **ההוכחה היא מבנית, לא ספירת מילים.**

**הוכחות מבניות (מה נבדק בפועל)**
- יעד build יחיד: `vite.config.js` בונה רק את `2029.html`; `package.json` מריץ build 2029 בלבד; אין rewrite או redirect ל־`/index.html` (שער `test-legacy-retired`). בנייה עם כל דגלי ה־preview דולקים (`VITE_INTEGRATED_PREVIEW`, `VITE_FUNCTIONAL_UNIFIED_PREVIEW`, `VITE_KINGDOM_PREVIEW`, `VITE_BOOK_PUBLICATION_REVIEW_PREVIEW`, `VITE_FOLLOW_CENTER_PREVIEW`, `VITE_PUBLIC_FOUNDATION_PREVIEW`) עוברת גם על הענף וגם על `main`.
- שער ה־boundary והגרף הסגור עוברים; שערי theme ו־isolation עוברים.
- **imports יחסיים שאינם מתרגמים לקובץ:** 203 בענף מול 202 ב־`main` (כולם קודמים להסרה, למעט חמישה). שניים מהחמישה הם תוצאת כלי בלבד (`test/small-n-components-2029.test.mjs` מתרגם נתיבים מול תיקיית העבודה דרך esbuild והבדיקה עוברת). **שלושה אמיתיים:** `EntityHubGoldenControls.jsx` ← `QuickActions.jsx`, `OrGeulaSourceShortcut2029.jsx` ← `OrGeulaStoryColumnCore.jsx`, `StoryViewerOnDemand2029.jsx` ← `StoryViewer.jsx`. הם קבצים רדומים: אף אחד לא מגיע אליהם מכניסת 2029, גם לא בבנייה עם כל דגלי ה־preview, ולכן אין להם השפעה על ריצה או על build. ראו "שאריות".
- חיפוש ממוקד של שורות שמציינות את Legacy כמוצר פעיל (app, ui, runtime, build, theme, host, rollback): 64 שורות בקוד, בבדיקות ובהגדרות; הן שערי הגנה שמוכיחים היעדר, הערות היסטוריות, תיאורי בדיקות, או בדיקות דפדפן ישנות (ראו "שאריות").

**חמש קטגוריות**
1. **קוד מוצר Legacy שנמחק:** 415 קבצים (ראו לעיל).
2. **מונחים היסטוריים ונתוני ארכיון שנדרשים:** המילה legacy מופיעה ב־2,205 שורות ב־513 קבצים מחוץ לתיקיות ההיסטוריה (ב־`main`: 2,395 שורות ב־560). 794 שורות סווגו לפי משמעות: צנרת **World legacy replay** של מחקר 2029 (304), נתוני ארכיון וזהות (`legacy_id`, צ׳אט ישן, חשבונות ישנים, claims: 256), קוראי תאימות לערכים ופורמטים ישנים (66+37), שמות שערים ו־workflow (29), טבלאות הפניה (17), שמות קבצי נכסים (16), ניסוח על המוצר שפרש (69).
3. **תשתיות משותפות שנשמרו בכוונה:** כל הטבלה ב"מה נשמר".
4. **שאריות שדורשות החלטה:** ראו הסעיף "שאריות והחלטות פתוחות".
5. **false positives:** שם קובץ התמונה `legacy-dark-bg-post-mobile-v2-720x1280-….webp` (נטען באתר החי בעמוד פוסט) ושמות chunks של ווידג׳ט OpenWeb של צד שלישי (`packages_legacy_notifications-bell…`), נתוני ארכיון, והערות.

**מה לא נבדק:** 1,411 שורות עם המילה שלא נתפסו על ידי אף כלל סיווג לא נקראו אחת אחת (הקבצים הגדולים ביניהן: בדיקות ה־raziel result bundle, `test-2029-world-surface`, `worldLegacyReplayProjection` ובדיקותיו, `ai-analyze`; דגימה הראתה שימוש במשמעות "ישן" של נתונים ופורמטים). אין כאן טענה ל־100% בידוד: הטענה היא שאין **צימוד מבני** מוכח, ושלושה קבצים רדומים עם import שבור מתועדים. מחרוזות שנבנות דינמית ושימוש בקבצים דרך נתיבי ריצה לא נבדקו.

## שימור תשתיות Admin/2029
נבדק בענף: כל הנתיבים שברשימת ההוראה קיימים וזהים ל־`main` (למעט שלוש שורות ב־`WriterPersonal2029Page.jsx`). `/2029/control` ו־`/2029/me/:module` רשומים ב־`App2029.jsx`; `isAdmin` מוגדר ב־`AuthContext` ו־44 קבצים צורכים אותו; `supabase/functions` ו־`supabase/migrations` זהים ל־`main`. מה שחסר למסוף הניהול החדש וקיים רק ב־Git: ממשקי הפרסום, העריכה, ההעלאה והמודרציה הישנים (פקודות `git show b0a752c66:<path>` למעלה, ובקובץ `deleted-files.txt`); ה־RPC, ה־Edge functions וה־Storage שמאחוריהם נשארו. מפת "איזו יכולת נשענת על איזה RPC/טבלה/Edge function" לא נכתבה כאן (מחוץ להיקף); הסשן השני כתב מפה כזו בשורת `work_log` `f69dd66e-500b-4f5b-9670-2b6dc6730cd9` (קריאה בלבד), וטענותיה על 122 RPC ועל ה־Edge functions לא נבדקו כאן מחדש.

**בדיקה עצמאית של ה־RPC (קריאה בלבד מול ה־DB החי `linswmnnkjxvweumprav`, ללא שינוי):** `src` ב־`b0a752c66` קורא בשם מילולי ל־336 RPC; **333 קיימים** ב־schema `public`. החסרים: `mutation` (מחרוזת בתוך בדיקה, לא קריאה), `admin_people_identity_review_v1` (נקרא מ־`src/lib/research/peopleIdentityProjection.js`) ו־`els_search_v1` (נקרא מ־`src/lib/research/elsW2Executor.js` ומ־`api/world-corpus-triage-audit.js`; מוגדר במיגרציה `20260916150500_g3_els_callable_core_v1.sql` בקוד, אך ב־DB החי יש `els_search_core_v1`, `els_search_page_v1` ו־`els_search_geometry_v1` ואין `els_search_v1`, וגרסה זו אינה ברשימת המיגרציות שהוחלו). שני הקבצים נקראים גם ב־`main` הנוכחי ולא שונו בענף: **ממצא קיים שאינו נגרם מההסרה**. לא נגעתי בו (ELS קפוא) ולא בדקתי אם הנתיב נגיש בפועל בפרודקשן; החלטה ובדיקה אצל ZURIEL.

## SEO
- `scripts/test-2029-route-seo-decisions.mjs` (+ workflow `route-seo-decision-2029.yml`): כל נתיב ב־`App2029` חייב מקור החלטה מפורש (`api/og.js`, `route-legitimacy.js`, כותרת noindex ב־`vercel.json`, noindex ברמת הדף או דגל preview). אין baseline ואין allow-list. חולשה: זו בדיקת רישום, והיא הייתה מקבלת גם את `/beit-midrash` כשהשרת ענה לו 404.
- `scripts/test-2029-route-seo-behavior.mjs` (חדש): החלטה אחת מפורשת לכל אחד מ־60 הנתיבים (index, noindex, closed, account, missing, redirect, item, shape, collection, number), והשרת האמיתי (`public-document` שמריץ `api/og.js`, מיובאים בלבד) חייב לענות אותה: status, `X-Robots-Tag`, canonical וכותרת, בשלושה מצבי נתונים סינתטיים. הוכחה במוטציות על worktree נקי של `main`: עם `api/og.js` מלפני תיקון בית המדרש הוא נכשל על `/beit-midrash` (404, ״הפוסט לא נמצא״); נתיב חדש בלי החלטה נכשל. הוא **אינו** מפעיל את שכבת ה־rewrites של Vercel ואת ה־Edge middleware (מכוסים ב־`test-route-legitimacy-2029` ובבדיקה אחרי פרסום).
- ה־workflow החדש אינו ניתן להפעלה ידנית לפני שהוא ב־`main` (GitHub מחזיר 404): הוא ירוץ ב־PR. הפקודות שלו ופקודת ההתנהגות עוברות מקומית. **לא מוצג כעבר ב־CI.**

## בדיקות (פקודה, SHA, תוצאה)
**מקומי, על `6847e6799` (ללא רשת; אין בדיקת Preview או production):** כולן exit 0: `node scripts/test-legacy-retired.mjs`, `test-one-tree-content-contract`, `npm run build`, `test-2029-built-graph`, `test-2029-module-boundary`, `test-2029-isolation`, `test-2029-system-frame`, `test-2029-theme-isolation`, `test-2029-world-surface`, `test-2029-route-seo-decisions`, `test-2029-route-seo-behavior`, `test-2029-server-seo-ai-parity`, `test-route-legitimacy-2029`, `test-2029-canonical-presentation`, `test-2029-live-contracts`, `test-search-indexing-2029`, `test-public-reading-main-release-contract` (וה־`--test` שלו), `build-public-reading-production` ו־`--test test/public-reading-production-artifact.test.mjs` (22/22), `test/realtime-entry-split-2029.test.mjs`, `test/beit-midrash-rail-no-page-scroll-2029.test.mjs`, `test/public-launch-seo-gates.test.mjs`, `test/public-canonical-parity-repair.test.mjs`, `test/public-reading-release-2029.test.mjs`, `test/small-n-components-2029.test.mjs`, `src/lib/avatar.test.js`, `test-g1-agent-routing-smoke` (18/18).

**כל קבצי ה־Node שרצים בלי דפדפן (884 קבצים: 866 בענף, 879 ב־`main`), בלי רשת, ענף מול worktree נקי של `main`** ([`node-tests-main-vs-branch.tsv`](node-tests-main-vs-branch.tsv)): בענף 703 עברו ו־72 נכשלו (91 קבצי דפדפן/שרת לא הורצו); ב־`main` 703 עברו ו־85 נכשלו. **אין קובץ שעובר ב־`main` ונכשל בענף.** 72 הכשלים בענף נכשלים זהה גם ב־`main` (חסרות חבילות כמו `react-test-renderer` ו־`@electric-sql/pglite`, ואין רשת): baseline סביבתי. 13 קבצים נכשלים ב־`main` ועוברים בענף. 18 הקבצים שנמחקו קיימים רק ב־`main`. ההרצה הזוגית חשפה בדיוק **שלוש בדיקות ש־Legacy שבר** (קראו קובץ שנמחק) ותוקנו בקומיט `6847e6799` בלי להוריד דרישה על קוד שקיים: `public-url-residual205-2029` (הוסרה ההצהרה על `SearchTabs` של Legacy), `research-viewer-entity-graph-lens` (הוסר החצי שקרא את דף ה־viewer שנמחק; הבדיקה על `researchViewerProjection.js` נשארה ונכשלת זהה ב־`main` על הצהרה ישנה אחרת), `companion-2029-public-source-shortcuts` (הוסרה הבדיקה שקראה `OrGeulaStoryColumnCore`). כשל אחד בהרצה המקבילית, `els-matrix-reading-client-e2e`, התברר כקפיצת עומס: 4 הרצות בודדות עברו 6/6. בנוסף, `test/public-reading-production-artifact.test.mjs` (שה־job החדש `release-contracts-2029` ב־`main` מריץ) נשבר אחרי המיזוג כי קרא לסקריפט ה־Legacy lock שנמחק; תוקן ב־`4a47a36d4`.

## CI בענף מול `main`
כל הריצות הן `workflow_dispatch` על הענף (לא בדיקות PR; בענף אין ריצות `push`). לכל gate: הראש הסופי `a95b8170c`, ריצות קודמות בענף, `main`/baseline, והאם הכשל נגרם מהשינוי. **13 ה־gates שבטבלה רצו על הראש הסופי.** הקומיט שאחריו משנה רק את `REMOVAL.md` (`git diff --name-status a95b8170c HEAD`), ולכן לא הורצה עליו סדרה נוספת.

| Gate | ראש סופי `a95b8170c` | ריצות קודמות בענף | `main` / baseline | נגרם מהשינוי? |
|---|---|---|---|---|
| 2029 Isolation (`hard-isolation`) | success `42029787361` | success `42022009194` (`1a3bd6b58`), `42025470835` (`4a47a36d4`) | נכשל ב־`entry-learn-2029.spec.cjs:47` על `main` מוקדם יותר; תוקן ב־#1215 וב־#1222; ירוק ב־PR #1229 (`42021952573`) | לא |
| Release Visual | success `42029792284` | success `42022022262`, `42025475634` | נכשל (Bennett ב־1440, 19/20) על `main` מוקדם יותר; תוקן ב־#1216 וב־#1221; ירוק ב־#1229 (`42021952530`) | לא |
| ELS Core Compatibility | success `42029796885` | success `42022036546`, `42025480160` | נכשל ב־`74ead2ec` (`41977804829`, שלב הדפדפן); תוקן ב־#1219; success על `main@2500ec56`: `42025489393` | לא |
| G4 Public Core | success `42029800974` | success `42022017959`, `42025484665` | success ב־#1229 (`42021952309`) | לא |
| Production Release and Legacy Compatibility (`legacy-production-lock.yml`) | success `42029805893` | success `42022013747` | success על `main@2500ec56`: `42022871702` | לא |
| 2029 Live Contracts (3 jobs: `release-contracts-2029`, `perf-contracts-2029`, `live-contracts-2029`) | success `42029811331` (שלושת ה־jobs) | success `42022030975` | success ב־#1229 (`42021952328`) | לא |
| Observability/SEO Build Gate | success `42029816887` | success `42022026670` | | לא |
| Research Sync Acceptance | success `42030099046` | success `42022072728` | | לא |
| Agent Dispatch Contract | success `42030103688` | success `42022062691` | | לא |
| Community Reaction Visibility | success `42030108105` | success `42022066190` | | לא |
| Dependency Upgrade Radar V2 | success `42030112506` | success `42022069174` | | לא |
| System Self Maintenance V1 | success `42030117314` | success `42022077112` | | לא |
| Video Ingest | success `42030121792` | success `42022081028` | | לא |

אין כשל שהוא baseline ואין regression בענף. **לא הורצו:** `route-seo-decision-2029` (workflow חדש: ה־dispatch החזיר 404 כי הוא טרם ב־`main`; לכן גם `test-2029-route-seo-behavior`, שה־workflow הזה מריץ, נבדק מקומית בלבד ולא ב־CI), `follow-identity-isolated-db-gate` ו־`media-release-batch-gate` (`pull_request` בלבד), Preview מוגן וקנרית (דורשים פריסה). כשל או timeout שלא נפתר לא יסומן כירוק.

## ביצועים — נמדד מחדש (`scripts/measure-2029-load.mjs`, 5 ריצות, Chromium CPU x4, 390×844, localhost בלבד)
המכונה הייתה עמוסה בעבודות אחרות, ולכן ל־LCP יש רעש של כ־±200ms. הנתונים בקובץ [`perf-main-vs-branch.json`](perf-main-vs-branch.json).

| מדד | `main@2500ec56` (build 2029) | ענף `6847e6799` |
|---|---|---|
| Eager: chunks / gzip / modules | 18 / 199.6KB / 101 | 18 / 198.9KB / 102 |
| כל ה־chunks הנגישים (gzip) | 1,954KB (240) | 1,951KB (238) |
| ביקור ראשון: LCP / long tasks | 1,784ms / 7 | 1,968ms / 8 |
| בקשות / JS / העברה | 101 / 52 / 1,802KB | 102 / 53 / 1,798KB |
| ביקור חוזר: LCP | 1,036ms | 972ms |
| `npm run build` המלא | 8.2s (Legacy + 2029) | 4.6s (2029) |

**מסקנה, מופרדת:** (א) *פישוט ארכיטקטורה:* אמיתי: −415 קבצים, build אחד, גרף סגור, פחות סתירות לסוכנים. (ב) *הקטנת קוד ריצה בחבילה:* לא נמדדה (Legacy היה מסמך ו־build נפרדים). (ג) *שיפור build:* כ־3.6 שניות מתוך 8.2 ב־`npm run build`. (ד) *שיפור initial load:* **אין**; ההבדלים בתוך הרעש, וב־eager gzip הם 0.7KB. (ה) *TTFB ופרודקשן:* לא נמדדו כאן. **אין לטעון שהאתר מהיר יותר בגלל ההסרה.** (הטבלה הקודמת, 26 chunks eager, נמדדה על בסיס ישן; `main` הנוכחי כבר ב־18.) האיטיות האמיתית נמצאת במקום אחר: זמן תגובת השרת של המסמך (השרת בארה״ב והמסד בטוקיו) וכ־50–60 קבצי JS בעמוד הבית.

## ממצאים תוך כדי
- **Lightbox:** כלל "תמונה מלאה בלי חיתוך" (`LightboxVisualFoundation.css`) נטען רק ע"י כניסת Legacy. ב־2029 תמונות גבוהות נגללות. לא נוסף CSS; בדיקת `FIT_WHOLE_IMAGE` ב־Release Visual נמחקה. **החלטת מוצר פתוחה:** המלצה להשאיר את ה־Lightbox המשותף (יש לו `object-fit: contain`).
- **סיכון תפעולי שתוקן:** בדיקות ELS מקומיות שכתבו את `public/els-dynamic-lexicon-v1.gz64.txt` ו־`public/tzofen.html`; עכשיו הבדיקה בונה לתיקייה זמנית (`ELS_BUILD_OUT_DIR`, ברירת מחדל ללא שינוי). מקומית השוואת הבתים עדיין נכשלת כי ה־zlib כאן מפיק פלט שונה (נכשלה כך גם לפני התיקון); ב־CI היא עוברת.
- **שער ה־SEO של Observability** בדק את נתיבי Legacy ונמחק; במקומו שני שערי SEO חדשים (לעיל).

## ELS והיכל
לא שונתה התנהגות. השינויים בקבצים ששמם ELS/היכל: החלפת import של `palette.js` ל־`palette2029.js` ושל `FeatureClosedNotice` לעותק 2029 (12 קבצי `yetzirahModels` + `ElsNativeClassic2029`, `ElsRotatingMatrixCard2029`, `elsFindingColors2029`, `Els2029Page`), מחיקת רכיבי ELS ו־`HeichalPage`/`ElsWorkAreaPage` של Legacy, ו־`tools/els/build.py` (משתנה סביבה אופציונלי, ברירת מחדל ללא שינוי). ELS Core Compatibility עבר בענף (`42022036546`, `42025480160`).

נבדק שוב נקודתית (`git diff -U0 origin/main`): 16 קבצי ELS/Yetzirah של 2029 השתנו בשורה אחת כל אחד, והיא החלפת נתיב import בלבד (`palette.js` ← `palette2029.js`, `FeatureClosedNotice` ← `FeatureClosedNotice2029`); אין שינוי בהתנהגות. ההגנה ש־[#1225](https://github.com/zuriel337/sod1820/pull/1225) הוסיפה על כניסת ההיכל (`scripts/test-2029-live-contracts.mjs`, קבוצה 2: אין קישור לכניסה הלא־פתוחה ממשטחי 2029) בודקת את קבצי משטחי 2029 ולא את `HeichalPage.jsx` שנמחק, ולכן היא עדיין נקשרת: 6/6 מקומית בענף ו־job `live-contracts-2029` ירוק בריצה `42029811331`.

## שאריות והחלטות פתוחות
1. **שלושה קבצי src רדומים עם import שבור** (`EntityHubGoldenControls.jsx`, `OrGeulaSourceShortcut2029.jsx`, `StoryViewerOnDemand2029.jsx`). ה־Companion מנותק בהחלטת ZURIEL (1.11) וה־EntityHub preview אינו מחובר. אפשרויות: למחוק את האיים הרדומים (ובדיקותיהם), או לשחזר רכיבים ניטרליים בשם 2029. לא נעשה דבר כדי לא להגדיל מחיקה ולא לשחזר UI של Legacy.
2. **התלות `xlsx`** ב־`package.json` אינה בשימוש אחרי מחיקת `FileAnalyzer.jsx` (הייתה בשימוש רק בו). הסרה נוגעת ב־lockfile ודורשת החלטה.
3. **`src/theme.js`** (ראו "מה נשמר").
4. **בדיקות דפדפן ב־Python שמניחות את ה־hand-off של Legacy** ואינן רצות באף workflow: `test/public-contributor-routes-2029.browser.py` (מצפה ל־"Legacy document target"), `test/email-verify-2029-boundary.browser.py` (מצב `legacy`). לא הורצו ולא שונו.
5. **שמות ותוויות ישנים בלבד:** צעד ב־`2029-isolation-gate.yml` ששמו ״Theme/palette isolation (2029 store, Legacy-host adapter)״; שם הבדיקה ״normal Legacy build remains the default״ ב־`public-reading-release-2029.test.mjs` (עוברת); `SOD_BUILD_TARGET=2029` שנשאר בבדיקות דפדפן (מתעלמים ממנו); ושם ה־workflow `legacy-production-lock` שנשמר בכוונה לשמות הבדיקות הנדרשות.
6. **`src/features/personalPanels/*`** (`MessagesHub`, `PageEditor`): הועברו מקליפת Legacy, בשימוש `/2029/me/:module`, ועדיין בסגנון Legacy. החלטת עיצוב.
7. **נעילות `site_flags` במסד** (`lock_number`, `lock_books`...) אינן קובעות את מה שהציבור רואה באתר החי: פרופיל הקריאה הציבורית (`publicReadingRelease2029.js`) פותח בעצמו את `lock_world`, `lock_number`, `lock_gematria`, `lock_books`. רק נעילות שאינן ברשימה (למשל רזיאל) נשארות נעולות בפועל. סטייה תיעודית שמטעה סוכנים; הכרעה והחלטת DB אצל ZURIEL.
8. **מסמכי בעלים** (`SOD1820_MASTER_*`, `SOD1820_DESIGN_CONTRACT_V*`): ערכים היסטוריים כרונולוגיים שמזכירים את Legacy כפעיל נשארו כמות שהם; בקומיט הניסוח נערך רק ניסוח נעילת Legacy וחזרה. בראש `CLAUDE.md` ו־`AGENTS.md` נוסף בלוק "Legacy פרש".
9. **ענפים:** `claude/legacy-removal-integration-20261105` נשאר כראיית נחיתה. מחיקת ענפים ו־PR ישנים רק אחרי ארכוב ובאישור (תג לא ניתן לדחיפה מהסביבה הזו).
10. **שורש `vercel.json`:** ה־catch-all שלו מגיש עכשיו `/2029.html`. הפרודקשן משתמש ב־`public-reading-deploy/vercel.json` (לא שונה).
11. **ממצא קיים, לא קשור להסרה:** `public.els_search_v1` ו־`public.admin_people_identity_review_v1` נקראים מהקוד (גם ב־`main`) ואינם קיימים ב־DB החי (פירוט בסעיף "שימור תשתיות Admin/2029"). לא נגעתי; ELS קפוא. ההחלטה אם זה פגם חי, מיגרציה שלא הוחלה או נתיב רדום אצל ZURIEL.

## מה לא נבדק (מגבלות)
Preview מוגן של הענף; Auth, העלאות, פרסום וקהילה חיים מקצה לקצה (נבדקו חוזים סטטיים ומסכים); INP; ביצועי רשת ו־CDN אמיתיים; 91 קבצי בדיקה שדורשים דפדפן או שרת (חלק מכוסים ב־Playwright gates ב־CI); בדיקות Python; שכבת ה־rewrites של Vercel ו־Edge middleware בבדיקת ה־SEO; מחרוזות דינמיות. הרצות ה־CI הן dispatch על הענף ולא בדיקות PR.

## נדרש לפני merge
1. אישור מפורש של ZURIEL לפתיחת **טיוטת PR** ל־`main` (אין PR כרגע) ולנחיתה ב־**commit merge** (לא squash).
2. בדיקות ה־PR ירוקות, כולל ה־workflow החדש `route-seo-decision-2029` ושערי ה־PR בלבד (`follow-identity-isolated-db-gate`, `media-release-batch-gate`).
3. הכרעה בשאריות 1–2 או קבלתן כמתועדות.
4. אם `main` זז: merge רגיל נוסף (בלי rebase), ובדיקת התנגשויות.
5. **Preview מוגן** של ה־SHA המדויק, באישור, ובו מעבר ידני על התחברות, העלאה, קהילה, `/2029/control`, `/2029/me/*` וכל הנתיבים הציבוריים.

## נדרש לפני production
אישור מפורש של ZURIEL ל־**SHA מדויק**; קנרית מוצלחת על ה־SHA החי הנוכחי (Production Canary Gate); בנייה לפי מתכון ה־public-reading; אחרי מעבר הכתובות, הרצת קנרית ידנית אחת (הקנרית האוטומטית רצה לפני המעבר ואינה ראיה) ובדיקת דפדפן אמיתי ב־390 וב־1440 בדומיין החי. יעד חזרה: פריסת 2029 קודמת ולא Legacy; החזרה אינה משחזרת מסד או מדיה.
