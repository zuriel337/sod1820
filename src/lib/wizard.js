// 🧙 אשף התקנון — עדשה דקה על ה-RPCs שבונים התכנסות-קהילה לפי unified_discovery_architecture.
// כל הכתיבה-לליבה מתבצעת בצד-שרת (SECURITY DEFINER, אדמין בלבד) — כאן רק קריאה.
import { supabase } from "./supabase.js";

// אימות ביטויים במנוע (fn_ragil) + האם קיימים במאגר. מזין את שלב «אמת במנוע».
export async function verifyPhrases(phrases = []) {
  const list = (phrases || []).map(s => String(s || "").trim()).filter(Boolean);
  if (!supabase || !list.length) return [];
  const { data, error } = await supabase.rpc("wizard_verify_phrases", { p_phrases: list });
  if (error) throw error;
  if (data && data.error) throw new Error(data.error);
  return data || [];
}

// בניית השרשרת המלאה (שורש→Raw→AI-Judge→שער-אדם→התכנסות→תרומה→הקרנה). מחזיר {ok, slug, ...}.
export async function buildConvergence(payload) {
  if (!supabase) throw new Error("no supabase");
  const { data, error } = await supabase.rpc("wizard_build_convergence", { p: payload });
  if (error) throw error;
  if (data && data.error) throw new Error(data.error);
  return data;
}

// חילוץ ביטויי-גימטריה מטקסט חופשי של חידוש: שוברים לפי שורות/«=»/«·», משאירים
// רק מקטעים עבריים באורך סביר (2–30 תווים), בלי כפילויות. עזר-נוחות בלבד — האדמין עורך.
export function extractPhrases(text = "") {
  const clean = String(text || "")
    .replace(/[«»"'׳״]/g, " ")
    .replace(/[0-9]+/g, "|")            // מספרים = מפריד (הערך אחרי «=»)
    .replace(/[=·:+\-—,.\n\r\t()]/g, "|");
  const seen = new Set();
  const out = [];
  for (const raw of clean.split("|")) {
    const p = raw.replace(/\s+/g, " ").trim();
    if (!p) continue;
    if (!/[֐-׿]/.test(p)) continue;   // חייב עברית
    if (p.length < 2 || p.length > 30) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

// הצעת-slug מהכותרת/הערך (עברי-ידידותי, מקפים במקום רווחים).
export function suggestSlug(title, value) {
  const base = String(title || "").replace(/[«»"'׳״]/g, "").replace(/\s+/g, "-").replace(/[^֐-׿A-Za-z0-9\-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (base ? base : "התכנסות") + (value ? "-" + value : "");
}
