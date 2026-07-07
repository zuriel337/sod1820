// 🧩 הרמזים שלי — שכבת נתונים local-first (research_workspace_law).
// מחובר → research_items ב-Supabase (RLS: כל משתמש בעל השורות שלו).
// אנונימי → localStorage. אין טבלה מקבילה; רמז = research_items bucket='hint'.
import { supabase } from "./supabase.js";

const BUCKET = "hint";
const LS_KEY = "sod_my_hints_v1";

// ── אנונימי: localStorage ──
function lsRead() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function lsWrite(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch { /* מלא/חסום */ }
}

// שורת-רמז מנורמלת (אותו מבנה בענן ובמקומי) → { id, hint_type, number, title, image_url, note, source_url, occurred_at, created_at }
function normalize(row) {
  const m = row.metadata || {};
  return {
    id: row.id,
    hint_type: m.hint_type || "idea",
    number: row.entity_ref ? Number(row.entity_ref) : (m.number ?? null),
    title: row.title || "",
    image_url: m.image_url || null,
    note: m.note || "",
    source_url: m.source_url || row.link || null,
    occurred_at: m.occurred_at || null,
    created_at: row.created_at || m.created_at || null,
  };
}

// ── קריאה: כל הרמזים של המשתמש (עדכני→ישן) ──
export async function getMyHints(user) {
  if (user && supabase) {
    const { data, error } = await supabase
      .from("research_items")
      .select("id, entity_ref, title, link, metadata, created_at")
      .eq("user_id", user.id)
      .eq("bucket", BUCKET)
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) return data.map(normalize);
  }
  // אנונימי / כישלון רשת → מקומי
  return lsRead().map(normalize).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

// ── ספירה לפי סוג → { image: 3, ai: 1, ... , _total } ──
export function countByType(hints) {
  const out = { _total: hints.length };
  for (const h of hints) out[h.hint_type] = (out[h.hint_type] || 0) + 1;
  return out;
}

// ── הוספת רמז ──
export async function addHint(user, h) {
  const metadata = {
    hint_type: h.hint_type || "idea",
    image_url: h.image_url || null,
    note: h.note || "",
    source_url: h.source_url || null,
    occurred_at: h.occurred_at || null,
  };
  const number = h.number != null && h.number !== "" ? Number(h.number) : null;
  const title = (h.title || "").trim() || (number != null ? `רמז · ${number}` : "רמז");

  if (user && supabase) {
    const { data, error } = await supabase
      .from("research_items")
      .insert({
        user_id: user.id,
        bucket: BUCKET,
        entity_type: "hint",
        entity_ref: number != null ? String(number) : null,
        title,
        link: h.source_url || null,
        metadata,
      })
      .select("id, entity_ref, title, link, metadata, created_at")
      .single();
    if (!error && data) return normalize(data);
    if (error) throw error;
  }
  // אנונימי → מקומי (id זמני מקומי; ISO ידני כי אין שרת)
  const local = {
    id: `local-${lsRead().length + 1}-${(number ?? "x")}`,
    entity_ref: number != null ? String(number) : null,
    title, link: h.source_url || null, metadata,
    created_at: new Date().toISOString(),
  };
  const arr = lsRead();
  arr.unshift(local);
  lsWrite(arr);
  return normalize(local);
}

// ── מחיקת רמז ──
export async function removeHint(user, id) {
  if (user && supabase && !String(id).startsWith("local-")) {
    await supabase.from("research_items").delete().eq("id", id).eq("user_id", user.id);
    return;
  }
  lsWrite(lsRead().filter(r => r.id !== id));
}
