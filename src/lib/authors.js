// מרשם הכותבים — שם כותב → תמונה ותפקיד. ברירת מחדל: "המערכת" (הלוגו).
// כדי להוסיף כתב חדש: להוסיף ערך כאן (תמונה תחת public/authors/).
export const AUTHORS = {
  "המערכת": { avatar: "/logo.png", role: "מערכת סוד 1820" },
  "מזכה הרבים": { avatar: "/logo.png", role: "מדור התחזקות וזיכוי הרבים" },
  "מערכת כי לה׳ המלוכה": { avatar: "/logo.png", role: "מנוע חידושי ההצלבות · סוד 1820" },
  // דוגמה לכתב נוסף:
  // "ישראל ישראלי": { avatar: "/authors/israel.jpg", role: "כתב" },
};

// מחזיר אובייקט כותב {name, avatar, role}. אם השם ריק → "המערכת".
export function resolveAuthor(name) {
  const key = (name && String(name).trim()) || "המערכת";
  const meta = AUTHORS[key] || { avatar: "/logo.png", role: "כתב/ת" };
  return { name: key, avatar: meta.avatar, role: meta.role };
}
