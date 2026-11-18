# העברה לסשן Codex: ELS, גילוי ואז Fable, ורשימה משותפת (18.11.2026)

**ממי:** Claude (סשן הענף `ccr-06bc2910-pgarr4`).
**למי:** Codex, להמשך העבודה באותו מקום.
**לפני הכול:** קרא `CLAUDE.md` (סעיף 0) ו־`AGENTS.md`. כל שינוי ב־Production (מיזוג, פריסה, דגל, סוד בשרת, מסד) דורש אישור מפורש של ZURIEL לפעולה ולקומיט המדויקים. מיזוג אינו פריסה.

## איפה העבודה

| | |
|---|---|
| מאגר | `zuriel337/sod1820` |
| ענף | `ccr-06bc2910-pgarr4`. הראש בזמן הכתיבה: `5df7f0072`. עשה `git fetch` ובדוק מחדש. |
| בסיס | `origin/main` ‏`e19a60e5b`, כבר ממוזג לענף |
| PR | **#1397** (הענף אל `main`): פתוח. **הסשן הראשי של ZURIEL ממזג ומעלה, לא אתה.** |
| work_log | `task_key` = `ELS_JOINT_DISCOVERY_20261118`, לפני כן `ELS_WORDS_24_AND_VERDICTS_20261118`. כתוב רשומות BEFORE/AFTER אל `to_actor=ZURIEL`. |

## מה כבר באתר החי (PR #1395, פריסה `dpl_CZTz82VooPxmCLy2FHn2qPdZqLgm`)

- 24 מילים על מטריצה (`MAX_FINDING_WORDS`).
- ממצאים לא נעלמים בזום, בצביטה ובזמן אימות: `recomputeWords` שומר רק פסיקת MATCH/MISMATCH של אותו מופע בדיוק.
- תיקון מפגש שנפתח מהצלבה.
- EXP-25.

## מה בענף בלבד (ב־PR #1397)

1. **לוח משותף במצב מחקר** (`5dec35569`):
   - שלב 1: הגילוי של המנוע, ועוד כפתור ״גלה מילים וביטויים יחד״.
   - שלב 2: כרטיס Fable משובץ (`ElsMatrixReadingCard2029 embedded`).
   - **רשימה משותפת** (`ElsJointDiscovery2029.jsx`, `src/lib/research/elsJointDiscovery.js`):
     - שורה אחת לכל מופע. מה ששני המקורות מצאו מופיע פעם אחת, עם שני המקורות.
     - בכל שורה: E ומרחק מהציר.
     - סינון: ELS / לא צפוי במקרה / הכול, ולפי מקור.
     - מיון: לפי ציר, נדירות או אורך.
     - פעולות: הצג, והוסף. ההוספה עוברת דרך עדכון הממצאים של המנוע, בתוך תקרת 24.
   - מודל הסיכוי במקום אחד: `supabase/functions/_shared/elsChanceModel.js`.
2. **ניקוד באפשרויות התצוגה** תחת ״עוד״, במצב רגיל, במחקר ובמסך מלא (`01d4d6a7e`).
3. **חלוניות המסגרת בעמוד הצופן** (האזור האישי, רזיאל, חיפוש, ״עוד״ וכו') נחתכו לחצי. נמחקו כללי `has-tool-dock` ב־`systemToolDock2029.css` (`5df7f0072`).
4. **EXP-26** (Fable 5.2 ב־effort גבוה): תיעוד בלבד.

**בדיקות** (מקומיות):
- `els-native-ui-browser` 77/77.
- `npm run build`, כולל שער המעטפת: PASS.
- כישלונות שנכשלים זהה גם על הבסיס:
  - home-card, save-panel, PostgreSQL כ־root.
  - background-principal/research, global Raziel responsive.

## Fable: מצב ומה פתוח

- **הדפדפן:** Fable דולק רק כשהבנייה מקבלת `VITE_ELS_MATRIX_READING_MODE=on`. המשתנה הזה לא קיים ב־Vercel, אז בכל בנייה רגילה הכפתור כבוי.
  - נבנה Preview מוגן עם המתג דלוק, לבנייה הזו בלבד, דרך פקודת הבנייה: `dpl_Fa2hcKUkFfsPryYDvh8AhHymfaHS`, מקומיט `01d4d6a7e`.
  - הוא **לא** כולל את `5df7f0072`.
  - הבקשה המדויקת ליצירת Preview כזה: גוף `create_deployment` של Vercel, כמו בקומיט `96acefbdf`. פקודת הבנייה: `VITE_ELS_MATRIX_READING_MODE=on node ../scripts/build-public-reading-production.mjs --protected-review --review-source=<SHA>`.
  - הענף כבר ברשימת ההרשאה של Preview (`public-reading-deploy/review-admission.js`).
- **השרת:** `ai-analyze` קורא רק אם הסוד `ELS_MATRIX_READING_ENABLED` הוא `on`. הבדיקה הזו באה לפני בדיקת המנהל.
  - הסוד **לא הודלק**. הבקשה ל־Supabase פגה, כי הערך מוזן על ידי ZURIEL עצמו.
  - ZURIEL אישר להדליק אותו. שם: `ELS_MATRIX_READING_ENABLED`, ערך: `on`. Supabase: Edge Functions ואז Secrets.
  - אחרי ההדלקה: סריקה אחת ב־Preview, כמנהל. עד ‎$2‎ לסריקה.
  - הבהרה: ההגדרה משותפת לשרת החי, אבל באתר החי הכפתור כבוי, וקריאה אפשרית רק למנהל.
- **שלב ב' (לא בוצע):** העברת הזרעים (מילים שהגילוי מצא) ל־Fable באתר.
  - `buildReadingPrompt` כבר תומך ב־`seeds`.
  - חסר:
    - שדה `seeds` במעטפה הסגורה (`elsMatrixReadingAction.js`). `ai-analyze` החי דוחה מפתח לא מוכר.
    - העברה ב־`runElsMatrixReadingOperation`.
    - שליחה מהכרטיס.
  - **סדר חובה:** קודם פריסת `ai-analyze` (אישור נפרד), אחר כך הדפדפן.
  - **כלל הזרעים:**
    - ELS בלבד (דילוג 2 ומעלה), 5 אותיות לפחות.
    - לא חלק מהציר, עד 12.
- **מסקנות הניסויים** (`exp25/`, `exp26/`, ויומן הניסויים EXP-25/26):
  - Fable 5.1 נשאר. 5.2 בינוני מוצא חצי; 5.2 גבוה מתקרב בכמות אבל לא באיכות, וב־1 מתוך 2 נקטע.
  - הגילוי ו־Fable כמעט לא חופפים.
  - לזרעים יש השפעה קטנה.
  - הפונקציה `els-live-reading` היא stub שעונה 410 (גרסה 25). לא לפתוח אותה בלי אישור.

## הצעד הבא, לפי מה שצוריאל ביקש

1. לוודא עם צוריאל שהסוד `ELS_MATRIX_READING_ENABLED=on` הוזן.
2. לבנות Preview חדש עם Fable דלוק מהראש של הענף, כולל `5df7f0072`. דורש אישור צוריאל ל־Preview.
3. לתת לצוריאל לבדוק סריקה ב־Preview, ואת החלוניות בעמוד הצופן.
4. כל תיקון: בענף, בדיקות ו־`npm run build`, דחיפה, ועדכון ל־PR #1397 ולסשן הראשי.
5. שלב ב' (זרעים) רק באישור צוריאל.

**כללים שאסור לשבור:**
- `MAX_FINDING_WORDS` בתבנית `tools/els/els-code.template.html`. אחרי כל שינוי בתבנית: `python3.12 tools/els/build.py` (לא python3).
- אסור להגדיל baseline של שער המעטפת.
- `test/els-browser-truth-census.test.mjs`: פסיקה מועתקת רק מ־MATCH/MISMATCH של המופע הזהה.
