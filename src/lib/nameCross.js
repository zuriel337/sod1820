import { supabase } from "./supabase.js";
import { METHODS, DEPTH_METHODS } from "./gematria.js";

// 🔮 מחולל ההצלבה האישי — לשם נתון, מוצא מילה/מושג מהמאגר שמתכנס איתו בכמה שיטות.
// מנוע רשמי בלבד (METHODS) לחישוב ערכי השם; שאר ההתאמה מול הליבה gematria_words.

const KEYMAP = {
  "רגיל": "ragil", "מסתתר": "misratar", "מילוי": "miluy", "קדמי": "kadmi", "גדול": "gadol",
  "סידורי": "siduri", "אתבש": "atbash", "אלבם": "albam", "ריבוע": "ribua", "הכפלה": "hakpala",
  "ריבוע גדול": "ribua_gadol", "הכפלה גדולה": "hakpala_gadol", "מילוי דמילוי": "miluy_demiluy", "משולש גדול": "kadmi_gadol",
};
const LABEL = { ragil: "רגיל", misratar: "מסתתר", miluy: "מילוי", kadmi: "קדמי", gadol: "גדול", siduri: "סידורי", atbash: "אתבש", albam: "אלבם", ribua: "ריבוע", hakpala: "הכפלה", ribua_gadol: "ריבוע גדול", hakpala_gadol: "הכפלה גדולה", miluy_demiluy: "מילוי דמילוי", kadmi_gadol: "משולש גדול" };
const COLS = [...new Set(Object.values(KEYMAP))];

function nameValues(name) {
  const v = {};
  [...METHODS, ...DEPTH_METHODS].forEach(m => {
    const col = KEYMAP[m.key];
    if (col) { try { v[col] = m.fn(name); } catch { /* ignore */ } }
  });
  return v;
}

// מפתח אנגרמה — אותן אותיות (סופיות מנורמלות) → אנגרמה/היפוך = "לא חוכמה" (חולק טריוויאלית את שיטות הסכום)
const FINAL_NORM = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const anagramKey = s => String(s || "").replace(/[^א-ת]/g, "").split("").map(c => FINAL_NORM[c] || c).sort().join("");

// מדרג את כל ההצלבות (>=2 שיטות משותפות), מהחזקה לחלשה, בלי אנגרמות/כפילויות
function rankAll(rows, name, v) {
  const nameKey = anagramKey(name);
  const seen = new Set();
  const out = [];
  for (const r of rows || []) {
    if (!r.phrase || r.phrase === name || seen.has(r.phrase)) continue;
    // דילוג על אנגרמה/היפוך-אותיות של הביטוי — אותן אותיות = לא חידוש
    if (anagramKey(r.phrase) === nameKey) continue;
    const methods = [];
    for (const col of COLS) {
      if (r[col] != null && v[col] != null && r[col] === v[col]) methods.push({ col, label: LABEL[col], value: v[col] });
    }
    const n = methods.length;
    if (n < 2) continue;
    seen.add(r.phrase);
    // מעדיפים: יותר שיטות; ואז ביטוי קצר (מילה ולא משפט); קנס קל על מילה בודדת קצרצרה
    const score = n * 1000 - r.phrase.length + (r.phrase.length >= 3 ? 5 : 0);
    out.push({ partner: r.phrase, methods, matchCount: n, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export async function findNameCross(name) {
  const t = String(name || "").trim();
  if (!t || !supabase) return null;
  const v = nameValues(t);
  if (!v.ragil) return null;
  const cols = ["phrase", ...COLS].join(",");
  try {
    // כל שווי-הערך ברגיל; מדרגים לפי כמה שיטות נוספות הם חולקים
    const { data } = await supabase.from("gematria_words").select(cols)
      .eq("ragil", v.ragil).eq("is_verified", true).limit(250);
    const all = rankAll(data, t, v);
    if (!all.length) return null;
    const [primary, ...others] = all;
    primary.value = v.ragil; primary.mistater = v.misratar;
    primary.others = others.slice(0, 12).map(o => ({ ...o, value: v.ragil, mistater: v.misratar }));
    return primary;
  } catch { return null; }
}
