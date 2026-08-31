// ── Canonical Visitor Identity primitive (ONE TREE · identity owned once) ──────
// המקום היחיד שיוצר/קורא את מזהה-המבקר האנונימי של האתר (localStorage 'sod_vid').
// כל תחום (tracking · acquisition · signup · journey/event linkage) **צורך** את זה —
// אף אחד לא יוצר משלו. מודול טהור (בלי import אפליקטיבי) → בטוח מכל שכבה, בלי מעגל.
//
// חשוב (טקסונומיית One Tree): זהו REPRESENTATION אחד — «מבקר-דפדפן אנונימי» — ולא
// זהות-האדם הקנונית. Visitor ≠ Session ≠ Person ≠ Subscriber. קישור-זהות ≠ מיזוג-זהות.
const VID_KEY = "sod_vid";

// מחזיר את sod_vid (יוצר פעם-אחת אם חסר). null רק אם אין localStorage (מצב-פרטי) — לא ממציא.
export function getVisitorId() {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch { return null; }
}

export const VISITOR_ID_KEY = VID_KEY;
