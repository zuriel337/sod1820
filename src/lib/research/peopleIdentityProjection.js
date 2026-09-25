const clean = (value) => value == null ? "" : String(value).trim();

export const PEOPLE_IDENTITY_FILTERS = Object.freeze([
  Object.freeze({ key: "all", label: "הכול" }),
  Object.freeze({ key: "site", label: "מחוברי אתר" }),
  Object.freeze({ key: "verified", label: "עוגנים מאומתים" }),
  Object.freeze({ key: "collision", label: "כפילויות / התחזות" }),
  Object.freeze({ key: "unclaimed", label: "לא נתבעו" }),
  Object.freeze({ key: "review", label: "דורש בדיקה" }),
]);

export const IDENTITY_STATE_LABELS = Object.freeze({
  SITE_ACCOUNT_ANCHOR: "מחובר לחשבון אתר",
  SITE_ACCOUNT_EMAIL_MATCH_REVIEW_NAME: "חשבון אתר · שם לבדיקה",
  VERIFIED_UNIQUE_ANCHOR: "עוגן מאומת",
  VERIFIED_PRIMARY_WITH_COLLISION_TAIL: "עוגן מאומת · זנב כפילויות",
  LONG_LIVED_UNVERIFIED: "ותיק · לא מאומת",
  HIGH_BLOCK_NOISE: "רעש / חסימות",
  ONE_DAY_THIN: "זהות דקה",
  REVIEW: "דורש בדיקה",
});

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizePeopleIdentityRow(row) {
  const state = clean(row?.identity_state) || "REVIEW";
  return Object.freeze({
    sourceId: clean(row?.source_id) || null,
    contributorId: clean(row?.contributor_id) || null,
    contributorSlug: clean(row?.contributor_slug) || null,
    displayName: clean(row?.display_name) || "ללא שם",
    identityState: state,
    identityLabel: IDENTITY_STATE_LABELS[state] || state,
    emailVerified: row?.email_verified === true,
    siteAccountMatch: row?.site_account_match === true,
    siteDisplayName: clean(row?.site_display_name) || null,
    siteUsername: clean(row?.site_username) || null,
    messages: finite(row?.messages),
    activeDays: finite(row?.active_days),
    firstSeen: row?.first_seen || null,
    lastSeen: row?.last_seen || null,
    blockedRatio: Math.max(0, Math.min(1, finite(row?.blocked_ratio))),
    historicalSameNameIds: finite(row?.historical_same_name_ids),
    verifiedSameNameIds: finite(row?.verified_same_name_ids),
    linkedUser: row?.linked_user === true,
    contributorKind: clean(row?.contributor_kind) || null,
    contributorRole: clean(row?.contributor_role) || null,
    contributorSource: clean(row?.contributor_source) || null,
  });
}

export function peopleIdentityFilterKey(row) {
  if (row.siteAccountMatch) return "site";
  if (row.identityState === "VERIFIED_PRIMARY_WITH_COLLISION_TAIL") return "collision";
  if (row.identityState === "VERIFIED_UNIQUE_ANCHOR") return "verified";
  if (row.identityState === "LONG_LIVED_UNVERIFIED") return "unclaimed";
  return "review";
}

export function filterPeopleIdentityRows(rows, { query = "", filter = "all" } = {}) {
  const q = clean(query).toLocaleLowerCase("he");
  return (rows || []).filter((row) => {
    if (filter && filter !== "all" && peopleIdentityFilterKey(row) !== filter) return false;
    if (!q) return true;
    return [
      row.displayName,
      row.siteDisplayName,
      row.siteUsername,
      row.identityLabel,
      row.contributorRole,
      row.contributorKind,
    ].filter(Boolean).join(" ").toLocaleLowerCase("he").includes(q);
  });
}

export function peopleIdentityCounts(rows) {
  const counts = { all: rows?.length || 0, site: 0, verified: 0, collision: 0, unclaimed: 0, review: 0 };
  for (const row of rows || []) {
    const key = peopleIdentityFilterKey(row);
    if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1;
  }
  return Object.freeze(counts);
}

export async function fetchPeopleIdentityReview({ scope = "recent", limit = 250 } = {}) {
  const { supabase } = await import("../supabase.js");
  const safeScope = ["recent", "verified", "all"].includes(scope) ? scope : "recent";
  const safeLimit = Math.max(1, Math.min(finite(limit, 250), 500));
  const { data, error } = await supabase.rpc("admin_people_identity_review_v1", {
    p_scope: safeScope,
    p_limit: safeLimit,
  });
  if (error) throw error;

  const rawRows = Array.isArray(data?.rows) ? data.rows : [];
  const rows = rawRows.map(normalizePeopleIdentityRow);
  return Object.freeze({
    generatedAt: data?.generated_at || null,
    scope: clean(data?.scope) || safeScope,
    summary: Object.freeze(data?.summary || {}),
    rows: Object.freeze(rows),
    counts: peopleIdentityCounts(rows),
  });
}
