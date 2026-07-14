// 🔬 מערכת תרומות-המחקר (research_contribution_law) — עדשת-לקוח על research_contributions.
// מקור-אמת אחד; כל המשטחים (מחקר-קהילתי בכל דף) הם הקרנות. כתיבה דרך RPC (אוכף מודרציה-לפי-סוג).
import { supabase } from "./supabase.js";

// intent — מה המשתמש רצה לתרום. «תגובה» עולה מיד; השאר דורש אישור.
export const INTENTS = [
  { key: "תגובה", emoji: "💬", label: "תגובה", live: true },
  { key: "חידוש", emoji: "💡", label: "חידוש" },
  { key: "השערה", emoji: "🧩", label: "השערה" },
  { key: "תצפית", emoji: "🔍", label: "תצפית" },
  { key: "מקור",  emoji: "📚", label: "מקור" },
  { key: "שאלה",  emoji: "❓", label: "שאלה" },
  { key: "תיקון", emoji: "🛠", label: "תיקון" },
];
export const intentMeta = k => INTENTS.find(i => i.key === k) || { key: k, emoji: "•", label: k };

// research_state — מסע-המחקר (לא מודרציה)
export const STATE_META = {
  idea:          { emoji: "🟡", label: "רעיון" },
  discussion:    { emoji: "🔵", label: "בדיון" },
  investigating: { emoji: "🔬", label: "בבדיקה" },
  validated:     { emoji: "🟢", label: "אומת" },
  canonical:     { emoji: "🏛️", label: "קנוני" },
};
export const stateMeta = s => STATE_META[s] || STATE_META.idea;

// כל התרומות על ישות (RLS מחזירה מאושרים + הממתינים של המשתמש עצמו)
export async function getContributions(targetType, targetId, limit = 120) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("research_contributions")
      .select("id,author_name,author_user_id,intent,origin,research_state,status,target_type,target_id,parent_id,title,body,gematria_claim,created_at")
      .eq("target_type", targetType).eq("target_id", String(targetId))
      .order("created_at", { ascending: true }).limit(limit);
    return data || [];
  } catch { return []; }
}

export async function addContribution({ intent, origin, body, targetType, targetId, parentId = null, title = null, gematriaClaim = null }) {
  const { data, error } = await supabase.rpc("add_contribution", {
    p_intent: intent, p_origin: origin, p_body: body,
    p_target_type: targetType, p_target_id: targetId != null ? String(targetId) : null,
    p_parent_id: parentId, p_title: title, p_gematria_claim: gematriaClaim,
  });
  if (error) throw error;
  return data; // מזהה התרומה החדשה
}

// 🔗 «מצאתי קשר» — edge ברשת-התרומות + קרדיט-מוניטין
export async function linkContribution({ fromId, targetType, targetId, relation = "related", note = null }) {
  const { data, error } = await supabase.rpc("link_contribution", {
    p_from: fromId, p_target_type: targetType, p_target_id: String(targetId), p_relation: relation, p_note: note,
  });
  if (error) throw error;
  return data;
}
export async function getContributionLinks(fromId) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("contribution_links")
      .select("id,target_type,target_id,relation_type,note").eq("from_contribution_id", fromId);
    return data || [];
  } catch { return []; }
}

// 🎖️ «תיק חוקר» — מוניטין + דרגה (מבוסס-איכות)
export async function getReputation(userId = null) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc("researcher_reputation", userId ? { p_user_id: userId } : {});
    return data;
  } catch { return null; }
}

// ── מנהל ──
export async function approveContribution(id, { canonical = false, project = true } = {}) {
  const { data, error } = await supabase.rpc("approve_contribution", { p_id: id, p_canonical: canonical, p_project: project });
  if (error) throw error;
  return data;
}
export async function moderateContribution(id, status) {
  const { error } = await supabase.rpc("moderate_contribution", { p_id: id, p_status: status });
  if (error) throw error;
}
