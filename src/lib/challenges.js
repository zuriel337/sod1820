// 🧩 אתגרי מחקר — עדשת-לקוח על research_challenges (שכבת-סטטוס מעל תרומה, עץ אחד).
// חיים בתוך הזרם (פורום/דף-חוקר/שידור). כתיבה דרך RPCs מגודרי-הרשאה (SECURITY DEFINER).
import { supabase } from "./supabase.js";

export const CHALLENGE_DOMAINS = [
  { key: "els", emoji: "🔠", label: "דילוגים" },
  { key: "gematria", emoji: "🔢", label: "גימטריה" },
  { key: "language", emoji: "🔤", label: "לשון" },
  { key: "tanakh", emoji: "📖", label: "תנ״ך" },
  { key: "other", emoji: "🧩", label: "אחר" },
];
export const domainMeta = (k) => CHALLENGE_DOMAINS.find((d) => d.key === k) || { key: k, emoji: "🧩", label: k };
export const DIFFICULTY = { 1: { emoji: "🟢", label: "קל" }, 2: { emoji: "🟡", label: "בינוני" }, 3: { emoji: "🔴", label: "מורכב" } };
export const CHALLENGE_STATUS = {
  open: { emoji: "🟢", label: "ממתין לחוקר", color: "#2e9e5b" },
  claimed: { emoji: "🔵", label: "בטיפול", color: "#3ea6ff" },
  solved: { emoji: "✅", label: "נפתר", color: "#d4af37" },
};

// מפת challenge לכל contribution (לפיד הפורום) — מפתח = contribution_id
export async function getChallengesByContribs(ids = []) {
  const out = {};
  if (!supabase || !ids.length) return out;
  try {
    const { data } = await supabase.from("research_challenges").select("*").in("contribution_id", ids);
    for (const c of data || []) out[c.contribution_id] = c;
  } catch { /* noop */ }
  return out;
}

// אתגרים שכתב פתח — לדף-החוקר
export async function getChallengesByOpener(uid, name) {
  if (!supabase || (!uid && !name)) return [];
  try {
    let q = supabase.from("research_challenges").select("*").order("bumped_at", { ascending: false });
    q = uid ? q.eq("opened_by_uid", uid) : q.eq("opened_by_name", name);
    const { data } = await q;
    return data || [];
  } catch { return []; }
}

// כמה אתגרים חוקר פתר — «✔️ N אתגרים שנפתרו» (הכרה ציבורית)
export async function getSolvedCount(uid) {
  if (!supabase || !uid) return 0;
  try {
    const { count } = await supabase.from("research_challenges").select("id", { count: "exact", head: true })
      .eq("solved_by_uid", uid).eq("status", "solved");
    return count || 0;
  } catch { return 0; }
}

export async function openChallenge({ contributionId, title = null, domains = [], difficulty = null }) {
  const { data, error } = await supabase.rpc("open_challenge", {
    p_contribution_id: contributionId, p_title: title, p_domains: domains, p_difficulty: difficulty,
  });
  if (error) throw error;
  return data;
}
export async function claimChallenge(id) {
  const { error } = await supabase.rpc("claim_challenge", { p_id: id });
  if (error) throw error;
}
export async function setChallengeProgress(id, progress, note = null) {
  const { error } = await supabase.rpc("challenge_set_progress", { p_id: id, p_progress: progress, p_note: note });
  if (error) throw error;
}
export async function solveChallenge(id, solutionId = null) {
  const { error } = await supabase.rpc("solve_challenge", { p_id: id, p_solution_contribution_id: solutionId });
  if (error) throw error;
}
