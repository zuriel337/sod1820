# ‏`/heichal.html` ו־`/preview.html` — הצעה, לא הוחלה

**הצעה בלבד.** שום קובץ לא נמחק ושום הגדרה לא שונתה. Production עדיין מגיש את שני הדפים (נבדק 11.11.2026 06:11 UTC).

## מה נמצא (קריאה בלבד)
| | `/heichal.html` | `/preview.html` |
|---|---|---|
| מה זה | ״היכל השערים״ של Legacy: סצנה תלת־ממדית (three.js r128 מ־cdnjs), עם מוזיקה מ־`/heichal-theme.mp3` (2.6MB) | אב־טיפוס עיצובי של דף בית ישן (״סוד 1820 — היכל״). לקישורים בתפריט אין יעד |
| בקובץ | `public/heichal.html`: ‏49,061 בתים, blob ‏`6f4a7bed…`, SHA-256 ‏`5c605c5b…` | `public/preview.html`: ‏18,167 בתים, blob ‏`5a45ef85…`, SHA-256 ‏`13de6e19…` |
| היסטוריה (GitHub) | נוצר ביוני 2026, שונה לאחרונה ב־20.9.2026 (#593). לא הוסר ב־#1239 | נוצר ב־8.6.2026 (״שמירה אוטומטית״), שונה לאחרונה ב־14.6.2026 |
| ב־Production | 200, זהה ביטים לקובץ, בלי `robots`, ולכן ניתן לאינדוקס | 200, זהה ביטים, בלי `robots` |
| תלויות | קורא את טבלת `gates` (7 שורות פעילות) דרך REST אנונימי. הדלתות מובילות ל־7 נתיבים באתר | פונטים בלבד וסקריפט אחד. בלי נתונים |
| צרכנים | ראו את ההערה מתחת לטבלה | אין |
| תנועה | לא ניתנת למדידה: ב־Vercel Web Analytics יש 17 צפיות בכל הפרויקט ב־30 יום, ובדפים הסטטיים אין סקריפט מדידה | כמו בעמודה הקודמת |

צרכנים של `/heichal.html`:
- אין קישור אליו מ־`src`, מפוסטים, מקודקס, מחוקים, מפונקציות או מה־sitemap.
- הוא מופיע רק בתיעוד, בבדיקות, וברשימת ההיתרים הידנית ב־`route-legitimacy.js`.
- לרישום הזה אין השפעה, כי נתיב עם נקודה לא מגיע ל־middleware.

הדף `/heichal.html` עוקף את הודעת 2029 שההיכל סגור: `/heichal` מחזיר 503 (״ההיכל · SOD1820״). זה סותר את ״/heichal stays closed until decided״ (ZURIEL, 6.11) ואת כלל 3 ב־`CLAUDE.md`. השאלה פתוחה מאז הביקורת של 6.11: `docs/audit-evidence/20261106/archive_legacy.md`, סעיף 5 (״leave / noindex / remove?״).

## ההצעה
| נתיב | טיפול | נימוק |
|---|---|---|
| `/heichal.html` | **הפניה קבועה (308) ל־`/heichal`** | ראו את הנימוק מתחת לטבלה |
| `/preview.html` | **404 של 2029** (הקובץ נמחק) | אב־טיפוס בלי מקבילה ב־2029. הפניה לדף הבית הייתה soft-404, ואף אחד לא מקשר אליו |
| `/heichal-theme.mp3` | 404 (נמחק עם הצרכן היחיד שלו) | נכס של הדף בלבד |

למה הפניה ל־`/heichal`:
- יש נתיב 2029 בעלים לאותו אזור, עם הודעת הסגירה שלו (503 כל עוד `lock_heichal` פעיל).
- זה הדפוס שצוריאל קבע ב־6.11 לכתובות ישנות: הודעה של 2029 במקום 404 ריק, כמו ב־`/sulamot*`. זה גם הדפוס של `/tzofen.html`.
- אם יש לכתובת ערך מקישורים חיצוניים, הוא עובר לכתובת הקנונית.
- לא מוגש שום בייט של Legacy.

## מה נשמר
- **הקבצים עצמם, בהיסטוריית Git:** `git show 71709e4ba:public/heichal.html`, וכך גם `preview.html` ו־`heichal-theme.mp3`. ה־blobs מופיעים בפקודות ההחלה.
- **טבלת `gates` ומדיניות הקריאה שלה:** בלי שינוי במסד. ההחלטה עליהן נדחית לתכנון היכל 2029, שייגזר מה־Foundation. הטבלה עצמה אינה בעלים.
- **מה שלא משתנה:**
  - `/heichal`;
  - `/tzofen.html` (כלי הצופן המוטמע);
  - `route-legitimacy.js`;
  - שתי בדיקות ה־Playwright, `tests/g4-public-core-release.spec.cjs` ו־`tests/world2029-release.spec.cjs`. ההערות שלהן על `dist/heichal.html` יתיישנו, אבל ה־mock שלהן נשאר תקף.

## ה־patch
הקובץ `retire-legacy-static-pages.patch` (SHA-256 ‏`d4aa848446b62589703c7ff9b1768fd3d8c8a0337f19f59f02ed95d28302dacb`) בנוי על `origin/main` ‏`71709e4ba`. הוא מוחל נקי גם על main וגם על main יחד עם הענף הזה (`git apply --check`). הוא נוגע בשבעה קבצי טקסט:
- **`public-reading-deploy/vercel.json` (תצורת Production) ו־`vercel.json` (שורש):** ההפניה `{"source":"/heichal.html","destination":"/heichal","permanent":true}`, אחרי כללי `/tzofen.html`. החוזה הקיים דורש שהפניות Production יהיו שיקוף של הפניות השורש (`test/public-reading-production-artifact.test.mjs`), ולכן היא בשתיהן.
- **`test/public-continuity-closure-2029.test.mjs`:** ‏**re-pin** של ה־hash של `vercel.json` בשורש, מ־`62144d03…` ל־`800f5c837ea0724d67557d43fb821a50b9693b47e7e94cad0b5c315ab25f67f7`. הבדיקה עצמה קובעת שמותר לעשות re-pin רק באישור מפורש של שינוי התצורה.
- **`scripts/test-legacy-retired.mjs`:** הרחבה של שער המניעה (בסעיף הבא).
- **`test/legacy-retired-static-pages-2029.test.mjs`** (חדש): 9 מקרים שליליים.
- **`scripts/accept-legacy-static-pages-retired.mjs`** (חדש): בדיקת קבלה חיה, קריאה בלבד.
- **`.github/workflows/legacy-production-lock.yml`:** צעד שמריץ את המקרים השליליים.

בנוסף יש שלוש מחיקות. הן נעשות ב־`git rm` ולא בתוך ה־patch, כי ה־mp3 בינארי.

החלה, רק אחרי אישור:
```bash
git fetch origin main && git switch -c <new-branch> origin/main
test "$(git rev-parse HEAD:public/heichal.html)" = 6f4a7bed0e388e2d297b40c5c640049168bfcaf7
test "$(git rev-parse HEAD:public/preview.html)" = 5a45ef85d197863409998bda807199df04b17128
test "$(git rev-parse HEAD:public/heichal-theme.mp3)" = a09ed3df01778affcc2080e589ca0d1402a9b1c7
git rm public/heichal.html public/preview.html public/heichal-theme.mp3
git apply --index docs/reviews/contract-governance-audit-20261110/gap-closure-20261111/legacy-pages/retire-legacy-static-pages.patch
```
אם `git apply` נכשל, או ש־`vercel.json` בשורש השתנה ב־main מאז `71709e4ba` (ואז ה־re-pin כבר לא מתאים), עוצרים ומכינים מחדש. לא כופים.

## בדיקת המניעה המורחבת
השער `scripts/test-legacy-retired.mjs` רץ ב־`prebuild`, בתחילת בניית הפרסום ובתהליך `legacy-production-lock`. אחרי ההרחבה הוא נכשל במקרים האלה:
- אחד משלושת הקבצים חוזר ל־`public/`;
- הפניה או rewrite באחת משלוש התצורות מובילים לאחד מהם;
- ההפניה של `/heichal.html` חסרה, כפולה, זמנית, מותנית או מובילה ליעד אחר, באחת משתי התצורות השמורות;
- קוד ב־`src/` או המסמך `2029.html` מקשרים לאחד מהם, בכתובת יחסית או מלאה. אלה לא נחשבים קישור: ״ל-heichal.html״ בפרוזה, ושמות ארוכים יותר כמו `journey-preview-1237.html`.

תשעת המקרים השליליים (9/9) מריצים את השער כמו שהוא על עץ מינימלי. בכל מקרה משתנה דבר אחד, והבדיקה מוודאת שהשער נכשל עם ההודעה שלו.

**שינוי בשער הזה דורש אישור נפרד של ZURIEL** (`CLAUDE.md`, ״מצב חי וכללי שחרור״).

## קבלה
- **מקומית, בוצעה:** על `71709e4ba` עם ה־patch, בשכפול זמני. ‏19/19 עברו (`evidence/patched_main_tests.log`): הבנייה, השער, 9 המקרים השליליים, נעיצת `vercel.json`, חוזה התוצר (37/37), legitimacy, ‏SEO של נתיבים, isolation, ‏live contracts ו־one-tree. בתוצר שנבנה אין את שלושת הקבצים, ו־`tzofen.html` נשאר. **לפני** ה־patch, הבנייה של `71709e4ba` כללה את שלושתם.
- **חיה, אחרי פריסה מאושרת:** `node scripts/accept-legacy-static-pages-retired.mjs https://sod1820.co.il` צריך להחזיר 6/6. היום הוא מחזיר 3/6, כצפוי: שלושת הדפים עדיין מוגשים, ושלוש הבדיקות של מה שלא אמור להשתנות עוברות (`evidence/acceptance_live_before_20261111T0611Z.log`).
- **לא נבדק לפני פריסה:** איך הנתב של Vercel מבצע בפועל את כלל ההפניה. בדיקת הקבלה החיה מכסה את זה.

## Rollback
- **בקוד:** `git revert <commit>` מחזיר את הקבצים, את התצורות, את ה־pin ואת השער. אחר כך צריך פריסה חדשה, באישור.
- **חזרה תפעולית:** `assign_alias` לפריסת 2029 הקודמת, באישור, לפי הנוהל ב־`CLAUDE.md`.

שתי הדרכים מחזירות את דפי ה־Legacy לציבור.

## אישורים שנדרשים
כל אחד בנפרד, לקומיט ולפריסה המדויקים:
1. שינוי שער Legacy-retired.
2. ‏re-pin של `vercel.json` בשורש.
3. מיזוג ל־main.
4. פריסה ל־Production.

## מחוץ לתחום
שאר הדפים הסטטיים ב־`public/` (`book.html`, ‏`entity-hub-observatory-1237.html`, ‏`journey-preview-1237.html`, ‏`kolombia.html`) לא נבדקו במשימה הזו.
