// מרשם הכותבים — שם כותב → תמונה ותפקיד. ברירת מחדל: "המערכת" (הלוגו).
// להוסיף תמונה אישית: שים קובץ תחת public/authors/<name>.jpg והוסף ערך כאן.
export const AUTHORS = {
  "המערכת": { avatar: "/logo.png", role: "מערכת סוד 1820" },
  "מזכה הרבים": { avatar: "/logo.png", role: "מדור התחזקות וזיכוי הרבים" },
  "מערכת כי לה׳ המלוכה": { avatar: "/logo.png", role: "מנוע חידושי ההצלבות · סוד 1820" },
  'הרב ווינטרוב זצ"ל': { avatar: "/authors/weintraub.jpg", role: "דברי תורה" },
  "הרב יקותיאל דטבריה": { avatar: "/logo.png", role: "דברי תורה" },
  "ציון סיבוני": { avatar: "/authors/siboni.jpg", role: "כתב מיוחד" },
  "יניב לוי": { avatar: "/authors/yaniv.jpg", role: "כתב" },
  "שמעון חיימוב": { avatar: "/logo.png", role: "כתב" },
  // עלון «סוד החשמל» — לחיצה על הכותב מובילה לכל הקטגוריה שלו (cat), לא לפוסטים לפי-כותב.
  "סוד החשמל": { avatar: "/authors/sod-hachashmal.svg", role: "עלון סוד החשמל · פנימיות התורה", cat: "סוד החשמל" },
};

// מחזיר אובייקט כותב {name, avatar, role, cat?}. אם השם ריק → "המערכת".
// cat (אופציונלי): שם קטגוריה — כשקיים, לחיצה על הכותב מובילה ל-/category/<cat>.
export function resolveAuthor(name) {
  const key = (name && String(name).trim()) || "המערכת";
  const meta = AUTHORS[key] || { avatar: "/logo.png", role: "כתב/ת" };
  return { name: key, avatar: meta.avatar, role: meta.role, cat: meta.cat || null };
}
