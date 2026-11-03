# יצירת תוצר Production מוגן — בקשה מדויקת, חסומה כרגע בחיבור

## תוצאת הבירור

ביקורת קריאה בלבד עצמאית של `/root/release_staging_path_review` השלימה את הבירור. לא נמצא כיום מסלול מחובר שמוכיח גם בנייה ממקור Git המדויק וגם מניעת שיוך של כל שלושת דומייני הייצור.

- כלי create_deployment המחובר תומך ב־GitSource וב־SHA אמיתי, אך אין בו פרמטר skip-domain לכל פריסה. גם [OpenAPI הרשמי](https://openapi.vercel.sh) מסמן additionalProperties=false ואינו מציג autoAssignCustomDomains בשדות בקשת היצירה. הופעת השדה בתגובה אינה יכולת בקשה. אין לשלוח שדה לא נתמך.
- [המסלול הרשמי ב־CLI](https://vercel.com/docs/cli/deploying-from-cli#deploying-a-staged-production-build) הוא `vercel deploy --prod --skip-domain`. קוד חבילת vercel65.11.0 הרשמית מאשר מיפוי ל־autoAssignCustomDomains=false; SHA1 של חבילת המקור8ecaffaef3eb1e3483cedad5a4860fea22c60c86. אבל מסלול ה־CLI הרגיל מעלה קבצים עם Git metadata, ולא הוכח שהוא מספק checkout Git אמיתי ונקי במארח כפי שה־builder מחייב. אין להחליף זאת ב־prebuilt או במשתני פלטפורמה מזויפים.
- הגדרת הפרויקט autoAssignCustomDomains קיימת ב־PATCH, אך ערכה הנוכחי לא הוחזר, והתיעוד מתייחס ל־Production Branch Tracking. לא הוכחה ירושה בבניית GitSource ידנית או בטיחות הדומיין sod1820.vercel.app. אין לבצע שינוי גלובלי כמעקף.
- סודות/זהויות Vercel אינם מוגדרים בסביבת הביצוע שנבדקה. קריאת מטא־נתוני סודות GitHub החזירה403; זה אינו מוכיח שאין סוד. לא זוהה workflow פריסה קיים עם Vercel. לא התחיל login ולא הועתק מפתח.

היכולת החסרה היא פעולה בחיבור הקיים או מנגנון פרסום מורשה קיים מחוץ ל־Codex, שיוצר **Production ממקור Git מוצמד**, ובאותה פעולה מבטל במפורש כל שיוך דומיין ייצור, בלי שינוי הגדרות משותפות ובלי התקנת credential של Production ב־Codex. אישור פעולה אינו יוצר יכולת חיבור זו.

## נוסח האישור המוכן — לביצוע רק לאחר פתרון יכולת החיבור

״אני מאשר יצירת תוצר בדיקה אחד בלבד בפרויקט prj_43q7k7QFAcWnin1tcBjce5xOi7Cq, בענף gpt/2029-public-cutover-final-preparation-20261103, ממקור ה־SHA המדויק שנקוב בקבלת הפריוויו הסופית וברשומת AFTER של B/D. היעד Production אך ללא שיוך אוטומטי או ידני של sod1820.co.il, www.sod1820.co.il או sod1820.vercel.app. ה־build משתמש ב־public-production-candidate וב־review-source השווה לאותו SHA, עם זהות פלטפורמה ו־Git אמיתיות. התוצר נשאר מוגן ב־Vercel Authentication ובמקור הבלתי־משתנה בלבד. נבדקים snapshots של שלושת הדומיינים לפני ואחרי, והם נשארים ב־Legacy המאומת באותו רגע. אין promote, alias, שינוי DNS, שינוי הגדרות הפרויקט, main push/merge או 2029 Production cutover. אם תנאי המקור, ההגנה, החיבור, ה־canary או מניעת השיוך אינו מוכח — לא יוצרים תוצר.״

לפני הצגת בקשה זו כאישור בר־ביצוע יש להצמיד את ה־SHA הסופי בפועל ולציין את פעולת הכלי/CLI הנתמכת. כל עוד חסר המסלול, זהו נוסח מותנה בלבד ולא בקשת אישור ביצוע מוכנה. אין להציג אישור כללי כפתרון לחסם טכני.

Build מותנה באותו מקור:

```text
cd .. && VITE_AUTH_VERIFIED_PREVIEW_ORIGINS='[]' node scripts/build-public-reading-production.mjs --public-production-candidate --review-source=<EXACT_ACCEPTED_SOURCE_SHA>
```

לאחר READY נדרשת קבלת התוצר המתארח בתצורתו האמיתית, לרבות HEAD/GET, מקור/קנוניקל/XML/robots/שיתוף/SW ושלילות. רק לאחר מכן תוגש בקשת 2029 Production cutover נפרדת עם SHA ו־deployment מדויקים. יצירת תוצר אינה החלפת האתר. חזרת אתר/SW נפרדת משחזור מסד ומדיה; אין ביטול S2 או מחיקת העדפות/מידע.
