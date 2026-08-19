// 💎 סמל-קטגוריה קנוני — קטגוריות מיוחדות מקבלות אימוג'י-פתיח בכל מקום שמוצג בו שם-הקטגוריה
//    (צ'יפים בפוסט, כותרת עמוד-קטגוריה, תגית-פורום וכו'). מקור-אמת יחיד, כמו VideoBadge/StrongHintBadge.
//    להוספת סמל לקטגוריה — שורה אחת כאן, והיא מופיעה אוטומטית בכל המקומות.
export const CATEGORY_ICONS = {
  "רמזים חזקים": "💎",   // תוכן-הדגל של צוריאל (חי)
  "עלוני גאולה": "📖",   // עלון/ספרון
  "צפונות בתורה": "🔠",  // הסמל של תוכנת הצופן (דילוגי-אותיות/ELS)
};

export const categoryIcon = (name) => CATEGORY_ICONS[String(name || "").trim()] || "";

// מחזיר את שם-הקטגוריה עם אימוג'י-פתיח אם היא מיוחדת, אחרת השם כמות שהוא.
export const categoryLabel = (name) => {
  const ic = categoryIcon(name);
  return ic ? `${ic} ${name}` : name;
};

// קטגוריות שכבר מיוצגות ע"י באדג' ייעודי בכרטיס (💎 רמז-חזק) —
// כדי לא לכפול אותן בצ'יפ-קטגוריה הגנרי (למשל ב«עדכונים אחרונים»).
const DEDICATED_BADGE = new Set(["רמזים חזקים"]);

// מחזיר את הקטגוריה הראשונה של הפוסט שיש לה אייקון ואינה מיוצגת כבר בבאדג' ייעודי —
// לשימוש בצ'יפ-קטגוריה לחיץ ליד «פוסט» (כמו היהלום, לכל קטגוריה עם סמל).
export const primaryIconedCategory = (categories) => {
  if (!Array.isArray(categories)) return null;
  for (const c of categories) {
    const name = String(c || "").trim();
    if (CATEGORY_ICONS[name] && !DEDICATED_BADGE.has(name)) return { name, icon: CATEGORY_ICONS[name] };
  }
  return null;
};
