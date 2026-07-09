// ===== תמונות ממוזערות (Supabase Image Transformations) =====
// ממיר URL של אחסון Supabase (object/public) לנקודת ה-render עם width+quality.
// חוסך ~5-6x ב-Egress ברשתות/גלריות (התמונה המוצגת קטנה ממילא).
// כללי בטיחות: URLs חיצוניים, render קיים, ו-gif/svg (אנימציה/וקטור) — מוחזרים כמו שהם.

const OBJ_RE = /\/storage\/v1\/object\/public\//;

// 🖼 galThumb — מעדיף thumbnail סטטי מוכן (gen-thumb, שדה thumb_url) שמוגש ישירות ומהיר,
// בלי Image Transformation חוזרת. נפילה ל-thumb() בזמן אמת אם אין thumb_url. מקבל row או url.
export function galThumb(row, width = 480, quality = 62) {
  if (row && typeof row === "object") {
    if (row.thumb_url) return row.thumb_url;      // סטטי מוכן — מהיר, בלי טרנספורמציה
    return thumb(row.image_url, width, quality);
  }
  return thumb(row, width, quality);              // נקרא עם URL ישיר
}

export function thumb(url, width = 480, quality = 62) {
  if (!url || typeof url !== "string") return url;
  if (!OBJ_RE.test(url)) return url;                 // לא אחסון Supabase → ללא שינוי
  if (url.includes("/render/image/")) return url;    // כבר מותמר
  if (/\.(gif|svg)(\?|$)/i.test(url)) return url;    // אנימציה/וקטור → לא להתמיר
  const base = url.replace(OBJ_RE, "/storage/v1/render/image/public/");
  // resize=contain מפורש — לעולם לא לחתוך את התמונה בהקטנה (חוק אי-החיתוך)
  return `${base}${base.includes("?") ? "&" : "?"}width=${width}&quality=${quality}&resize=contain`;
}
