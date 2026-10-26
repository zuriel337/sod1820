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

// שורת-רמז מנורמלת (אותו מבנה בענן ובמקומי). שדות Life Journey
// נשארים metadata של אותה רשומת research_items/hint — אין store מקביל.
function normalize(row) {
  const m = row.metadata || {};
  return {
    id: row.id,
    capture_ref: m.capture_ref || null,
    capture_contract: m.capture_contract || null,
    hint_type: m.hint_type || "idea",
    number: row.entity_ref ? Number(row.entity_ref) : (m.number ?? null),
    title: row.title || "",
    image_url: m.image_url || null,
    note: m.note || "",
    research_question: m.research_question || "",
    source_url: m.source_url || row.link || null,
    occurred_at: m.occurred_at || null,
    date_precision: m.date_precision || null,
    life_journey_member_ref: m.life_journey_member_ref || null,
    created_at: row.created_at || m.created_at || null,
  };
}

// 📤 העלאת תמונת-רמז מהמכשיר ל-bucket 'gallery' (ציבורי) → URL ציבורי.
//    משתמש מחובר (policy public_upload); התמונה נשמרת ב-metadata.image_url של הרמז.
export async function uploadHintImage(user, file) {
  if (!supabase) throw new Error("no_supabase");
  if (!file) throw new Error("no_file");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `sod1820/hints/${user?.id || "anon"}/${Date.now()}-${Math.round(Math.random() * 1e5)}.${ext}`;
  const { error } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
}

// ── קריאה: כל הרמזים של המשתמש (עדכני→ישן) ──
export async function getMyHints(user, { fallbackLocal = true } = {}) {
  if (user && supabase) {
    const { data, error } = await supabase
      .from("research_items")
      .select("id, entity_ref, title, link, metadata, created_at")
      .eq("user_id", user.id)
      .eq("bucket", BUCKET)
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) return data.map(normalize);
    if (!fallbackLocal) {
      if (error) throw error;
      return [];
    }
  }
  if (!fallbackLocal) return [];
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
export async function addHint(user, h, { fallbackLocal = true } = {}) {
  const metadata = {
    capture_ref: h.capture_ref || null,
    capture_contract: h.capture_contract || null,
    hint_type: h.hint_type || "idea",
    image_url: h.image_url || null,
    note: h.note || "",
    research_question: h.research_question || "",
    source_url: h.source_url || null,
    occurred_at: h.occurred_at || null,
    date_precision: h.date_precision || null,
    life_journey_member_ref: h.life_journey_member_ref || null,
  };
  const number = h.number != null && h.number !== "" ? Number(h.number) : null;
  const title = (h.title || "").trim() || (number != null ? `רמז · ${number}` : "רמז");
  const captureId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(h.capture_ref || "")
    ? h.capture_ref
    : null;

  if (user && supabase) {
    const values = {
      ...(captureId ? { id: captureId } : {}),
      user_id: user.id,
      bucket: BUCKET,
      entity_type: "hint",
      entity_ref: number != null ? String(number) : null,
      title,
      link: h.source_url || null,
      metadata,
    };
    const { data, error } = await supabase
      .from("research_items")
      .insert(values)
      .select("id, entity_ref, title, link, metadata, created_at")
      .single();
    if (!error && data) return normalize(data);
    // Retrying a confirmed capture is idempotent. Read back only the exact owned
    // hint; never turn an unrelated conflict into a successful receipt.
    if (error && captureId) {
      const { data: existing, error: readError } = await supabase
        .from("research_items")
        .select("id, entity_ref, title, link, metadata, created_at")
        .eq("id", captureId)
        .eq("user_id", user.id)
        .eq("bucket", BUCKET)
        .maybeSingle();
      if (!readError && existing) return normalize(existing);
    }
    if (error) throw error;
  }
  if (!fallbackLocal) throw new Error("hint_writer_unavailable");
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
