// ===== גימטריה מרחבית — מפרטי-תצוגה (Presentation Specs) =====
// חוזה-תצוגה דק לרכיב <SpatialGematriaReveal>. זהו קובץ-נתונים (כמו spatialModels.js), *לא* מנוע,
// *לא* מאגר-אמת, *לא* טבלת-DB. ה-Research/Engine State נשאר במקומו; כאן רק ייצוג-תצוגה מובנה.
//
// זהות (Identity): המפתח הוא **reveal_id יציב** (זהות-תצוגה/ייצוג), *לא* ה-slug של הפוסט.
//   URL/display identity ≠ Research/Representation identity — שינוי slug של פוסט לא ישבור את הייצוג.
//   ה-slug עשוי להופיע כ-postSlug (מטא-נתון אינטגרציה בלבד), אך לעולם לא כמפתח-הזהות.
//
// אמת/תצוגה: הערכים (outer/inner/total) הם ממצא-מנוע (יאומתו מול Engine/Research החי בעת הצורך),
//   אך הרג'יסטרי *אינו* משכפל דגל-אמת. אין כאן engineVerified — סטטוס-אימות יוצג רק אם יוזרם
//   ממקור-אמת חי. crossref («פנים חדשות»=898) = התכנסות-גימטריה נפרדת, פרשנות-מחקר ולא הוכחה.
//   projectionDefault="layered_3d" — ברירת-מחדל; הרכיב יורד ל-static_2d לפי מכשיר/reduced-motion.
//
// כל ממצא-מרחבי עתידי מצטרף כאן כרשומה חדשה (מפתח = reveal_id יציב), והפוסט מטמיע מרקר
// <div data-spatial-reveal="<reveal_id>"></div> — בלי לקודד אנימציה ידנית בכל פוסט.

export const SPATIAL_REVEALS = {
  // ===== Golden specimen — ברכת כהנים: 1820 בחוץ, 898 בפנים =====
  // ערכים שנבדקו במנוע (fn_ragil): מעטפת(9 מילים)=1820 · פנים(6 מילים)=898 · סה״כ(15)=2718.
  "sg_birkat_kohanim_outer_inner_v1": {
    kind: "triangle-outer-inner",
    projectionDefault: "layered_3d",
    postSlug: "birkat-kohanim-spatial-1820-898", // מטא-אינטגרציה בלבד — לא זהות-הייצוג
    title: "ברכת כהנים — החוץ והפנים",
    subtitle: "לא מדגישים כל מילה. מסתכלים על המעטפת כצורה אחת — ואז נכנסים פנימה.",
    // 15 מילות ברכת כהנים מסודרות כמשולש (T5 = 1+2+3+4+5).
    rows: [
      ["יברכך"],
      ["יהוה", "וישמרך"],
      ["יאר", "יהוה", "פניו"],
      ["אליך", "ויחנך", "ישא", "יהוה"],
      ["פניו", "אליך", "וישם", "לך", "שלום"],
    ],
    // תת-המשולש הפנימי (6 מילים) — לפי אינדקסי-תא {rowIndex: [colIndex,...]}.
    // apex בשורה 2 (יהוה) · שורה 3 (ויחנך,ישא) · שורה 4 (אליך,וישם,לך).
    innerCells: { 2: [1], 3: [1, 2], 4: [1, 2, 3] },
    outer: { label: "החיצוניות · מעטפת המשולש נספרת כצורה אחת", value: 1820 },
    inner: { label: "הפנים · שש המילים הפנימיות", value: 898 },
    total: 2718,
    crossref: {
      term: "פנים חדשות",
      value: 898,
      note: "התאמה מחקרית מסקרנת — לא הוכחה למשמעות מכוונת.",
    },
  },
};

export function getSpatialReveal(revealId) {
  if (!revealId) return null;
  return SPATIAL_REVEALS[revealId] || null;
}
