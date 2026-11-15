# מסלול שמירה קנוני ליחידה — תכנית (לא מופעלת) · 2026-11-15

> **אין כאן שינוי DB / RPC / Edge / טבלה / חוק.** הכול קריאה בלבד + קוד שאינו מיובא בשום ממשק. כל שלב כתיבה דורש אישור מפורש של צוריאל.

## 1. מה קיים היום (נקרא)
- `adminUpdatePost(id, {content})` (`supabase.js:1716`): `UPDATE posts SET content=…, modified=now() WHERE id=…` — **דריסת כל הגוף, בלי בדיקת גרסה**, ומקפיץ `modified`.
- RPC `admin_save_post` (17 פרמטרים, `SECURITY DEFINER`): **אין פרמטר גרסה צפויה, אין `FOR UPDATE`, אין טיפול ב־`post_revisions`** (נבדק ב־`pg_get_functiondef`, קריאה בלבד). `p_keep_modified` מאפשר שינוי גוף בלי שינוי `modified`.
- טריגר `trg_snapshot_post_revision` (BEFORE UPDATE): שומר את הגרסה הקודמת ב־`post_revisions`, **אחת ל־10 דקות** — כתיבה בתוך החלון אינה מצלמת.
- מבנה הגוף של 5107 (rev 266, נקרא מהקובץ השמור): חמש מתוך שש היחידות הן `<section id>` **מקוננות** בתוך הסקשן הראשי; רק יחידת הכנסת היא ברמה עליונה. יחידת הפריוויו (`yamin-smol-…`) **אינה בגוף כלל**.

## 2. מה הוכן (קוד, לא מופעל) — `unitFragmentSavePlan2029.js`
`planUnitFragmentUpdate({snapshot, latest, unitId, newFragmentHtml})` מחזיר תוצאה רק אם: (1) גוף ה־latest **זהה בייט־בייט** לצילום שהעורך התחיל ממנו (SHA-256) — אחרת `conflict` ושום דבר לא נוצר; (2) היחידה קיימת כ־`<section id>` אחד (כל עומק); (3) הקטע החדש שומר את `id` היחידה, כל עוגני `id`, כל `href`, כל `src/poster`, ואין בו קוד ניתן להרצה; (4) מחוץ לקטע אין שום שינוי (נבדק גם רשימת כל הסקשנים); (5) מוחזר הגוף הקודם לשמירה עצמאית. **מוחזר `atomic:false` במפורש.** נבדק על הגוף האמיתי של 5107 (5 בדיקות).

## 3. חסמים (למה אי אפשר להפעיל)
| # | חסם | מה נדרש |
|---|---|---|
| B1 | **אין אטומיות.** בדיקה בלקוח ואז כתיבה = חלון מרוץ; כותב אחר יכול לנחות ביניהם | השוואה־והחלפה בשרת (שער אנושי: RPC חדש) |
| B2 | `modified` אינו אסימון גרסה אמין (`keepModified`; והעדכון מקפיץ ״עדכונים אחרונים״) | אסימון = SHA-256 של הגוף, מחושב בשרת |
| B3 | הגרסה הקודמת לא מובטחת ב־`post_revisions` (חלון 10 דקות) | צילום מפורש בכל כתיבה, או שמירה חיצונית של `previous.content` |
| B4 | יחידת הפריוויו אינה בגוף — ״שמירה״ שלה היא **הוספה ראשונה**, לא עדכון | החלטה נפרדת על פרסום + מיקום + סידור היחידות |
| B5 | ייצור ה־HTML של סקשן קנוני מ־blocks אינו קיים (העיצוב המפורסם נושא `style` ו־`aria-labelledby`) | בנאי HTML + בדיקת זהות מול סקשנים קיימים |
| B6 | היסטים: JS סופר יחידות UTF-16, Postgres תווים; בגוף יש אימוג׳י (✨👑📜) | להשתמש בהחלפה לפי מחרוזת ייחודית, לא לפי היסט |

## 4. הצעה מדויקת (טקסט בלבד — **לא להריץ**; דורשת שער אנושי ל־DDL)
```sql
-- admin_save_post_unit_fragment(p_id bigint, p_unit_id text, p_expected_sha256 text, p_old_fragment text, p_new_fragment text) returns jsonb
-- SECURITY DEFINER, אותה בדיקת מנהל כמו admin_save_post (להעתיק מהגדרתה), search_path קבוע.
--   select content into v from public.posts where id = p_id for update;                     -- נעילת שורה
--   if encode(sha256(convert_to(v,'UTF8')),'hex') <> p_expected_sha256 then raise exception 'conflict'; end if;
--   if (length(v) - length(replace(v, p_old_fragment, ''))) <> length(p_old_fragment) then raise exception 'fragment_not_unique'; end if;
--   -- הקטע החדש: אותה בדיקת זהות (id/עוגנים/קישורים/מדיה) כמו בלקוח, ושאין בו קוד ניתן להרצה
--   insert into public.post_revisions (...) select <OLD> ;                                   -- צילום מפורש, בלי חלון 10 דקות (עמודות לפי fn_snapshot_post_revision)
--   update public.posts set content = replace(v, p_old_fragment, p_new_fragment) where id = p_id;   -- modified: לפי החלטה (p_keep_modified)
--   return jsonb_build_object('ok', true, 'sha256', <חדש>);
```
זרימת לקוח עתידית: קריאת הגוף העדכני → `planUnitFragmentUpdate` → הצגת diff לצוריאל → אישור מפורש לקומיט ולפעולה → קריאת ה־RPC עם `expectedSha256` ו־`previous.content` נשמר במקביל.

## 5. החלטות שממתינות
1. לאשר הקמת ה־RPC (DDL) — או להשאיר שמירה ידנית דרך `admin_save_post` עם דיף ידני.
2. מדיניות `modified` ליחידה ערוכה (להקפיץ או לא).
3. החלטת פרסום ליחידת הפריוויו (B4) — נפרדת.
