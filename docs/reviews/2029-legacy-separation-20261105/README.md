# הפרדה ארכיטקטונית 2029 ↔ Legacy — Audit ומסירה (5.11.2026)

> **מצב חי (5.11):** הפרודקשן הוא `main` = `b0a752c66` (`dpl_jMPhd1gbMuoDRHk1PLXxg18PRHPP`; יעד חזרה `dpl_8wS3rP2YgbqSaapmYxa3SAk8jdFk` = `18c98fa6f`). **ההסרה המתוארת כאן עדיין אינה בחי** — היא בענף `claude/2029-legacy-separation-e8j9tf` בלבד, ממוזגת נקי מול `b0a752c66`, ללא PR/מיזוג/פריסה.

> **עדכון:** הסיווג המעמיק של הרכיבים והחוזים המשותפים נמצא ב־[FINDINGS.md](FINDINGS.md). `src/features/personalPanels/*` שנוצר בסבב הראשון **אינו** מצב סופי — הוא עדיין בסגנון Legacy ומסומן שם כ־F.

בסיס: `origin/main` = `a27d8d06ff72e8ae664c02f0a5bc0bb66dd7a1b5`, ענף `claude/2029-legacy-separation-e8j9tf`.
היקף: קוד בלבד. אין Production/alias/דומיינים, אין שינוי Supabase/RLS/Storage, אין מחיקת קבצים. זו עבודת ענף ולא פריסה.

## ממצאי Audit (גרף ייבוא מ־`src/main2029.jsx`, סטטי + דינמי; ובנייה עם sourcemap)

| תחום | מצב לפני | מצב אחרי |
|---|---|---|
| `components/layout/*` (Navbar, BottomBar, Footer, Tickers, LiveActivityBar, Backdrops, Launchers) — 19 קבצים | לא בגרף 2029 | לא בגרף 2029 + נאכף ב־test חדש |
| `App.jsx`, `main.jsx`, `appHeal`, `adminTheme` | לא בגרף | נאכף |
| InstallPrompt / UpdateBanner / SitePromoPopup / AiQuotaToast / ProfileNudge / AskRaziel | לא בגרף | נאכף |
| `userCenter/UserCenter.jsx` (מגירת Legacy, 1822 שורות) + `UserCenterContext`, `HintsPanel`, `useWaLink`, `MyTreeCard` | **נארז בצ׳אנק `WriterPersonal2029Page`** (`PageEditor`/`MessagesHub`). `test-2029-built-graph` לא זיהה זאת כי הוא בודק זהות צ׳אנק בלבד | **הוצא מהבנייה של 2029** |

## מה הופרד בפועל
- `PageEditor`, `looksGenericName` ← `src/features/personalPanels/PageEditor.jsx`.
- `MessagesHub`, `RepliesPanel`, `InboxPanel`, `MyContributionsList`, `personalReplyContext` ← `src/features/personalPanels/MessagesHub.jsx`.
- המימוש הועבר כמות שהוא (לא הועתק, לא שונה שם). Legacy `UserCenter.jsx` מייבא ומייצא מחדש את אותם סמלים — אין שינוי התנהגות ב־Legacy.
- `WriterPersonal2029Page` מייבא מהמודול הנייטרלי בלבד.
- Backend/Auth/RPC (`commandCenter.js`, `AuthContext`, Supabase) לא נגעו בהם.

## אכיפה חדשה
`scripts/test-2029-module-boundary.mjs` (`npm run test:2029-module-boundary`, מחובר ל־`2029-isolation-gate.yml`): סורק ברמת מודול כל ייבוא סטטי ודינמי מכניסת 2029 ונכשל אם מודול Shell/UI של Legacy (41 מודולים/משטחים) נגיש. אומת שהוא נכשל כשמחזירים ייבוא ל־`UserCenter.jsx` ועובר בלעדיו.

## סיווג חוזים
1. UI/Navigation/Layout — מחוץ ל־2029: כל הטבלה למעלה.
2. פנימי ל־Legacy — נשמר מאחור: `UserCenter` (מגירה, Roadmap, WhatsApp, Credits וכו׳), `layout/*`, `App.jsx`.
3. Backend/API/Data/Auth — נשמר: `lib/commandCenter.js`, `AuthContext`, `supabase.js`, מנועי גימטריה/ELS (`lib/gematria.js`, `coreEngine.js` נגישים בגרף המקור; הם מנועים, לא UI, ונשארו).
4. משותף — גבול נייח: `src/features/personalPanels/*` (שני הצדדים תלויים בו; הוא לא תלוי באף Shell).

## נשאר משותף ולא הופרד (דורש החלטה — לא נוחש)
- `components/ProfileSettings.jsx` — טופס פרופיל קנוני משותף (גם `/profile` ב־Legacy). נטען ב־2029 בצ׳אנק נפרד. לא Shell; לא הועבר.
- `components/MatrixRain.jsx` (אפקט ב־`Post2029Page`), `NotFoundPage.jsx` (עטוף ב־`Sod2029Shell`), `MaintenanceLock`, `FeatureClosedNotice`, `Lightbox`, `ReactionBar`, `PersonJourney` ועוד ~35 קומפוננטות לא־`2029` ששמן ישן. אלו רכיבי תוכן/שער ולא Shell/ניווט; סיווג מלא ומעבר לשם 2029 דורש אישור (שינוי נראות), ולכן הושאר.
- בדיקת `test-2029-built-graph` נשארת ברמת צ׳אנק; המודול־רמה החדש משלים אותה, לא מחליף.

## בדיקות שהורצו (מקומית)
`npm run build` (Legacy+2029) ✔ · `test-2029-isolation` ✔ · `test-2029-built-graph` ✔ · `test-2029-module-boundary` ✔ · `test-legacy-production-lock` ✔ · `test-legacy-research-containment` ✔ · `test-2029-system-frame` ✔ · `test-public-2029-language` ✔ · `test-one-tree-content-contract` ✔ · `test/personal-replies-community-2029` ✔ (עודכן לקרוא את המודול החדש) · `test/wa-db-held-http-cutover-v4` ✔.

## לא נבדק / סיכונים
- לא הורצו בדיקות דפדפן אמיתיות (390/1440, מנהל/משתמש), lint (אין תצורת lint ב־repo), Preview של Vercel, Isolation A3, העלאות/TUS/פרסום/Auth חיים. בדיקות אלו דורשות CI/Preview ואישור — לא מוצהרות כעבור.
- קבצי העלאה, TUS, Supabase, RLS, Storage לא שונו ולכן לא נפגעו.
- אין הכרזת השלמה כללית: הפרדת UI/Shell הושלמה ונאכפת; הרכיבים המשותפים שלמעלה ממתינים להחלטה.
