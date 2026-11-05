# ממצאי שלב 2 — רכיבים וחוזים משותפים בין 2029 ל־Legacy (טבלה לפני שינוי מסיבי)

> **מצב חי (5.11):** הפרודקשן הוא `main` = `b0a752c66` (`dpl_jMPhd1gbMuoDRHk1PLXxg18PRHPP`; יעד חזרה `dpl_8wS3rP2YgbqSaapmYxa3SAk8jdFk` = `18c98fa6f`). **ההסרה המתוארת כאן עדיין אינה בחי** — היא בענף `claude/2029-legacy-separation-e8j9tf` בלבד, ממוזגת נקי מול `b0a752c66`, ללא PR/מיזוג/פריסה.

בסיס: ענף `claude/2029-legacy-separation-e8j9tf`. שיטת המדידה: גרף ייבוא מלא (סטטי+דינמי) מ־`src/main2029.jsx` מול `src/main.jsx`.
"משתמש Legacy" = מודול שנמצא רק בגרף Legacy ומייבא את הרכיב. ההכרעה מבוססת תוכן ו־imports בפועל, לא על שם תיקייה.

## נתונים
| | |
|---|---|
| מודולים בגרף 2029 | 853 (339 רק ב־2029) |
| משותפים עם Legacy ושמם אינו 2029 | 296 |
| מתוכם **אין להם אף משתמש Legacy** (בפועל שייכים ל־2029, רק לא מסומנים ככאלה) | 197 (172 lib, 25 רכיבי UI/CSS) |
| משותפים בפועל (יש משתמש Legacy) | 99 · מתוכם UI/State: 47 |
| מודולי 2029 שמייבאים ישירות חוזה Legacy או קוראים `usePalette()` | 32 |
| מודולי 2029 הנוגעים בחוזה Legacy בעקיפין | 219 |

## ממצאים מבניים (לא ברמת רכיב)
1. **`palette.js` הוא קובץ מעורב.** מכיל גם את הפלטה של Legacy (`PALETTES`, `usePalette`, טבלת נתיבים `lightRoutes.js`) וגם את 2029 (`DESIGN_V2_PALETTES`, `use2029Palette`). הוא מייבא `lightRoutes.js` ו־`themeMode.js`, ולכן כל מודול 2029 שצורך `use2029Palette` תלוי בעקיפין בטבלת נתיבי Legacy. `PaletteProvider` הוא קונטקסט יחיד לשני הצדדים.
2. **מצב ערכת נושא משותף.** `themeMode.js` שומר ב־`localStorage["sod-theme"]` וכותב `<html data-theme>`; אותו מפתח כותב גם ה־Navbar של Legacy. מתג ב־Legacy משנה את 2029 ולהפך.
3. **`theme.js` מכיל מנוע גימטריה.** מלבד טוקנים של Legacy (`C`, `F`, `LOGO_URL`, `GLOBAL_CSS`) הוא מכיל `GEM`, `calcGem`, `KEY_NUMBERS`. מנועים (`gematria.js`, `engine.js`, `timeFlow.js`, `numberMessage.js`) מייבאים ממנו. כל מודול 2029 שנוגע במנוע תלוי בקובץ הטוקנים של Legacy. הפתרון הוא חילוץ של המנוע כמות שהוא (בלי שינוי לוגיקה) ו־`theme.js` יעשה re-export ל־Legacy.
4. **`AuthContext.jsx`** — session יחיד הוא תשתית נדרשת, אבל הוא מכיל תופעות לוואי של Legacy (קרדיטים יומיים, WA, referral, marketing). הן צריכות לעבור לבחירה מפורשת של שורש Legacy.
5. **`PersonJourney.jsx`** (1,796 שורות) — רכיב Legacy עם דגל `variant="2029"`. זו בדיוק התבנית שיש להפסיק.
6. **`stream.js`** — מצב "ממלכה/מציאות" עם `<html data-stream>` ו־localStorage משותפים; `experienceContext` צורך ממנו קבועים.
7. **חוק "רכיב קנוני יחיד" (`canonical_ui_components_law`)** מנוגד להחלטה הנוכחית. לכן הפעולה המומלצת בכל רכיב כזה היא **פיצול**: הלוגיקה (RPC, אופטימיות, מדיניות) עוברת לשירות ניטרלי, ולכל מערכת UI משלה — ולא שכפול הרכיב.

## טבלת הרכיבים (UI שמשותף בפועל עם Legacy)
סיווג: **L** Legacy בלבד · **N** נדרש רכיב/חוזה 2029 עצמאי · **I** תשתית ניטרלית (מותר) · **F** פונקציונליות משותפת: הפרדת שירות מממשק.

| רכיב | משתמשי Legacy | משתמשי 2029 | מקור/ממצא בתוכן | מתאים ל־2029? | סיווג | פעולה מומלצת |
|---|---|---|---|---|---|---|
| MaintenanceLock | 15 (App, Topic, Posts…) | 7 | resolver של site_flags + נעילת קריאה ציבורית **ובנוסף** UI "mlock" עם לוגו מורשת מ־theme.js | חלקית (ה־resolver כן, ה־UI לא) | F | להפריד שירות feature-state; ל־2029 יש כבר `FramedGate2029` |
| FeatureClosedNotice | 2 | 2 | usePalette + theme.js | לא | N | רכיב סגור ל־2029 על `use2029Palette` |
| NotFoundPage | 1 | 2 | 29 שורות, usePalette | לא | N | `NotFound2029` |
| PrivacyPage / UnsubscribePage | 1 / 1 | 1 / 1 | עמודי שירות על Legacy usePalette | לא | N / F | UI 2029; RPC הסרת מנוי נשאר |
| VideoAssetPage | 1 | 1 (רק `Player`) | 2029 לוקח רק קומפוננטה אחת מעמוד Legacy | חלקית | F | לחלץ `Player` |
| EntityHubPreviewPage | 1 | 1 | ממוּנט משני ה־Apps | לא הוכרע | N | **החלטה:** בעלות 2029; מסלול Legacy → handoff (נוגע ב־Legacy routing) |
| CommunityCalculatorPage + NameMultiSearch + VisitorSearchesBox | 1/1/1 | 1/1/1 | 802 שורות, palette Legacy, localStorage, popups; 2029 עוטף בפרופס `passive/actionsLocked` | לא | N | משטח מחשבון 2029 מעל מנוע הגימטריה (ללא שינוי מנוע) |
| ShareActions | 11 | 13 | לוגיקה ב־`lib/share.js`; UI על usePalette/theme.js | UI לא | F | `ShareActions2029` מעל share.js |
| WatchButton, PostFollowBox | 8 / 1 | 6 / 2 | מנוע משפך מנויים + UI; "ברירות מחדל Legacy נשמרות" | UI לא | F | שירות follow ניטרלי + UI 2029 |
| ReactionBar | 2 | 2 | RPC + עדכון אופטימי + בוסט אדמין | UI לא | F | שירות reactions + UI 2029 |
| ReportHint / IssueReport | 4 / 0 | 1 / 1 | דיווח רמז (community_hints); IssueReport רק פולט טלמטריה | IssueReport כן | F / I | IssueReport ניטרלי; ReportHint UI 2029 |
| StayUpdatedCTA | 3 | 4 | newsletter owner + `chromeTheme` + `themeMode` של Legacy | UI לא | F | שירות הסכמה/שליחה נשאר; UI ב־2029 |
| StrongHintBadge | 8 | 1 | 43 שורות, theme.js | לא | N | תג 2029 |
| Lightbox | 8 | 2 | 329 שורות, טוקני theme.js, כפתור עריכת אדמין | לא | N | מציג מדיה 2029 (`CanonicalMediaFigure2029` כבר בעלים) |
| ProfileSettings | 1 (+/profile) | 2 | העלאת אווטאר/Storage + שמירת פרופיל | UI לא | F | שירות פרופיל/העלאה ללא שינוי; UI 2029 |
| PersonJourney | 1 | 1 | Legacy + `variant="2029"` | לא | N | משטח Journey 2029; מנועים/projections ללא שינוי |
| TzofenEmbed + SubscribeGate | 4 / 7 | 1 / 1 | embed עם storage/events/popups, עטוף בשער Legacy (`subscribe_gate_law`) | לא | N / L | הסרת השער מנתיב 2029; embed 2029 |
| EmailVerify | 0 (דרך שערים) | 2 | OTP UI; קיים `Auth2029Page` | לא | F | להסיר אחרי פיצול WatchButton/SubscribeGate |
| ContributorFindingsLens | 1 | 1 | ממוּנט ב־ContributorPage וב־PublicContributor2029Page | לא | N | עדשה 2029 מעל אותן projections |
| TopicConvergenceContent | 2 | 1 | ממוּנט ב־TopicPage וב־World2029Page | לא | N | תוכן נושא 2029 |
| MatrixRain | 2 | 1 | canvas עם props בלבד, ללא imports מלבד React/תמה/state | כן | **I** | נשאר; מאושר כניטרלי |
| HumanDateInput | 3 | 2 | בקרת קלט טהורה, ללא palette/router/state | כן | **I** | נשאר; מאושר כניטרלי |
| features/personalPanels/PageEditor, MessagesHub | 1 (re-export) | 1 | **נוצרו בסבב הקודם; עדיין בסגנון Legacy (`T` מ־UserCenter) ו־RPC** | לא | F | לא סופי: פאנל 2029 + שירות ניטרלי |
| AuthProvider.jsx | 1 | 1 | shim של 4 שורות | — | L | להסיר מנתיב 2029 (נשאר ל־Legacy) |
| CanonicalProgress, person-journey.css, EmailVerify, ContactGateway, IssueReport, ResearchIcon, SignatureResearchIcon, Heichal/World* (25 UI) | 0 | 1–12 | אין להם משתמש Legacy | כן, אחרי החלפת usePalette | N בפועל | להעביר לבעלות 2029 (שם+`use2029Palette`) אחרי בדיקת תוכן |

## טבלת חוזים/state (lib)
| חוזה | משתמשי Legacy | משתמשי 2029 | ממצא | סיווג | פעולה |
|---|---|---|---|---|---|
| palette.js (usePalette + route table) | 107 | 58 | קובץ מעורב, קונטקסט משותף | F | `palette2029.js` עצמאי; Legacy palette נשאר |
| themeMode.js | 13 | 7 | מפתח `sod-theme` ו־data-theme משותפים | N | store 2029 נפרד; **החלטה** על מיגרציית הערך השמור |
| lightRoutes.js, chromeTheme.js | 3 / 3 | 1 / 1 | טבלת נתיבים וצבעי Navbar של Legacy | L | יוצאים מגרף 2029 |
| theme.js | 25 ייבוא | 25 | טוקנים Legacy + מנוע גימטריה | F | חילוץ GEM/calcGem/KEY_NUMBERS כמות שהם |
| stream.js | 9 | 1 | stream משותף, `data-stream` | N | **החלטה** |
| AuthContext.jsx | 73 | 54 | session נדרש + תופעות לוואי Legacy | I (עם תיקון) | תופעות לוואי לשורש Legacy |
| ResearchProvider.jsx | 20 | 35 | קונטקסט משותף, מפתח rollout משותף | F | **החלטה** |
| supabase, tracking, events, identity, visits, acquisition, auth, oauthReturn, privacy, propagation, hints, openweb, seo | — | — | תשתית/נתונים ללא UI | I | נשאר |
| gematria/engine/timeFlow/numberMessage | — | — | מנועים; רק ייבוא מ־theme.js | I | שינוי ייבוא בלבד אחרי החילוץ |

## אכיפה שנוספה (שלב 6)
`scripts/test-2029-module-boundary.mjs` + `scripts/2029-legacy-coupling-baseline.json`: שלוש קבוצות מחושבות מהגרף האמיתי — (1) שימוש ישיר בחוזה Legacy או `usePalette()` (32), (2) מודולי UI/State שגם קוד Legacy מייבא (47), (3) מודולי 2029 שנוגעים בחוזה Legacy בעקיפין (219). כל קישור **חדש** נכשל; ערך שנעלם חייב להימחק מה־baseline (ratchet, ללא עדכון אוטומטי). נבדק בשתי מוטציות (ייבוא `theme.js` ל־Footer2029, וייבוא `Discourse.jsx` ל־Posts2029Page) — שתיהן נתפסו.

## סדר ביצוע מוצע (ממתין לאישור)
1. חילוץ מנוע גימטריה מ־`theme.js` (שינוי ייבוא בלבד, בלי שינוי לוגיקה).
2. `palette2029.js` + store ערכת נושא 2029 → מוריד את כל התלות העקיפה דרך palette/themeMode/lightRoutes.
3. רכיבי N הקטנים (NotFound, FeatureClosed, StrongHintBadge, Privacy/Unsubscribe).
4. פיצול שירות/UI: Watch/Follow, Reactions, Share, Profile, ReportHint, StayUpdated.
5. משטחים גדולים: מחשבון קהילה, PersonJourney, Lightbox, Tzofen/ELS embed.
6. Auth/Research providers — אחרי החלטה.
