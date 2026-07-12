// 🔮 חיפוש-ה-AI העמוק — מודול משותף לכל משטח (unified_graph_law · research_workspace_law).
// עיקרון: המנוע (gematria.js + bidim) מחשב את כל השיטות ואת ההצלבות; ה-AI מפרש בלבד.
// עדשה אחת → אותו עומק בכל מקום: דף מספר · מעבדת-השם (מחקר לפי שפות) · מרכז מחקר · השוואות.
// ✅ לא מחשב מחדש — משתמש רק בערכי-המנוע הרשמיים ובהצלבות מ-bidim (number_cross_resonance).
import { crossMethodPairs } from "./gematria.js";
import { getNumberCrossResonance, getNumberResonanceStats, getAiAnalysis } from "./supabase.js";

const _cache = new Map();  // מילה → {methodsLine, crossLine, groups, stats} (ממוזג per-session, חוסך קריאות)

// 📊 מדד-תהודה (0-100) — מחושב מעובדות-המנוע בלבד (שיטות/חיבורים/צמתים), לא AI.
//    שקלול: שיטות 40% · חיבורים 35% (תקרה 80) · צמתים-חזקים 25% (תקרה 7). שקוף וקבוע.
export function resonanceScore(stats) {
  if (!stats) return null;
  const methods = Number(stats.n_methods) || 0;
  const conns = Number(stats.n_connections) || 0;
  const nodes = Number(stats.n_strong_nodes) || 0;
  const score = Math.round(100 * (0.4 * Math.min(methods, 7) / 7 + 0.35 * Math.min(conns, 80) / 80 + 0.25 * Math.min(nodes, 7) / 7));
  return { methods, connections: conns, strongNodes: nodes, score };
}

// מביא (וממזג) את שכבת-העומק הבין-שיטתית למילה עברית. ריק למספר/לועזית (אין אותיות).
// crossLine = "«מילה» ב<שיטה נסתרת> (ערך) = <מילים שוות ברגיל>" — הפנים של אחרות = הנסתר שלנו.
export async function getWordCrossFacts(term) {
  const w = (term || "").trim();
  if (!w) return { methodsLine: "", crossLine: "", groups: [], stats: null, resonance: null };
  if (_cache.has(w)) return _cache.get(w);
  let out = { methodsLine: "", crossLine: "", groups: [], stats: null, resonance: null };
  try {
    const pairs = crossMethodPairs(w);              // [{method,value}] ב-7 שיטות קריאות (מהמנוע)
    if (pairs.length) {
      const methodsLine = pairs.map(p => `${p.method}=${p.value}`).join(" · ");
      const [groups, stats] = await Promise.all([
        getNumberCrossResonance(w, pairs, { perGroup: 5 }),
        getNumberResonanceStats(w, pairs),
      ]);
      const crossLine = groups
        .filter(g => g.method !== "רגיל")            // רגיל מיוצג ממילא ברשימת המילים-השוות של המשטח
        .slice(0, 5)
        .map(g => `«${w}» ב${g.method} (${g.value}) = ${g.matches.map(m => m.phrase).join(", ")} ברגיל`)
        .join(" · ");
      out = { methodsLine, crossLine, groups, stats, resonance: resonanceScore(stats) };
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
  const r = cross?.resonance;
  if (r) f += ` מדד-תהודה (עובדת-מנוע): ${r.methods} שיטות · ${r.connections} חיבורים · ${r.strongNodes} צמתים חזקים (ציון ${r.score}/100). נתח את *מבנה* הרשת — לא רק ערך בודד.`;
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
