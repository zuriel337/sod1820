import { supabase } from "./supabase.js";

// 📊 מוני-אתר חיים (עובדות מהמאגר) — לעמודי «כאן מתחילים» ו«מפת האתר».
// מקור יחיד: RPC site_counts (ציבורי). נשמר במטמון-מודול כדי לא לספור שוב בכל מעבר.
let _cache = null;
export async function getSiteCounts() {
  if (_cache) return _cache;
  if (!supabase) return {};
  try {
    const { data } = await supabase.rpc("site_counts");
    _cache = data || {};
    return _cache;
  } catch { return {}; }
}

// עברית יפה למספרים גדולים (1212 → «1,212»)
export const fmtCount = n => (typeof n === "number" ? n.toLocaleString("he-IL") : n ?? "—");
