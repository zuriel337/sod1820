// שם תמונת גלריה תקין — מסנן הערות-לוג של וורדפרס (`legacy_content_protocol` סעיף 3).
// שמות "עדכון … נוספה/נוספו תמונה/מסר" הם הערות-לוג מ-WordPress (~43% מהתמונות),
// לא כותרות אמיתיות — לא מציגים אותן ככיתוב (מבלבל). מחזיר שם תקין או null.
// מקור יחיד: בשימוש הקרוסלה (PostImageCarousel) ועמוד הטופיק (TopicPage).
export function cleanName(name) {
  const s = (name || "").trim();
  if (!s) return null;
  if (/^עדכון\b/.test(s)) return null;            // "עדכון 24/5/2020 …"
  if (/נוספ\w*\s+(תמונה|תמונות|מסר|מסרים)/.test(s)) return null;
  return s;
}
