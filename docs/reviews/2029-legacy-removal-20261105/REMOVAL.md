# הסרת Legacy מהקוד הפעיל — דוח ביצוע (5.11.2026)

החלטת צוריאל: Legacy מוצר שפרש; נשמר רק ב־Git (לצורך rollback). בסיס העבודה `28ab3aaea`, ענף `claude/2029-legacy-separation-e8j9tf`. אין PR/merge/פריסה. רשימת הקבצים שנמחקו: [`deleted-files.txt`](deleted-files.txt) (419 קבצים; 509 קבצים שונו; −84,924 שורות).

## קומיטים (כל אחד ניתן ל־`git revert` בנפרד)
| קומיט | תוכן |
|---|---|
| `295381f7d` + `1c0029c3d` | Audit, כלי מיפוי, בסיס ביצועים |
| `11fd78a8b` | **שערי שחרור** (קומיט נפרד, באישור): `test-legacy-production-lock` → `test-legacy-retired`; הוסר rollback worker של Legacy מה־artifact; catch-all ב־`vercel.json` → `/2029.html`; rewrites מפורשים ל־`/code`, `/community/chat`, `/login` |
| `623b8d38a` | **הסרת ריצת Legacy**: 343 קבצי `src`, `index.html`, יעד בנייה Legacy, adapters של ה־host; `App2029` — כתובת לא מוכרת מסתיימת ב־404 של 2029 (בלי hand-off) |
| `872db6de7` | 43 קבצי UI מתים (אין להם שום הפניה): טיקרים, ווידג׳טי פורום/פיד, פופאפים, דפי מחשבון והיכל ישנים |
| `f0b541f43` | **הסרת חוזי theme/palette של Legacy**: `palette.js`, `themeMode.js`, `lightRoutes.js`, `chromeTheme.js`, `stream.js`, ה־bridge ב־vite; רכיבים חיים הועברו ל־`use2029Palette`, `TYPEFACE`, `accentRoles2029`, `themePreset2029` |

## מה הוסר
- כל מה שנגיש רק מ־`src/main.jsx` (App, routes, `legacy.jsx` 265KB, layout/Navbar/BottomBar/טיקרים, UserCenter, דפי תוכן ציבוריים שיש להם מקבילה ב־2029).
- **מסוף הניהול** (`AdminPage` + `components/admin/*`, 60 קבצים), **עורך הפוסטים** (`PostEditorPage`, `AdvancedPostEditor`, `ContributorStudio`, `UploadFindings`, `LeadOrderEditor`), `CreditsBuyPage`, `WaInboxPage`/`WaChatWindow` — באישור מפורש; אין להם מקבילה ב־2029 וה־artifact החי לא הגיש אותם. נשארו ב־Git בלבד.
- 17 בדיקות שנושאן קוד שנמחק; בדיקות מעורבות נערכו (הוסרו רק הצהרות על קבצי Legacy).
- הגדרות: יעד build Legacy, `build:legacy`, שער ה־Legacy lock, rollback SW, workflow paths/steps לקבצים שנמחקו.

## מה נשמר ולמה
| פריט | סיבה |
|---|---|
| `src/lib/analysisFlow.js`, `triage.js` | מיובאים ע"י edge function `expression-extract` וסקריפטי audit |
| `src/theme.js` | מופיע כמקור קנוני ב־packaging ובבדיקת provenance של `expression-extract`. אין לו צרכנים ב־`src`. מועמד למחיקה יחד עם עדכון ה־packaging (דורש אישור — נוגע בפונקציית Supabase חיה) |
| `src/lib/gematriaCore.js` | המנוע (`GEM`, `calcGem`, `KEY_NUMBERS`) — חולץ בשלב 1 |
| libs ללא צרכנים: `richScore`, `systemEvents`, `wizard`, `nameCard`, `worldAnchorProjection`... | לוגיקת Foundation; לא נמחקו (דורשים החלטת בעלים) |
| 46 קבצי foundation/2029 עם בדיקות אך ללא צרכן בריצה | לא Legacy; חלק מהמנועים/המשטחים של 2029 בבנייה |
| 383 "יתומים" מקוריים | נבדקו; נמחקו רק 43 קבצי UI של Legacy שאין להם הפניה כלל |
| `public/sw.js` (37 שורות) | ה־2029 רושם `/sw.js` להתראות; ב־artifact החי נדרס ע"י ה־worker של ה־public-reading |
| הזכרות "legacy" ב־195 קבצים | מושגי נתונים (legacy_id, ארכיון הצ׳אט הוותיק, claim של פרופילים ישנים) — לא קוד Legacy |
| יכולות שנשארות בצד שרת | Auth, Supabase, Storage/TUS (`mediaResumableUpload`, `lifeJourneyHintMedia`), RLS, API, מנועי גימטריה/ELS/Raziel/Journey — לא נגעתי |

## שירותים שחולצו
`gematriaCore.js` (מנוע), `palette2029`/`paletteTokens2029`/`themePreset2029` (theme עצמאי), `paletteRoles2029` (תפקידי צבע על פלטת 2029 במקום קבועי הזהב של Legacy), lens metadata ב־`experienceContext`.

## ביצועים — לפני/אחרי (`scripts/measure-2029-load.mjs`; Chromium, CPU x4, 390×844, localhost בלבד)
| מדד | לפני | אחרי הסרת הריצה | אחרי הסרת ה־theme |
|---|---|---|---|
| Eager: chunks / gzip / modules | 26 / 199.9KB / 100 | 26 / 199.8KB / 100 | 26 / 199.5KB / 99 |
| כל ה־chunks הנגישים (gzip) | 1,955.5KB | 1,955.7KB | 1,955.6KB |
| Build 2029 (בלבד) | 2.7s | 1.9s | 2.7s |
| `npm run build` | שני builds (Legacy+2029) | build יחיד | ≈3.3s |
| ביקור ראשון LCP / long tasks | 1,012ms / 2 | 1,024ms / 2 | 1,012ms / 3 |
| ביקור חוזר LCP | 656ms | 664ms | 640ms |
| בקשות בעמוד הבית / JS | 109 / 60 | 109 / 60 | 110 / 61 |
**מסקנה:** הסרת Legacy לא שינתה את ביצועי 2029 בפועל (בתוך רעש המדידה). זה צפוי: Legacy היה מסמך ובנייה נפרדים. היתרון הוא תחזוקה: −401 קבצי `src` (−5.4MB מקור), build אחד, גרף סגור. **האיטיות לא נפתרה** — עמוד הבית טוען 60 קובצי JS (≈1.8MB לא דחוס), וזה האזור לטיפול בנפרד.

## בדיקות
- סט מלא (875 קבצי בדיקה Node): בסיס 728 עוברות / 146 נכשלות (סביבה: חסרות חבילות, Playwright/Supabase חיים); אחרי השינויים: אין בדיקה שעברה לפני ונכשלת עכשיו (למעט `expression-extract-packaging-guard`, שנכשלת רק כשיש שינויים לא־committed ועוברת אחרי commit).
- Build, בדיקות בידוד, גרף 2029 סגור, `test-legacy-retired`, build של ה־artifact הציבורי (מצב dormant) — עוברים.
- דפדפן (Chromium, 390 ו־1440): 18 נתיבים × 2 viewports נטענים ללא שגיאות (`/2029`, `/world`, `/post`, `/number`, `/gematria`, מחשבון הקהילה, `/community/chat`, `/code`, `/books`, `/gallery`, `/privacy`, `/unsubscribe`, `/heichal`, `/login`, `/2029/control`, `/2029/me`, 404). בדיקת theme בדפדפן עוברת.
- CI (workflow_dispatch על הענף): ראו הדיווח.

## לא ניתן היה לבדוק
- Preview של Vercel (אין deployments לענף; `git.deploymentEnabled=false`; לא נוצר ללא אישור).
- Auth/העלאות/פרסום/קהילה **חיים** (דורשים Supabase חי ו־Playwright ב־CI); נבדקו רק חוזים סטטיים וטעינת מסכים.
- INP; ביצועי רשת/CDN אמיתיים; שערי `pull_request`־בלבד (`follow-identity-isolated-db-gate`, `media-release-batch-gate`).
- ה־CLAUDE.md ו־`SOD1820_MASTER_*` עדיין מתארים את Legacy; לא עודכנו (מסמכי בעלים).

## סיכונים פתוחים
1. אין כרגע ממשק פרסום/ניהול/העלאה בריפו; נדרש תחליף 2029 אם הוא נדרש מעבר ל־Git.
2. קישורים פנימיים של 2029 לכתובות ישנות (למשל `/reality`) מסתיימים ב־404.
3. `src/theme.js` והפרוביננס של `expression-extract` — ראו למעלה.
4. הענף 22 קומיטים אחרי `origin/main`; נדרש rebase לפני מיזוג.
