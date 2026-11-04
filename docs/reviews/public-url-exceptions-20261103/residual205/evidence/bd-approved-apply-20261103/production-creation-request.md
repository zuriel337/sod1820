# יצירת תוצר Production מוגן — בקשת1bc8260a, חיבור CLI נדרש

**הוחלף ב־12.45:** הבעליםביטלמסלולCLIשלאנפתחואישרבמפורשפרסוםישיר. OAuthנעצרללאcredentialוהבקשההישנהלאנשלחה. source1bc8260aנבנהכ־ProductionCkoiEsaT1ב־MCP,נבדקונקשרלשלושתדומייניהאתר. איןלהפעילאתהצעותהיצירהההיסטוריותלהלןעלגבירסתחיה. [ראיותלפרסוםשבוצע](../direct-cutover-20261104/README.md).

עדכון12.44, 4.11.2026. B/D כבר הוחלו ואומתו מחדש; לא תתבצע החלה כפולה.
קבלת פתיחת המנהל לפי הבעלים ב־12.43 נשמרת. אין סבב בדיקות מוצר חדש.

## מה הוכח כעת

ה־CLI הרשמי `vercel65.11.0` מאפשר בקשת API גולמית המשלבת **GitSource אמיתי
מוצמד ל־SHA** יחד עם `autoAssignCustomDomains:false` באותו payload. מקור
הפקודה הרגילה `deploy --skip-domain` משתמש באותו שדה ובאותו endpoint.
מחולל הפקודה האמיתי הורץ מקומית בלי רשת או אימות: JSON הפקודה פוענח ונמצא
זהה לחלוטין ל־JSON ההצעה, כולל SHA ו־false בוליאני. זו הוכחת סריאליזציה
ומימוש CLI, **לא** קבלת הבקשה המשולבת בשרת או קבלת תוצר Production.

החיבורMCP הנוכחי אינו חושף את השדה הזה בבקשת create_deployment; לא נמצא
כלי בקשת API גולמית חלופי. אין להכניסו למקום אחר במבנה או לשנות הגדרות
פרויקט כמעקף. בניגוד להערכה ההיסטורית, קיים כעת מסלול CLI קונקרטי; מה
שחסר הוא אימות CLI. בדיקת `CI=1 ... whoami` דיווחה `Logged out`. ה־CLI
הותקן בתיקיית כלים זמנית בלבד; לא התחיל login ולא נוצר credential.

הפעולה אפשרית דרך מפעיל שכבר מחובר, או לאחר אישור מפורש לחיבורOAuth
של כלי הפרסום בסביבה. חיבור כזה נעשה בדףVercel של הבעלים, ללא מסירת
מפתח או סיסמה בצ׳אט. אינו התחברותGoogle/Facebook לאתר, ואינו שינויAuth
של האתר. אישור פעולה ללא השלמת החיבור אינו מאפשר לפרסם.

## הפעולה המדויקת — הצעה בלבד, לא הורצה

[בקשתJSON המלאה](staged-transport-20261104/create-request.json) מצמידה פרויקט
`prj_43q7k7QFAcWnin1tcBjce5xOi7Cq`, צוות
`team_vtfWHZfKvdbob8gvynQb5N89`, ענף
`gpt/2029-public-cutover-final-preparation-20261103` ומקור `1bc8260adaa889d7903aaa33ef43510df09817f2`.
המקור התקבל בפריוויו `dpl_ADnf6NL9VznxiiysCQZqoGPguJSE`.

```sh
CI=1 VERCEL_TELEMETRY_DISABLED=1 vercel api \
  '/v13/deployments?teamId=team_vtfWHZfKvdbob8gvynQb5N89' \
  --method POST --input create-request.json --raw
```

יש להריץ עםCLI65.11.0 והרשאה מחוברת מאומתת; קובץ הקלט הוא הקובץ המקושר
לעיל, בלי שינוי תוכנו. target=production; autoAssignCustomDomains=false;
GitSource ולא העלאת קבצים; buildCommand מאושר עם public-production-candidate
ו־review-source המדויק. אין alias/promote/domain/DNS או שינוי פרויקט.

לפני הפעלה: לוודא שוב ראש ענף, מקור/הרשאות, הגנת כתובת התוצר וכל שלוש
הפניותLegacy. הגנת הפרויקט נקראה: SSO מופעל ב־all_except_custom_domains;
יש לוודא שהיא מכסה את כתובת התוצר הבלתי־משתנה. אין להחליש הגנה.
אחרי יצירה: לאמת source ו־Git checkout אמיתי נקי, target, READY,
מניעת שיוך, כל שלושת דומייניLegacy ללא שינוי ו־VercelAuthentication ללא
הרשאה. כשל/שדה לא נתמך עוצרים; אין retry שמסיר false או עובר ל־files.
לא מבצעים promote או alias כדי לבדוק.

רק אחרי שהתוצר נבנה, בדיקה ממוקדת של ניתוב/SEO/SW וגבולות ההפעלה תיעשה
עליו; בדיקות מוצר תקפות לא ירוצו מחדש ללא צורך. לאחר מכן אפשר להציג
בקשת **2029 Production cutover** עםSHA ו־deployment ID המתקבלים. זו בקשה
נפרדת הנדרשת ב־AGENTS.md; הפריסה אינה ידועה מראש ואין להמציא מזהה.

## נוסח אישור מדויק ליצירת התוצר ולחיבור הנדרש

״אני מאשר חיבורOAuth חד־פעמי שלCLI Vercel בסביבת העבודה, ללא מסירת
סודות בצ׳אט, וליצור תוצרProduction מוגן אחד בלבד בפרויקט והצוות לעיל,
מ־SHA `1bc8260adaa889d7903aaa33ef43510df09817f2` ומהבקשה המקושרת המדויקת, עם
`autoAssignCustomDomains:false` ו־GitSource אמיתי. שלושת הדומיינים
sod1820.co.il, www.sod1820.co.il, sod1820.vercel.app נשאריםLegacy.
אין main push/merge, promote, alias, DNS או שינוי הגדרות משותפות.
אם אימות המקור/ההגנה/מניעת השיוך נכשל — עוצרים. יצירת התוצר אינה
אישור2029 Production cutover; אאשר מעבר מדויק בנפרד לאחר קבלת התוצר.״

[ראיותCLI ואימות B/D](staged-transport-20261104/README.md).

## צילום הבירור הקודם — היסטוריה בלבד

הקטע הבא נשמר לזיהוי המקור והגבולות הקודמים. מקורd8ee2753 ובקשתו
הישנה הוחלפו; אין לבצע אותם מעל תיקון1bc8260a.

# יצירת תוצר Production מוגן — בקשה מדויקת, חסומה כרגע בחיבור

# עדכון12.42 — מקור היסטורי, אין לבצע בקשה זו

לאחר תיקון המסך השחור ב־CP1, מקור המוצר העדכני הוא
`1bc8260adaa889d7903aaa33ef43510df09817f2`, בפריוויו המוגן
`dpl_ADnf6NL9VznxiiysCQZqoGPguJSE` בלבד. הבקשה להלן נשמרת כתיעוד
מותנה למקור הקודם `d8ee2753`; אינה אישור לפרסמו מעל התיקון.
לאחר הוכחת מסלול יצירה ללא שיוך דומיינים וקבלת המנהל האמיתית,
יש להכין בקשה מדויקת מוצמדת למקור המתוקן. אין אישור חדש ליצירת
Production או למעבר לחי. [ראיות התיקון](../admin-black-screen-20261103/README.md).

## תוצאת הבירור

ביקורת קריאה בלבד עצמאית של `/root/release_staging_path_review` השלימה את הבירור. לא נמצא כיום מסלול מחובר שמוכיח גם בנייה ממקור Git המדויק וגם מניעת שיוך של כל שלושת דומייני הייצור.

- כלי create_deployment המחובר תומך ב־GitSource וב־SHA אמיתי, אך אין בו פרמטר skip-domain לכל פריסה. גם [OpenAPI הרשמי](https://openapi.vercel.sh) מסמן additionalProperties=false ואינו מציג autoAssignCustomDomains בשדות בקשת היצירה. הופעת השדה בתגובה אינה יכולת בקשה. אין לשלוח שדה לא נתמך.
- [המסלול הרשמי ב־CLI](https://vercel.com/docs/cli/deploying-from-cli#deploying-a-staged-production-build) הוא `vercel deploy --prod --skip-domain`. קוד חבילת vercel65.11.0 הרשמית מאשר מיפוי ל־autoAssignCustomDomains=false; SHA1 של חבילת המקור8ecaffaef3eb1e3483cedad5a4860fea22c60c86. אבל מסלול ה־CLI הרגיל מעלה קבצים עם Git metadata, ולא הוכח שהוא מספק checkout Git אמיתי ונקי במארח כפי שה־builder מחייב. אין להחליף זאת ב־prebuilt או במשתני פלטפורמה מזויפים.
- הגדרת הפרויקט autoAssignCustomDomains קיימת ב־PATCH, אך ערכה הנוכחי לא הוחזר, והתיעוד מתייחס ל־Production Branch Tracking. לא הוכחה ירושה בבניית GitSource ידנית או בטיחות הדומיין sod1820.vercel.app. אין לבצע שינוי גלובלי כמעקף.
- סודות/זהויות Vercel אינם מוגדרים בסביבת הביצוע שנבדקה. קריאת מטא־נתוני סודות GitHub החזירה403; זה אינו מוכיח שאין סוד. לא זוהה workflow פריסה קיים עם Vercel. לא התחיל login ולא הועתק מפתח.

היכולת החסרה היא פעולה בחיבור הקיים או מנגנון פרסום מורשה קיים מחוץ ל־Codex, שיוצר **Production ממקור Git מוצמד**, ובאותה פעולה מבטל במפורש כל שיוך דומיין ייצור, בלי שינוי הגדרות משותפות ובלי התקנת credential של Production ב־Codex. אישור פעולה אינו יוצר יכולת חיבור זו.

## נוסח האישור המוכן — לביצוע רק לאחר פתרון יכולת החיבור

״אני מאשר יצירת תוצר בדיקה אחד בלבד בפרויקט prj_43q7k7QFAcWnin1tcBjce5xOi7Cq, בענף gpt/2029-public-cutover-final-preparation-20261103, ממקור SHA d8ee2753482ee9c264795b19c52745da494be63a. היעד Production אך ללא שיוך אוטומטי או ידני של sod1820.co.il, www.sod1820.co.il או sod1820.vercel.app. ה־build משתמש ב־public-production-candidate וב־review-source השווה לאותו SHA, עם זהות פלטפורמה ו־Git אמיתיות. התוצר נשאר מוגן ב־Vercel Authentication ובמקור הבלתי־משתנה בלבד. נבדקים snapshots של שלושת הדומיינים לפני ואחרי, והם נשארים ב־Legacy המאומת באותו רגע. אין promote, alias, שינוי DNS, שינוי הגדרות הפרויקט, main push/merge או 2029 Production cutover. אם תנאי המקור, ההגנה, החיבור, ה־canary או מניעת השיוך אינו מוכח — לא יוצרים תוצר.״

מקור הקוד הוצמד ל־d8ee2753482ee9c264795b19c52745da494be63a והתקבל בפריוויו dpl_6DekQkT2ByVnPhtPbrFTYmD7bDgZ. לפני הצגת בקשה זו כאישור בר־ביצוע עדיין יש לציין פעולת כלי/CLI נתמכת שמקיימת את שני תנאי החיבור. כל עוד חסר המסלול, זהו נוסח מותנה בלבד ולא בקשת אישור ביצוע מוכנה. אין להציג אישור כללי כפתרון לחסם טכני.

Build מותנה באותו מקור:

```text
cd .. && VITE_AUTH_VERIFIED_PREVIEW_ORIGINS='[]' node scripts/build-public-reading-production.mjs --public-production-candidate --review-source=d8ee2753482ee9c264795b19c52745da494be63a
```

לאחר READY נדרשת קבלת התוצר המתארח בתצורתו האמיתית, לרבות HEAD/GET, מקור/קנוניקל/XML/robots/שיתוף/SW ושלילות. רק לאחר מכן תוגש בקשת 2029 Production cutover נפרדת עם SHA ו־deployment מדויקים. יצירת תוצר אינה החלפת האתר. חזרת אתר/SW נפרדת משחזור מסד ומדיה; אין ביטול S2 או מחיקת העדפות/מידע.
