import { supabase } from "./supabase.js";

// 🛡️ מודרציית-אדמין — הסתרה/החזרה/מחיקה של חידושים (insights) ותרומות-פורום (research_contributions).
// כל הנתיבים מאומתים-אדמין בצד-שרת (users.role='admin' לפי auth.uid()). action: "hide" | "show" | "delete".
async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  if (data === "denied") throw new Error("אין הרשאת מנהל");
  return data;
}

// חידושים (insights, כולל חידושי-הקהילה): RPC ייעודי — hide=is_active:false · show=true · delete.
export const moderateInsight = (id, action) => rpc("admin_moderate_insight", { p_id: id, p_action: action });

// תרומות-פורום: הסתרה/החזרה דרך moderate_contribution הקיים (status — משתלב גם במסך-האדמין),
// מחיקה דרך admin_delete_contribution הייעודי (מוחק גם שרשור-תגובות מתחת). עץ אחד, בלי כפילות RPC.
export async function moderateContribution(id, action) {
  if (action === "delete") return rpc("admin_delete_contribution", { p_id: id });
  const status = action === "hide" ? "hidden" : "approved";
  const { error } = await supabase.rpc("moderate_contribution", { p_id: id, p_status: status });
  if (error) throw error;
  return status;
}
