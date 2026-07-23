// 👥 דיווחי-רמזים מהקהילה (identity_architecture_law)
// אנונימי/רשום מדווח רמז → status='pending' → אדמין מאשר → עובר ל-gallery_images (source='community').
import { supabase } from "./supabase.js";

// 📥 שליחת דיווח (INSERT ישיר — policy ch_insert + column-grant מגבילים לשדות בטוחים בלבד)
export async function submitCommunityHint({ visitorId, userId, name, imageUrl, number, allNumbers, description, sourceUrl, occurredAt } = {}) {
  if (!supabase) return { ok: false, error: "no_client" };
  if (!imageUrl && !description) return { ok: false, error: "empty" };
  const row = {
    visitor_id: visitorId || null,
    reporter_user_id: userId || null,
    reporter_name: (name || "").trim() || null,
    image_url: imageUrl || null,
    number: Number.isFinite(+number) && +number > 0 ? +number : null,
    all_numbers: Array.isArray(allNumbers) ? allNumbers.filter(n => Number.isFinite(+n)).map(Number) : null,
    description: (description || "").trim() || null,
    source_url: (sourceUrl || "").trim() || null,
    occurred_at: occurredAt || null,
  };
  try {
    const { error } = await supabase.from("community_hints").insert(row);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
}

// 🔐 אדמין — תור הדיווחים (server-only דרך RPC מגודר)
export async function getPendingHints(status = "pending", limit = 100) {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc("admin_pending_hints", { p_status: status, p_limit: limit }); return data || []; }
  catch { return []; }
}

// ✅ אישור → יוצר שורת gallery_images (source='community')
export async function approveHint(id, { number, name, occurred } = {}) {
  if (!supabase) return { ok: false };
  try {
    const { data } = await supabase.rpc("approve_community_hint", {
      p_id: id,
      p_number: Number.isFinite(+number) ? +number : null,
      p_name: name || null,
      p_occurred: occurred || null,
    });
    return data || { ok: false };
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
}

// ❌ דחייה
export async function rejectHint(id, note) {
  if (!supabase) return { ok: false };
  try { const { data } = await supabase.rpc("reject_community_hint", { p_id: id, p_note: note || null }); return data || { ok: false }; }
  catch (e) { return { ok: false, error: String(e?.message || e) }; }
}
