# הסרת Legacy מהקוד הפעיל — Audit לפני מחיקה (5.11.2026)

> **מצב חי (5.11):** הפרודקשן הוא `main` = `b0a752c66` (`dpl_jMPhd1gbMuoDRHk1PLXxg18PRHPP`; יעד חזרה `dpl_8wS3rP2YgbqSaapmYxa3SAk8jdFk` = `18c98fa6f`). **ההסרה המתוארת כאן עדיין אינה בחי** — היא בענף `claude/2029-legacy-separation-e8j9tf` בלבד, ממוזגת נקי מול `b0a752c66`, ללא PR/מיזוג/פריסה.

בסיס: `28ab3aaea` על `claude/2029-legacy-separation-e8j9tf`. אין PR/merge/פריסה. הנתונים נוצרו מהכלים ב־`tools/legacy-removal/` (גרף ייבוא סטטי+דינמי מכניסת 2029 ומכניסת Legacy, והפניות מסקריפטים, בדיקות ו־edge functions).

## מצב הקבצים ב־`src` (1,581 קבצים)
| קבוצה | קבצים | משמעות |
|---|---|---|
| משותפים (גם 2029 וגם Legacy) | 512 | נשארים; הופכים ל־2029 אחרי הסרת Legacy (ללא פיצול) |
| 2029 בלבד | 341 | נשארים |
| **Legacy בלבד** (נגישים רק מ־`src/main.jsx`) | **345 (≈5.0MB)** | מועמדים למחיקה |
| יתומים (לא נגישים משום כניסה) | 383 | 209 בדיקות, 27 SVG, 134 קוד/CSS — דורשים בדיקה נפרדת; **לא למחוק בשלב זה** |

## Legacy בלבד — סיווג
| סיווג | קבצים | פירוט |
|---|---|---|
| **Keep / Extract** | 2 | `lib/analysisFlow.js`, `lib/triage.js` — מיובאים ע"י `supabase/functions/expression-extract` וסקריפטי audit (לוגיקה שנדרשת בצד שרת). |
| **Replace — אין תחליף ב־2029** | 66 (≈1.5MB) | ראו הסעיף הבא. |
| **Delete** | 277 (≈3.5MB) | `src/App.jsx`, `main.jsx`, `routes.jsx`, `legacy/legacy.jsx` (265KB), `components/layout/*` (Navbar, BottomBar, Footer, טיקרים), דפי תוכן ציבוריים שיש להם מקבילה ב־2029 (Home, Posts, Number, Topic, Gallery, Beit Midrash, Journey...), UserCenter, `adminTheme.css` וכו'. |

## יכולות שקיימות רק ב־Legacy (אסור להכריז על מחיקה בלי החלטה)
בגרף 2029 **אין** עורך פוסטים, מסוף ניהול, העלאת מדיה (TUS/Storage) מתוך ממשק, רכישת קרדיטים או תיבת WhatsApp. הם נמצאים רק כאן:
| קבוצה | קבצים | KB | יכולת |
|---|---|---|---|
| C1 מסוף ניהול (`AdminPage` + `components/admin/*`) | 60 | 1,405 | ניהול, העלאות, כתיבות DB, edge functions, מודרציה |
| C2 כתיבת פוסטים/מדיה (`PostEditorPage`, `AdvancedPostEditor`, `ContributorStudio`, `UploadFindings`, `LeadOrderEditor`) | 5 | 112 | פרסום פוסטים והעלאות |
| C3 `CreditsBuyPage` | 1 | 18 | רכישת קרדיטים |
| C4 `WaInboxPage`, `WaChatWindow` | 2 | 13 | תיבת WhatsApp לניהול |
**חשוב:** ה־artifact החי (`public-reading-deploy`) הוא קריאה־בלבד ואינו מגיש אף אחד מהמסכים האלה (`rm dist/index.html`, ה־worker חוסם כתיבות). כלומר מחיקתם אינה פוגעת ביכולת חיה היום, אבל היא מוחקת את ממשק הפרסום/ניהול היחיד שבריפו. נדרשת החלטה (ראו בדיווח).

## קשרים לתשתית השחרור (דורשים אישור נפרד לפי CLAUDE.md)
- `scripts/test-legacy-production-lock.mjs` — שער חובה שנקרא גם מ־`prebuild` ומ־`build-public-reading-production.mjs`; בודק גם את `src/App.jsx` ואת `vercel.json`.
- `scripts/build-public-reading-production.mjs` כותב `rollback/legacy-sw.js` ואת `legacyRollbackWorkerSha256` ל־artifact החי (SW של Legacy כיעד חזרה).
- `vercel.json` בשורש מכיל catch-all ל־`/index.html` של Legacy; ה־artifact החי משתמש ב־`public-reading-deploy/vercel.json`.
- `.github/workflows/legacy-production-lock.yml` ושערים נוספים שמפנים ל־`src/App.jsx`.
שינוי השערים הללו הוא שינוי בשער שחרור ולא מתבצע בלי אישור מפורש.

## ניקוי בדיקות (נפילה צפויה מהמחיקה)
66 קבצים מחוץ ל־`src` מפנים בטקסט לנתיבי Legacy: 18 שורות ב־`test-2029-module-boundary`, 14 ב־`test-2029-built-graph`, `test-2029-isolation`, `test-legacy-research-containment`, `test_canonical_presentation`, `test-route-legitimacy-2029`, כ־30 בדיקות `test/*.test.mjs` שקוראות מקור של דפי Legacy (AdminPage, Navbar, HomeNewPage, ResearchViewerLegacyV0Page...), ו־`2029-isolation-gate.yml`, `g4-public-core-gate.yml`. בדיקות שמטרתן לאכוף התנהגות של קוד שנמחק יימחקו יחד איתו; בדיקות הגבול יעודכנו (ה־forbidden list יהפוך ל"הקבצים האלה אינם קיימים").

## בסיס ביצועים (לפני) — `scripts/measure-2029-load.mjs`
Chromium, CPU x4, 390×844, רשת חיצונית חסומה (מבודד עלות JS של הלקוח; אינו מודד Supabase/CDN אמיתיים), חציון של 3 ריצות על `/2029`.
| מדד | ערך |
|---|---|
| Build 2029 | 2.7s |
| Eager: chunks / gzip / modules | 26 / 199.9KB / 100 (64 מודולי אפליקציה) |
| כל ה־chunks הנגישים | 246 / 1,955KB gzip |
| ביקור ראשון: TTFB / FCP / LCP | 2.8ms / 140ms / 1,012ms |
| ביקור ראשון: long tasks | 2 (241ms, מקסימום 114ms) |
| ביקור ראשון: בקשות / JS / העברה | 109 / 60 / 1,791KB (לא דחוס בשרת הבדיקה) |
| ביקור חוזר: LCP / בקשות / העברה | 656ms / 109 (מהמטמון) / 1.5KB |
| INP | לא נמדד (דורש אינטראקציה אמיתית) |
**ממצא עצמאי מ־Legacy:** כניסה ל־`/2029` טוענת 60 קובצי JS (≈1.8MB לא דחוס) — רוב ה־chunks של המסלול הראשי נטענים כבר בעמוד הבית. זה חשוד מרכזי לאיטיות, ומחיקת Legacy לא תשנה אותו.

## שלבי ההסרה המתוכננים (כל אחד בקומיט נפרד, עם build + בדיקות + מדידה לפני/אחרי)
1. מחיקת Legacy ציבורי שאין לו צרכן: `layout/*`, דפי תוכן, `legacy.jsx`, UserCenter וכו' (+ עדכון בדיקות הגבול והבדיקות התלויות).
2. הסרת גשרי theme/palette (`themeHostAdapter2029`, `paletteHostAdapter2029`, plugins ב־vite) ו־`themeMode/palette/lightRoutes/chromeTheme` של Legacy; הרכיבים הנותרים עוברים ל־`use2029Palette` ול־store של 2029.
3. הסרת יעד הבנייה Legacy (`index.html`, `main.jsx`, scripts/`vite.config` ו־`package.json`) — כפוף לאישור שערי השחרור.
4. C1–C4 והיתרה לפי ההחלטה.
5. יתומים (383): Audit נפרד.
