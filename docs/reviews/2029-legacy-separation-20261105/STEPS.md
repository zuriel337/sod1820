# יומן ביצוע — שלבים 1–3 (החלטות צוריאל, 5.11.2026)

כל שלב בקומיט נפרד; rollback = `git revert` של הקומיט. אין PR, merge או פריסה.

## עדכון חוק `canonical_ui_components_law` (רשומה בריפו בלבד)
ההחלטה: לוגיקה עסקית ושירותים ניטרליים יכולים להיות קנוניים ומשותפים; UI, state, providers ו־flows מערכתיים אינם חייבים להיות משותפים; Legacy UI אינו מקור אמת ל־2029; אין לשכפל לוגיקה עסקית — מפרידים לוגיקה מממשק.
**החוק החי נמצא ב־Supabase ולא שונה** (אין שינוי תשתית חיה בלי אישור נפרד). נדרש אישור לעדכון הרשומה שם ולגרסה מתאימה ב־Owner Index.

## שלב 1 — חילוץ מנוע הגימטריה מ־`theme.js` — הושלם (קומיט `df4616850`)
- `GEM`, `calcGem`, `KEY_NUMBERS`, `isWarmNumber` הועברו מילה במילה ל־`src/lib/gematriaCore.js`; `theme.js` מייצא אותם מחדש (Legacy לא נגע).
- `gematria.js`, `engine.js`, `timeFlow.js`, `numberMessage.js`, `Lightbox.jsx` מייבאים מהליבה.
- הוכחה: ה־API של `theme.js` זהה לפני/אחרי (שמות וערכים), `calcGem` על אותם קלטים מחזיר אותן תוצאות, ו־`theme.calcGem === core.calcGem`. הבנייה ובדיקות הבידוד/הגרף/הנעילה עברו. התלות העקיפה של 83 מודולי 2029 בקובץ הטוקנים של Legacy נעלמה.
- בדיקות שנכשלות בסביבה ללא קשר: `doc37-post-follow-admission` (חסר `react-test-renderer`), `expression-extract-packaging-guard` (חסר artifact של build).

## שלב 2 — store ו־palette של 2029 — **נעצר ובוטל (rollback)**
מה נבנה (קומיט `978db7979`, בוטל ב־`9411dfde7`; העץ זהה לשלב 1):
`themePreset2029.js` (מפתח `sod2029:theme-preset`, מאפיין `data-theme-2029`, seed חד־פעמי מ־`sod-theme` עם סמן, בלי כתיבה ל־Legacy), `paletteTokens2029.js` (טוקנים טהורים, הועברו מילה במילה), `palette2029.js` (קונטקסט ו־hook עצמאיים), גשר בנייה ל־2029 בלבד, שינוי 17+ מודולי 2029, 6 קובצי CSS, ובדיקת `test-2029-theme-isolation`. הבדיקות הרלוונטיות עברו.

**התלות הלא צפויה שעצרה אותי:** `src/App.jsx` של Legacy מרנדר בתוך סביבת Legacy דפי 2029: `/world` (World2029Page), `/heichal` ו־`/היכל` (Heichal2029Page), `/2029` כש־`CORE_PUBLIC_LAUNCH_2029=false` (Home2029Page), ו־`/community-shadow-preview-2029`. בסך הכול 85 מודולי 2029 נטענים בתוך ריצת Legacy. אחרי ההפרדה הם היו קוראים את ה־store של 2029 (העדפה נפרדת, מאפיין `data-theme-2029`, כתיבה למפתחות `sod2029:*`) במקום את מתג הערכה של Legacy — שינוי התנהגות ב־Legacy, בניגוד לדרישת "Legacy לא משתנה".

אפשרויות (דורש החלטה):
- **A (מומלץ):** גשר הפוך בבניית Legacy: `themePreset2029.js`→`themeMode.js` ו־`palette2029.js`→מעטפת על `palette.js`. דפי 2029 שמארח Legacy ממשיכים לעקוב אחרי הערכה של המארח (כמו היום); ה־2029 הציבורי עצמאי. נוסף בדיקה שמוכיחה ש־Legacy לא מגיע ל־store של 2029.
- **B:** להסיר את דפי 2029 מנתיבי Legacy (handoff למסמך 2029) — שינוי routing של Legacy, דורש אישור נפרד.
- **C:** להשאיר את הדפים המאורחים על ה־store של 2029 — לא מומלץ (משנה את Legacy).

## שלב 3 — רכיבי N קטנים — בדיקת תלויות בלבד (לא בוצע שינוי)
| רכיב | משתמשי 2029 | משתמשי Legacy בלבד | מארח ב־Legacy? | הערה |
|---|---|---|---|---|
| FeatureClosedNotice | App2029, Els2029Page | 2 (HomeForumTile, Discourse) | לא | בטוח ליצור גרסת 2029 |
| NotFoundPage | PublicPostAddress2029Page, PublicServices2029Page | 1 (App.jsx) | לא | בטוח |
| StrongHintBadge | PostCategories2029 | 8 | **כן** (`PostCategories2029` מרונדר גם ב־Legacy) | החלפת הייבוא ב־PostCategories2029 תשנה את Legacy — לטפל אחרי הכרעת שלב 2 |
| PrivacyPage / UnsubscribePage | PublicServices2029Page | 1 / 1 (App.jsx) | לא | בטוח |
כל גרסאות 2029 החדשות ישתמשו ב־`use2029Palette`; היא קוראת את ה־store הנוכחי עד להכרעת שלב 2 ותועבר אחריה.

## מפת תלות לפני שינוי — `stream.js` ו־`ResearchProvider` (ללא שינוי בקוד)
| | משתמשי 2029 | משתמשי Legacy בלבד | state / subscriptions | הערה |
|---|---|---|---|---|
| `lib/stream.js` | 1 (`experienceContext` — קבועי `STREAMS`) | 9 (App, HomeNewPage, HomeReality, StreamGate, JourneyPage/V2, StreamSwitch, Navbar, LayoutCore) | localStorage (מפתח זרם + A/B), `<html data-stream>` | 2029 צורך רק קבועים; אפשר להפריד קבועים טהורים משכבת ה־store |
| `ResearchProvider.jsx` | 35 | 20 | `createContext`, localStorage/sessionStorage, מאזיני `online` ו־`message` (ELS), מפתח rollout | כל שורש מרכיב מופע משלו (App.jsx ו־App2029). אין channel ל־Realtime בקובץ, ולכן אין subscriptions כפולים בין השורשים; ההצעה: מופע נפרד לכל שורש וחלוקת מפתחות האחסון |


---
# עדכון — אחרי אישור אפשרות A (שלבים 2 ו־3)

## שלב 2 — הושלם בקומיט נפרד (`422769560`)
**2029 הציבורי:** store עצמאי `themePreset2029.js` (מפתח `sod2029:theme-preset`, מאפיין `data-theme-2029`), `paletteTokens2029.js` (טהור, הועבר מילה במילה), `palette2029.js` (קונטקסט/hook משלו). אין תלות ב־`lightRoutes` או ב־Navbar. ה־seed החד־פעמי קורא את `sod-theme` רק אם סמן ה־seed חסר ואין העדפה של 2029; אחרי הקריאה הראשונה נקבע סמן ולכן אין סנכרון ואין קריאה חוזרת.
**Legacy host:** Adapter הפוך בזמן בנייה בלבד (`themeHostAdapter2029.js`, `paletteHostAdapter2029.js`, plugin `legacyHostThemeAdapter` ב־`vite.config.js`). דפי 2029 שמארח Legacy מקבלים את ה־theme של המארח (חד־כיווני); בחבילת Legacy אין store של 2029 ואין מפתחות `sod2029:*`. ה־adapter משקף את `data-theme-preset` של המארח ל־`data-theme-2029` (מאפיין בלבד, בלי storage) כדי שה־CSS של 2029 יעבוד בדפים המאורחים.
**הסרה:** כשדפי 2029 מנותקים מ־Legacy — למחוק את שני קובצי ה־adapter ואת ה־plugin; אין להם שום ייבוא אחר (נאכף בבדיקה).
**גשר 2029:** רכיבים שעדיין משותפים (ShareActions, WatchButton, ReactionBar, StayUpdatedCTA, CommunityCalculatorPage...) ממשיכים לייבא `palette.js`/`themeMode.js`; בבניית 2029 הם מקבלים את המימוש של 2029 (`paletteBridge2029.js`, `themePreset2029.js`). נמחק כשהם מפוצלים (שלב 4).
**CommunityCalculatorPage:** בדיקת "יש העדפה שמורה" עברה ל־`hasStoredThemePreference()` של ה־store הרלוונטי (Legacy: אותה בדיקה על `sod-theme`; 2029: על המפתח שלו) — בלי שינוי התנהגות ב־Legacy.

### הוכחות (דפדפן אמיתי, Chromium, רשת חסומה חוץ מ־localhost)
- **שינוי theme ב־Legacy משנה רק דפי 2029 מאורחים:** `/2029` ב־Legacy מקבל `data-theme-2029` זהה למארח; בורר הערכה של הדף המאורח כותב למפתח המארח כמו קודם; עמוד Legacy רגיל (`/`) אינו נושא `data-theme-2029`; Legacy לא יוצר אף מפתח `sod2029:*`.
- **שינוי theme ב־2029 אינו משנה Legacy:** בורר 2029 אינו כותב `sod-theme`; פתיחת Legacy אחרי שינוי ב־2029 נותנת אותם מאפיינים כמו קודם והוא לא קורא את `sod2029:theme-preset`.
- **2029 הציבורי אחרי ה־seed אינו קורא את theme של Legacy:** שינוי `sod-theme` ל־`dark` וטעינה מחדש — 2029 נשאר עם בחירתו ואין קריאה למפתח (נמדד עם spy על `Storage.getItem`). **שימו לב:** בביקור הראשון בלבד נקרא `sod-theme` פעם אחת בהתאם להחלטה 3 (העתקה חד־פעמית); אם נדרש "אפס קריאות" מוחלט — להסיר את `seedOnce` (שורה אחת) במחיר איבוד העדפות קיימות.
- **אין flash / mismatch:** ערך המאפיין בטעינה נקבע פעם אחת בלבד ושווה לסופי (MutationObserver מתחילת המסמך); אין אזהרות hydration/mismatch בקונסולה (הרינדור client-only).
- **כל דפי Legacy כמו לפני:** 8 נתיבים × 4 מצבי theme (ללא/light/parchment/dark) מול בניית שלב 1 — theme attributes, צבעי רקע ומפתחות storage זהים 32/32, ו־Legacy לא כתב אף מפתח `sod2029:*`.
- בדיקות: `scripts/test-2029-theme-isolation.mjs`, `test/theme-separation-2029.browser.mjs` (מחוברות ל־`2029-isolation-gate.yml`), ושינוי מכוון (הסרת ה־plugin) נתפס.

## שלב 3 — רכיבי N קטנים שאומתו כבטוחים (קומיט נפרד)
- `FeatureClosedNotice2029` (`components/experience2029/`) ו־`NotFound2029Page` (`pages/`): מוצגים על `use2029Palette` ו־`TYPEFACE` של 2029, ללא `theme.js`/`palette.js`. אותו טקסט, אותו SEO (noindex) ואותה התנהגות. צרכנים: `App2029`, `Els2029Page`, `PublicPostAddress2029Page`, `PublicServices2029Page` (אף אחד מהם לא מרונדר ב־Legacy). הגרסאות Legacy נשארו ללא שינוי.
- שינוי חזותי יחיד: הגופן של שני הרכיבים עבר מ־`Assistant` (שלא נטען ב־2029) לגופני 2029 (Rubik / Noto Sans Hebrew).
- נבדק: `test/small-n-components-2029.test.mjs` (חדש), בדיקות הנתיבים/שירותים הציבוריים, ו־build.
- **לא בוצעו (ממתינים להחלטה):**
  - `StrongHintBadge` — הצרכן שלו `PostCategories2029` מרונדר גם ב־Legacy.
  - `PrivacyPage` — טקסט משפטי; גרסה נפרדת תשכפל תוכן, והפרדה נכונה דורשת הוצאת התוכן למודול נתונים ושינוי הקובץ של Legacy.
  - `UnsubscribePage` — לוגיקת fetch חתומה (~15 שורות); הפרדה נכונה דורשת הוצאתה לשירות ושינוי הקובץ של Legacy.
