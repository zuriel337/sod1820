# ראיות קבלה — ללא סודות

הקוד נבנה בענף המשימה מבסיס `4987d7a1`. הגיבוי הראשון הוא `720007de`; קריאת מקור הנושא, קישורי החזרה, חסימת שיתוף פרטי ותיקון NumberDrawer נכללו בשינויים המאוחרים שנבדקו. ה־SHA הסופי והפריוויו מאומתים ברשומת AFTER, לאחר שמירת חבילת הראיות הזאת. build identity מקומי במהלך העבודה אינו הוכחת SHA מרוחק.

- `focused-tests.txt`: 191 בדיקות ממוקדות, ללא כשל/דילוג. `access-final.txt`: הרצה חוזרת של 11 בדיקות מתוכן על ההרשאות, הפרוקסי, ה־worker והשיתוף לאחר השינוי האחרון בתחום זה.
- `browser-main.txt`: 33 מקרי קבלה. `browser-admin-dock.txt`: שלושה מקרים סינתטיים נוספים למצב כלי מנהל. `browser-typed-number.txt`: שני מקרי מספר/ביטוי נוספים לאחר תיקון ה־predicate. `browser-baseline-regressions.txt`: 18 בדיקות מסירת הבסיס, ללא שינוי תנאי קבלה. סך הכול 56 מקרי קבלה, ובנפרד ריצת המדידות עם שמונה זוגות מסלולים.
- `browser-read-only-summary.json`: ספירות GET/HEAD, חסימות וכשלים לכל שלב, כולל מדידות baseline/after. אפס תקלות תעבורה בהרצות התקינות, אפס כתיבות מוצר/קריאות מודל שהועברו. כתיבות מדומות נענות בתוך דפדפן הבדיקה ואינן מגיעות לשרת.
- `matched-transitions.json` ו־`transition-summary.json`: כל 16 המסלולים המדודים והסיכום. אין הסקת מהירות מהרצות תשתית שנכשלו; ההסבר ב־MEASUREMENTS.md.
- `real-public-connections.json`: נתונים ציבוריים אמיתיים שקורא הנושא הקיים החזיר. הקשרים אינם fixtures חדשים. נבדקה חזרה לנושא באותו query ומקטע.
- גאומטריה, גדלי כפתורים ותצלומים: `geometry.json`, `personal-layout.json`, `personal-button-grids.json`, `tool-dock.json`, `baseline-layout-context.json`, `screenshots/`.
- בניות וגרף: `build-legacy-and-2029.txt`, `build-preview.txt`, `graph-before.txt`, `graph-after.txt`, `production-lock.txt`.
- `remote-smoke.cjs`: כלי לבדיקה נפרדת של **הלקוח שנפרס בפועל**, עם מענק גישה זמני בזיכרון דרך stdin בלבד. אין בו מענק, cookie, חשבון אמיתי או תוצאת פריסה שטרם בוצעה. תוצאתו לאחר הפריסה נמסרת ב־AFTER; אין טענה כאן שכבר עבר.

## שחזור בסביבת העבודה

לשני שרתי הקבלה המקומיים שימש אותו `docs/reviews/public-foundation-20261101/evidence/local-readonly-server.mjs` מהענף המתאים, אותו מחסום רשת, `NODE_USE_ENV_PROXY=1` ו־`NODE_OPTIONS=--max-http-header-size=65536`. baseline ב־4195 עם dist של הבסיס; אחרי ב־4196 עם dist של המשימה. לא משנים קובצי מוצר כדי להפעיל את שרת הקבלה.

ההרצות השתמשו ב־`@playwright/test` הקיים ב־`/tmp/ci1185-helpers/node_modules`, Chromium ב־`/usr/bin/chromium`, locale `he-IL`, worker אחד, retries אפס. `NODE_PATH` מצביע לתלות המקומית בלבד; `node_modules` לא נכנס לקומיט. בדיקת הקבלה הראשית: `test/public-frame-context-playwright.config.cjs`; מדידות: `test/public-frame-transitions-playwright.config.cjs`. מחסום הקריאה ב־`test/public-frame-readonly-fixture.cjs` שומר את כללי הבסיס ומוסיף Origin למפתח HTTP cache, ללא הרחבת RPC או כתיבה.

18 בדיקות השימור הועתקו לנתיב זמני עם התאמת **כתובת מקומית ונתיבי imports בלבד** מ־`public-foundation-20261101/evidence/public-foundation.spec.cjs`. לא שונו assertion, timeout, סף או תרחיש. הכשל הראשון בגלל proxy של שרת הבדיקה נפתר בהפעלת הסביבה המתאימה, ללא שינוי קוד היישום.

הרשאות משתמש/מנהל, תרחישי הדיוור, הכשל והביטול הם נתוני בדיקה סינתטיים מסומנים. הם אינם קבלה של Google/Facebook, כתיבה בחשבון חי, העלאה או קריאת מודל. Service Worker חסום רק במחסום הדפדפן העצמאי; ה־worker שנוצר נבדק בנפרד, כולל שוויון בבייטים ותרחישי שלילה. אין כאן browser storage, trace עם cookies, מפתחות, מענקי גישה או פלט פרטי.
