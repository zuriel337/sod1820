# canonical_ui_components_law v13 — DRAFT (not written to the database)

**Status:** DRAFT for ZURIEL's approval of the exact text. Nothing was written to the database.
The rule is versioned additively (“שינוי חוק = גרסה חדשה, לא מוחקים”), so v13 is **all of v12
unchanged plus the block below appended at the end**. The v8 §1 text and the v5 `GoldButton` line stay
in place as history; the v13 block states exactly which parts it supersedes.

- Base: `nodes` row `rule_id = canonical_ui_components_law`, `rule_version = 12`, `is_active = true`,
  description length 18,131, `md5(description) = 7babed68333f7dce0b4fca0ab4f34b0b` (read 19.11.2026).
- Writing v13 (on approval) = a new row `rule_version = 13`, `supersedes_version = 12`, description =
  v12 description + the block below, v12 set inactive in the same transaction; labels and metadata
  follow the existing version rows. The exact SQL is prepared only after ZURIEL approves this text.
- Linked owners: Design V2 §14 (`SOD1820_DESIGN_CONTRACT_V2.md`), System Frame addendum §10.12.

## Difference from v12

The only difference is this appended block (unified diff, end of the description):

```diff
 This is the permanent component contract approved by ZURIEL's current instruction “קדימה תקבע את זה”. It does not itself activate an unverified provider/environment or authorize Production cutover.
+
+—— v13 · ZURIEL 19.11.2026 — כפתור השיתוף הקנוני בסרגל ומשפחת הכפתורים האחידה ——
+Owner check: EXTEND_EXISTING canonical_ui_components_law; Design V2 §14 ו־System Frame addendum §10.12. אין רכיב שיתוף, מערכת, טבלה, כתובת או composer חדשים.
+1. היתר מפורש (מחליף חלקית את v8 §1): הסרגל הגלובלי של SystemFrame2029 מכיל כניסה קבועה אחת בשם «שיתוף». היא פותחת את ShareActions הקנוני עבור הפריט המוצג (עמוד, תוצאה או ממצא) ומציינת במפורש מה משותף — שם וכתובת. זהו כפתור השיתוף הקנוני של הסרגל. אין כפתור שיתוף קבוע נוסף בסרגל, בפינה או כרכיב צף. שאר האיסור של v8 §1 נשאר בתוקף: אין פעולת סרגל נוספת מעבר לכניסות שנקבעו בחוזה המסגרת (כאן · שיתוף · רזיאל · עכשיו · עוד), ואין כפתור שיתוף קבוע כפול.
+2. «שתפו בקהילה» נשאר אפשרות אחת בתוך מנגנון השיתוף הקנוני, בכפוף ל־v8 §§1–7: לא כפתור קבוע ולא מערכת נוספת. שיתוף בקהילה מחייב עדיין דברי משתמש לפני פרסום.
+3. משפחת כפתורים אחת: כפתורי 2029 צורכים את משפחת .r29-btn (royal2029.css) — צורה, גובה לפחות 44px, טיפוגרפיה, אייקון NavigationIcon2029 ומצבי לחיצה, מיקוד, השבתה והמתנה אחידים. פעולה ראשית ושיתוף בכחול רויאל מתפקידי הפלטה (accentPrimary/onAccent); פעולה משנית שקטה (משטח וקו דק). ShareActions מציג את אפשרויותיו במשפחה זו דרך variant (props) — אותו רכיב, אותם ערוצים, אותה טלמטריה — וסמלי הפלטפורמות שומרים על צבעיהם המזוהים. GoldButton (v5) אינו כפתור ברירת המחדל של 2029; זהב נשאר עיטור מותג (טבעות וקווים דקים) ואינו מסמן אימות או הצלחה.
+4. כפתור השיתוף הראשי נבחר לפי התמיכה בפועל של הדפדפן בשיתוף מערכת (navigator.share), לא לפי סוג המכשיר. העתקת הקישור זמינה תמיד.
+5. נשמרים ללא שינוי: share/share_story, טלמטריה ו־attribution (v3, v8 §7), OG ו־/api/card (v11), הרשאות ופרטיות. טקסט אינו מוקטן כדי להכניס תוכן; שטח לחיצה לפחות 44×44; שלוש ערכות הצבע; מקלדת וקורא מסך.
+6. Merge Gate: מימוש שמוסיף כפתור שיתוף קבוע נוסף, מערכת שיתוף נוספת, או כפתור 2029 מקומי מחוץ למשפחה = FAIL. גרסה זו אינה אישור למיזוג, לפריסה או לשינוי נתונים.
```
