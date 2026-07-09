// 🔗 מערכת החיבור האחת ל-AI — נקודת-כניסה יחידה לכל מערכות האתר.
// מחשבון קהילתי · דף מספר · מרכז מחקר · בית מדרש · כלי-השוואה — כולם קוראים ל-`analyze(...)` באותו מבנה.
// עיקרון: המנוע (SQL/JS) מייצר עובדות; ה-AI (Claude/Gemini) מפרש בלבד ולעולם לא מחשב.
// backward-compatible: עוטף את getAiAnalysis הקיים; אפשר לעבור אליו מערכת-מערכת בלי לשבור כלום.
import { getAiAnalysis } from "./supabase.js";

// המנועים הזמינים — engine נבחר במצב-השוואה (A/B). ברירת-מחדל בשרת: claude.
export const ENGINES = ["claude", "gemini"];

// סוגי ניתוח (kind) — כל אחד עם hint משלו ב-ai-analyze (SYSTEM אחד, hints לפי kind).
export const KINDS = ["number", "compare", "discovery", "verse", "daily_verse", "notarikon", "research"];

// 🧱 הבנאי הקנוני — הופך נתוני-מנוע מובנים למחרוזת facts אחידה.
// זה ה«פורמט האחד» שכל מערכת מייצרת → פלט עקבי בין כל המשטחים ובין שני המנועים.
// methods: [{key,value}] · parallels: [{phrase}|string] · pair: {a:{name,value},b:{name,value},shared:[{key,value}]}.
export function buildAiFacts({ subject, methods = [], parallels = [], pair = null, userGoal = "", note = "" } = {}) {
  const parts = [];
  if (subject) parts.push(`הנושא: "${subject}".`);
  if (methods.length) parts.push(`ערכי המנוע (מאומתים, אל תחשב מחדש): ${methods.map(m => `${m.key}=${m.value}`).join(" · ")}.`);
  if (parallels.length) {
    const list = parallels.slice(0, 12).map(p => (typeof p === "string" ? p : p.phrase)).filter(Boolean).join(", ");
    if (list) parts.push(`מקבילות באותו ערך (עובדה): ${list}.`);
  }
  if (pair) {
    parts.push(`השוואה: "${pair.a?.name}"=${pair.a?.value} · "${pair.b?.name}"=${pair.b?.value}.`);
    parts.push(pair.shared?.length
      ? `נפגשים ב-${pair.shared.length} שיטות: ${pair.shared.map(s => `${s.key}(${s.value})`).join(", ")}.`
      : `אין להם ערך שווה באף שיטה (0 מתוך 19). סכום: ${(pair.a?.value || 0) + (pair.b?.value || 0)}.`);
  }
  if (userGoal) parts.push(`מטרת המשתמש: ${userGoal}.`);
  if (note) parts.push(note);
  return parts.join(" ");
}

// 🎯 נקודת-הכניסה האחת. מקבל או `facts` מוכן, או נתונים מובנים שהיא תבנה מהם facts קנוני.
//    engine: 'claude'|'gemini' (undefined → ברירת-מחדל בשרת). fast=true לכלים אינטראקטיביים.
//    מחזיר טקסט-ניתוח או null (נפילה בחן — בלי מפתח/כשל).
export async function analyze({ subject, kind = "number", engine, fast = true, again = false,
                               facts, methods, parallels, pair, userGoal, note } = {}) {
  const factsStr = facts || buildAiFacts({ subject, methods, parallels, pair, userGoal, note });
  return getAiAnalysis({ kind, subject, facts: factsStr, engine, fast, again });
}
