const clean = (value) => value == null ? "" : String(value).trim();

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nonNegative(value) {
  return Math.max(0, finite(value));
}

// Unknown is not zero: a missing or non-numeric value stays null; a known number is clamped at zero.
function metric(value) {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

function timestamp(value) {
  const t = value ? Date.parse(value) : NaN;
  return Number.isFinite(t) ? t : 0;
}

function timestampOrNull(value) {
  const t = value ? Date.parse(value) : NaN;
  return Number.isFinite(t) ? t : null;
}

export const PEOPLE_DIRECTORY_ACTIVITY_STATES = Object.freeze({
  ONLINE: "ONLINE",
  ACTIVE: "ACTIVE",
  RECENT: "RECENT",
  DORMANT: "DORMANT",
  HISTORICAL: "HISTORICAL",
});

export const PEOPLE_DIRECTORY_ACTIVITY_LABELS = Object.freeze({
  ONLINE: "מחובר עכשיו",
  ACTIVE: "פעיל",
  RECENT: "פעיל לאחרונה",
  DORMANT: "רדום",
  HISTORICAL: "היסטורי",
});

export const PEOPLE_DIRECTORY_FILTERS = Object.freeze([
  Object.freeze({ key: "all", label: "כל האנשים" }),
  Object.freeze({ key: "online", label: "מחוברים" }),
  Object.freeze({ key: "active", label: "פעילים" }),
  Object.freeze({ key: "new", label: "חדשים" }),
  Object.freeze({ key: "returning", label: "חוזרים" }),
  Object.freeze({ key: "hints", label: "תורמי רמזים" }),
  Object.freeze({ key: "researchers", label: "חוקרים" }),
  Object.freeze({ key: "writers", label: "כותבים" }),
  Object.freeze({ key: "dormant", label: "רדומים" }),
  Object.freeze({ key: "historical", label: "היסטוריים" }),
]);

export const PEOPLE_DIRECTORY_SORTS = Object.freeze([
  Object.freeze({ key: "recent", label: "פעילות אחרונה" }),
  Object.freeze({ key: "momentum", label: "תנופה" }),
  Object.freeze({ key: "tenure", label: "וותק" }),
  Object.freeze({ key: "messages", label: "הודעות" }),
  Object.freeze({ key: "communityImpact", label: "השפעה קהילתית" }),
  Object.freeze({ key: "hints", label: "רמזים" }),
  Object.freeze({ key: "findings", label: "ממצאים" }),
  Object.freeze({ key: "publications", label: "פרסומים" }),
  Object.freeze({ key: "researchStanding", label: "רמת חוקר" }),
]);

function normalizeActivityState(value) {
  const state = clean(value).toUpperCase();
  return Object.prototype.hasOwnProperty.call(PEOPLE_DIRECTORY_ACTIVITY_STATES, state)
    ? state
    : null;
}

function normalizeCapabilities(input = {}) {
  return Object.freeze({
    contributor: input?.contributor === true,
    researcher: input?.researcher === true,
    writer: input?.writer === true,
    author: input?.author === true,
    vip: input?.vip === true,
  });
}

function normalizeMetrics(input = {}) {
  return Object.freeze({
    messages: metric(input?.messages),
    activeDays: metric(input?.activeDays ?? input?.active_days),
    momentum: metric(input?.momentum),
    tenureDays: metric(input?.tenureDays ?? input?.tenure_days),
    reactionsReceived: metric(input?.reactionsReceived ?? input?.reactions_received),
    likesReceived: metric(input?.likesReceived ?? input?.likes_received),
    hints: metric(input?.hints),
    findings: metric(input?.findings),
    publications: metric(input?.publications),
  });
}

function normalizeCommunityImpact(input = {}, metrics) {
  return Object.freeze({
    score: metric(input?.score),
    reactionsReceived: metric(input?.reactionsReceived ?? input?.reactions_received ?? metrics.reactionsReceived),
    uniqueResponders: metric(input?.uniqueResponders ?? input?.unique_responders),
  });
}

function parseResearchLevel(level) {
  const match = clean(level).toUpperCase().match(/^R(\d+)$/);
  return match ? nonNegative(match[1]) : null;
}

function normalizeResearchStanding(input, capabilities) {
  if (!capabilities.researcher || !input) return null;
  const level = clean(input?.level);
  return Object.freeze({
    level: level || null,
    label: clean(input?.label) || level || null,
    orderValue: input?.orderValue == null
      ? parseResearchLevel(level)
      : metric(input.orderValue),
  });
}

function primaryCapability(capabilities) {
  if (capabilities.researcher) return "researcher";
  if (capabilities.writer || capabilities.author) return "writer";
  if (capabilities.contributor) return "contributor";
  return "community";
}

export function normalizePeopleDirectoryPerson(row = {}) {
  const capabilities = normalizeCapabilities(row?.capabilities);
  const metrics = normalizeMetrics(row?.metrics);
  const activityState = normalizeActivityState(row?.person?.activityState ?? row?.person?.activity_state);

  return Object.freeze({
    personRef: clean(row?.person?.personRef ?? row?.person?.person_ref) || null,
    displayName: clean(row?.person?.displayName ?? row?.person?.display_name) || "ללא שם",
    username: clean(row?.person?.username) || null,
    avatarUrl: clean(row?.person?.avatarUrl ?? row?.person?.avatar_url) || null,
    activityState,
    activityLabel: activityState ? PEOPLE_DIRECTORY_ACTIVITY_LABELS[activityState] : null,
    isNew: row?.person?.isNew === true || row?.person?.is_new === true,
    isReturning: row?.person?.isReturning === true || row?.person?.is_returning === true,
    joinedAt: row?.person?.joinedAt ?? row?.person?.joined_at ?? null,
    firstSeen: row?.person?.firstSeen ?? row?.person?.first_seen ?? null,
    lastSeen: row?.person?.lastSeen ?? row?.person?.last_seen ?? null,
    identityCount: nonNegative(row?.identityCount ?? row?.identity_count),
    capabilities,
    primaryCapability: primaryCapability(capabilities),
    metrics,
    communityImpact: normalizeCommunityImpact(row?.communityImpact, metrics),
    researchStanding: normalizeResearchStanding(row?.researchStanding, capabilities),
    whyNow: Array.isArray(row?.whyNow)
      ? Object.freeze(row.whyNow.map(clean).filter(Boolean))
      : Object.freeze([]),
  });
}

function dedupeByPersonRef(rows) {
  const byKey = new Map();
  const duplicatePersonRefs = new Set();
  let missingPersonRefs = 0;

  rows.forEach((row, index) => {
    const key = row.personRef || `__missing__:${index}`;
    if (!row.personRef) missingPersonRefs += 1;
    if (!byKey.has(key)) {
      byKey.set(key, row);
      return;
    }

    duplicatePersonRefs.add(key);
    const current = byKey.get(key);
    const currentScore = [current.identityCount, timestamp(current.lastSeen)];
    const nextScore = [row.identityCount, timestamp(row.lastSeen)];
    if (nextScore[0] > currentScore[0] || (nextScore[0] === currentScore[0] && nextScore[1] > currentScore[1])) {
      byKey.set(key, row);
    }
  });

  return Object.freeze({
    rows: Object.freeze([...byKey.values()]),
    diagnostics: Object.freeze({
      duplicatePersonRefs: Object.freeze([...duplicatePersonRefs].filter((key) => !key.startsWith("__missing__:"))),
      missingPersonRefs,
    }),
  });
}

function filterMatch(row, filter) {
  switch (filter) {
    case "online": return row.activityState === "ONLINE";
    case "active": return row.activityState === "ONLINE" || row.activityState === "ACTIVE";
    case "new": return row.isNew;
    case "returning": return row.isReturning;
    case "hints": return row.metrics.hints != null && row.metrics.hints > 0;
    case "researchers": return row.capabilities.researcher;
    case "writers": return row.capabilities.writer || row.capabilities.author;
    case "dormant": return row.activityState === "DORMANT";
    case "historical": return row.activityState === "HISTORICAL";
    case "all":
    default:
      return true;
  }
}

function queryMatch(row, query) {
  const q = clean(query).toLocaleLowerCase("he");
  if (!q) return true;
  return [
    row.displayName,
    row.username,
    row.activityLabel,
    row.primaryCapability,
    row.researchStanding?.label,
  ].filter(Boolean).join(" ").toLocaleLowerCase("he").includes(q);
}

// A sort value of null means "not measured". Known values always rank above unknown ones,
// including a known zero; unknown values keep the explicit recent/name tie-breakers.
function sortValue(row, sort) {
  switch (sort) {
    case "momentum": return row.metrics.momentum;
    case "tenure": return row.metrics.tenureDays;
    case "messages": return row.metrics.messages;
    case "communityImpact": return row.communityImpact.score ?? row.communityImpact.reactionsReceived ?? null;
    case "hints": return row.metrics.hints;
    case "findings": return row.metrics.findings;
    case "publications": return row.metrics.publications;
    case "researchStanding": return row.researchStanding?.orderValue ?? null;
    case "recent":
    default:
      return timestampOrNull(row.lastSeen);
  }
}

function compareDirectoryRows(a, b, sort) {
  const av = sortValue(a, sort);
  const bv = sortValue(b, sort);
  if (av == null && bv != null) return 1;
  if (av != null && bv == null) return -1;
  const diff = av == null ? 0 : bv - av;
  if (diff !== 0) return diff;
  const recentDiff = timestamp(b.lastSeen) - timestamp(a.lastSeen);
  if (recentDiff !== 0) return recentDiff;
  return a.displayName.localeCompare(b.displayName, "he");
}

function cardMetricKeys(sort) {
  switch (sort) {
    case "tenure": return ["tenureDays", "activeDays"];
    case "messages": return ["messages", "activeDays"];
    case "communityImpact": return ["communityImpact", "messages"];
    case "hints": return ["hints", "messages"];
    case "findings": return ["findings", "hints"];
    case "publications": return ["publications", "messages"];
    case "researchStanding": return ["researchStanding", "findings"];
    case "momentum": return ["momentum", "activeDays"];
    case "recent":
    default:
      return ["lastSeen", "activeDays"];
  }
}

function toCard(row, sort) {
  return Object.freeze({
    personRef: row.personRef,
    displayName: row.displayName,
    username: row.username,
    avatarUrl: row.avatarUrl,
    activityState: row.activityState,
    activityLabel: row.activityLabel,
    primaryCapability: row.primaryCapability,
    identityCount: row.identityCount,
    metrics: row.metrics,
    communityImpact: row.communityImpact,
    researchStanding: row.researchStanding,
    metricKeys: Object.freeze(cardMetricKeys(sort)),
    unknownMetrics: Object.freeze(Object.keys(row.metrics).filter((key) => row.metrics[key] === null)),
    whyNow: row.whyNow,
  });
}

export function projectPeopleDirectory2029(inputRows = [], {
  filter = "all",
  sort = "recent",
  query = "",
} = {}) {
  const safeFilter = PEOPLE_DIRECTORY_FILTERS.some((item) => item.key === filter) ? filter : "all";
  const safeSort = PEOPLE_DIRECTORY_SORTS.some((item) => item.key === sort) ? sort : "recent";

  const normalized = (Array.isArray(inputRows) ? inputRows : []).map(normalizePeopleDirectoryPerson);
  const deduped = dedupeByPersonRef(normalized);

  const visible = deduped.rows
    .filter((row) => filterMatch(row, safeFilter) && queryMatch(row, query))
    .sort((a, b) => compareDirectoryRows(a, b, safeSort));

  const known = visible.filter((row) => sortValue(row, safeSort) != null).length;

  return Object.freeze({
    version: "people-directory-2029-v1",
    filter: safeFilter,
    sort: safeSort,
    query: clean(query),
    totalPeople: deduped.rows.length,
    visiblePeople: visible.length,
    // Why the list is empty, or how many visible people have no value for the chosen sort.
    emptyReason: visible.length ? null : deduped.rows.length ? "no_match" : "no_people",
    sortCoverage: Object.freeze({ sort: safeSort, known, unknown: visible.length - known }),
    rows: Object.freeze(visible.map((row) => toCard(row, safeSort))),
    diagnostics: deduped.diagnostics,
  });
}
