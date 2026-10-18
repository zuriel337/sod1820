# F5 — חסימת ה-RPC במסלול הפוסט: ביקורת והוכחה

בסיס: `gpt/perf-unified-candidate-20261017` @ `8c8e9df9b2b012b70479e398e75f16e7008b8619` (ענף העבודה ששויך לסשן: `claude/perf-post-middleware-f5-vmwq1d`; השם המבוקש `…-20261018` לא נדחף).
אין DB חי לצורך המדידה, אין CI/PR/merge/preview/deploy. **קוד מוצר לא שונה.**

## תוצאה במשפט

הפתרון היחיד שמסיר את ההמתנה ממבקר רגיל משאיר **מבקר אנושי שמנווט לפוסט שאינו קיים** עם HTTP 200 + noindex בצד הלקוח במקום HTTP 404. זו בדיוק החלטת ה-soft-404, ולכן לא יושם. הוכנו patch (`candidate-A.patch`, לא מוחל) ובדיקת חוזה שמוכיחה שכל שאר החוזים נשמרים, ובחירה בין שתי חלופות מתומחרות למטה.

## מדידה (loopback, `loopback.mjs`, 15 הרצות לתרחיש; תוצאות גולמיות ב-`results/`)

שרת מקומי מחקה את Supabase עם השהיה מוזרקת L; ה-`middleware-core.js` האמיתי רץ בלי שינוי. המספרים הם **כמה round trips טורים נוספו**, לא זמן ייצור (RTT אמיתי Edge→Supabase לא ניתן למדידה כאן).

| תרחיש (GET; HEAD זהה) | הוספה, L=150ms | RPC לבקשה |
|---|---|---|
| נתיב ידוע (`/posts`), קו בסיס | 0.01ms | 0 |
| `/post/:slug` קיים, cache קר | **151.4ms** (= L + ~1ms) → HTML | 1 |
| `/post/:slug` חסר, cache קר | **151.7ms** → 404 | 1 |
| אותו slug, cache חם | 0.05ms (קיים) / 0.06ms (חסר→404) | 0 |
| `/:slug` ישן קיים / חסר | 151.8ms → 308 / 404 | 1 |
| browser לעומת goodbot | זהה (browser 151.4, Googlebot 152.3) | 1 |
| Supabase 500 / JSON פגום / reset | L (51ms ב-L=50) → fail-open | 1 **בכל בקשה** (כשל לא נשמר ב-cache) |
| Supabase תלוי (לא עונה) | **ללא גבול** (נעצר בתקרת הכלי 2.5s; אין `AbortSignal`) | 1 |

L=0: תקורה מקומית 0.6–1.3ms. מקור שדה (לא שלי, `SOD1820_2029_DEEP_BOTTLENECK_AND_CONTROL_REVIEW_20261018`): זמן מסמך של `/post/:slug` p50 312ms / p95 760ms, n=1,135/24h. אחוז פגיעות ה-cache בייצור (cache בזיכרון של isolate, 10 דק', עד 512 מפתחות) לא נמדד ואינו ניתן לגזירה מכאן; כניסה לפוסט "זנב ארוך" היא miss אלא אם אותו isolate ראה את אותו slug ב-10 הדקות האחרונות.

## סדר rewrites ומסלול OG/SEO (`rewrite-order.mjs`, מ-`vercel.json` ומה-matcher האמיתיים)

redirects → middleware (matcher `/((?!api/|assets/|.*\.).*)`) → filesystem → rewrites לפי סדר הקובץ, ההתאמה הראשונה מנצחת (הנחת פלטפורמה, לא נמדדה).

- `rewrites[48]` `/post/(.*)` + UA של Googlebot/bingbot/Baiduspider → `/api/og?path=/post/$1&crawler=search`.
- `rewrites[50]` `/(.*)` + UA של בוטי שיתוף ו-AI (facebookexternalhit, GPTBot, …) → `/api/og?path=/post/…`.
- `rewrites[54]` דפדפן → `/2029.html`. `rewrites[78]` `/(.*)` → `/legacy.html`.
- `/post/x/` → redirect 308 ל-`/post/x` **לפני** ה-middleware. `/post` → `/posts` (308).
- ה-middleware רץ לפני כל ה-rewrites, ולכן ה-RPC מעכב גם את מסלול ה-OG; ואז `api/og.js` מבצע **שאילתת פוסט שנייה** משלו (`api/og.js:600`).
- **`api/og.js` מחזיר HTTP 200 + `noindex, follow` לפוסט חסר** (`:629-631`, `:751`). לכן ה-404 האמיתי לבוט חיפוש נוצר **רק** ב-middleware; אי אפשר להסיר את הבדיקה מהמסלול של בוטים בלי לגעת ב-`api/og.js` (מחוץ לתחום).

## ממצאים נוספים

1. **אין timeout על ה-RPC**: Supabase תלוי מחזיק את המסמך (גם של בוטים) עד שהפלטפורמה חותכת. "fail-open" קיים רק לכשל מהיר.
2. **כשל לא נשמר ב-cache**: בתקלה ממושכת כל בקשה משלמת שוב את מלוא ה-RTT/timeout.
3. **סיווג UA הוא רשימה לבנה, לא זיהוי מנועי חיפוש**: Yahoo Slurp, Naver Yeti ו-Qwantify מסווגים `browser` (ניסוי `uaClassification`). כלומר "הדלג על הבדיקה לכל browser" היה שובר 404 אמיתי למנועי חיפוש כאלה. לכן המועמד מחייב גם `Sec-Fetch-Mode: navigate` + `Sec-Fetch-Dest: document`. (Sogou/Seznam מקבלים 403 לפני הבדיקה.)
4. **המסלול הישן `/:slug` לא ניתן להקלה**: ההחלטה 308 / 404 / legacy.html תלויה בקיום ולכן חייבת תשובה; הוא נשאר חוסם לכולם (גם במועמד).
5. **טריות**: פוסט חדש שנבדק לפני פרסומו נשאר 404 עד 10 דק' ב-isolate (cache שלילי), ופוסט שנמחק נשאר "קיים" עד 10 דק'. נשמר ללא שינוי בשתי החלופות; קיצור TTL שלילי הוא החלטת טריות, לא יושם.
6. (מחוץ לתחום, לידיעה) matcher מדלג על כל נתיב עם נקודה, כולל `/post/foo.bar` — אין שם שער מדינה/בוט ואין בדיקת קיום. ב-`middleware.js` (עטיפת SG) ה-payload של ה-JWT בקבוע `ANON` הוא `"iss":"supaase"` לעומת `"supabase"` ב-core — דורש בדיקה מול החי; לא נבדק כאן ולא שונה.

## שתי חלופות, מחיר מדויק

**A — מסלול ניווט אנושי (`candidate-A.patch`)**: ב-`/post/:slug` דלג על הבדיקה כש-`kind==='browser'` וגם `Sec-Fetch-Mode=navigate` + `Sec-Fetch-Dest=document`; בנוסף `AbortSignal.timeout(800)` → fail-open.
- רווח (נמדד): מבקר אנושי: 151.4ms→0.01ms ב-L=150 על miss; כשל/תלייה של Supabase לא נוגע בו (תלייה: ללא גבול→0.01ms); בוט בתלייה: ללא גבול→813ms ואז fail-open.
- נשמר (בדוק ב-`test/post-middleware-f5-contract.test.mjs`, 12/12 על המועמד עם `F5_CANDIDATE=A`; ו-`scripts/test-route-legitimacy-2029.mjs` + `middleware.test.js` עוברים): 404+noindex לגוגל/בינג/בוטי שיתוף/AI/Slurp-דומים ול-HEAD/GET בלי Sec-Fetch; 308 מהכתובת הישנה; fail-open; שערי bot/מדינה/strict/quarantine לפני כל בדיקה; TTL חדש/נמחק.
- **מחיר**: מבקר אנושי שמנווט ל-`/post/<חסר או נמחק>` מקבל HTTP 200 עם עמוד "הפוסט לא נמצא" + noindex בצד הלקוח (`Post2029Page.jsx:112-118`) במקום 404. ה-header `Sec-Fetch-*` ניתן לזיוף — מזייף מקבל רק soft-404, אין כאן שער אבטחה. דורש עדכון נוסח "אותה תשובת 404 לדפדפן ול-goodbot" ב-`middleware-core.js` וב-`docs/2029-search-indexing-closure-map-v1.md` (מחוץ לתחום הכתיבה). הנתיב `/:slug` הישן נשאר חוסם.

**B — לשמור 404 לכולם, לחסום רק את הגרוע**: רק `AbortSignal.timeout` + cache קצר לכשל.
- רווח: תלייה של Supabase חסומה (ללא גבול → התקרה שנבחרה); כשל לא נוצל שוב בכל בקשה.
- **מחיר**: מבקר רגיל משלם עדיין RTT מלא ב-miss (151ms ב-L=150; בשדה p50 312ms/p95 760ms כולל המסמך). ההמתנה הרגילה אינה מוסרת — לא עונה על מטרת המשימה.

המלצה: A, בכפוף להחלטת צוריאל שניווט אנושי לפוסט חסר רשאי להחזיר 200+noindex. להחלה: `git apply docs/perf-evidence-20261018/post-middleware-f5/candidate-A.patch` ואז `F5_CANDIDATE=A` בבדיקת החוזה. הערת טריות נפרדת (לא בהחלטה זו): TTL שלילי קצר יותר.

## שחזור

```
export VERCEL_EDGE_ENTRY=<path>/node_modules/@vercel/edge/dist/index.js   # רק כשאין node_modules ב-repo
node --import ./docs/perf-evidence-20261018/post-middleware-f5/resolve-vercel-edge.mjs docs/perf-evidence-20261018/post-middleware-f5/loopback.mjs out.json
node --import ./docs/perf-evidence-20261018/post-middleware-f5/resolve-vercel-edge.mjs --test test/post-middleware-f5-contract.test.mjs
node docs/perf-evidence-20261018/post-middleware-f5/rewrite-order.mjs
```
`MW_DIR=<תיקייה עם עותק מוחל>` מריץ את אותם הכלים על המועמד. מדידת ה-AFTER של המועמד: `results/loopback-candidate-A.json`.

## לא הוכח

זמן ייצור, יחס פגיעות cache, RTT אמיתי Edge→Supabase, סדר הפלטפורמה בפועל (נגזר מהמסמכים), התנהגות Google בפועל מול 200+noindex לדפדפן (לא רלוונטי לבוט), ‏`Sec-Fetch-*` בדפדפנים ישנים (נופלים לבדיקה המלאה — בטוח).
