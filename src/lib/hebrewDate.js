// 📅 המרת תאריך גרגוריאני → תאריך עברי מאויית — מנוע קנוני יחיד (@hebcal/core).
// ⛔ לא מקור-אמת חדש ולא אלגוריתם חדש: עוטף את hebcal (אותו דפוס כמו DatesTool/CommunityCalculator)
//    ומחזיר את הצורה המאויתת בלבד. ה-input (profiles.birth_date, גרגוריאני) נשאר מקור-האמת;
//    התאריך-העברי הוא derived-בזמן-ריצה — לא נשמר, ואין עמודת birth_date_hebrew.
//
// Timezone-safe: מפרק את ה-ISO ל-y/m/d ומשתמש ב-new Date(y,m-1,d) (חצות מקומי) — לעולם לא
//   new Date("YYYY-MM-DD") שנפרסר כ-UTC ועלול לקפוץ יום באזורי-זמן שליליים (תאריך-לידה הוא date, בלי שעה).
// אדר א׳/ב׳ ושנים-מעוברות (גרגוריאני + עברי) — מטופלים ע״י hebcal, ולכן אין לכתוב אלגוריתם ידני.
// renderGematriya מאיית שנה בקונבנציה המקובלת (בלי אלפים): «כ״ב סִיוָן תש״נ».
export async function gregToHebrewSpelled(iso) {
  if (!iso || typeof iso !== "string") return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  try {
    const { HDate } = await import("@hebcal/core");
    const hd = new HDate(new Date(y, m - 1, d));    // TZ-safe: חצות מקומי מ-ints
    const rendered = hd.renderGematriya();           // «כ״ב סִיוָן תש״נ»
    const pretty = rendered.replace(/[֑-ׇ]/g, "");   // בלי ניקוד/טעמים (לתצוגה + כפריט-הצלבה)
    const clean = pretty.replace(/[^א-ת]/g, "");     // אותיות בלבד (לגימטריה)
    if (!clean) return null;
    return { iso, pretty, clean };
  } catch {
    return null;   // תאריך מחוץ-לטווח / HDate נכשל → מדלגים על התאריך, לא שוברים את המחקר
  }
}
