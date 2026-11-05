# המשך חיבור המדידה וקוראי הניהול — Claude, 4.11.2026 (ענף בלבד)

סטטוס: **BRANCH_ONLY / לא מוזג / לא פרוס.** החי נשאר `969b51423d8b67b7b8061d067b5366e1e2a1c5e4` / `dpl_xw7fECMyWRrZvxxKdy71yobAhj8h`.
BEFORE ביומן: `db8fc5d4-1812-4082-b1da-ad252e1f46dd`, משימה `PUBLIC_PRODUCTION_OBSERVABILITY_RECONNECT_20261104`.
אין שינוי בקוד המוצר (22 הקבצים של `78775e8c3`). נוספו רק ראיות, סקריפטי בדיקה ובדיקת רגרסיה אחת.

## אימות בתחילת ההמשך
- HEAD מרוחק של הענף = `55576c9e93de0fa76694375c80772b157c762147`, כפי שנמסר. `origin/main` (`03e74edfb`) הוא אב קדמון של הענף, ולכן PR לענף main הוא diff נקי.
- אין שורות ביומן אחרי ה-AFTER של GPT (21:55 UTC); אין כותב חופף.

## שחזור הבדיקות על ה-HEAD המדויק
- `npm ci` + `npm run build` (Legacy + 2029) עברו; בניית תוצר ה-public-reading הרדום עברה.
- 4 קבצי הבדיקה של המימוש: **25/25 עברו**, אבל רק אחרי שני תנאי סביבה שאינם מוצהרים ב-`package.json`:
  1. `react-test-renderer@19.3.0` אינו תלות מוצהרת (ה-CI מתקין אותו ב-`--no-save`).
  2. `public-reading-observability.test.mjs` ו-`public-reading-provider-readers.test.mjs` דורשות `public-reading-deploy/.generated/protected-review-build.js`, שנוצר על ידי `node scripts/build-public-reading-production.mjs`. בלי בנייה זו הן נכשלות ב-checkout נקי.
- `scripts/test-web-vitals-2029.mjs` ו-`scripts/test-legacy-production-lock.mjs`: PASS.

## קבלת Google SDK אמיתי — מה בוצע ומה לא
**בוצע (אופליין, ללא רשת):** קוד ה-gtag הציבורי האמיתי (`443,493` בתים, sha256 `35dbadfaab806eb6267dd4441757fa3d719ff808ba277a5f55a851f09e0c224f`, מזהה מדידה פיקטיבי `G-TEST12345`, ללא מפתח ספק) הורץ בתוך jsdom כשכל נקודות היציאה מוחלפות. בקשות האיסוף שהוא שלח הוזרמו אל ה-worker המדויק שנפלט (אותה מעטפת VM של הבדיקות הקיימות):
- `POST https://www.google-analytics.com/g/collect` (`en=page_view`, `dp=/number/:value`, `dr=""`, ללא `ep.*`/`uid`/`up.*`) — **מתקבל**.
- `POST https://www.google.com/g/collect` (מופע שני של page_view, עם `gaf`) — **נדחה 403** (וגם אינו ב-`connect-src`). זו התנהגות רצויה לפי ההפרדה משיווק; צפוי רעש קונסולה/CSP, ללא אובדן נתוני GA4.
- `analytics.google.com`, `stats.g.doubleclick.net` — נדחים; `region1.google-analytics.com` — מתקבל.
- `gtag/js` ו-`gtag/destination` — לא נעצרים על ידי ה-worker. ל-CSP אין `script-src`/`default-src`, ולכן טעינת ה-SDK לא נחסמת.
- כלים: `real-sdk-offline-harness.cjs`, `real-sdk-worker-replay.mjs`, תוצאות: `real-sdk-offline-result.json`, `real-sdk-worker-decisions.json`. בדיקת רגרסיה קבועה: `test/public-reading-real-gtag-shape.test.mjs` (צורת הבקשות האמיתית, ערכים סינתטיים).

**לא בוצע / לא נקבע:**
- מעבדת Chromium מבודדת עם ה-SDK האמיתי **אינה אפשרית בסביבת הענן הזו**: Chromium מנותב דרך פרוקסי הסוכן גם עם `--no-proxy-server` ו-`--host-resolver-rules`. ריצת הניסיון שלחה בקשת GET קריאה בלבד אחת (`/number/PRIVATE-PHRASE?token=DO-NOT-LEAK`, ערכים מפוברקים) לאתר החי ולא אל שרת הלולאה. לא בוצעה כתיבה, לא נשלח ערך אמיתי, וניסיון הדפדפן נעצר. לא נעשה בו שימוש כראיה.
- אירועים נוספים (`user_engagement` ב-pagehide, `scroll`) וגלישת בקשות מאוגדות (POST עם שורות מרובות) לא נוצרו בהרצה האופליינית. ה-worker דוחה גוף עם שורת רווח (`/[\r\n]/`); אם ה-SDK האמיתי מאגד בפועל, אירועים כאלה יידחו. **לא אומת בדפדפן אמיתי.**
- ה-SDK הורד עבור מזהה פיקטיבי. הגדרות הנכס האמיתי ב-GA (מדידה משופרת, Signals) עשויות להוסיף פרמטרים. הקבלה האמיתית נעשית לאחר פרסום: GA DebugView/Realtime של הנכס.

## פתוח, ונדרש ZURIEL
1. **קבלת מנהל אמיתי** ב-`/2029/control` → "מדידה וגוגל": GA, Search Console (sitemap + 3 URL inspections). לא נאספו אישורים בצ׳אט; הבדיקות המבוקרות אינן תחליף.
2. **Vercel Web Analytics:** נשאר פתוח (חסר `VERCEL_API_TOKEN`, 404). אין proxy או העתקת token.
3. **קליטת RUM/GA אמיתית:** תיתכן רק לאחר פרסום מאושר. החריגה לשעה נוצלה ופגה 21:16 UTC; נדרש אישור חדש עם SHA ו-deployment מדויקים.
4. **חיבור לבדיקות ב-CI:** הבדיקות החדשות/המעודכנות אינן מחוברות לשום workflow. חיבור ל-`2029-isolation-gate` דורש התקנת `react-test-renderer` והרצת בניית התוצר לפני `node --test`; זהו שינוי שער שדורש אישור נפרד, ולא בוצע.

כל הספים נשמרו (CLS 0.1, קנרית 15 שניות, תקציבי bundle). לא שונו מיגרציות, RLS, Auth, Edge, דגלים, דיוור או תוכן מוצר.
