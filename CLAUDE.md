# SOD1820 — Claude Runtime Adapter

## Legacy פרש — קרא ראשון (החלטת ZURIEL, 5.11.2026)

1. **Legacy retired — אינו מוצר פעיל.** אין ריצת Legacy, אין יעד build של Legacy ואין שער Legacy lock (הוחלף ב־`scripts/test-legacy-retired.mjs`). ההחלטה סופית. הסרת קוד ה־Legacy מהעץ הפעיל הושלמה ומוזגה ל־`main` (PR #1239, קומיט `a5ef82cce`, 5.11.2026); ענף ההסרה הישן אינו מקור אמת ואין להחיות, למזג או להמשיך אותו. אם נראה קוד Legacy פעיל ב־`main` — מדווחים לצוריאל כסתירה; לא משחזרים ולא ״משלימים הסרה״ מענף ישן.
2. **מערכת 2029 היא המוצר הפעיל** (`src/App2029.jsx`, `src/main2029.jsx`, `2029.html`; פרסום דרך `public-reading-deploy`). מצב חי נקרא מ־Vercel (alias ← deployment ← `sourceSha`) ומ־`origin/main` בזמן הפעולה, לא ממסמך.
3. **אין לשחזר Legacy** כ־runtime, route, UI, build target, rollback worker או compatibility layer. כתובת שאינה מוכרת מסתיימת ב־404 של 2029.
4. **היסטוריית Git היא מנגנון השחזור** של קוד Legacy (`git show <sha>:<path>`; ראו [REMOVAL.md](docs/reviews/2029-legacy-removal-20261105/REMOVAL.md)); אין צורך להחזיק מוצר Legacy חי לשם rollback. חזרה תפעולית בפרודקשן היא לפריסת 2029 קודמת, באישור מפורש; היא אינה שחזור מסד או מדיה.
5. **אין למחוק תשתיות משותפות** ש־2029 או מסוף הניהול החדש עדיין צריכים: Supabase (functions, RPC, RLS, Storage, TUS), `AuthContext` ו־`isAdmin`, `/2029/control`, `/2029/me/*`, `researchViewerProjection.js`, `useUniversalWorkspace.js`, ספריות העלאת המדיה, `docs/admin-command-blue-slice-v1.md` ו־`docs/reviews/admin-full-access-auth-20261103/`. גם נתוני ארכיון ושדות כמו `legacy_id` נשארים: שם שמכיל "legacy" אינו הוכחה לקוד Legacy.
6. **מסמכים ישנים הם היסטוריים.** מסמך שמציג Legacy כפעיל, כיעד חזרה או כשער חובה הוא תצלום היסטורי ולא מקור אמת; ראו הבאנרים בראש מסמכי `docs/reviews/2029-legacy-*`. אין למחוק אותם.
7. **כל שינוי בפרודקשן דורש אישור מפורש של ZURIEL** לקומיט ולפריסה מדויקים: merge ל־`main`, פרסום, שינוי alias, Preview מוגן, שינוי DB או דגל. מיזוג קוד אינו פריסה.

## 0. משמעת סשן — פתיחה, ענפים ישנים, כפילות, Production ודוח מסירה (ZURIEL, 7.11.2026)

סעיף זה מוסיף משמעת סשן ואינו מחליף את §1–§16 ואת הכללים שלמעלה ושלמטה; `AGENTS.md` (Codex) מפנה אליו ואינו מעתיק אותו, ואין לשכפל אותו בקובץ הוראות אחר. אם נראית סתירה בינו לבין כלל אחר — חל הכלל המגביל יותר, ומדווחים לצוריאל על הסתירה (ראו 0.1 סעיף 6). אין כאן ענף, SHA או PR נעוצים: הם נקראים מחדש בכל סשן.

### 0.1 פתיחת סשן — לפני כל עבודה

1. קוראים את `CLAUDE.md` ואת ההוראות הרלוונטיות למשימה בלבד (ניתוב: `SOD1820_MASTER_OWNER_INDEX.md`; Codex: גם `AGENTS.md`), לפי תקציב הקריאה ב־§3. את היומן (`work_log_current`) בודקים בתחילת כל סשן לפי §10 ו־0.3. Doc37 (״מסמך 37״) הוא `project_codex.id=37` ב־Supabase ואינו קובץ בריפו (מוזכר ב־`SOD1820_MASTER_STATE.md` וב־`SOD1820_MASTER_ROADMAP.md`): קוראים רק את הסעיף הרלוונטי למשימה, ורק כשהיא נוגעת בו; סעיפיו (12.xx) הם רשומות מתוארכות — תצלום היסטורי, לא הוראה ולא הרשאה (מצב חי: Vercel ו־`origin/main`).
2. מזהים את המאגר הנכון (שם המאגר וה־remote) לפני כל קריאה או כתיבה.
3. `git fetch origin --prune`, ואז רושמים: ה־SHA של `origin/main`, הענף הנוכחי וה־HEAD שלו, מצב ה־working tree (הפקודות ב־§9), PRs פתוחים בתחום המשימה ומצב ה־CI של ה־SHA הרלוונטי.
4. **ה־SHA המאושר** הוא `origin/main` כפי שנקרא בפעולה, אלא אם צוריאל קבע SHA אחר בסשן הנוכחי; זהו בסיס עבודה בלבד, ואישור למיזוג או לפריסה ניתן לקומיט מדויק לפי 0.4. לא קובעים בסיס מזיכרון של סשן קודם, מסיכום, משם ענף או מ־PR ישן. מצב חי נקרא מ־Vercel בלבד: `main` אינו הוכחת פריסה (ראו ״מצב חי וכללי שחרור״ למטה).
5. הוראה מפורשת של צוריאל על SHA עדיפה על הנחות שנשענות על ענף ישן, אך עדיין בודקים שהיא קיימת, שהיא מתאימה למשימה ושאין בה סיכון (למשל שאינה דורסת עבודה של כותב אחר או אישור שכבר נצרך); אם לא — מדווחים לפני ביצוע.
6. סתירה בין הוראות, יומן, ענף או SHA — **עוצרים ומדווחים; לא מנחשים.**

### 0.2 ענפים, PRs וסשנים ישנים

- ענף ישן אינו נקודת התחלה רק משום שהוא קיים: מתחילים מענף מבודד חדש מתוך ה־SHA המאושר. ענף ישן אינו מקור אמת — תוכנו נבדק מול `main` העדכני.
- אין המשך אוטומטי של סשן, PR או ענף קודם. המשך מתבצע רק אם צוריאל ביקש אותו, ורק אחרי הבדיקות ב־0.1.
- **בלי אישור מפורש של צוריאל** אין: cherry-pick מענפים ישנים; מיזוג ענפים, PRs או קומיטים ישנים; מחיקה, שינוי או ״ניקוי״ של ענפים (כולל force-push ושינוי שם).
- ממצא שימושי בענף ישן — מדווחים (ענף, SHA, קבצים, מה הוא נותן, מה הסיכון) ושואלים החלטה; לא מייבאים בשקט.
- ניקוי ענפים אינו חלק ממשימה אחרת ואינו ״תיקון לוואי״.

### 0.3 מניעת עבודה כפולה

- לפני התחלה בודקים ביומן אם המשימה כבר הושלמה, ואם סשן אחר עובד באותו תחום (יומן, PRs פתוחים, ענפים פעילים). אם אי אפשר לקרוא את היומן — מדווחים `COORDINATION_UNVERIFIED` ואין טוענים שהתיאום נבדק.
- משתמשים בסיכום מאומת קיים (כזה שמצוין בו SHA וראיה) במקום למפות מחדש; מאמתים רק את מה שהשתנה מאז.
- לא פותחים מחדש משימה שהושלמה בלי ממצא חדש.
- כותב אחד לכל תחום רגיש וקובץ משותף (**ONE SCOPE — ONE ACTIVE WRITER**, §10). עבודה מקבילה מתואמת דרך היומן והדיווח לצוריאל, בלי מנגנון חדש.

### 0.4 הגנת Production — נדרש אישור מפורש של ZURIEL

אישור מפורש, לפעולה ולקומיט מדויקים, נדרש ל: merge ל־`main`; deployment, promotion, rollback או שינוי alias; הגדרות דומיין או Production; DB, SQL ו־migrations; הרשאות, policies, secrets והגדרות אבטחה; מחיקת ענפים, קבצים או נתונים; cherry-pick או שילוב מענפים ישנים; וכן כל שינוי שמונה בכלל 7 שבראש הקובץ (כולל Preview מוגן ודגלים).

- בדיקות קריאה בלבד מותרות כשהן נחוצות, ואינן היתר לשינוי.
- אישור שנצרך, אישור היסטורי (למשל המיזוג של `MAIN_2029_LIVE_STATE_RECONCILIATION_20261104`) ואישור מסשן אחר אינם מתחדשים; אישור אינו מורחב לפעולה אחרת.
- זמינות של כלי אינה אישור: רשימת ההיתרים ב־`.claude/settings.json` קובעת אילו כלים אינם מבקשים אישור טכני בלבד, ואינה אישור של צוריאל לשינוי.

### 0.5 דוח מסירה חובה בסוף כל משימה

הדוח נמסר לצוריאל בשיחה (ואינו מחליף את שדות ה־handoff ב־§10): מה בוצע ומה לא בוצע · מאגר, ענף ו־SHA (בסיס וראש) · קבצים שהשתנו · קומיטים · בדיקות ותוצאות CI (לפי SHA; הרצה מקומית נפרדת מ־CI) · מצב ה־PR · האם Production שונה (כן/לא, ואם כן — מה) · חסמים, סיכונים והחלטות ממתינות · צעד הבא מומלץ.

אין לכתוב ״הושלם״, ״עבר״, ״מוזג״, ״נפרס״ או ״אומת״ בלי ראיה. מציינים במפורש מה לא בוצע ומה לא נבדק, ומשתמשים בסולם המצבים של §12 (DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED).

### 0.6 הקשר השקה

מתקדמים לקראת השקה: לא פותחים מחדש עבודה שהושלמה; אין ניקוי ענפים רחב; אין הרחבת היקף אבטחה (ממצא אבטחה חדש מדווחים לצוריאל; הרחבת היקף היא החלטתו); אין מיפוי מלא מחדש כשקיים מיפוי עדכני; מפרידים בין RC, בדיקות, תיעוד ו־Production; מציינים חסם אמיתי בדיוק (מה חסום, למה, מי מחליט); לא ממציאים משימות.

## מצב חי וכללי שחרור — 2029 (יישור ZURIEL, ‏4.11.2026)

**2029 הוא האתר החי. Legacy פרש (החלטת צוריאל 5.11: אין חזרה); הקוד נשמר בהיסטוריית Git בלבד.** מצב חי נקבע מקריאה עדכנית של שיוך הדומיינים ב־Vercel, מקור הפריסה וה־artifact שמוגש בפועל; `main`, הודעה ישנה או work_log לבדם אינם הוכחת פריסה.

**צילומי מצב ישנים (12.53–12.56, 4.11.2026) — היסטוריה בלבד.** הפריסות, ה־SHA והאישורים שבהם — ובכלל זה Production `dpl_xw7fECMyWRrZvxxKdy71yobAhj8h` / מקור `969b51423d8b67b7b8061d067b5366e1e2a1c5e4` והפריסה הקודמת `dpl_7KcvdVHsp26uyiLrNHppBtCKeGbX` — אינם המצב החי הנוכחי ואינם הרשאה לפעולה חדשה; האישורים שניתנו בהם נצרכו. הראיות המלאות: [12.53](docs/reviews/main-live-state-reconciliation-20261104/README.md#המשך-1253--תמונות-ומפת-האתר) · [12.54](docs/reviews/main-live-state-reconciliation-20261104/README.md#המשך-1254--בסיס-לסשנים-חדשים-seo-וספים-קבועים) · [12.55](docs/reviews/main-live-state-reconciliation-20261104/README.md#המשך-1255--שילוב-d96c41ea-וקבלה-של-החבילה-המצטברת) · [12.56](docs/reviews/main-live-state-reconciliation-20261104/README.md#המשך-1256--החבילה-המצטברת-פורסמה-לחי). סשן חדש מתחיל מ־`origin/main` העדכני (0.1), מאמת פריסה ובעלויות מול Vercel והיומן, ואינו מייבא שוב ענפים או מסירות שכבר שולבו או הוחלפו (0.2).

**ספים קבועים גם עם תוספת יכולות (ZURIEL,4.11):** משתמשים בספים ובתקציבים הקיימים; אין עדכון אוטומטי של baseline או הגדלת סף כדי להעביר בדיקה. CLS נשאר≤0.1, ברירת מחדל לקנרית נשארת15,000ms, וספיWebVitals ותקציב גרף הפתיחה נשארים כפי שנקבעו בקוד הקנוני. שינוי מכוון בסף דורש החלטה מפורשת של צוריאל. התאמת ציפייה לממשק שאושר אינה שינוי סף ואינה פטור מבדיקת התנהגות.

- היסטוריה (נצרך): אישור המיזוג של `MAIN_2029_LIVE_STATE_RECONCILIATION_20261104` ניתן ונצרך במלואו במיזוג PR [#1191](https://github.com/zuriel337/sod1820/pull/1191) (קומיט מוצר `71bb76467091ecd920eea92cc5b041c24c8145df`, כבר ב־`origin/main`). אין בו אישור קיים או מתחדש, והוא אינו חל על מיזוג אחר או על ענפים היסטוריים (0.4). תיעוד שמתקדם מעל קומיט המוצר אינו פריסה — קוראים מחדש את HEAD ולא מניחים שהוא פרוס; ולפני כל מיזוג בודקים שפריסת Git אוטומטית לא תחליף את החי בתוצר או בתצורה שלא אושרו.
- מסלול פרסום 2029 הוא `public-reading-deploy`, עם `sourceFilesOutsideRootDirectory=true` ובנייה מפורשת `node scripts/build-public-reading-production.mjs --public-production-candidate --review-source=<exact-main-SHA>`. שורש המאגר והמתג `CORE_PUBLIC_LAUNCH_2029=false` נשמרים כפי שהם (הדגל בשימוש בקוד 2029; Legacy פרש); אין להשתמש בבניית ברירת המחדל כתחליף לתוצר הציבורי. `git.deploymentEnabled=false` בשני השורשים מפריד את main מהפעלה אוטומטית; אין לשנות דגל משותף כדי לחקות Preview.
- בקשה כללית לפרסום, PASS של workflow שבתור ואישור מסירה ישנה אינם override לקנרית או לשער שנכשלו; חריגה דורשת אישור מפורש ומוגבל של ZURIEL (`deploy_on_request`) לקומיט ולפריסה מדויקים. אישור מסירה ישנה נשאר מוגבל לדלתה שנקבה בה, ובדיקות שלא עברו אינן פטורות.
- מיזוג קוד אינו פריסה. `main` יכול לכלול תיקונים מאושרים שטרם נפרסו; מדווחים במפורש את ההבדל ממקור הפריסה החיה. Production, דומיינים, שרת/מסד משותפים ודגלים — רק באישור מפורש לפי 0.4, ללא הרחבה מכוח מיזוג.
- **ענפים ומסירות שהוחלפו הם היסטוריה, לא מסלול שחרור** — הכללים ב־0.2 וב־0.4. אין למחוק את הענפים או את הראיות כדי לאכוף זאת.
- הפריסה `dpl_BFpwZGiYL3Qpdy9nCuGKGb9Xmko2` (Legacy) אינה יעד חזרה ואין לשחזר אליה תנועה; קוד Legacy נשמר בהיסטוריית Git בלבד ([ההסרה והשחזור מההיסטוריה](docs/reviews/2029-legacy-removal-20261105/REMOVAL.md)). מסמכים שמציגים אותה כיעד חזרה (למשל 12.55 ו־12.56 ב־README של המשימה) הם היסטוריים. חזרה, אם נדרשת — לפי כלל 4 שבראש הקובץ.
- שער Legacy הוחלף בשער ״Legacy פרש״ (`scripts/test-legacy-retired.mjs`; רץ גם ב־`prebuild`, וב־workflow `legacy-production-lock` ששמו נשמר בכוונה לשמות הבדיקות הנדרשות): הוא מוודא שאין מסמך Legacy, worker חזרה או catch-all ל־Legacy. מעבר שלו אינו הוכחה שתוצר 2029 התקבל. אישור נפרד של ZURIEL לשינוי השער נשאר בתוקף; אין להסיר או להחליש בדיקות. הצלחת workflow בשם G4 אינה סגירת G4 בתוכנית.
- חיבורי החשבונות שכבר התקבלו, H1, החלטות הסיכון והדחיות המאוחרות נשמרים. אין דרישה חדשה לבדיקות שכבר תקפות ללא שינוי רלוונטי.

מצב המועמד, אישור השער וראיות המיזוג/הפריסה: [המסירה הקיימת למשימה](docs/reviews/main-live-state-reconciliation-20261104/README.md), BEFORE `a89ac5ea-9802-49b2-a101-1786d13acd5f`. זהו קישור לראיות; הוא אינו מקור אמת חלופי או הרשאת פרסום.

## חוק נראות פעולה (Operation Visibility Law — ZURIEL, 6.11.2026)

**אין פעולה במערכת שלא רואים מה קורה בה בכל רגע.** כל פתיחה, חיפוש, אימות, סריקה, שמירה וטעינה חייבת חיווי חי שדבוק למסך (ריבוע/מד קבוע, לא מוסתר מאחורי גלילה או לשונית), עם השלב האמיתי שהמערכת יודעת עליו ושניות שחלפו. אסור אחוז מומצא: בלי נתון אמיתי מציגים מד לא־מוגדר ושלב חי (בהתאם ל־`CanonicalProgress`). מסך קפוא בלי חיווי הוא באג, לא שיפור עתידי. המימוש הראשון: `ElsOperationMeter2029` (פתיחת המטריצה והמנוע, חיפוש, אימות, סריקה, שמירה, טעינת מקור), עם `onEngineReady` ב־`TzofenEmbed`. פעולה חדשה שאין לה חיווי כזה לא נחשבת גמורה.

## נוהל פריסה ל־Production מסשן ענן — בלי CLI, בלי טוקן (אומת 6.11.2026, `be9b173` / `dpl_HcoHSTtpq6uv6CYkAkrTda8R2H13`)

מיזוג ל־`main` אינו יוצר פריסה. ב־Vercel (פרויקט `sod1820`) מוגדר Ignored Build Step ישן (`main → exit 0`) שמבטל כל בנייה של `main`: גם redeploy, גם `gitSource` רגיל וגם `forceNew` מתבטלים בתוך שניות (`errorLink: ignored-build-step`). מי שמכריז "פרוס" לפני שבדק `readyState` כמה שניות אחרי היצירה טועה. הנוהל המאושר, באישור מפורש של ZURIEL לקומיט ולפריסה מדויקים:

1. **יצירה:** Vercel MCP `create_deployment` עם הבקשה המתועדת ב־[executed-production-request.json](docs/reviews/main-live-state-reconciliation-20261104/live-969-release/executed-production-request.json), עם ה־SHA המדויק במקום `969b514…`: `gitSource` (github, `zuriel337/sod1820`, `ref: main`, `sha`), `target: production`, ו־`projectSettings` (`rootDirectory: public-reading-deploy`, `sourceFilesOutsideRootDirectory: true`, `installCommand`, `buildCommand` עם `--public-production-candidate --review-source=<SHA>`, `outputDirectory: dist`, ו־`commandForIgnoringBuildStep` שמתיר רק `VERCEL_ENV=production` עם ה־SHA המדויק ושומר `main → exit 0` בכל מקרה אחר). לא שולחים PATCH להגדרות הפרויקט.
2. **המתנה ל־READY:** בודקים `get_deployment` אחרי ~40 שניות. `CANCELED` = ה־Ignored Build Step; לא ממשיכים ולא מנסים שוב באותה צורה.
3. **דומיינים:** `assign_alias` של `sod1820.co.il`, `www.sod1820.co.il` ו־`sod1820.vercel.app` לפריסה החדשה. READY לבדו לא מזיז דומיינים. חזרה אחורה היא אותו `assign_alias` לפריסה הקודמת (לקרוא אותה מ־`get_alias` לפני ההזזה ולדווח).
4. **אימות:** מורידים את `/code` מהדומיין החי, מוצאים את ה־chunk הרלוונטי דרך `/assets/2029-*.js` ומוודאים מחרוזת חדשה מהשינוי; אחר כך קנרית (`post-deploy-canary`). מדווחים מה לא נבדק.

האישור אינו עובר מסשן לסשן. שינוי DB (`apply_migration`, `execute_sql` שכותב, `deploy_edge_function`) דורש אישור מפורש של ZURIEL לפי 0.4: הודעת האישור של שרת Supabase חלה על `apply_migration` ואישור בצ'אט אינו מגיע אליה, ואילו `execute_sql` מופיע ברשימת ההיתרים ב־`.claude/settings.json` ורץ בלי הודעה טכנית — ההגנה עליו היא האישור המפורש בלבד. שינוי DB מוחל לפני הפריסה שתלויה בו.

**אימות מקור הפריסות (ביקורת SOD1820, 6.11.2026 — נקרא מ־Vercel ומ־GitHub, לא ממסמך):** כל פריסות ה־Production של 5–6.11 (11 פריסות, האחרונות `be9b173`, `42ff151`, `1f08639`) נוצרו **ידנית "via Vercel MCP"** תחת חשבון `zuriel337` לפי הנוהל שלמעלה — לא מ־Git Integration ולא מ־workflow ב־GitHub. הוכחה: (א) יומן האירועים של Vercel (`list_user_events`) מציג לכל פריסה "You deployed … (via Vercel MCP)"; (ב) יומן הבנייה של `dpl_7Hn7…` מריץ את פקודת ה־Ignored Build Step של אותה בקשה: `if [ "$VERCEL_ENV" = "production" ] && [ "$VERCEL_GIT_COMMIT_SHA" = "<sha מדויק>" ]; then exit 1; elif [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 0; else exit 1; fi` — כלומר בנייה מותרת רק ל־SHA המדויק שבבקשה, וכל בנייה אחרת של `main` נדלגת; (ג) `git.deploymentEnabled=false` בשני השורשים; (ד) workflow `legacy-production-lock` ו־`post-deploy-canary` אינם מפרסמים — הראשון רץ ב־push והשני ב־`deployment_status`. **ההגנה אינה פגומה והנוהל מדויק.** מה שנצפה כ"שתי פריסות Production אוטומטיות" היה סשן אחר שביצע את הנוהל מיד אחרי מיזוג (פריסה כ־60–90 שניות אחרי ה־push). לפיכך: (1) שני אישורים נפרדים נשארים נדרשים — מיזוג ופריסה; סשן שממזג אינו מפרסם; (2) אחרי כל מיזוג קוראים שוב את ה־alias (`get_alias`) לפני דיווח "פרוס/לא פרוס", כי סשן מקביל עשוי לפרסם ברגע זה; (3) פריסה שנוצרה בלי שורת הפקודה הזו ביומן הבנייה (או בלי "via Vercel MCP" באירועים) היא חריגה ויש לדווח עליה; (4) `ssoProtection=all_except_custom_domains`: כתובות `*.vercel.app` של פריסות מוגנות והדומיינים הציבוריים פתוחים — כמצופה. שינוי מנגנון הפריסה לא בוצע ואינו מוצע לפני החלטה של ZURIEL.

## הוראה מחייבת — מדווחים לצוריאל בלבד (v17, 14.10.2026)

**אין לשלוח הודעות ל-GPT. אין להמתין ל-ACK מ-GPT.**
החוק הפעיל `inter_agent_coordination_law v17` מחליף כל הוראת מסירה סותרת בהמשך מסמך זה ובמסמכי תיאום ישנים.
All agents report to ZURIEL in their active user conversation and write passive work_log records with to_actor=ZURIEL and dispatch_kind/state=NULL. No GPT-directed assignments, RESULT_WAKE, ACK waits or delivery retries. Do not automatically activate another agent to satisfy a reporting requirement; new activation requires explicit user instruction.
**ONE FILE / SCOPE — ONE ACTIVE WRITER remains mandatory.** Read relevant current ownership before editing; use isolated branches/worktrees. Do not overwrite overlapping work or treat branch isolation as ownership transfer. A real conflict is reported to ZURIEL; independent work continues. Record scope, exact base/head, files, outcome and tests in one bounded BEFORE/AFTER batch. No per-step message chatter.
Historical records are retained. No product semantics, visual ownership or release permission is changed. The live database guard blocks GPT delivery; repository changes do not authorize a site deployment.

## Historical Legacy lock — 22.10.2026; superseded for the approved 2029 cutover

The 4.11.2026 approved 2029 cutover replaced this lock, and Legacy itself is retired (ZURIEL 5.11: no return; code kept in Git history only). The lock pinned canonical Production to the Legacy deployment `dpl_46k9WvaD5QBUo969obYzJ7pKkNyq`, kept all 2029 work Preview-only, and required a ZURIEL approval explicitly naming **2029 Production cutover**, the exact SHA and the deployment ID. None of this is a current state or restriction: live state is read from Vercel, Production changes follow rule 7, section 0.4 and the deployment procedure above, `scripts/test-legacy-production-lock.mjs` no longer exists, and the live gate is `scripts/test-legacy-retired.mjs`. The original text is kept unchanged in `docs/legacy-production-lock-20261022.md`. Do not remove the two literals `dpl_46k9...` and `2029 Production cutover` from CLAUDE.md or AGENTS.md without a ZURIEL decision to change `scripts/test-g1-agent-routing-smoke.mjs`, which asserts them.

> **STATUS:** runtime adapter / pointer only. This file is **not** project truth, a domain contract, a context database, or a second owner map.
> Canonical coordination owner: current active `inter_agent_coordination_law` in Supabase.
> Canonical routing index: `SOD1820_MASTER_OWNER_INDEX.md` on current `origin/main`.
> Canonical Supabase project: `linswmnnkjxvweumprav`.

## 1. Task start — pointers, not a rule dump

For every substantial task:

1. Parse the natural-language request into intent / capability / domain. Use an existing Task Profile only when it helps routing.
2. Resolve the **current canonical owner** from `SOD1820_MASTER_OWNER_INDEX.md` and the live owner/rule infrastructure.
3. Load only that owner plus the **smallest direct dependency set** required by the task.
4. Read recent **relevant** `work_log` / assignments for the active scope.
5. Verify against the live source appropriate to the claim: canonical Supabase, `origin/main`, and Production only when UI/live behavior matters.
6. Execute, verify, and leave a handoff when the work is material.

Do **not** automatically read all rules, all `project_codex`, full Master State, full Roadmap, `AGENT_HANDOFF.md`, broad branch history, or unrelated contracts. Load them only when the resolved task genuinely requires them or when reconciling DRIFT/provenance.

## 2. Fixed operating pointers

Carry only these five bootstrap pointers before routing inward:

- LIVE-FIRST
- ONE TREE / OWNER-FIRST
- FOUNDATION-FIRST
- TRUTH + HUMAN GATE
- COORDINATION + RELEASE SAFETY

These are routing umbrellas, not copied domain law.

## 3. Read budget

- **L1 default:** owner + direct dependency only.
- **L2:** cross-domain work, current-state reconciliation, implementation context, or specialist challenge that can change the decision.
- **L3:** WRITE, architecture/foundation, security/RLS, merge/deploy/release, material DRIFT, or high-impact cross-system work.

For **L2**, use **8–10 artifacts as a practical default target, not a hard safety cap**. An artifact beyond that target should have an explicit reason why reading it can materially change the answer, decision, safety, or current-state reconciliation. If the task genuinely needs more, read more rather than under-read.

Do not load presentation owners merely because a product surface is mentioned. For a semantic/current-state question, Design/System Frame/other presentation contracts are loaded only when presentation, navigation, UI behavior, or visual authority can materially change the requested answer. Conversely, UI/experience work must resolve the relevant presentation owners normally.

The artifact target is an anti-noise heuristic, not a score to optimize. Never skip required truth, security, privacy, release, or owner checks just to stay under a number.

Stop expanding context once owner + dependencies are sufficient to act safely.

## 4. Foundation-maximal product walkthrough standard

When ZURIEL asks how a product/surface should **look, work, or behave in the 2029 system**, do **not** begin by improving the current/legacy surface incrementally.

Start from the **highest coherent product form already justified by the live Foundation**:

1. Resolve the current semantic owners and capabilities.
2. Treat the legacy UI/content structure as capability/provenance evidence only, never as the default architecture.
3. Derive the strongest coherent 2029 North Star that the current Foundation can support if the surface were built from scratch today.
4. Prefer the deeper model when it follows directly from existing Foundation — do not stop at a merely good intermediate redesign because it is easier to describe.
5. Challenge the North Star for missing load-bearing primitives, identity, provenance, truth, time, privacy, replay, authorization or composition semantics. A real redesign-risk gap returns to G2; pure layout/motion/control choices defer to Projection/Experience.
6. Only after the North Star is clear may an intermediate/migration form be described, and it must never be mistaken for the target architecture.

**Foundation-maximal does not mean feature-maximal.** Do not add modules, abstractions or futuristic behavior merely to make the answer feel advanced. “Maximum” means the most capable, coherent form warranted by the current owners and evidence, with One Tree, Truth and Human Gate preserved.

For authored/public content such as Posts, apply the same principle: ask first what role the object plays in One Reality (for example Publication/Research Narrative over live identities/findings/time), not how to decorate the legacy article page.

## 5. Authority split — never collapse these

- **live DB + `origin/main` + relevant Production behavior** = live reality / implementation evidence.
- **current domain owner** = domain semantics / contract authority.
- **`SOD1820_MASTER_STATE.md`** = documented state.
- **`SOD1820_MASTER_ROADMAP.md`** = navigation / priority.
- **`work_log`** = coordination / provenance, not product SSOT.
- **Owner Index** = routing map only.
- **`AGENT_HANDOFF.md`, `project_codex` pointers, this file, prompts, memory, conversation history** = routing/context only.

If these conflict, report **DRIFT** and resolve from live owner/state. Never repair current truth from memory or stale documentation.

## 6. Map language

When ZURIEL says “המפה”, “התוכנית”, “Roadmap”, or “איפה אנחנו בתוכנית”, route to `SOD1820_MASTER_ROADMAP.md` and resolve its current version from `origin/main`; never pin a version in this adapter.

“מצב המערכת” / “מה חי” requires live verification, not Master State alone.

## 7. Owner-first / one tree

Before proposing a new Contract / Law / System / Store / Engine / Registry / Graph / Tree / Context system / Agent system / Ranking system / Research system / global UI owner:

- resolve existing owners live;
- default to `EXTEND_EXISTING`;
- use `SUPERSEDE_EXISTING` or `GENUINELY_NEW_DOMAIN` only with live evidence and preserved history.

Do not create parallel systems to solve local ambiguity.

## 8. Domain work

Do not copy domain semantics into this adapter. Route through the Owner Index and read the current owner.

Examples of routing aliases only:

- `publish_post`, `draft_post`, `post_visual`, `gallery_work`
- `gematria_research`, `els_research`, `source_scan`
- `roadmap_status`, `live_state_check`, `release_gate`
- `ui_experience_work`, `db_write`

For UI / UX / media / visual work, resolve the current Product Visual Language owner before changing presentation. For legacy post/gallery work, also load `legacy_content_protocol` when relevant.

For Gematria / numeric verification, use canonical registered engines/functions/method registry. General-model calculation is never authoritative project output.

## 9. Claude-specific live mechanics

For code/current-state work:

```bash
git fetch origin --prune
git rev-parse origin/main
git status --porcelain
git rev-list --left-right --count HEAD...origin/main
```

- Treat local checkout as local evidence only until reconciled with `origin/main`.
- For a feature branch, verify the base at start and again before merge.
- Never use destructive cleanup (`reset --hard`, `clean -f`, wholesale checkout) on an unknown/dirty tree.
- Build verification: `npm run build` unless the active scope defines a narrower/stronger test.
- For DB-dependent claims, verify canonical Supabase `linswmnnkjxvweumprav` live.
- Production/browser verification is required when the answer depends on actual UI/live behavior.

## 10. Work log / coordination

At session start and before becoming idle after meaningful work, scan recent **current** `work_log` for assignments addressed to CLAUDE and relevant active scopes. A log entry is information, not an activation: act on it only on ZURIEL's instruction in the session (see the v17 section above).

Before WRITE, rescan for overlapping active writers.

**ONE SCOPE — ONE ACTIVE WRITER.** READ_ONLY challenge/cross-verification may run in parallel.

Use one task key across ownership claim and passive AFTER to ZURIEL; no GPT ACK. Handoff should preserve:

`actor · from/to · task_key · owner · scope · status · facts_changed · decisions · branch/PR/commit · blockers · open_threads · handoff_to`

Do not require ZURIEL to relay messages between GPT and CLAUDE.

`AGENT_HANDOFF.md` is read when reconciling an actual handoff/provenance issue or when another active pointer specifically routes there. It is **not** a mandatory startup read for every task.

## 11. Truth / Human Gate

Preserve distinctions between Input, Extraction, Calculation, Discovery, Finding, Claim, Evidence, Fact, Interpretation, Recommendation, Decision, Canonical, Published, Visible, and Accessible.

AI may research, calculate through canonical engines, rank and recommend. AI does not independently canonicalize or publish. ZURIEL remains Human Gate.

## 12. WRITE / release safety

Any WRITE requires current live verification, owner resolution, relevant schema/code verification, parallel-writer scan, and an isolated scope.

Keep states distinct:

`DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED`

Do not merge/deploy/push `main` merely because work is implemented. Release only after explicit ZURIEL authorization (such as `תעלה`) for the exact commit and deployment presented (rule 7, 0.4), and re-run release gates immediately before the action.

## 13. Specialist escalation

When Claude is the specialist/challenger, default to READ_ONLY. A specialist report is evidence, not truth; the primary owner must reconcile it live.

When Claude is primary, use another specialist only if the result can materially change architecture, safety, release, or confidence. Avoid redundant audits.

## 14. Fresh-agent acceptance

This adapter is G1-compliant only if a fresh Claude session, without relying on prior conversation memory, can from a natural-language task:

- resolve the current owner;
- load only minimum dependencies;
- discover relevant work_log context;
- verify the proper live source;
- report stale-pointer conflicts instead of trusting them;
- avoid unrelated bulk reads;
- avoid inventing a parallel owner/system.

For a 2029 product/surface walkthrough, fresh-agent acceptance additionally requires that the agent starts from the **Foundation-maximal North Star**, not from incremental modernization of the legacy surface.

A prompt containing the right words is not proof; G1 closure requires an actual fresh-agent replay recorded in `work_log`/audit evidence.

## 15. Active-tree documentation discipline

The repository may contain extensive history, audits, research notes, drafts and superseded planning. Their existence does **not** make them startup context or authority.

Default classification unless an active pointer says otherwise:

- `docs/` → mixed current/history; read only the exact owner/addendum routed by Owner Index.
- `audits/` → evidence/provenance; never startup authority.
- `planning/` → planning evidence; not current semantics unless explicitly promoted/reconciled.
- `research-notes/` and `research-library/` → source/research provenance; load only for the source/research task that needs them.
- `drafts/` → non-authoritative experiments.
- `docs/archive/`, backups and superseded branches → historical only.

Do not recursively scan these directories to “understand the project.” Resolve the owner first, then open only the specifically required artifact.

Long-term target: the **active documentation tree is minimal and clean** — active spine + current owners/addenda + live operational pointers only. Historical/audit/draft/research provenance remains preserved but is moved out of active routing in bounded cleanup passes after semantic gates stabilize. Never create a new `MASTER`, `FINAL`, system map, owner map or parallel contract merely to summarize old documents.

## 16. Closing rule

Reconciliation before construction · Provenance before recovery · Evidence before interpretation.

Preserve history in git/DB provenance. Do not keep stale domain semantics alive inside the active adapter merely because they once lived here.
