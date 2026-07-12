// 🔮 חיפוש-ה-AI העמוק — מודול משותף לכל משטח (unified_graph_law · research_workspace_law).
// עיקרון: המנוע (gematria.js + bidim) מחשב את כל השיטות ואת ההצלבות; ה-AI מפרש בלבד.
// עדשה אחת → אותו עומק בכל מקום: דף מספר · מעבדת-השם (מחקר לפי שפות) · מרכז מחקר · השוואות.
// ✅ לא מחשב מחדש — משתמש רק בערכי-המנוע הרשמיים ובהצלבות מ-bidim (number_cross_resonance).
import { crossMethodPairs } from "./gematria.js";
import { getNumberCrossResonance, getAiAnalysis } from "./supabase.js";

const _cache = new Map();  // מילה → {methodsLine, crossLine, groups} (ממוזג per-session, חוסך קריאות)

// מביא (וממזג) את שכבת-העומק הבין-שיטתית למילה עברית. ריק למספר/לועזית (אין אותיות).
// crossLine = "«מילה» ב<שיטה נסתרת> (ערך) = <מילים שוות ברגיל>" — הפנים של אחרות = הנסתר שלנו.
export async function getWordCrossFacts(term) {
  const w = (term || "").trim();
  if (!w) return { methodsLine: "", crossLine: "", groups: [] };
  if (_cache.has(w)) return _cache.get(w);
  let out = { methodsLine: "", crossLine: "", groups: [] };
  try {
    const pairs = crossMethodPairs(w);              // [{method,value}] ב-7 שיטות קריאות (מהמנוע)
    if (pairs.length) {
      const methodsLine = pairs.map(p => `${p.method}=${p.value}`).join(" · ");
      const groups = await getNumberCrossResonance(w, pairs, { perGroup: 5 });
      const crossLine = groups
        .filter(g => g.method !== "רגיל")            // רגיל מיוצג ממילא ברשימת המילים-השוות של המשטח
        .slice(0, 5)
        .map(g => `«${w}» ב${g.method} (${g.value}) = ${g.matches.map(m => m.phrase).join(", ")} ברגיל`)
        .join(" · ");
      out = { methodsLine, crossLine, groups };
    }
  } catch { /* נפילה בחן — בלי עומק, לא שוברים את המשטח */ }
  _cache.set(w, out);
  return out;
}

// מוסיף את שכבת-העומק על גבי baseFacts שהמשטח סיפק (ההקשר הייחודי שלו נשמר).
export function appendDeepFacts(baseFacts, cross) {
  let f = baseFacts || "";
  if (cross?.methodsLine) f += ` ערכי המילה בשיטות: ${cross.methodsLine}.`;
  if (cross?.crossLine)   f += ` הצלבות בין-שיטתיות (עובדה מהמנוע): ${cross.crossLine}.`;
  return f;
}

// 🎯 נקודת-הכניסה האחת לחיפוש-AI עמוק על מילה. המשטח מספק subject + baseFacts (ההקשר שלו),
//    והמודול מוסיף את שכבת-העומק ומריץ. deep=true → Sonnet (עמוק, במכסה) · אחרת Haiku (מהיר, נדיב).
//    מחזיר { text, cross } — cross זמין למשטח להצגת המילים המוצלבות כקישורי-פנים.
export async function analyzeWordDeep({ term, subject, baseFacts = "", engine = "claude", deep = false, kind = "number", again = false } = {}) {
  const cross = await getWordCrossFacts(term);
  const facts = appendDeepFacts(baseFacts, cross);
  const fast = !deep;
  let txt = await getAiAnalysis({ kind, subject: subject || term, facts, fast, engine, again });
  if (!txt) { await new Promise(r => setTimeout(r, 800)); txt = await getAiAnalysis({ kind, subject: subject || term, facts, again: true, fast, engine }); }
  return { text: txt, cross };
}
