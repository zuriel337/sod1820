# מה קורה הבורא (PKqKLjO_0nc) — חבילת טיוטה לבדיקת ZURIEL
task_key: MAH_KORE_BORE_PKqKLjO_0nc_20261111 · **BRANCH-ONLY. לא נכתב ל-DB, לא פורסם, לא מוזג.**
סיווג (לפי work_log d521ea49): Series='מה קורה הבורא' · categories=['תיעוד אירועים'] בלבד · Medium=video (נגזר מהטמעת YouTube) · 'וידאו' אינו קטגוריה · 'רמזים חזקים' — Human Gate (לא נוסף).

קבצים
- post.html — גוף הפוסט (קול מערכת רבים; פרפרזה, לא תמלול; "בשיעור" מול "בדיקת המערכת")
- post-meta.json — כותרת, כותרת משנית, slug, תגיות, מצב תמונה
- method-trace.md — Method Trace (fn_ragil v1, parity=true) לכל 22 הביטויים, כתיב מדויק
- source-checks.md — אימות אירועים ומקורות מדרשיים (כולל מה לא אומת)
- graph-proposals.json — מועמדים בלבד + תוצאות dedup
- image/original.png + image/derivatives/{reading,preview}.jpg — תמונה ראשית לפי חוזה המדיה (JPG/PNG, בתקציב; לא הועלתה)
- ai-addition.html — תוספת המערכת ל-posts.ai_addition (תבנית 5129/5130)
- preview-real/ — צילומי פריוויו מהאפליקציה האמיתית (build מלא, נתיב /post/<slug>, Supabase מדומה בדפדפן בלבד)
- preview.html — פריוויו סטטי עם CSS הקריאה האמיתי
- validate-draft.mjs — בדיקות טיוטה: `node work/mah-kore-bore-PKqKLjO_0nc-20261111/validate-draft.mjs`

## פערי חוזה פרסום לפני READY — להחלטת ZURIEL (לא נערכו חוזים)
1. **תמלול**: video_transcription_law / ברירות מחדל לווידאו דורשים שורת video_transcripts מקור + סט תרגום he·en·ar·es·fr·ru·pt·de. אין תמלול מילולי (פרפרזה בלבד), ולכן אי אפשר ליצור אותה — נדרש ייבוא כתוביות ברישיון/ייצוא מאושר, או החלטה שהפוסט מפורסם כהטמעת מדיה חיצונית עם קרדיט.
2. **סרטון מאוחסן**: החוזה מגדיר פרסום וידאו כנוכחות קובץ מקור מאוחסן; כאן יש הטמעת YouTube בלבד (קרדיט גלוי כנדרש למדיה חיצונית).
3. **פוסטר**: הוכנה תמונה ראשית גרפית (לא פוסטר שנגזר מהסרטון) — באישורך.
4. **תוספת המערכת**: ממומשת לפי התבנית החיה (section data-origin inline + ai_addition).
5. **תרגום הפוסט עצמו** (content_translation_law v4) לא הוכן.
