// 💎 סמל-קטגוריה קנוני — קטגוריות מיוחדות מקבלות אימוג'י-פתיח בכל מקום שמוצג בו שם-הקטגוריה
//    (צ'יפים בפוסט, כותרת עמוד-קטגוריה, תגית-פורום וכו'). מקור-אמת יחיד, כמו VideoBadge/StrongHintBadge.
//    בחירת צוריאל: «רמזים חזקים» = 💎 יהלום (תוכן-הדגל).
export const CATEGORY_ICONS = {
  "רמזים חזקים": "💎",
};

export const categoryIcon = (name) => CATEGORY_ICONS[String(name || "").trim()] || "";

// מחזיר את שם-הקטגוריה עם אימוג'י-פתיח אם היא מיוחדת, אחרת השם כמות שהוא.
export const categoryLabel = (name) => {
  const ic = categoryIcon(name);
  return ic ? `${ic} ${name}` : name;
};
