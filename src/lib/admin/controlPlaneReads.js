import { supabase } from "../supabase.js";
import { RELEASE_CONTRACT } from "./releaseProjection.js";

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

export async function getCurrentAdminWorkLog() {
  if (!supabase) throw new Error("חיבור המערכת אינו זמין");
  const { data, error } = await supabase.rpc("get_work_log_current").select("id,topic,status,created_at").order("created_at", { ascending: false }).limit(8);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("המקור לא החזיר יומן עבודה תקין");
  return data;
}
async function readRelease(mode) {
  const { data, error } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (error || !token) throw new Error("נדרשת כניסת מנהל תקפה");
  const response = await fetch(`/api/admin-release-status?mode=${mode}`, { method: "GET", cache: "no-store",
    signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`מקור הגרסאות אינו זמין (${response.status})`);
  const result = await response.json();
  if (result.contract !== RELEASE_CONTRACT || !result.identity) throw new Error("מקור הגרסאות לא החזיר מבנה מוכר");
  return result;
}
export const getAdminReleaseStatus = () => readRelease("status");
export const getAdminBuildIdentity = () => readRelease("identity");
