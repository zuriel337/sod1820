# קבלת מסירה וביקורת עצמאית — עורך יחידות, רזיאל ומפת המציאות
תאריך בדיקה: 15.11.2026. מסמך עבודה ובדיקות בלבד; אינו חוזה, owner או אישור שחרור חדש.

## בסיס מאומת
- repo: zuriel337/sod1820.
- main: c2acc064be31df93a229637bc32305a951c8006b.
- ענף Claude: ccr-b8e8ab12-9hoamu. בקריאה הראשונה 50f89351732b7c1ef656aaedd7bad31e83d7ffc2; בקריאה חוזרת 267722eb8623d7a5c09e0a431a8a26a8944f3b97.
- PR #1358 פתוח ולא מוזג; אינו Draft. תיאורו הישן אינו משקף את כלל ההרחבות האחרונות.
- main והענף: 28 קומיטים בלעדיים בכל צד. אין להסיק מ-mergeable קבלה של העץ המשולב.
- work_log_current נקרא. בעלות העורך/הפוסט רשומה ל-Claude; אין מסירת בעלות ל-GPT. לא נערכו קובצי המימוש.
- latest discovered protected Preview: dpl_3hTP4ykz588j2cmvRQ6et9qHrfAn, READY, source aa37d16854e3ec0d195266b3d9b1f86303e39a5d.
  URL: https://sod1820-ogzd270jc-sod1820-s-projects.vercel.app/post/sharshar-elections-redemption-hints-draft?proto=admin
  זה אינו HEAD העדכני. פתיחה בדפדפן Work הפנתה ל-Vercel Login. לא בוצעה קבלה חזותית או בדיקת רזיאל חי.
- DB חי, קריאה בלבד: posts:5107, length(content)=22010, md5=a10ea4de28ac262ec5d14e0262db9b13, modified=2026-11-10T16:56:00.412935Z; היחידה השביעית אינה בגוף.
- לא שונו תוכן ציבורי, DB מוצר, Edge, הרשאות, main, פריסה או alias.

## מה נוסף מאז המסירה d581e81a
aa37d168 הוסיף מודל מקור/נתון/עריכה, הוספת גימטריה, ארבע תצוגות, יישור, הזזה והסרת מקור מפורשת; ece02c92 הסיר גיבוי קבצים לפי הכיוון לשמירה בענן; 50f89351 שינה מעטפת; 267722eb שינה את עץ הפוסט והסיר Companion ניסיוני. האחרון לא משנה את חמשת מודולי הליבה שנבדקו להלן.
מסמכי 20261116/20261117 הם שמות תיקיות בענף; תאריך הבדיקה כאן הוא 15.11 ואין להסיק תאריך ריצה משמותיהם.

## בדיקות שבוצעו כאן
על checkout 50f89351:
`node --test src/lib/research/unitDocument2029.test.js src/lib/research/postUnitBody2029.test.js src/lib/research/unitRazielReview2029.test.js src/lib/research/unitGematriaTrace2029.test.js src/lib/research/unitFragmentSavePlan2029.test.js`
47/47 עברו. ההפרש של חמשת מודולי המימוש מול 267722eb ריק.
לא הורצו כאן build, כלל 1875 הבדיקות או CI. הדיווח הקודם על Projector הוא דיווח בעל הענף, לא הוכחת baseline חדשה שלנו.

בדיקות אדברסריות נוספות, ללא DB או דפדפן:
1. `cleanGematriaItem({phrase:"אב",methodKey:"רגיל",display:"full",by:"yaniv-levi",sourceRef:"channel_updates:example"})` מחזיר phrase/methodKey/display/by בלבד — sourceRef אובד.
2. `refreshData({kind:"claim",identity:"shachar-kandro",group:"shachar-kandro",text:"מקור = 1237"},"נוסח חדש = 999")` שומר identity/group של שחר עם נוסח שונה.
3. `planUnitFragmentUpdate` על section תקין עם קישור `href="jav&#x61;script:alert(1)"` מחזיר ok:true. זהו כשל במאמת המוצע שאינו פעיל, לא הוכחת XSS ב-Production.

## ממצאים שחוסמים קבלה
| מזהה | ממצא והשלכה | תיקון תחת הבית הקיים | מבחן קבלה |
|---|---|---|---|
| F1 | בחירה מתוך מקור שומרת מחרוזת ושם בלבד; אין locus יציב של המקור | להפנות לזהות מקור/בלוק קיימת ומורשית; לשמרה ב-draft/serialize/parse/Diff | שני מקורות עם אותו ביטוי נשארים נפרדים אחרי copy/paste ורענון |
| F2 | שינוי טענת נתון משאיר ייחוס מקורי | טענת המקור נשמרת בלתי משתנה; שינוי עריכתי הוא שכבה נפרדת עם קשר למקור | אין הצגת הנוסח החדש כדברי שחר/יניב; אפשר לראות לפני ואחרי |
| F3 | blacklist regex אינה מאמת HTML בטוח | serializer מצומצם ו-parser/allowlist קיימים; בדיקת URL אחרי decode; אותה הגנה בשרת | encoded schemes, single/unquoted attrs, SVG, nested section, duplicate IDs נדחים או מנוקים לפי החוזה |
| F4 | עורך עדיין מיוחד ל-parseYaminSmolText, ומזהי b0.. הם מיקומים | להרחיב מודל יחידה קיים בלי store חדש; בסיס גרסה וזהויות יציבות | עריכת כל שש היחידות הקיימות + השביעית; draft ישן לא מתחבר לבלוק אחר |
| F5 | אין שמירה קנונית; HTML ציבורי והידרציית פריט גימטריה טרם הושלמו | posts.content + post_revisions + RPC מוגבל לאחר אישור | שני עורכים מתחרים: הצלחה אחת, conflict אמיתי, צילום מלא ושחזור |
| F6 | רזיאל רואה עד חמישה מקטעים; אין הוכחת הבנת המסמך השלם | אותו session/provider; תוכנית הקשר מלא תחת בעל רזיאל | כפילות בראש ובסוף, סדר גלובלי, מקור מורשה, פלט ישים, Diff, אישור וביטול; מודל חי |
| F7 | מדיה, החלפת מקור, קיבוץ/פירוק קבוצה ויישור מקטע טרם הוכחו כיכולות שלמות | reuse קוראי מקור ומדיה, רכיבי תצוגה ופעולות העורך | הוספת תמונה והחלפת מקור ללא שינוי המקור המקורי; קבוצה זזה ומתפרקת בלי אובדן |
| F8 | Hosted Preview אינו head נוכחי; כניסת Vercel חסומה בדפדפן | כניסה מורשית + מועמד exact SHA לאחר תיאום | 320/390/768/1440, שלוש ערכות, ללא גלישה/כיסוי dock; 5107/5112/92 |
| F9 | תוכנית ה-RPC משמרת רק חלק מהסיכון מול כותבים אחרים | לבחון גם existing writers ו-grants, לא רק RPC חדש | כותב ישן עם snapshot ישן אינו דורס לאחר השמירה החדשה |

## שמירה: מסקנת הביקורת
RPC עם נעילת שורה, hash של כל הגוף בתוך הטרנזקציה, החלפת מקטע יחיד וצילום מלא באותה טרנזקציה הוא כיוון מתאים. אינו מספיק לבדו: כותב ישן שאינו בודק גרסה יכול לחכות לנעילה ואז לדרוס את התוצאה. יש למפות את כל writers המורשים וליישר בדיקת גרסה/מסלול גישה לפני הכרזה על מניעת דריסה.

אומת חי: admin_save_post חסר expected-version. טריגר fn_snapshot_post_revision מדלג על צילום בתוך עשר דקות וגם מוחק גרסאות מעבר ל-50. לכן אין להבטיח שמירת היסטוריה מלאה דרך הטריגר בלבד. יש להסדיר אינטראקציה בין snapshot מפורש, trigger ומדיניות retention בלי מחיקת היסטוריה לא מאושרת.
תוכנית השמירה אינה יכולה להחליף מקור בכוח שמירת כל href/src הישנים; צריכה להבדיל הסרת הפניה מאושרת ממחיקת מקור קנוני. פרסום U7 הוא פעולה נפרדת.
אין בקשת אישור להפעלת SQL לפני שיש SQL מדויק, בדיקות תחרות/הרשאות/שחזור, preflight ו-rollback.

## בעלי הסמכות והרכיבים — EXTEND_EXISTING
| תחום | בעל סמכות | שימוש קיים והשלמה |
|---|---|---|
| יחידה ופוסט | publishing_conventions + Content Foundation + source-native identity | פוסט האב והקישור publicPostUnitHref נשארים; אין route/store יחידה חדש |
| גימטריה | gematria_engine + gematria_engine_law + canonical_methods_registry_law v6 פעיל | fetchNumberMethodProfile / fetchGematriaMethodTrace / projectGematriaTrace; בלי חישוב React/AI |
| תצוגה | canonical_ui_components_law v12 פעיל + Design V2 | SpatialMethodStage2029 ו-TraceFamilyStage2029 משותפים; GematriaShowcase2029 עדיין משפחת פוסט; UnitGematria2029 מתאם. אין עדיין הוכחה ששינוי עיצוב ספיר אחד משנה גם את כל תצוגות דף המספר |
| רזיאל | companion/routing/response owners | session.submit הקיים; אין צ׳אט/Edge/מכסה חדשים ללא בדיקה ואישור מתאים |
| מקור וקרדיט | Intake + Person/access + publishing | הפניה מורשית מדויקת, טענת מקור נפרדת מתיקון עריכתי |
| מפת תוכן | Reality Graph + מנגנון הסדרות הקיים | מפת המציאות סדרה; מפה כללית אינה סדרה; אותו מספר אינו edge מאושר |

זוהו ונקראו הוראות bootstrap, Owner Index, מסמכי העורך והשמירה, עדכון העורך החדש, מסמכי ביקורת נבחרים וקוד הליבה. סקירת כל גופי החוזים ומלאי 834 השורות אינה מסומנת כאן כהושלמה; נדרשת השלמה ממוקדת לפני שינוי בתחומים שלהם.

## תוכנית ביצוע אחת — לפי תלות, ללא כותב כפול
1. **Claude נשאר כותב המימוש** עד מסירת בעלות מפורשת. Work מנהל ביקורת וקבלה. למסור את F1–F9 דרך work_log; לא להפעיל סוכן חדש, לא להמתין ל-GPT ACK.
2. **מקור וזהות תחילה:** F1/F2/F4; לסגור בדיקות הליבה והעתקה/רענון. החלטת המשתמש כבר מחייבת: מותר לערוך נתון אך אסור לייחס נוסח שונה למקור.
3. **עורך שלם:** להשלים תמונות/החלפת מקור/קבוצה/יישור מקטע מעל המודל; לשמר 2×2 במובייל והעיצוב שאושר.
4. **רכיב משותף:** להכריע בבעלות הקיימת אילו variants חסרים; לחבר reference אחד. אין העתקים מקומיים של CSS/תוצאות. בדיקת שינוי תצוגה משותפת בלי שינוי payload.
5. **רזיאל:** live acceptance דרך חשבון מנהל, עם בדיקת חוצה-מקטעים. אם המסלול הקיים אינו מספיק, להכין שינוי קונקרטי תחת בעל רזיאל ולהגיש אישור Edge/מכסות בנפרד; לא להציג segmentation כהשלמה.
6. **שמירה:** להכין serializer בטוח, RPC ובדיקות מקומיות תחת scope מתואם; לא להחיל migration. בדיקות snapshot/revision concurrent writers והרשאות חובה.
7. **שילוב וקבלה:** owner מכין מועמד שמ reconciles main העדכני בלי overwrite; CI ובנייה על SHA הסופי; Preview בדיוק ממנו, desktop/mobile + auth אמיתי. אין להסיק קבלה מתמונות localhost.
8. **שערי משתמש נפרדים:** DB/RPC; Edge/מכסות/הרשאות אם נדרש; פרסום U7; merge exact SHA; deployment exact artifact. אין אישור אוטומטי.

## מצב סיום של סבב זה
AUDITED_PARTIAL / OWNER_CONFLICT_FOR_IMPLEMENTATION / HOSTED_AUTH_BLOCKED.
47 בדיקות עברו, שלוש בדיקות אדברסריות חשפו פערים. מוצר אינו מוכן לקבלה סופית.
המשך אינו התחלה מחדש: לתקן בתוך המימוש הקיים אחרי תיאום. לא נכתב קוד מוצר בסבב זה.
