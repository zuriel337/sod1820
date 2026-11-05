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
