// מרשם הכותבים — שם כותב → תמונה ותפקיד. ברירת מחדל: "המערכת" (הלוגו).
// להוסיף תמונה אישית: שים קובץ תחת public/authors/<name>.jpg והוסף ערך כאן.
export const AUTHORS = {
  "המערכת": { avatar: "/logo.png", role: "מערכת סוד 1820" },
  "מזכה הרבים": { avatar: "/logo.png", role: "מדור התחזקות וזיכוי הרבים" },
  "מערכת כי לה׳ המלוכה": { avatar: "/logo.png", role: "מנוע חידושי ההצלבות · סוד 1820" },
  'הרב ווינטרוב זצ"ל': { avatar: "/authors/weintraub.jpg", role: "דברי תורה" },
  "ציון סיבוני": { avatar: "/authors/siboni.jpg", role: "כתב מיוחד" },
  "יניב לוי": { avatar: "/authors/yaniv.jpg", role: "כתב" },
};

// מחזיר אובייקט כותב {name, avatar, role}. אם השם ריק → "המערכת".
export function resolveAuthor(name) {
  const key = (name && String(name).trim()) || "המערכת";
  const meta = AUTHORS[key] || { avatar: "/logo.png", role: "כתב/ת" };
  return { name: key, avatar: meta.avatar, role: meta.role };
}
