import { supabase } from "../supabase.js";

// Existing admin RPCs only. Unlike legacy convenience wrappers, failures propagate.
async function read(name, args) {
  if (!supabase) throw new Error("חיבור המערכת אינו זמין");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  if (data == null) throw new Error("המקור לא החזיר נתונים");
  return data;
}
export async function getPendingAdminSuggestions() {
  const data = await read("admin_suggestions_list", { p_status: "pending", p_limit: 80 });
  if (!Array.isArray(data)) throw new Error("המקור לא החזיר רשימת הצעות תקינה");
  return data;
}
export async function getAdminAttentionFeed() {
  const data = await read("admin_attention_feed_v1", { p_include_handled: false, p_limit: 100 });
  if (!Array.isArray(data)) throw new Error("המקור לא החזיר תור קשב תקין");
  return data;
}
export async function getAdminRetentionPreview() {
  const data = await read("admin_retention_preview");
  if (!data || !Array.isArray(data.tables)) throw new Error("המקור לא החזיר תצוגת ניקוי תקינה");
  return data;
}
export async function getAdminNotificationChannels() {
  const data = await read("admin_notify_get");
  if (!Array.isArray(data)) throw new Error("המקור לא החזיר רשימת ערוצים תקינה");
  // The new view does not need recipient addresses or secret/configuration values.
  return data.slice(0, 20).map(r => ({ channel: r.channel, enabled: typeof r.enabled === "boolean" ? r.enabled : null }));
}
