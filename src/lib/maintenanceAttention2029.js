// One maintenance view over the existing recommendation engine (system_suggestions_law v7). It reads what the detectors already wrote
// (admin_suggestions_list); it never writes, dismisses or decides. Repeated rows with the same meaning are shown once, with their count and
// their first and latest occurrence; a group that has not recurred for STALE_DAYS is marked as possibly outdated, never closed automatically.

export const STALE_DAYS = 14;

// Operational time of an admin record (when a detector wrote it, when the source was read), Israel time with the hour, as the control
// plane page shows its own operational timestamps. Not a content/record date of the public surfaces (those use relativeTime2029.js).
export function operationalTime(value) {
  const at = Date.parse(value);
  return Number.isFinite(at) ? new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(at) : "—";
}

// The owner of each detector's subject, by the existing owners (Owner Index). Unknown detectors fall back to their category.
const OWNERS = {
  capacity_growth_guard: { owner: "foundation_closure_protocol_law · קיבולת", area: "תשתית" },
  dependency_upgrade_radar: { owner: "system_suggestions_law · תלויות", area: "תשתית" },
  runtime_error_incident: { owner: "system_suggestions_law · תקלות ריצה", area: "שחרור" },
  web_vitals_regression: { owner: "Traffic Intelligence · מרכז המהירות (סשן המהירות)", area: "מהירות" },
  post_document_freshness: { owner: "פרסום · טריות מסמך הפוסט", area: "פוסטים" },
  pending_ratings: { owner: "AI · דירוג תשובות", area: "רזיאל" },
};

// Lower is more urgent. A capacity row carries its level in the title (ALERT / CAPACITY_WARNING / WATCH).
function rank(detector, title) {
  if (detector === "runtime_error_incident") return 1;
  if (detector === "capacity_growth_guard") return /\bALERT\b/.test(title) ? 2 : /WARNING/.test(title) ? 3 : 4;
  if (detector === "web_vitals_regression" || detector === "post_document_freshness") return 2;
  if (detector === "dependency_upgrade_radar") return 4;
  return 5;
}

// Same meaning = same detector and the same title once counts and numbers are set aside ("(5 sessions)" and "(6 sessions)" are one issue).
export function meaningKey(row) {
  const title = String(row?.title ?? "").replace(/\d+(?:[.,]\d+)?/g, "#").replace(/\s+/g, " ").trim();
  return `${row?.detector || row?.category || "unknown"}|${title}`;
}

export function groupSuggestions(rows, now = Date.now()) {
  const groups = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !["pending", "later"].includes(row.status)) continue;
    const key = meaningKey(row), at = Date.parse(row.created_at);
    const group = groups.get(key) || { key, detector: row.detector || null, category: row.category || null, rows: [], newest: null, oldest: null, latest: null };
    group.rows.push(row);
    if (Number.isFinite(at)) {
      if (!group.newest || at > Date.parse(group.newest)) { group.newest = row.created_at; group.latest = row; }
      if (!group.oldest || at < Date.parse(group.oldest)) group.oldest = row.created_at;
    }
    groups.set(key, group);
  }
  return [...groups.values()].map(group => {
    const latest = group.latest || group.rows[0];
    const meta = OWNERS[group.detector] || { owner: group.category || "לא שויך", area: group.category || "לא שויך" };
    const ageDays = group.newest ? (now - Date.parse(group.newest)) / 86400000 : null;
    return { ...group, title: latest?.title || "", reason: latest?.reason || "", impact: latest?.estimated_impact || "",
      count: group.rows.length, owner: meta.owner, area: meta.area, rank: rank(group.detector, latest?.title || ""),
      possiblyStale: ageDays !== null && ageDays > STALE_DAYS, ageDays };
  }).sort((a, b) => Number(a.possiblyStale) - Number(b.possiblyStale) || a.rank - b.rank || Date.parse(b.newest || 0) - Date.parse(a.newest || 0));
}

export function maintenanceSummary(groups) {
  const list = Array.isArray(groups) ? groups : [];
  return { groups: list.length, rows: list.reduce((total, group) => total + group.count, 0),
    recurring: list.filter(group => group.count > 1).length, possiblyStale: list.filter(group => group.possiblyStale).length,
    byArea: Object.entries(list.reduce((acc, group) => ({ ...acc, [group.area]: (acc[group.area] || 0) + group.count }), {})).sort((a, b) => b[1] - a[1]) };
}
