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

// בוחר את המילה הטובה ביותר (הכי הרבה שיטות משותפות, ואז ביטוי קצר ומשמעותי)
function pickBest(rows, name, v) {
  const nameKey = anagramKey(name);
  let best = null, bestScore = -1;
  for (const r of rows || []) {
    if (!r.phrase || r.phrase === name) continue;
    // דילוג על אנגרמה/היפוך-אותיות של הביטוי — אותן אותיות = לא חידוש
    if (anagramKey(r.phrase) === nameKey) continue;
    const methods = [];
    for (const col of COLS) {
      if (r[col] != null && v[col] != null && r[col] === v[col]) methods.push({ col, label: LABEL[col], value: v[col] });
    }
    const n = methods.length;
    if (n < 2) continue;
    // מעדיפים: יותר שיטות; ואז ביטוי קצר (מילה ולא משפט); קנס קל על מילה בודדת קצרצרה
    const score = n * 1000 - r.phrase.length + (r.phrase.length >= 3 ? 5 : 0);
    if (score > bestScore) { best = { partner: r.phrase, methods, matchCount: n }; bestScore = score; }
  }
  return best;
}

export async function findNameCross(name) {
  const t = String(name || "").trim();
  if (!t || !supabase) return null;
  const v = nameValues(t);
  if (!v.ragil) return null;
  const cols = ["phrase", ...COLS].join(",");
  try {
    // נעילה כפולה (רגיל+מסתתר) — החזקה ביותר
    let { data } = await supabase.from("gematria_words").select(cols)
      .eq("ragil", v.ragil).eq("misratar", v.misratar).eq("is_verified", true).limit(80);
    let best = pickBest(data, t, v);
    if (!best) {
      // נפילה אחורה: שווי-ערך ברגיל, ובוחרים את מי שחולק הכי הרבה שיטות נוספות
      ({ data } = await supabase.from("gematria_words").select(cols)
        .eq("ragil", v.ragil).eq("is_verified", true).limit(150));
      best = pickBest(data, t, v);
    }
    if (best) { best.value = v.ragil; best.mistater = v.misratar; }
    return best;
  } catch { return null; }
}
