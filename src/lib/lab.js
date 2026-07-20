// 🧪 מעבדה להבנת משמעות — שכבת-נתונים מבודדת (lab_*). לא נוגעת בליבה.
// חיבור לסוכן ההוראה (Edge Function lab-teacher) + הערות-ידע + היסטוריית-שיח.
import { supabase } from "./supabase.js";

// ── סוכן ההוראה (המורה האדפטיבי) ──
// messages = [{ role:'user'|'assistant', content }]. fast=true → Haiku (מהיר), אחרת Sonnet (עומק).
export async function labTeacherReply(messages, { fast = false } = {}) {
  if (!supabase) return { reply: null, error: "no_client" };
  try {
    const { data, error } = await supabase.functions.invoke("lab-teacher", { body: { messages, fast } });
    if (error) return { reply: null, error: error?.message || "invoke_error" };
    return { reply: data?.reply || null, error: data?.error || null, model: data?.model };
  } catch (e) {
    return { reply: null, error: String(e?.message || e) };
  }
}

// ── הערות-ידע (lab_notes) ──
export async function getLabNotes() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("lab_notes").select("*").order("created_at", { ascending: false });
  if (error) { try { console.warn("[lab] notes:", error.message); } catch { /* noop */ } return []; }
  return data || [];
}

export async function addLabNote(note) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("lab_notes").insert(note).select().single();
  if (error) { try { console.warn("[lab] addNote:", error.message); } catch { /* noop */ } return null; }
  return data;
}

export async function deleteLabNote(id) {
  if (!supabase) return;
  await supabase.from("lab_notes").delete().eq("id", id);
}

// ── היסטוריית-שיח (lab_messages) ──
export async function getLabThread(thread = "main") {
  if (!supabase) return [];
  const { data, error } = await supabase.from("lab_messages").select("*").eq("thread", thread).order("created_at", { ascending: true });
  if (error) { try { console.warn("[lab] thread:", error.message); } catch { /* noop */ } return []; }
  return data || [];
}

export async function saveLabMessage(msg) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("lab_messages").insert(msg).select().single();
  if (error) { try { console.warn("[lab] saveMsg:", error.message); } catch { /* noop */ } return null; }
  return data;
}
