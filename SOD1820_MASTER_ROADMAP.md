# SOD1820 — MASTER ROADMAP v6.12 COMPACT

**המשך 12.53 · 4.11.2026 — אותה תוכנית, תחזוקה ממוקדת בקוד:** דלתת התמונות28f ותיקוניXML מוזגו ב־PR1193 / מוצרa4910bc2 מעל הבסיס המאוחד, ללא החלפת חי. נשמרו95 בדיקות ממוקדות ו־14 תרחישי G4 מקומיים; A3 אמיתי מבודד עבר ב־558, Isolation המלא ו־Visual/ELS אינם סגורים. הוראת ZURIEL האחרונה מצמצמת לתיקונים חשובים: מפת האתר משתמשת במדיניות המטמון הקיימת רק ל־GET200 קנוני, והפרטיות נכללת לפי המטאדאטה הקיימת. אין סבב כתובות/ארכיטקטורה היסטורי חדש ואין שינוי אינדוקס קהילה. סדר ההמשך הקיים: קבלת CDNHIT קנוני וכניסה קרה בסף15 ללא override, יישור תרחישי הדפדפן שהוחלפו בהחלטות מוצר, ואז החלטת פרסום תחזוקה מדויקת. בפריוויו המוגן הסופי שתי הקנריות עדיין timeout; אין להסיק מטמון תקין בחי מבדיקת header מבוקרת. Productiond06/7Kcv נשאר, הקוד מ־main טרם נפרס. [מסירה וראיות](docs/reviews/main-live-state-reconciliation-20261104/README.md#המשך-1253--תמונות-ומפת-האתר). לא נפתח שלב חדש ולא נסגר G4; ההחלטות הקודמות והיסטוריית12.52ומטה נשמרות.

**המשך 12.52 · 4.11.2026 — איחוד main הושלם, הפרסום נפרד:** קומיט המוצר `71bb7646` מ־PR1191 משמר אתd06 ואת כל הדלתות שאושרו. נקודות החזרה למקורmain ולמקור החי נשמרו מרחוק; לא נמחקו ענפים. הקוד והוראות ההפעלה נמצאים כעת ב־main, וענפי המסירות שהוחלפו אינם מסלול שחרור ללא אישורמיוחד. מסלולPreview הנוכחי הוא חריג הבדיקה המצומצם שאושר בשער, ולא הרשאתProduction לענףישן. הבא: השלמת הקנרית המדויקת והריצות הרלוונטיות שנמצאות בתור, ואז פרסום 2029 מה־main המדויק לפי ההוראה שניתנה. אין צורך בהחלטת מוצר חדשה או בנייה מחדש של המערכות. [ראיות וקבלה](docs/reviews/main-live-state-reconciliation-20261104/README.md). מקורProduction נוכחי d06 /7Kcv; main מכיל במכוון תיקוני פוסט/תפריט/בדיקות שטרם פורסמו. התיעוד יכול להתקדם מעל קומיט המוצר ללא שינויruntime. אין מעברבדיקה לתוצאתPASS, override או סגירתG4 מכוח המיזוג.

**המשך 12.51 · 4.11.2026 — איחוד המאגר אחרי המעבר:** ZURIEL אישר הכנה ומיזוג של המוצר המאוחד ל־main, ובהמשך ביקש לפרסם את התיקונים. נשמר מקור החי העדכני d06cf1ab, עיצוב הקהילה ותיקוני המחשבון; שמונת קומיטי Legacy של main שולבו ללא סתירות. הושלם תיקון קישור CSS הפוסט הקיים ונוסף מחשבון גימטריה לתפריט, ללא שינוי עיצוב או הרחבת מערכת. הסדר שנותר: אישור השער הנפרד שהוצע ונבדק → שילוב מדויק וקבלה מתארחת → PR/main בהיסטוריה לינארית ללא פריסת Git אוטומטית → פעולת פרסום מאושרת מהמקור שנבדק. אין להציג אבחנת CSS מקומית כפריסה. קבלת source/current deployment נבדקת מחדש לפני כל פעולה. [החבילה והראיות](docs/reviews/main-live-state-reconciliation-20261104/README.md). H1, שני החשבונות, דחיות הבעלים וחסמי הניטור/הביצועים נשמרים. אין סגירת G4.

**המשך 12.50 · 4.11.2026 — תיקון ממשק מצומצם התקבל בפריוויו:** על בסיס המוצר `273ceb24`, מקור `d81e1b125d8a94fb41572e6a8d1493adb5572ce5` שומר קהילה ומנוע קיימים ומוסיף אריחי אפס לפתיחת המחשבון ואת עיגול החיפוש שבחר צוריאל. [הפריוויו המדויק](https://sod1820-n0z7ckyxb-sod1820-s-projects.vercel.app/gematria) עבר שלושה מסלולים עם SW ונתונים ציבוריים אמיתיים, מעבר למספר וחזרה, בנייד ובמחשב; גם בדיקות השפה/מחשבון/גבולות ובנייה עברו. [ראיות ומגבלות](docs/reviews/calculator-idle-tiles-20261104/README.md). החי נשאר `273ceb24` בקריאת הסיום; אין פרסום מכוח המשימה. ממשיכים רק בהשלמות המתועדות: ניטור, ביצועים וקבלה לפי השינוי הרלוונטי; אין הרחבת מערכות, סבב מיפוי או סגירת G4 מכוח תיקון זה. H1, קבלת החשבונות והדחיות המאושרות נשמרים. העדכונים הקודמים להלן נשמרים כהיסטוריה.

**עדכון 12.48–12.49 · 4.11.2026:** המועמד המשותף הוא `98d0508fb81de12850d8e97c5bcc13e2206729e4`. הוא כולל את תיקוני SEO, המחשבון, ״עכשיו״, הלוגו והכותרת הנעוצה, ואת תיקון אריזת ה־middleware. [פריוויו מוגן](https://sod1820-cv8jl8oo3-sod1820-s-projects.vercel.app), target=null, עבר16 תרחישים ב־390/1440. מקור זה הגיע ל־Production DNiWmnVW בנתיב הקהילה במהלך העבודה; root לא ביצע את הפרסום. קריאה חוזרת בחי: דפדפן200, בוט403 וזחלן ציבורי200. שלוש נקודות GA/Vercel/Search Console עדיין מחזירות404 וחסומות ב־SW. מדידות הביצועים על073 חלקיות, עם נסיגות ו־CLS מעל0.1; אין קבלת ביצועים מלאה או סגירתG4. קבלת שני החשבונות, H1 ודחיות הבעלים נשמרו. [ראיות האבטחה והחזרה](docs/reviews/public-url-exceptions-20261103/residual205/evidence/middleware-activity-20261104/README.md), BEFORE68f400e6; [איחוד וביצועים](docs/reviews/public-url-exceptions-20261103/residual205/evidence/seo-repair-calculator-integration-20261104/combined-integration-notes.md).

**12.47 — פערי קבלת SEO/HTTP קיימים:** ביקורת קריאה בלבד ב־Production `f4390dd3` מאשרת canonical סותר בכינויי מחשבון/מספר/ביטוי ובקטלוג פוסטים, ו־404 במסמך הגלריות. נדרש תיקון ממוקד בקוראים/תנאי הפרסום הקיימים וקבלה של המסלולים המושפעים בלבד; אין תוכנית חדשה, פתיחת מערכות, מעבר אוטומטי או סגירת G4. [ראיות וגבולות](docs/reviews/public-url-exceptions-20261103/residual205/evidence/canonical-parity-20261104/README.md); BEFORE `b9c346a3-320f-4bf9-9216-f439d7507d49`.

**12.46 — המשך נקודתי לאחר הפרסום:** תאימות שלושת כינויי המחשבון `/2029` אומתה בחי; תיקון canonical שרת/לקוח נבדק בענף בלבד. אין שינוי תוכנית, פתיחת מערכת או פריסה נוספת. קבלת G4 הפורמלית אינה נסגרת מכך. [ראיה ומגבלות](docs/reviews/public-url-exceptions-20261103/residual205/evidence/calculator-canonical-20261104/README.md); BEFORE `268c6a37-7858-497f-8367-9021aacce526`. האחרונה: בעת הבדיקה נמצא עדכון קהילה עצמאי bde0a822 בענף המקורי וב־Production9mWv; לא בוצע בידי משימת המחשבון. התיקון נשמר בנפרד בענף gpt/2029-calculator-canonical-compatibility-20261104, ללא שילוב או פריסה נוספת. גם בגרסה המעודכנת שלושת הכינויים חושבו בהצלחה והפער במטאדאטה שוחזר. אין כאן קבלה כוללת של דלתת הקהילה.

**המשך12.45 — המעבר בוצע:** 2029 חי במקור1bc8260a / ProductionCkoiEsaT1; כתובותlegacyנשמרובנתביםהקיימים, WWWו־vercel.app מחזירים308ל־canonicalעםפרמטריםחוזרים. לאממתיניםיותרלחיבורCLI/תוצרProduction/אישורcutoverלפריסהזו. נשמריםלהמשך:195שחזורישמע/פוסטיםשנדחובאישור,יבואצ׳אטשנדחה,פעולותשלאהתקבלונשארותסגורותכמובמועמד,כניסהחברתיתידניתשדולגהוקבלתדיוורחיוביתשלאבוצעהאוטומטית. H1היסטורימאומת;עדכניותגיבוי/מדיהלאאומתהוהסיכוןאושר. איןסבבאופטימיזציה/מיפוי/מערכותחדשותמכוחcutoverואיןסגירתG4פורמלית. MainנשארLegacy;פריסהעתידיתדורשתאישורמדויקושמירתהנעילות. [קבלהותוכניתחזרה](docs/reviews/public-url-exceptions-20261103/residual205/evidence/direct-cutover-20261104/README.md).

**המשך12.44 — צעד הפרסום הבא:** לא להחיל B/D שוב; השרתים והמסד אומתו כפעילים בגרסאות המאושרות. שומרים את קבלת המנהל ושני החשבונות והדילוג על בדיקה חברתית. [הפעולה המוכנה](docs/reviews/public-url-exceptions-20261103/residual205/evidence/bd-approved-apply-20261103/production-creation-request.md): לאחר אישורOAuthלכלי הפרסום והשלמת החיבור, בקשתAPIאחת ליצירתProductionמוגן ממקור1bc8260a עםGitSource ו־autoAssignCustomDomains=false, ללא שיוך דומיינים. קליטת הבקשה בשרת לא נבדקה; כשל עוצר ללא הסרתהדגל. לאחר קבלת התוצר בלבד יוצגSHA+deploymentלבקשתcutoverמדויקת. אין סבב בדיקות מוצר חדש, פריסה או שינוי תשתית; המשימות הקודמות והסיכון המתועד נשמרים. BEFORE5d3150d3.

**המשך12.43 — כשל פתיחת המנהל נסגר:** צוריאל אישר „עובד” על הפריוויו המתוקן1bc8260a/dpl_ADnf6NL9; אין בקשה חוזרת לפתיחת אותו מסך. בדיקות רענון/trace לא דווחו פרטנית, ולא נסגר מכוח הדיווח שערCP1מלא/G4. ממשיכים רק עם ההשלמות הקיימות: תוצרProduction מוגן ממקורGit בלי שיוך דומיינים וקבלת פעולות דיוור חיוביות בבעלות המשתמש; אין יצירה/מעבר לחי באישור זה. קבלת שני החשבונות ודיון סיכון הגיבויים נשמרו, ובדיקה חברתית ידנית דולגה. [קבלת הבעלים](docs/reviews/public-url-exceptions-20261103/residual205/evidence/admin-black-screen-20261103/owner-acceptance.json); BEFOREf7f20b82.

**המשך12.42 — CP1:** נסגר תיקון הקוד לקריסת הכניסה בבקרת המנהל; נותרת קבלת הבעלים האמיתית על [1bc8260a](https://sod1820-96jzc6z50-sod1820-s-projects.vercel.app/login?returnTo=%2F2029%2Fcontrol). שישה תרחישי תצוגה/כשל/הרשאה סינתטיים,37 בדיקות וגבולותLegacy עברו; אינם קבלת חשבון אמיתי או שערG4. Google/Facebook ידניים: `SKIPPED_BY_OWNER_NOT_TESTED`; לא לבקש שוב את אותה בדיקה כעת, ולא לסמן שהספקים התקבלו. ממשיכים מהמועמד השמור; לא נפתח סבב אופטימיזציה או מיפוי. חסם יצירת תוצרProduction מ־Git ללא שיוך דומיינים נשאר נפרד; B/D כברהוחלו, ההמשכיות האישית/H1 תקפים והסיכון לעדכניות גיבוי/מדיה התקבל. אין אישור מעבר לחי. [דלתא וראיות](docs/reviews/public-url-exceptions-20261103/residual205/evidence/admin-black-screen-20261103/README.md); BEFOREa87a33d4. סטטוס12.41ל־CP1/בדיקהחברתית הוא היסטורי.

**מצב12.41 — B/D אושרו והוחלו:** מיגרציה20261103223217, signup20 ו־unsubscribe10 אומתו מול המקורות המדויקים;1,024 הרשומות הקיימות וטביעתן נשמרו, וטריגר החשבון לא השתנה.33 בדיקות דיוור,6 בדיקות פרופיל שירות ו־10 בדיקות חיות ללא כתיבה עברו. טופסי הבית ו־/updates התקבלו מול החוזה האמיתי בפריוויו מוגן `d8ee2753482ee9c264795b19c52745da494be63a` / `dpl_6DekQkT2ByVnPhtPbrFTYmD7bDgZ`:4 תרחישי390/1440 עםSWאמיתי ושדה ריק, ללאשליחה. [הפריוויו המדויק](https://sod1820-lnutdyfin-sod1820-s-projects.vercel.app). התיקון מסיר רק חסימה ישנה בפרופיל הפרסום הקיים. אין שינוי מנויים/משלוח, A2/C או Auth. קבלת שני החשבונות נשמרת; callback נדחה וקבלת CP1 אמיתית פתוחים. בירור עצמאי אישר שחסרה יכולת מחוברת המשלבת Git אמיתי עם אפס שיוך דומייני Production; בקשת יצירה נשמרת מותנית ואינה ניתנת לביצוע רק מכוח אישור. אין main/אתרProduction/דומיינים או סגירתG4. מצב12.40 שמתחת הוא היסטורי לעניין B/D והדף בלבד. BEFORE8e5e5ffe ותוספת0673ed5e. [ראיות והשלמות](docs/reviews/public-url-exceptions-20261103/residual205/evidence/bd-approved-apply-20261103/README.md).

**מצב 12.40 — התאמת השער אושרה ושולבה בענף בלבד:** תשעת הקבצים תואמים בדיוק להצעה שאישר צוריאל ב־8882d7c5. עברו 49 בדיקות שער ותוצר, 33 בדיקות הרשאות ובנייה מקומית במצב dormant; שערי Legacy והעץ היחיד נשמרו. קבלת שני החשבונות נשמרת. קוד המוצר `21f1a8d9e3e3fc6c7c35583ac79aee28f5e92b41` שמור מרחוק, ו[הפריוויו המדויק](https://sod1820-d3ocprlw4-sod1820-s-projects.vercel.app) התקבל בשישה תרחישי דפדפן עם SW אמיתי ב־390/1440 ובשישה מסלולי HTTP ב־GET/HEAD; פריסה `dpl_8VcC1LwM4aBmPEeZNS9DwYUGDSCu`, ‏target=NULL. ראיות מאוחרות הן תיעוד בלבד ואינן קוד מוצר חדש. יצירת Production ושיוך דומיינים אינם מורשים. מסלול יצירה מוגן ללא דומיינים עדיין לא הוכח; B/D, callback שנדחה וקבלת CP1 אמיתית נשארים פתוחים. מצב 12.39 שמתחת הוא צילום ההצעה הקודמת, שהוחלף רק לעניין שילוב הקוד. BEFORE45453603; אין סגירת G4 או cutover. [ראיות והשלמות הבעלים](docs/reviews/public-url-exceptions-20261103/residual205/evidence/final-preparation/production-activation/public-candidate/approved-integration/README.md).

**מצב12.39 — פרסום מתוכנן, לא הוחל:** קוד המועמד והפריוויו נשאר01662ab57e92ea71332c05ca971a2280ddb988ea. הוכנה [הצעת שער ציבורי מדויקת](docs/reviews/public-url-exceptions-20261103/residual205/evidence/final-preparation/production-activation/public-candidate/README.md), הכוללת שמירתPreview/staging, קבלת כתובות ואינדוקס ציבורי לפי הבעלים הקיימים.49 בדיקות ובנייתdormant מקומית מבודדת עברו; הפורום,WP2481,404/503,פרטי ו־API noindex נשמרו. אין שינוי בקובצי המוצר, בפריסה או בדומיינים. חסר עדיין מסלול יצירתProduction מוגן ובלי שיוך דומיינים שהוכח ומורשה; CLIבדקlogged-out ו־autoAssignהנוכחי אינו ידוע. אישור שער נפרד וקבלת תוצר בפלטפורמה אינם אישורcutoverסופי. שאריתB/D, callbackהנדחה ו־CP1 נשמרת; קבלות החשבון/H1/סיכון/שחזוריםדחויים לא נפתחו מחדש. BEFORE59cb9dce; G3סגור ו־G4לאהוכרזכסגור. ההמשך12.38 נשמר כהיסטוריה במקום שהשתנה רק מצב הכנת הפרסום.

**המשך12.38 — קיצור וקבלת המשכיות:** Google/Facebook/OTP חוברו מחדש ל־Auth הקיים, ללאשינוי הטריגר, העדפות או הדיוור הפעיל. כתובתPreviewשלענף נקשרת להוכחתפלטפורמהמדויקת לקבלתcallbackקבוע.32 בדיקותממוקדותעברו; איןבדיקהמחודשתשלכלקבלתחשבונות. פתיחהוביטולשלשניספקיםעדייןחזרהל־Production; דרושהבדיקתRedirectURLsמדויקתוקבלתבעלחשבון. CP1מוכןלקבלתמנהלקריאה. אישורהדיוורצומצםל־B/D, A2נשמרלעתיד ואינוחסםAuthנוסף. הצעתstagingשומרתאתהדלתאהחדשהועברה5מבחניםמבודדים,לאהוחלה; תוצרProductionואישורcutoverנותרונפרדים. [קישורים, צעדים ותוצאותצפויות](docs/reviews/public-url-exceptions-20261103/residual205/four-completions.md). איןשינוינתוני/העדפותמוצר,משלוחגורף,Legacyהחי,mainאודומייניםקנוניים. ההיסטוריה12.37נשמרתבמהשהוחלףכאן.

**מצב12.37 · 3.11.2026:** S2 ושתי זרועות הכשל בקורא הבקרה אושרו והוחלו בשרת המשותף;8 hashes והרשאות/ספירות תואמים, קבלה אנונימית ו־4 בדיקות מסלולים מושפעים עברו. אין מכך חותםS2/CP1/G4מלא. A הישן הוחלף בהחלטת צוריאל: חשבון חדש ומאומת מקבל עדכוני אתר כברירת מחדל, עם הסרה פעילה; כניסה רגילה והסרות קודמות אינן משתנות. הצעתA2/B/D נבדקה22/22 קבוצותPostgreSQL אך טרם הוחלה/אושרה כתשתית מדויקת. נדרש נוסח נכון גם ב־signup הפעיל בלגאסי. בעל־הבית הקנוני עודכן ל־subscription_funnel_law v22 כהחלטה בלבד; ההיסטוריה נשמרה. [ראיות ותלויות](docs/reviews/public-url-exceptions-20261103/residual205/final-preparation.md). BEFORE951a982f. שאר צילום12.36ומטה היסטורי היכן שהוחלף כאן. אין שינוי אתרProduction/main/דומיינים, קמפיין או ייבואצאט.

**המשך12.36 — קבלת מועמד בלבד:** חלונית האורח חוברה לטופס עדכוני האתר הקיים, עם תמונה ורקע חלל מקומיים ופונטים2029, בלי „קוד המציאות”; לא ניתן אישור שרת/משלוח. תוקנו קריאות/רענון/מצבי כשל וזהות בתצוגת הבקרה.109בדיקות ממוקדות ובניותLegacyו־2029עברו; הצעות השרת מבודדות/ממתינות. הצ׳אט נדחה כעת בידי צוריאל —0יובאו. [פירוט ההחלטות והחסמים](docs/reviews/public-url-exceptions-20261103/residual205/final-preparation.md). שני החשבונות התקבלו בדיווח המשתמש; אין צורך לבדוקם מחדש. A/B/DלעומתקמפייןC ו־CP1/S2/הפעלתProductionנפרדים; H1תקף והסיכון הנוכחי אינוPASS. איןcutoverאוG4מלא.

**קדימות נוכחית 12.36 · 3.11.2026:**
אותה חבילת מעבר: S2 ואישורו, ההכרעה הממוקדת בשינוייAuth/דיוור, בקרה ותצורת פרסום/חזרה. בירור נוסף של גיבוי אינו מעכב את ההכנה לפי החלטת הסיכון של צוריאל; המידע לא אומת ואינו מסומןPASS. אין שלב חדש, חזרה עלG3, הרחבת מערכות או אישורcutover. [המשך ההכנה והקבלה האישית](docs/reviews/public-url-exceptions-20261103/residual205/final-preparation.md). סטטוסים קודמים לגבי חסם הבירור מוחלפים רק בתחום הזה.

**קדימות המעבר 12.35 · 3.11 · אותה תוכנית, ללא שלב חדש:**
[מסירת ההמשכיות](docs/reviews/public-url-exceptions-20261103/residual205/continuity-closure-20261103.md). דחיית 193 קישורי השמע ושני הפוסטים אושרה תוך שימור כתובות, ראיות ומשימת שחזור. המשך הפורום ודפי ההרצאות טופלו; קבלת הפעולות האישיות המפורטות בשני החשבונות התקבלה בדיווח המשתמש על `7360`.

סדר ההמשך לפי התנאים הקיימים: תיקון S2 המוגבל ואישורו; עדכניות גיבוי המסד וכיסוי המדיה על בסיס H1; קבלת CP1 ומעבר מבקר חוזר/יחידות הפרסום; הכרעה בשינויי Auth ודיוור שהושארו בהמתנה; ולבסוף תצורת הפעלה וחזרה ואישור cutover מדויק. אין פתיחה מחדש של G3, הרחבת ספרים, עיצוב או מערכות גדולות. הצלחת workflow אינה סגירת G4.

**סעיפי12.34/12.33 להלן היסטוריים בתחום ספירתהיתרות וקבלתהחשבונות בלבד;12.35 מחליף אותם בתחומים אלה.**

**קדימות המעבר העדכנית12.34 · 3.11 · ללא שלב חדש:**
[בירור205 והראיות](docs/reviews/public-url-exceptions-20261103/residual205/README.md): 197 נשארו פתוחות —193שמע+2פוסטים שבורים כבר בלגאסי,ForumPost ציבורי ואינדקס הרצאות לא מוכרע. שחזור הכשלים ההיסטוריים ניתן לדחייה מפורשת; אין פטור אוטומטי. להשלים קבלת חשבונות שלא פורטה וחיבורWhatsApp;DMאמיתי דווח בידי המשתמש. שימור הספרים/אהבת תורה מטופל בתוך המועמד, ללא ענף בסיס חדש. S2/CP1,מבקר חוזר,גיבוי/מדיה והפעלה/חזרה נפרדים;G3/H1תקפים ו־G4/cutoverפתוחים. BEFORE1db8d430.

**המשכיות חשבונות · 3.11 — runtime7937f084, Preview בלבד:**
חסימת חשבון רגיל בפעולות האישיות הקיימות תוקנה ונבדקה במבוקר; קבלת כל פעולות שני
החשבונות עדיין פתוחה. צוריאל דיווח כעת על תצוגה ו־DMאמיתי תקינים ב־b80; יתר הפעולות טרם פורטו.
אין פתיחת מערכות גדולות או שלב חדש. [ראיות ומגבלות](docs/reviews/personal-continuity-glass-number-20261103/README.md).
מסמך37§12.33 ו־F25 עודכנו; קבלת14 מקרים ציבורייםc023 אינה קבלת חשבון. social/signup ושינויי b21ed1ff בהמתנה. תנאי S2/CP1,
מבקר חוזר, עדכניות גיבוי/מדיה והפעלה/חזרה נשמרים; H1/G3 אינם נפתחים מחדש,
ומעבר בדיקות אינו סגירת G4 או הרשאת Production.


**צילום קבלה קודם12.32 — הוחלף בבירור205 העדכני שלהלן/לעיל; Preview בלבד:**
[קבלה לפי כתובת מקור וסיבת חריגה](docs/reviews/public-url-exceptions-20261103/README.md).
מכנה469+2140 נשמר במלואו: **2352 נפתרו לפי ראיה מדויקת;48 סגורים במכוון;
4 לא תקינים;205 חסרי ראיית מקור** (193 שמע,8 זהויות פוסט,3 סרטונים חיצוניים
והרצאה אחת). נפתרו הפניות תמונה/embed, כינויים וקטגוריה מדויקת; אין מכך קבלת
כל33,667 הכתובות ב־HTTP או סגירת G4/מעבר. כיסוי מלא של תוכן העבר נשאר פתוח.
הרשאות, כתובות הפוסטים וגבולות P0 נשמרים. דיווח קודם התקבל בהיקף המאושר;
בדיקות הדיווח החיות לא חזרו בסבב זה. חשבונות אמיתיים/שמירות/התחברות, מעבר
מבקר חוזר, S2/CP1, עדכניות גיבוי וכיסוי מדיה ותצורת הפעלה/חזרה עדיין פתוחים.
H1/G3 נשמרים; b21ed1ff עדיין בהמתנה. BEFORE8c147469-65f8-4ffe-8e03-91baf66ab4ca.

**צילום קבלה קודם (המספרים469/2140 הוכרעו כעת כמפורט לעיל):**
**עדכון קבלה ממוקד 3.11 — ממשיך את 3f23b26f:**
[ספירת הכתובות, תיקוני התמונות/הטיקר, הדיווח וחסמי המעבר](docs/reviews/public-acceptance-closure-20261103/README.md).
33,667 רשומות סווגו אוטומטית: אין זו קבלת HTTP מלאה. 641 הפניות כוללות
258 יעדים לא מטופלים; 211 רשומות נוספות אינן מטופלות ישירות. שמירת דיווח
מפורש אושרה בנפרד והופעלה: פנייה אחת נבדקה בממשק ותקלה אחת ב־API;
דיווח תקלה מאדם אמיתי עדיין טעון קבלה. אין שינוי דיוור או זהות בשרת. חשבון אמיתי, מבקר חוזר,
S2/CP1, עדכניות גיבוי וכיסוי מדיה ו־Production activation נשארים פתוחים.
H1/G3 נשמרים; אין מעבר לחי. BEFORE a8d1af3f-c987-40c8-a582-c59dc2c27109.

**Date:** 2026-11-03 (navigation/status synchronization; existing gate sequence retained)
**Status:** NAVIGATION / PRIORITY / GATES ONLY · **G2 CLOSED · G3 CLOSED · G3→G4 TRANSITION** · HUMAN-GATE CONTROLLED

This Roadmap is not a rulebook, archive, change log, research store or owner body.

**Prior navigation checkpoint · 2026-11-03 (gate sequence retained; exception status continued above):** continue the existing
G3→G4 / Public Cutover lane; no new launch stage. Product branch `gpt/2029-public-url-continuity-20261103` (runtime checkpoint `78275d17`, continuing `9d3a0968`) is a protected
Preview candidate, not Production. The working-site scope now explicitly
includes preservation of existing community, chat, accounts, public libraries
and services; only unfinished/new capabilities may use their approved closed
states. Earlier public-reading-only acceptance is insufficient for that scope.
Explicitly retired experiments and private access boundaries remain governed by
their existing decisions; preserving a real public service does not reopen them.
G3 remains CLOSED; formal G4 and Public Cutover remain OPEN.

Current evidence/status belongs in [Master State](SOD1820_MASTER_STATE.md#1-authority)
and Doc37 §12.29. The [condition-by-condition reconciliation](docs/reviews/url-continuity-plan-20261103/coverage.md)
links requirements, evidence SHAs, missing acceptance and explicit deferrals.
The [existing address map](docs/w0-2027-route-seo-addressability-matrix-v1.md#8-current-2029-reconciliation--2026-11-03)
owns route-inventory navigation. Provenance: AFTER
`e18c1cb9-0ea0-4e6c-9617-232bb296d31b`; documentation BEFORE
`2b9004b6-5285-4aee-93e2-4b1174ec06cf`.

**Next work under the existing gates, in dependency order:** accept remaining
public URL/service exceptions after the implemented priority 1 adapters and
readers ([bounded evidence](docs/reviews/public-url-continuity-20261103/README.md)); retain source boundaries and finish the affected
Posts/Skeleton, identity and exact-return acceptance; close the existing S2
security/CP1 operational requirements; then accept the exact publication and
recovery/rollback evidence. Shared identity/mail changes remain HELD_BY_USER.
Reuse valid G3/H1/A3 and unchanged component evidence. Workflow G4 success is not
formal G4 closure. World/Home high-fidelity Goldens and other explicitly deferred
systems stay at their existing later positions; active public content/API paths
do not receive an exemption because a larger UI is closed.

**Tag/content-page acceptance clarification, 3.11 (implemented in the priority 1 candidate; representative browser acceptance, not all-item cutover parity):** restoring a real tag page
includes its specific content and a finished, polished 2029 presentation using
the approved Posts language and Design V2. A bare technical list, right-pinned
controls or a generic World redirect does not close the family. Reuse existing
components; inspect Legacy for content/behavior when unclear. This scoped
quality requirement does not move the deferred whole-World/Home Goldens forward.

One integrated candidate does not waive the existing
[family cutover/rollback and automated parity requirements](docs/g3-2029-cutover-acceptance-checklist.md#cutover-gate-extensions--2026-10-04).
Exact activation is still unapproved. AGENTS.md requires an explicit 2029
Production cutover authorization naming the final SHA and deployment, and
separate authorization for a release-guard change when applicable.

## Current position

**G2 — Foundation/Product capability reconciliation + Canonical Compaction: CLOSED.**

Human-Gate closure: **ZURIEL · 2026-09-15**.

Closure evidence:

- active tree frozen at 86 active rules, 0 ownerless, 0 unclassified;
- independent Claude fresh-agent challenge consumed;
- North-Star absorption blocker patched into existing owners;
- PR #467 merged to main at `27900d3f696a26cda598463a58bcff4e74d5832d`;
- Observability/SEO Build Gate PASS;
- Release Visual Gate PASS;
- production deployment READY and public site HTTP-verified;
- detailed gate: `audits/g2-p0-containment/G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_GATE_V1.md`.

**Current phase: G3 — CLOSED. Next navigation: G3→G4 transition / Golden preparation.**

**G3 CLOSURE SEAL · 2026-10-01 · Human Gate ZURIEL:** G3 runtime closure release = `74d15f88095deee8a629c9f65daf3b17173e033a`; `origin/main` and Production matched that exact SHA during live acceptance before the docs-only seal; PR #876 MERGED; Vercel READY on the exact SHA; final `sod1820/post-deploy-canary` SUCCESS on the same SHA. The six endgame migrations are LIVE/repo-aligned, 17 required Edge functions are ACTIVE, Canonical Data Inventory reports 317 objects / 0 material unmapped, WA has 0 active cron/background direct DB-held Green paths, the live Maintenance Acceptance Matrix was refreshed, and the independent Foundation LIVE challenge returned **PASS_G3_LIVE_CLOSURE_READY** (`work_log.id=663f93eb-1d16-4bdf-88dd-f3487508b7bc`). Temporary restore-test projects are gone; only canonical Supabase `linswmnnkjxvweumprav` is active.

Non-blocking maintenance debt remains routed to existing owners rather than reopening G3: transient sitemap-canary latency, existing `contributors_feed`/42501 read errors, DB capacity-baseline establishment, inventory client-RLS review items, and stale PR disposition.

**NEXT:** use the already-defined G3→G4 transition lane (informal “G3.5” shorthand) to prepare/validate the next real Golden Experiences. Closing G3 does **not** by itself open English, entitlement/pricing, Voice/Multimodal, Spatial/3D/XR, governed publication, or a broad Legacy→2029 cutover; those remain under their existing Human-Gate/owner rules.

**BOTTOM-UP CLOSURE / NO PREMATURE ASCENT · Human-Gate ZURIEL · 2026-09-29:** active closure owner is `foundation_closure_protocol_law v7`. Before a new WRITE, verify whether the canonical owner/runtime already satisfies the requirement. Ascend only when the load-bearing dependency below is CLOSED or explicitly non-blocking/deferred. A discovered lower gap descends only to its owning seam, closes there, and resumes from the interrupted point; it does not reopen all of G2/G3. Completion percentage and visible UI are never closure authority.

**G3→G4 transition rule · 2026-09-28:** G4 does not activate later capabilities merely because the gate number changes. G3 must first close its implementation/compaction blockers; G4 then runs real/replayable **Golden Experiences** over the already-built 2029 capabilities. A capability becomes Golden only after its real journey passes; English, entitlement/pricing, Voice/Multimodal, Spatial/3D and XR remain governed by their later program stages and do not auto-open at G4.

Detailed bottom-up execution/dependency plan: `docs/2029-implementation-dependency-plan-v1.md`.

**Human-Gate implementation focus · 2026-09-22 — 2029 FIRST.**

**Later scope clarification, 3.11:** this historical implementation direction
does not authorize blanket closure of existing community/chat/services. Their
meaning and capabilities must continue through the new presentation; the
availability rule for genuinely unfinished systems remains. See Doc37 §12.29.

- product/UX engineering effort goes to the 2029 tree, not to improving the Legacy experience for temporary parity;
- a Legacy UI/route may be frozen, hidden or explicitly unavailable during transition instead of receiving repair/polish when no current 2029 dependency requires that UI;
- if a capability has no safe 2029 renderer yet, prefer a truthful `BUILDING / unavailable` state over maintaining two competing product runtimes;
- **do not interpret this as blanket Legacy shutdown:** canonical engines, sources, ingress, writers, data/provenance and compatibility adapters remain live wherever 2029 still depends on them;
- source/writer retirement still requires replacement proof + live-consumer proof under existing owners; destructive/permanent retirement and major route cutover remain Human-Gated;
- target end-state: one 2029 product tree; Legacy survives only as bounded source/adapter/provenance until safely absorbed or retired.

**Historical release-semantics pointer (superseded for current coordination and this cutover authorization):** the detailed dependency plan is navigation only. Release authority always resolves from the live owners. At that checkpoint, `deploy_on_request` **v3** + `inter_agent_coordination_law` **v13** provided standing Human-Gate authorization for routine gate-clean, dependency-clean releases; older planning wording requiring a fresh `תעלה` for every routine merge/deploy was superseded. Current coordination is v17 via AGENTS/Owner Index; the 22.10 Legacy lock and later explicit task restrictions govern this candidate. No standing routine-release wording grants 2029 cutover, main push or guard modification. Governed publication, irreversible changes, pricing, privacy/security weakening and permanent retirement retain their owner/Human-Gate requirements.

## 2029 North Star — owner pointers only

Detailed domain semantics live in owners, not here:

- Foundation gate sequence / bottom-up closure / maintenance acceptance → active `foundation_closure_protocol_law` **v7**;
- Unified Experience / Audio / Motion / Spatial projection → active `experience_governance_foundation_v1_law` **v8**;
- Continuous Raziel Research Companion / multimodal voice readiness → active `raziel_companion_layer_law` **v3**;
- Capability Fabric / bounded Context Compiler / Context Pack → active `research_strategy_layer_law` **v17** + Research Workspace;
- Capability preservation / Premium-readiness / entitlement semantics → active `platform_tiers_law` **v5**;
- Capability availability / building/open state → active `site_flags_lock_law` **v3**;
- No Black Box / full execution trace / system recommendations / Incident Intelligence / resource-aware reliability → active `system_suggestions_law` **v5**;
- Translation / source-language evidence integrity → active `content_translation_law` **v4**;
- Personal Reality / authorized Person-Life relevance projection → active `person_foundation_contract_law` **v6**;
- Contextual Source Gap / missing-source research task → active `research_intake_foundation_contract_law` **v13**.
- 2029 Search / Video Discovery Foundation → current Video/Search projection remains on the 2029 product tree; canonical direction: `source/asset → 2029 projection → 2029 route`. Detailed implementation evidence stays in `docs/2029-implementation-dependency-plan-v1.md` + `docs/2029-search-indexing-closure-map-v1.md`, not duplicated here.

Historical Roadmap v5.6 remains provenance only. Normal routing starts from the current owner tree, not from the historical Roadmap body.

## G3 closure archive — pointer only

G3 is **CLOSED**. Its dependency spine, opening order, maintenance/compaction requirements and implementation detail are no longer part of active navigation.

Current closure pointers:
- documented current state and exact release evidence → `SOD1820_MASTER_STATE.md`;
- Foundation closure owner / acceptance law → active `foundation_closure_protocol_law v7`;
- implementation compaction / archive acceptance → `audits/g3-implementation-compaction/G3_IMPLEMENTATION_COMPACTION_ARCHIVE_GATE_V1.md`;
- post-release Maintenance Acceptance Matrix refresh → `work_log.id=4220295a-1e98-40de-98c4-d127d8f20059`;
- final independent LIVE Foundation verdict → `work_log.id=663f93eb-1d16-4bdf-88dd-f3487508b7bc`;
- final closure seal → `work_log.id=325cca05-3d5d-4ec5-bc21-683d3a51094d`.

Open operational debt from G3 is maintenance work under its existing owners; it does not restore the closed G3 execution plan to this Roadmap.

## G3→G4 transition lane — 2029 Public Shell + Posts-first Design Readiness

**ACTIVE NOW after G3 CLOSED. Informal shorthand: “G3.5”. This is NOT a new gate.**

Purpose: make 2029 the coherent visible product shell quickly, without pretending unfinished capabilities are live, without polishing Legacy UI, and without freezing replaceable presentation before G4 can teach us from real use.

- Freeze a **semantic shell contract**, not an irreversible IA or final visual composition. Stable through the transition: canonical surface/entity identities, route families, truth/access semantics, availability states, Research Context/Exact Return behavior, and capability slots. Replaceable by G4 evidence: navigation grouping/order, page composition, hierarchy emphasis, card geometry, imagery, motion, spatial treatment and other presentation details.
- High-fidelity design is an **early Human-Gate thinking instrument**, not a late cosmetic phase and not an acceptance shortcut. Once the semantic shell/availability contract is frozen, build at real visual quality so ZURIEL can inspect the system, compare directions and change composition before broad rollout.
- Freeze one coherent 2029 shell vocabulary across Home, World, Posts, Topics, Books/Sources, Number, ELS/Cipher, Journey, Community, Personal Area/Workspace, Raziel and future capability slots. Existing owners keep semantic authority; no surface becomes a new truth or capability owner.
- Every visible destination must project an honest availability state through existing capability/site-flag owners: **OPEN / BUILDING / LATER / GATED**. A visible button, image, icon or card may preview the future product, but an unavailable capability must not resolve into a fake working route or imply Golden acceptance.
- Define the **minimum public 2029 slice** before broad cutover: Home, World, Posts Index, Post, Topic and Book/Source navigation must form a coherent route chain with truthful return/navigation. Other surfaces may remain BUILDING.
- The public-shell transition is presentation/cutover readiness, not Legacy destruction. Legacy engines, sources, data, media, SEO compatibility and adapters remain behind 2029 until replacement/consumer proof permits retirement under their existing owners.
- **Posts-first priority:** because new public posts are the immediate Human-Gate need, the first high-fidelity Golden is **Posts Index + Post**. Current FZ1073 and Bennett×salt are fixtures; do not create a third Post Golden merely to test another local composition.
- Posts-first does **not** make Posts the owner of the visual system. Extract/reuse shared primitives and tokens so World and Home inherit the same language; no Bennett/FZ1073-specific UI law and no page-local visual system.
- Posts Golden acceptance must prove generic relationships and navigation rather than slug-specific semantics: Post↔Topic/Number/Book/Source connections, list→post→context→return, and shared Research Path behavior. Decision-changing failures descend only to their owning lower seam.
- G4 begins with the **Posts Index + Post Golden** over this semantic shell. Design readiness must never masquerade as experience acceptance.

- **Historical accepted 2029 composition · Human Gate ZURIEL · 12.10.2026:** one slim anchored real-update strip over natural living source sections; one desktop LEFT Companion with **עדכונים | הקשר**, contextual Golden Projector nested within it, and one BOTTOM Command Island with optional section-based progress inside its trail. The RIGHT global navigation remains distinct. **Owners:** Design V2 §§8.1/11.8, System Frame V2 addendum §3.5.3, current Publishing/Research Intake/Reality Graph and Owner Index. **G4 remaining sequence at that checkpoint:** certified source-native fragment + revision reader → Post/Home/World exact update/return → 320/390/desktop + Night/Day/Parchment/anon/admin visual/privacy acceptance. PR #1039 (Posts) and PR #1044 (Companion) were independent unmerged implementation candidates at that checkpoint; approval of direction was not Golden PASS, major cutover authorization, or an additional Golden.
- **Later composition decisions supersede only the conflicting presentation:** the old source Companion is hidden; Context, Now and the ticker remain active. Home follows the event-first/visible-series and later construction-panel decisions in Doc37. This does not reopen deferred meter/timeline work, restore an old sidebar or require historical PR reimport.
### Source-world completion timing after the 2026-10-07 corpus census

**Current evidence correction, 3.11:** P0-A/B maps were completed in AFTER
`af62469b-834a-4d61-9bea-b8cecb5333e8`; P0-C has the accepted archive-only research
admission decision. Their historical maps are not missing. The obligations below
now apply to the material delta and active public consumers, not a repeated deep
scan. [Receipt and precise limits](docs/reviews/url-continuity-plan-20261103/source-boundaries-evidence.md).
An archive admission decision is not permission to close chat or lose history.

- **Now / before the Posts Golden is accepted:** close only the selective identity/linkage repairs and exact source/provenance seams actually used by the Golden fixtures. The completed Zvi + Sod Hashmal maps are sufficient to proceed; do **not** deep-map the whole remaining world first.
- **During G4, before the Cross-Surface Skeleton Golden and before any 2029 Public Cutover:** complete the three P0 source-boundary maps discovered by the census: **P0-A Legacy Published Posts family**, **P0-B non-Zvi Channel/WhatsApp source-occurrence + identity**, and **P0-C OpenWeb/community admission boundary**. Required closure is boundary/identity/provenance sufficient to prevent duplicate source authority, false evidence independence and wrong attribution on active Post/Topic/Number/World/Book/Source projections; it is **not** a requirement to deep-extract every legacy item.
- **Before G4 closure:** any P0 corpus materially consumed by a Golden or public cross-surface projection must have owner-first lookup/reconciliation against existing Number/Entity/Convergence/Event/Source identities. An unresolved P0 source-identity/false-independence gap is a G4 blocker and must not be relabeled as G5 entitlement debt.
- **G5+ may carry deferred P1/P2/P3 deep maps and selective admissions** for source works, contributor packs and long-tail references that no closed Golden/public journey depends on. The moment such a corpus becomes an active public/premium capability input, its source/provenance/admission boundary must close **before activation**; entitlement never hides a Truth/Source gap.
- This timing creates no Corpus #3, tree, store or registry. It routes the census result through the existing Research Intake / Truth / Reality Graph owners and preserves One Tree.

- After Posts passes, run one bounded **Cross-Surface Skeleton Golden** over the minimum public slice before cutover — representative path such as Home → World → Topic → Post → Book/Number → exact return. Acceptance must include an exact-return replay after a full page reload, an auth-expiry → sign-in → return transition, and the constrained-mobile / Contextual Inspector bottom-sheet path. Its purpose is to prove shared navigation/context/availability semantics across surfaces, not to require final World/Home artwork.
- A **2029 Public Cutover** may occur only after both the Posts Golden and the Cross-Surface Skeleton Golden pass, the minimum public slice passes release/crawler/redirect/SEO checks, and ZURIEL explicitly authorizes the major cutover. At that point 2029 becomes the public face; unfinished destinations stay visibly BUILDING rather than falling back to Legacy UI.
- After cutover, continue G4 with **World high-fidelity Golden second** and **Home high-fidelity Golden third**, reusing the same visual system while allowing G4 evidence to change composition/navigation presentation without changing semantic identity.
- G4 remains the formal Golden-experience gate. This transition lane prepares the shell and high-fidelity design; it does not mark a capability Golden or satisfy G4 acceptance by itself.

## Later program sequence

### G4 — Golden Experiences

Run representative real journeys and surfaces against live/replayable fixtures. No simulated PASS.

**Transition semantics:** entering G4 means the G3 foundation/runtime is sufficiently closed to test complete experiences. It does **not** auto-enable G5+ capabilities. G4 consumes what already exists, finds real cross-layer failures, and promotes only journeys that pass Golden acceptance. Failed journeys route back to the owning G3 layer for repair without reopening Legacy UX as the target.

Golden order should include ELS + Raziel/context before broad localization/media rollout.

Golden acceptance also includes measured end-to-end performance on representative core journeys against live/replayable production-like data: route/input responsiveness, p50/p95 server/RPC latency where measurable, Raziel tool/response latency, query count/DB time, cache behavior, Storage/CDN egress, error/fallback rate and trace completeness. A latency/query/storage regression routes back to its owning G3 layer for repair. Raw/historical telemetry may be archived only after the Golden window proves canonical rollups preserve the required history.

**Post-G4 retrieval/inventory regression check:** after representative G4 Goldens complete, rerun the end-of-G3 owner-first retrieval benchmark, diff the Canonical Data Inventory against its G3 closure baseline, **and replay the enforcement-chain negative tests** for save receipts, Person ownership, canonical engine/writer entrypoints and media ingress. Any reintroduced orphan Person/artifact linkage, archived-log dependency in default routing, serial cross-store fallback, duplicate source authority, unowned new table/store, bypass that can still claim `DONE/SAVED`, or material p95 regression routes back to the owning G3 seam for correction before broad G5+ scaling. This is a maintenance/reconciliation check under existing owners, not a new monitoring or search system.

**External challenge + single-operator blind-spot review (standing G4/cutover matrix):** use the existing Redesign-Risk Challenge in `foundation_closure_protocol_law` plus read-only specialist dispatch under `inter_agent_coordination_law`; ZURIEL is never the messenger and no new agent system/registry is created. Review lenses are roles, not new bots: (1) beginner/product comprehension, (2) truth/Reality-Graph integrity, (3) release/SEO/cutover safety, (4) operability/simplification for one human operator, and (5) independent skeptic/unknown-unknown challenge. **Before G4 closure:** prove the Exact Return replay cases above and resolve the live Reality-Graph contract→DB enforcement gap for relation vocabulary/provenance/alias drift through the existing graph owner and Human Gate; stable writer/source binding must be resolved before any Golden materially relies on standing trusted-writer attribution. **Before Public Cutover:** prove parity+rollback/Legacy-retirement evidence, audit the two authorized POST-A pilot redirects before any broader post-URL precedent, challenge Topic↔Number and Home↔World product boundaries, include a Raziel unavailable/unregistered-capability negative test, verify beginner/orientation learnability, and run a bounded operations simplification pass over active functions/jobs/flags. **Later major gates only:** re-check retention/egress proportionality and rerun this matrix; do not create continuous monitoring merely to satisfy the review. Full external CTO A–J reconciliation and explicit do-not-build decisions: `audits/g4-gemini-cto-review/GEMINI_CTO_REVIEW_RECONCILIATION_V1.md`. Detailed evidence stays in work_log/audits and domain owners, not in this Roadmap.

**Security Hardening timing lane:** security is staged, not deferred. During G4 collect journey/RPC evidence and fix confirmed critical exposure immediately; before major 2029 Public Cutover pass the blocking Pre-Cutover Security Gate; G5 adds the Money/Entitlement Security Gate before paid/credit activation; G6 adds the Global Exposure Gate before broad multilingual exposure. Detailed acceptance stays in `docs/2029-security-hardening-gate-plan-v1.md`; security weakening remains Human-Gated.

**Public Beta Evidence / Self-Learning lane:** after required Goldens + the Pre-Cutover Security Gate, use the 2029 Public Cutover as a measured evidence window. Reuse existing Traffic Intelligence / Analytics owners; no second analytics truth store. G5 product allocation and G6 international rollout consume this evidence. Detailed metric identity, windows/cohorts and governed recommendation loop live in `docs/2029-public-beta-evidence-learning-plan-v1.md`.

**2029 Control Plane / Attention readiness lane:** during G4 freeze the shared Surface Registration / Launch Contract + Attention contract and wire owner projections; before Public Beta Cutover ship the minimum operational Control Plane; G5/G6 add money and international lenses. Any current or future surface may remain BUILDING, but may not become OPEN/Golden/Public without the shared launch evidence contract. Detailed inheritance/observability plan: `docs/2029-control-plane-attention-observability-plan-v1.md` + `docs/2029-implementation-dependency-plan-v1.md`.

External analytics/search/observability providers remain complementary evidence projections. Missing or unconfigured feeds render `UNAVAILABLE/NOT_CONFIGURED`, never synthetic zero; detailed provider/dimension semantics stay outside this Roadmap.

### G5 — Product / Entitlement Matrix

Exact Free / Registered / Premium / Credits allocation after Goldens. Entitlement never changes truth quality.

Deferred P1/P2/P3 corpus deep-mapping may continue in or after G5 when those corpora were not dependencies of closed G4 Goldens/public cutover. P0 source-boundary debt from the G4 source-world timing above is **not** deferrable into G5.

**Security gate:** before any first live paid purchase, credit grant/spend or premium entitlement activation, pass the G5 Money/Entitlement Security Gate from `docs/2029-security-hardening-gate-plan-v1.md`: server-owned amount/package/entitlement truth, authenticated ownership/admin boundaries, webhook verification + idempotency/replay protection, immutable/auditable credit ledger semantics, bounded rate/abuse controls and recovery/failure-path acceptance.

### G6 — English Golden Locale / multilingual projection acceptance

Prove English over the same identities, capability/access state, Research Context, truth/provenance and product surfaces. Then expand the same projection contract to the remaining canonical locales.

**Security gate:** before broad English/multilingual exposure, pass the G6 Global Exposure Gate from `docs/2029-security-hardening-gate-plan-v1.md`: locale routes preserve the same authorization/side-effect boundaries, public crawler/AI access remains read-only where intended, international abuse/rate patterns are measured, and Turnstile/ASN/datacenter/country controls are added only from evidence rather than by default.

### G7 — Multimodal / spatial / premium experience activation

Activate selected Voice/Audio/Private Corpus/Spatial/Media/Pulse/Cross-channel capabilities according to G5 entitlement and per-capability Golden acceptance. Capability may remain BUILDING/PARKED without deletion.

### G8 — Global shell, design acceptance, release batching

Complete cross-surface integration, measurable UX acceptance, parity/release proof and final deployment batches.

## Stable product homes / navigation direction

These are product homes, not semantic owners:

- Home
- World
- Heichal
- Updates / Posts
- Archive
- My Personal Area / Workspace
- Internal Control Plane / Admin — internal-only Human-Gate and operations projection; not public navigation and not a semantic owner

Global capabilities such as Raziel, Universal Resolve/Search/Command, Follow/Attention, Share and Journey may appear across surfaces without becoming separate top-level truth systems.

**Gematria Calculator (Human Gate ZURIEL · 2026-10-12):** one infrastructure, two projections — professional calculator (tiles/ledger, advanced, wide mode for Heichal) and the viral community calculator. Existing owners only (gematria engine/registry, Design V2, Raziel AI routing). Phases, dependencies and acceptance tests: `docs/2029-implementation-dependency-plan-v1.md` §5A.1.

## Open decisions that still matter

Only decision-changing open items belong here:

- exact remaining hardening/coverage mechanics for the G3 event-driven dispatcher, under `inter_agent_coordination_law` v13;
- exact runtime integration mechanics for the existing agent media/file upload bridge beyond the live bounded image URL relay;
- exact physical trace/span persistence + propagation mechanics that extend current AI/cost logs without creating disconnected telemetry;
- exact runtime provider/routing implementation for voice/STT/TTS and usage metering; providers remain replaceable;
- exact Home/Global Now composition;
- final Convergence index-admission threshold after the public Topic census; preserve current `/topic/:slug` behavior until Human Gate approves any bulk deindex policy;
- exact replacement gates and safe batching for Legacy writer retirement / major route cutover after 2029 consumer proof; Legacy UX maintenance/parity itself is no longer an objective;
- exceptional POST-A pilot redirects for FZ1073/Bennett remain bounded Human-Gate pilots, not general URL precedent; before any broad post-URL migration, complete inbound/SEO/canonical parity evidence under the existing route owner;
- exact server-boundary mechanics for HTTP 404/301/200 on invalid/retired/current **2029** public routes, without adding DB lookups to CN/SG bot-policy middleware;
- exact Free/Registered/Premium/Credits allocation in G5;
- exact English launch scope after Golden Locale acceptance;
- Calculator: Registry activation of the `en_*` methods (3 verified, `en_reverse_reduction` pending adjudication), Agrippa/Latin admission, and the Heichal wide-mode link;
- release batching after acceptance.

## Anti-inflation rule

Do not add detailed contracts, audits, examples or research findings to this Roadmap.

- domain semantics → owner;
- project current state → Master;
- research → Research OS;
- coordination/release trace → work_log;
- superseded detail → Archive;
- Roadmap → navigation, sequence, gates, priority, explicit open decisions only.
