export const CONTROL_VIEWS = [
  { id: "attention", label: "דורש החלטה" },
  { id: "monitor", label: "ניטור ומקורות" },
  { id: "media", label: "העלאות ועיבוד" },
  { id: "cleanup", label: "ניקוי — לפני ואחרי" },
  { id: "simulation", label: "סימולציה ומשאבים" },
  { id: "budget", label: "תקציב והתראות" },
  { id: "release", label: "גרסאות ועדכונים" },
];
export const SOURCE_NAMES = {
  health: "admin_system_health", traces: "admin_op_trace_list_v1",
  videoMap: "admin_video_map_health", command: "admin_command_center",
  suggestions: "admin_suggestions_list", retention: "admin_retention_preview",
  attention: "admin_attention_feed_v1",
  notify: "admin_notify_get", trace: "admin_op_trace_v1",
  release: "מקורות גרסה מורשים · /api/admin-release-status",
  build: "זהות הפריסה הנוכחית · /api/admin-release-status?mode=identity",
  worklog: "get_work_log_current",
};
export const emptySource = () => ({ status: "idle", data: null, readAt: null, error: null });
export const numeric = value => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
export const iso = value => typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
export const rows = value => Array.isArray(value) ? value : [];
export const resolveControlView = value => CONTROL_VIEWS.some(v => v.id === value) ? value : "attention";

// Each source settles independently: a failed RPC never turns other panels into zeros.
export async function readAdminSource(reader, now = () => new Date().toISOString()) {
  try {
    const data = await reader();
    if (data == null) throw new Error("המקור לא החזיר נתונים");
    return { status: "ready", data, readAt: now(), error: null };
  } catch (error) {
    return { status: "error", data: null, readAt: null, error: String(error?.message || error) };
  }
}

export function sourceFreshness(source, now = Date.now(), staleMinutes = 60) {
  const measuredAt = iso(source?.data?.generated_at);
  const readAt = iso(source?.readAt);
  const at = measuredAt || readAt;
  const ageMinutes = at ? Math.max(0, (now - Date.parse(at)) / 60000) : null;
  return {
    measuredAt, readAt, ageMinutes,
    state: source?.status === "error" ? "error" : source?.status === "loading" ? "loading" :
      source?.status !== "ready" || !at ? "unknown" : ageMinutes > staleMinutes ? "stale" : "fresh",
  };
}

function evidenceText(value, depth = 0) {
  if (depth > 2 || value == null) return null;
  if (typeof value === "string") return value.slice(0, 350);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.slice(0, 8).map(v => evidenceText(v, depth + 1)).filter(Boolean).join(" · ");
  if (typeof value !== "object") return null;
  return Object.entries(value).filter(([key]) => !/token|secret|password|authorization|email|phone|recipient|chat_id/i.test(key))
    .slice(0, 10).map(([k, v]) => { const text = evidenceText(v, depth + 1); return text ? `${k}: ${text}` : null; }).filter(Boolean).join(" · ");
}
export function attentionItems({ suggestions, command, health, attention }, now = Date.now()) {
  const items = [];
  const seen = new Set();
  for (const f of rows(attention).slice(0, 100)) {
    if (!f || !f.attention_key || f.handled === true || seen.has(f.attention_key)) continue;
    seen.add(f.attention_key);
    const createdAt = iso(f.created_at);
    const tab = ({ contact: "messages", community_hint: "hintreports", comment: "contribmod", research_contribution: "contribmod" })[f.source_type] || "warroom";
    items.push({ id: `attention:${f.attention_key}`, source: "attention", owner: f.source_group || "תור קשב קיים",
      category: ["contact", "direct_message", "whatsapp"].includes(f.source_type) ? "communication" : "research",
      title: String(f.title || "פריט קשב"), reason: evidenceText(f.body) || "המקור לא סיפק תוכן לתצוגה",
      evidence: `מפתח: ${f.attention_key} · ${f.context_label || f.source_type || "מקור לא ידוע"} · ${f.status || "סטטוס לא נמסר"}`,
      estimate: null, createdAt, ageDays: createdAt ? Math.max(0, (now - Date.parse(createdAt)) / 86400000) : null,
      severity: "normal", href: `/admin?tab=${tab}`, action: "בדוק בתור הקיים" });
  }
  for (const s of rows(suggestions).slice(0, 80)) {
    if (!s || s.id == null || (s.status && !["pending", "later"].includes(s.status))) continue;
    const createdAt = iso(s.created_at);
    items.push({ id: `suggestion:${s.id}`, source: "suggestions", owner: "המלצות המערכת", category: s.category || "system",
      title: String(s.title || "הצעה ממתינה"), reason: String(s.reason || "המקור לא סיפק הסבר"),
      evidence: evidenceText(s.observed), estimate: evidenceText(s.estimated_impact), createdAt,
      ageDays: createdAt ? Math.max(0, (now - Date.parse(createdAt)) / 86400000) : null,
      severity: ["critical", "high"].includes(s.severity) ? "high" : "normal", href: "/admin?tab=suggest", action: "פתח מסך החלטה" });
  }
  for (const r of rows(command?.recommendations).slice(0, 20)) {
    if (!r || r.id == null) continue;
    items.push({ id: `recommendation:${r.id}`, source: "command", owner: "המלצות מחקר", category: "research",
      title: `${r.type || "המלצת מחקר"} · ${r.target_entity || r.target_node || r.id}`,
      reason: String(r.reason || "המקור לא סיפק הסבר"), evidence: evidenceText(r.evidence), estimate: null,
      createdAt: iso(r.created_at), ageDays: iso(r.created_at) ? Math.max(0, (now - Date.parse(r.created_at)) / 86400000) : null,
      severity: "normal", href: "/admin?tab=warroom", action: "פתח מפקדה והחלטה" });
  }
  const counters = [
    ["zuriel_definitions", "הגדרות שלך ממתינות", "anchors", "research"],
    ["hints_pending", "דיווחי רמזים ממתינים", "hintreports", "research"],
    ["journey_drafts", "טיוטות מסע ממתינות", "jexp", "research"],
    ["worklog_ready_deploy", "עבודות ממתינות לפריסה", "worklog", "system"],
  ];
  for (const [key, title, tab, category] of counters) {
    const count = numeric(command?.counters?.[key]);
    if (count > 0) items.push({ id: `counter:${key}`, source: "command", owner: "מפקדה", category,
      title, reason: `${count.toLocaleString("he-IL")} פריטים במקור הקיים`, count, severity: "normal",
      href: `/admin?tab=${tab}`, action: "פתח תור קיים", ageDays: null, createdAt: null });
  }
  const failures = numeric(health?.bots?.outbox_failed);
  if (failures > 0) items.push({ id: "health:outbox", source: "health", owner: "תפעול ותקשורת", category: "system",
    title: "שליחות שנכשלו", reason: `${failures.toLocaleString("he-IL")} רשומות כשל בתור השליחות`,
    severity: "high", href: "/2029/control?view=monitor", action: "פתח ניטור", ageDays: null, createdAt: null });
  for (const c of rows(health?.cron).filter(c => numeric(c?.failures_24h) > 0).slice(0, 20)) {
    items.push({ id: `cron:${c.job_name}`, source: "health", owner: "מתזמן קיים", category: "system",
      title: `כשלים: ${c.job_name}`, reason: `${c.failures_24h} כשלים ב־24 שעות`,
      severity: "high", href: "/2029/control?view=media", action: "פתח ביצועים", ageDays: null, createdAt: iso(c.last_run_at) });
  }
  return items.sort((a, b) => (b.severity === "high") - (a.severity === "high") || (b.ageDays ?? -1) - (a.ageDays ?? -1));
}

export function retentionRows(data) {
  const count = value => { const n = numeric(value); return n != null && Number.isSafeInteger(n) ? n : null; };
  return rows(data?.tables).slice(0, 150).map((r, index) => {
    const total = count(r.total_rows), protectedRows = count(r.protected_rows), candidates = count(r.purge_candidates), dependencies = count(r.unknown_dependency_rows);
    const eligible = r.auto_purge_allowed === true && dependencies === 0 && total != null && protectedRows != null && candidates != null && candidates > 0 && candidates <= total - protectedRows;
    return { key: `${r.table_name}:${index}`, name: String(r.table_name || "מקור לא מזוהה"), total, protectedRows, candidates, dependencies,
      eligible, retentionClass: String(r.retention_class || "UNKNOWN"), reason: String(r.reason || "אין פירוט מהמקור"),
      oldestAt: iso(r.oldest_at), newestAt: iso(r.newest_at) };
  });
}
