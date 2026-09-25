const clean = (value) => value == null ? "" : String(value).trim();

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nonNegative(value) {
  return Math.max(0, finite(value));
}

function bool(value) {
  return value === true;
}

const freezeArray = (items) => Object.freeze(items.map((item) => Object.freeze(item)));

export const PERSON_PROFILE_VIEWERS = Object.freeze({
  PUBLIC: "public",
  SELF: "self",
  ADMIN: "admin",
});

export const PERSON_PROFILE_TAB_ORDER = Object.freeze([
  "overview",
  "messages",
  "activity",
  "hints",
  "media",
  "findings",
  "sources",
  "methods",
  "els",
  "publications",
  "questions",
]);

export const PERSON_PROFILE_TAB_LABELS = Object.freeze({
  overview: "סקירה",
  messages: "הודעות",
  activity: "פעילות",
  hints: "רמזים",
  media: "מדיה",
  findings: "ממצאים",
  sources: "מקורות",
  methods: "שיטות",
  els: "צפנים / ELS",
  publications: "פרסומים",
  questions: "שאלות פתוחות",
});

export const PERSON_PROFILE_ENTRY_LENS = Object.freeze({
  directory: "overview",
  direct: "overview",
  profile: "overview",
  community: "messages",
  chat: "messages",
  message: "messages",
  reaction: "messages",
  mention: "messages",
  heichal: "findings",
  finding: "findings",
  source: "sources",
  method: "methods",
  els: "els",
  post: "publications",
  article: "publications",
  publication: "publications",
  byline: "publications",
  self: "activity",
  personal: "activity",
});

const METRIC_KEYS = Object.freeze([
  "messages",
  "activeDays",
  "reactionsReceived",
  "likesReceived",
  "hints",
  "media",
  "findings",
  "sources",
  "methods",
  "els",
  "publications",
  "openThreads",
  "tenureDays",
]);

function normalizeMetrics(metrics = {}) {
  const out = {};
  for (const key of METRIC_KEYS) out[key] = nonNegative(metrics?.[key]);
  return Object.freeze(out);
}

function normalizeIdentitySummary(identities = []) {
  const rows = Array.isArray(identities) ? identities : [];
  const verified = rows.filter((item) => item?.emailVerified === true).length;
  const siteLinked = rows.filter((item) => item?.siteAccountMatch === true || item?.linkedUser === true).length;
  return Object.freeze({
    identityCount: rows.length,
    verifiedIdentityCount: verified,
    siteLinkedIdentityCount: siteLinked,
  });
}

function safeAdminIdentity(identity = {}) {
  return Object.freeze({
    sourceId: clean(identity?.sourceId || identity?.source_id) || null,
    contributorId: clean(identity?.contributorId || identity?.contributor_id) || null,
    contributorSlug: clean(identity?.contributorSlug || identity?.contributor_slug) || null,
    displayName: clean(identity?.displayName || identity?.display_name) || null,
    source: clean(identity?.source || identity?.contributorSource || identity?.contributor_source) || null,
    emailVerified: identity?.emailVerified === true || identity?.email_verified === true,
    siteAccountMatch: identity?.siteAccountMatch === true || identity?.site_account_match === true,
    firstSeen: identity?.firstSeen || identity?.first_seen || null,
    lastSeen: identity?.lastSeen || identity?.last_seen || null,
    messages: nonNegative(identity?.messages),
    activeDays: nonNegative(identity?.activeDays ?? identity?.active_days),
  });
}

function normalizeCapabilities(capabilities = {}) {
  return Object.freeze({
    researcher: bool(capabilities?.researcher),
    writer: bool(capabilities?.writer),
    author: bool(capabilities?.author),
    contributor: bool(capabilities?.contributor),
    vip: bool(capabilities?.vip),
  });
}

function buildTabs({ metrics, person, capabilities }) {
  const hasActivity = metrics.activeDays > 0 || Boolean(person?.joinedAt || person?.firstSeen || person?.lastSeen);
  const counts = {
    overview: null,
    messages: metrics.messages,
    activity: hasActivity ? metrics.activeDays : 0,
    hints: metrics.hints,
    media: metrics.media,
    findings: metrics.findings,
    sources: metrics.sources,
    methods: metrics.methods,
    els: metrics.els,
    publications: metrics.publications,
    questions: metrics.openThreads,
  };

  const enabled = new Set(["overview"]);
  if (counts.messages > 0) enabled.add("messages");
  if (hasActivity) enabled.add("activity");
  if (counts.hints > 0) enabled.add("hints");
  if (counts.media > 0) enabled.add("media");
  if (counts.findings > 0) enabled.add("findings");
  if (counts.sources > 0) enabled.add("sources");
  if (counts.methods > 0) enabled.add("methods");
  if (counts.els > 0) enabled.add("els");
  if (counts.publications > 0) enabled.add("publications");
  if (counts.questions > 0) enabled.add("questions");

  // Capabilities never manufacture empty tabs. They only describe the same Person.
  void capabilities;

  return freezeArray(PERSON_PROFILE_TAB_ORDER
    .filter((key) => enabled.has(key))
    .map((key) => ({
      key,
      label: PERSON_PROFILE_TAB_LABELS[key],
      count: counts[key],
    })));
}

function resolveLens(tabs, { requestedLens, entryContext } = {}) {
  const available = new Set(tabs.map((tab) => tab.key));
  const requested = clean(requestedLens);
  if (requested && available.has(requested)) return requested;

  const fromContext = PERSON_PROFILE_ENTRY_LENS[clean(entryContext).toLowerCase()] || "overview";
  return available.has(fromContext) ? fromContext : "overview";
}

function safeResearchStanding(input, capabilities) {
  if (!capabilities.researcher || !input) return null;
  const level = clean(input?.level);
  return Object.freeze({
    level: level || null,
    label: clean(input?.label) || level || null,
    summary: clean(input?.summary) || null,
    explain: Array.isArray(input?.explain)
      ? Object.freeze(input.explain.map(clean).filter(Boolean))
      : Object.freeze([]),
    calibrationVersion: clean(input?.calibrationVersion || input?.calibration_version) || null,
  });
}

function safeCommunityImpact(input = {}) {
  return Object.freeze({
    score: input?.score == null ? null : nonNegative(input.score),
    reactionsReceived: nonNegative(input?.reactionsReceived ?? input?.reactions_received),
    uniqueResponders: nonNegative(input?.uniqueResponders ?? input?.unique_responders),
    repliesReceived: nonNegative(input?.repliesReceived ?? input?.replies_received),
    explain: Array.isArray(input?.explain)
      ? Object.freeze(input.explain.map(clean).filter(Boolean))
      : Object.freeze([]),
  });
}

function safePrivateContext(input = {}) {
  return Object.freeze({
    activityItems: Array.isArray(input?.activityItems)
      ? Object.freeze(input.activityItems.map((item) => Object.freeze({
          kind: clean(item?.kind) || null,
          at: item?.at || null,
          ref: clean(item?.ref) || null,
          title: clean(item?.title) || null,
          private: item?.private !== false,
        })))
      : Object.freeze([]),
    savedCount: nonNegative(input?.savedCount),
    followedCount: nonNegative(input?.followedCount),
    openQuestionCount: nonNegative(input?.openQuestionCount),
  });
}

function safeEconomy(input = {}) {
  return Object.freeze({
    credits: nonNegative(input?.credits),
    xp: nonNegative(input?.xp),
    participationLevel: clean(input?.participationLevel || input?.participation_level) || null,
  });
}

function safeReferral(input = {}) {
  return Object.freeze({
    invitedCount: nonNegative(input?.invitedCount ?? input?.invited_count),
    activeInvitees: nonNegative(input?.activeInvitees ?? input?.active_invitees),
    retainedInvitees: nonNegative(input?.retainedInvitees ?? input?.retained_invitees),
  });
}

export function projectPersonProfile2029(payload = {}, {
  viewer = PERSON_PROFILE_VIEWERS.PUBLIC,
  entryContext = "directory",
  requestedLens = null,
} = {}) {
  const safeViewer = Object.values(PERSON_PROFILE_VIEWERS).includes(viewer)
    ? viewer
    : PERSON_PROFILE_VIEWERS.PUBLIC;

  const person = Object.freeze({
    personRef: clean(payload?.person?.personRef || payload?.person?.person_ref) || null,
    displayName: clean(payload?.person?.displayName || payload?.person?.display_name) || "ללא שם",
    username: clean(payload?.person?.username) || null,
    avatarUrl: clean(payload?.person?.avatarUrl || payload?.person?.avatar_url) || null,
    publicLocation: clean(payload?.person?.publicLocation || payload?.person?.public_location) || null,
    joinedAt: payload?.person?.joinedAt || payload?.person?.joined_at || null,
    firstSeen: payload?.person?.firstSeen || payload?.person?.first_seen || null,
    lastSeen: payload?.person?.lastSeen || payload?.person?.last_seen || null,
    activityState: clean(payload?.person?.activityState || payload?.person?.activity_state) || null,
  });

  const metrics = normalizeMetrics(payload?.metrics);
  const capabilities = normalizeCapabilities(payload?.capabilities);
  const tabs = buildTabs({ metrics, person, capabilities });
  const lens = resolveLens(tabs, { requestedLens, entryContext });
  const identitySummary = normalizeIdentitySummary(payload?.identities);

  const profile = {
    version: "person-profile-2029-v1",
    viewer: safeViewer,
    entryContext: clean(entryContext) || "directory",
    lens,
    person,
    capabilities,
    metrics,
    identitySummary,
    tabs,
    communityImpact: safeCommunityImpact(payload?.communityImpact),
    researchStanding: safeResearchStanding(payload?.researchStanding, capabilities),
    whyNow: Array.isArray(payload?.whyNow)
      ? Object.freeze(payload.whyNow.map(clean).filter(Boolean))
      : Object.freeze([]),
  };

  if (safeViewer === PERSON_PROFILE_VIEWERS.SELF) {
    profile.private = safePrivateContext(payload?.privateContext);
    profile.economy = safeEconomy(payload?.economy);
    profile.referrals = safeReferral(payload?.referrals);
  }

  if (safeViewer === PERSON_PROFILE_VIEWERS.ADMIN) {
    profile.economy = safeEconomy(payload?.economy);
    profile.referrals = safeReferral(payload?.referrals);
    if (payload?.admin?.privateActivityAuthorized === true) {
      profile.private = safePrivateContext(payload?.privateContext);
    }
    profile.admin = Object.freeze({
      identities: freezeArray((Array.isArray(payload?.identities) ? payload.identities : []).map(safeAdminIdentity)),
      claimState: clean(payload?.admin?.claimState || payload?.admin?.claim_state) || null,
      reconciliationState: clean(payload?.admin?.reconciliationState || payload?.admin?.reconciliation_state) || null,
      attributionConfidence: clean(payload?.admin?.attributionConfidence || payload?.admin?.attribution_confidence) || null,
    });
  }

  return Object.freeze(profile);
}

export function profileHasLens(profile, lens) {
  const key = clean(lens);
  return Boolean(key && profile?.tabs?.some((tab) => tab.key === key));
}
