// 🎬 מתג-פתיחה גלובלי לפיד-הרצף של «מימד חמש» (Shorts). כל כרטיס-מימד-חמש קורא ל-openD5Feed(slug);
//    הרכיב הגלובלי <DimensionFiveFeed/> (ב-Layout) מאזין ופותח את הנגן ברצף מהסרטון שנבחר.
export const openD5Feed = (slug) => {
  try { window.dispatchEvent(new CustomEvent("d5feed:open", { detail: { slug } })); } catch { /* noop */ }
};
