// 🖼️ מטריצות-דילוג שמורות (els_records) — עדשת-לקוח על הטבלה הקיימת. שיתופיות ולשיתוף.
// קריאה ציבורית למאושרות (status=published). כתיבה/אישור דרך RPC (SECURITY DEFINER).
import { supabase } from "./supabase.js";

const COLS = "id,slug,title,search_term,scope,skip_distance,direction,positions,image_url,description,author_name,primary_number,anchor_numbers,created_at";

export async function getSavedMatrices(limit = 100) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS)
      .eq("status", "published").order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// 🔗 עמוד קנוני לצופן — שליפה לפי slug (רק מפורסם; RLS מתירה קריאה ציבורית)
export async function getMatrixBySlug(slug) {
  if (!supabase || !slug) return null;
  try {
    const { data } = await supabase.from("els_records").select(COLS)
      .eq("slug", slug).eq("status", "published").maybeSingle();
    return data || null;
  } catch { return null; }
}

// אדמין — מטריצות ממתינות לאישור
export async function getPendingMatrices(limit = 100) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS + ",status")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

export async function saveMatrix({ term, scope = "torah", skip = null, direction = null, positions = null, imageUrl = null, title = null, note = null, isPublic = true }) {
  const { data, error } = await supabase.rpc("save_els_matrix", {
    p_term: term, p_scope: scope, p_skip: skip, p_direction: direction,
    p_positions: positions, p_image_url: imageUrl, p_title: title, p_note: note, p_public: isPublic,
  });
  if (error) throw error;
  return data;
}

export async function moderateMatrix(id, status) {
  const { error } = await supabase.rpc("moderate_els_matrix", { p_id: id, p_status: status });
  if (error) throw error;
}
