# ציון סיבוני — מסע שמונת השערים · מסירת מימוש חזותי

**מקור אחד:** מייל שני #113 מ־22.11.2026. PDF ציבורי ב־`gallery/Book/zion50.pdf`; המקור המדויק 110 עמודים, 1,322,143 בתים, SHA256 `35261bcc661d6364353482c9f911de9c39f203e503a68aa97b680e4a85c77e2c`. אין להשתמש במהדורה הישנה ואין להחליף כריכות מקוריות בדימוי AI.

**מיקום התוכן והקוד:** `src/data/bookReader2029.js` הוא ה־manifest הקיים של קורא הספרים. התוספת `src/data/siboniGate50Journey2029.js` מספקת שמונה שערים עם שמות, טווחי עמודים וקישורי `/book/hamasa-leshaar-hahamishim-zion-siboni?page=N`; שלושת הנספחים נמצאים בנפרד. אין ליצור קורא PDF נוסף או זרם Now נוסף.

## מפת חוויית המשתמש המאושרת
1. **בספרייה:** כרטיס כמו יתר הספרים, עם הבלטה רויאלית ברמת פריט, שם מחבר והכריכה המקורית בלבד. לא להכביד על כל הספרייה עם אנימציה או תמונה כבדה.
2. **בדף הספר:** מעטפת פתיחה מותאמת, מעל הקורא הקיים. 974 / 973 / 50 הם צירי חיפוש של המחבר, לא תוצאות מנוע מאומתות. גלגלת שמונה שערים תוביל לעמוד PDF מדויק, תמיכה במסך צר ובמקלדת, RTL והיררכיית כותרות תקינה.
3. **קריאה:** לשמר את `BookSourceReader2029` והניווט `?page=N`; שגיאות PDF לא יהפכו למצב הצלחה. נספחי א/ב ו־97 נשארים אחרי שמונת השערים, כנפרדים.
4. **מספרים:** קישור `/number/:value` משתמש במסלולים הקנוניים; ערך שלא אומת במנוע מוצג כמוטיב מחבר/הפניה למחקר בלבד, לא כקשר גרפי קנוני.
5. **בית:** כרטיס השקה קומפקטי אחד אחרי תוכן הבית הקיים, בלי לדרוס את הפוסט האחרון, בלי שינוי כותרת הבית ובלי ייבוא סטטי חדש ל־System Frame. תמונת כריכה נגזרת קלה רק אם בוצע ממקור ה־PDF ונבדקה.
6. **״עכשיו״:** פרסום יחיד דרך זרם העדכונים הקיים, מקושר לאותה זהות ספר. אין לעקוף הפיד ואין כפילות בין פוסט הספר לבין עדכון ההשקה.
7. **SEO ונגישות:** תוכן שרת משמעותי, canonical אחד, Book/CreativeWork JSON-LD רק עם שדות ידועים, OG נגזר מהמקור, קישורים אמיתיים; לא לשכתב פתרונות SEO אחרים.
8. **ביצועים:** רכיב שערים נטען עצלנית, ללא הגדלת כניסה או shell; לא לגעת ב־CLS/תקציבי המהירות הקיימים. בדיקת נייד 320/390 ושולחן עבודה 1440; יום/קלף/לילה.

## שערי קבלה ושחרור
- מאמתים anonymous GET של PDF מלא ו־SHA256 ממקור האחסון; עצם קיום `storage.objects` אינו readback.
- יש ליצור/לאשר **Book node** בזהות יחידה תחת `nodes(type='book')`, עם `metadata.slug`, `metadata.identity_tiers.digital_object` ו־`source_ref_prefixes`; חובה לעבוד דרך מסלול פרסום DB המאושר. לא ליצור גרף קשרים או Research Objects מאומתים מתוך טענות המחבר.
- `BooksEntry2029` ב־`PUBLIC_READING_RELEASE` מפנה כרגע ציבור אנונימי למעטפת continuity ולא לקורא הספר. יש להסדיר את החרגת הספר במסגרת פתיחת ספרים מאושרת ולא בהסרת שער כללי.
- עד ש־Book node + route + readback + דפדפן + CI עוברים: **אין להציג את ההשקה כ־LIVE** ואין להדליק בית/״עכשיו״.
- מיזוג ופריסה דורשים אישור מדויק של צוריאל בהתאם ל־`CLAUDE.md` ו־`AGENTS.md`.

## כתיבה ועבודת סוכנים
**עדכון הרשאת בעלים 23.11.2026:** צוריאל הורה במפורש ש־GPT ימשיך גם את העבודה החזותית כי Claude אינו עובד כרגע. לכן בענף זה נוספו רכיבי תצוגה **מבודדים לספר ולכרטיס הבית** בלבד, ולא שונו System Frame/רכיבי Royal משותפים. לפני כל כתיבה נוספת בודקים writer ownership; אין להפעיל כותב נוסף במקביל. משתמשים ב־PR #1519 כבסיס מקור ומונעים PR כפול או דריסה של עבודת Royal מקבילה.

## מצב נוכחי
- SOURCE/MANIFEST + JOURNEY DATA + Royal 8-gate UI + public Book read admission + guarded Home spotlight: BRANCH-ONLY PR #1519.
- DB Book identity, external PDF GET/SHA readback, Now publication, browser acceptance, deployment: NOT DONE.
- `NOW-RELEASE.md` prepares one `site-news` row for separate approved release; no DB mutation. `RELEASE-GATE.md` describes a reviewed inactive-to-active Book identity admission plan.
- CI קודם עבור HEAD `b70a180`: 6/7 workflow success; `2029 Live Contracts` failure in `auth-browser-acceptance-2029`, step `Community dislikes beside likes` (scope unrelated). יש לבדוק ריצה חדשה על HEAD מעודכן.
