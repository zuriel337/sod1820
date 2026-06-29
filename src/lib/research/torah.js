import { elsNormalize } from "../../features/els/Els.jsx";

// 📖 מקור-אמת אחד לטקסט התורה — נטען פעם אחת ונשמר במטמון (משותף לכל הכלים).
// אותיות (להצפנה/דילוגים) + פסוקים (לפרק:פסוק מדויק ולחיפוש רגיל). עץ אחד.
let _letters = null, _verses = null;

export function getTorahLetters() {
  if (!_letters) _letters = fetch("/torah-letters.txt", { headers: { Accept: "text/plain" } })
    .then(r => r.ok ? r.text() : Promise.reject(r.status))
    .then(t => elsNormalize(t))
    .catch(() => "");
  return _letters;
}

export function getTorahVerses() {
  if (!_verses) _verses = fetch("/torah-verses.json", { headers: { Accept: "application/json" } })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .catch(() => null);
  return _verses;
}

// ניקוד אופציונלי — שכבת סימני-ניקוד מיושרת לרשת-האותיות (nq[i] = הסימנים לאות i).
// נטען רק כשמדליקים את הניקוד (1.4MB → lazy). מקור: MAM (כתר ארם-צובא), מיושר לרשת הסטנדרטית.
let _niqqud = null;
export function getTorahNiqqud() {
  if (!_niqqud) _niqqud = fetch("/torah-niqqud.json", { headers: { Accept: "application/json" } })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .catch(() => null);
  return _niqqud;
}

export const heNorm = s => elsNormalize(s);
export const verseRef = (v, r) => `${(v.books || [])[r[0]] || "?"} ${r[1]}:${r[2]}`;
