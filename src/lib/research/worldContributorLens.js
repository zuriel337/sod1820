const clean = (value) => value == null ? "" : String(value).trim();

export const WORLD_APPROVED_CONTRIBUTOR_SLUGS = Object.freeze([
  "tzvi-opoc",
  "shimon-haimov",
  "yaniv-levi",
  "shachar-kandro",
]);

function contributorAliases(row) {
  return [...new Set([
    clean(row?.display_name),
    ...(Array.isArray(row?.wa_names) ? row.wa_names.map(clean) : []),
  ].filter(Boolean))];
}

function numericValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function contributionTouchesWorldAnchor(row, { type = null, label = null, topicSlugs = [] } = {}) {
  const anchorType = clean(type);
  const anchorLabel = clean(label);
  if (!anchorType || !anchorLabel) return false;

  if (clean(row?.target_type) === anchorType && clean(row?.target_id) === anchorLabel) return true;

  if (anchorType === "number" && /^\d+$/.test(anchorLabel)) {
    const anchorValue = Number(anchorLabel);
    if (numericValue(row?.target_id) === anchorValue && clean(row?.target_type) === "number") return true;
    if (numericValue(row?.gematria_claim?.value) === anchorValue) return true;
  }

  const slug = clean(row?.convergence_slug);
  if (slug && topicSlugs.includes(slug)) return true;
  return false;
}

export function convergenceTouchesWorldAnchor(item, { type = null, label = null } = {}) {
  const anchorType = clean(type);
  const anchorLabel = clean(label);
  if (!anchorType || !anchorLabel) return false;
  if (anchorType === "number" && /^\d+$/.test(anchorLabel)) {
    return numericValue(item?.value) === Number(anchorLabel);
  }
  const phrases = [
    ...(Array.isArray(item?.author_phrases) ? item.author_phrases : []),
    ...(Array.isArray(item?.phrases) ? item.phrases : []),
  ].map(clean);
  return phrases.includes(anchorLabel);
}

function rowContributorSlug(row, contributorById, contributorByName) {
  const id = clean(row?.meta?.contributor_id);
  if (id && contributorById.has(id)) return contributorById.get(id).slug;
  const name = clean(row?.contributor);
  if (name && contributorByName.has(name)) return contributorByName.get(name).slug;
  return null;
}

export function buildWorldContributorLens({
  contributors = [],
  contributions = [],
  authorConvergences = [],
  researchRows = [],
  topicRows = [],
  anchor = {},
} = {}) {
  const allowed = new Set(WORLD_APPROVED_CONTRIBUTOR_SLUGS);
  const approved = (contributors || []).filter((row) => allowed.has(clean(row?.slug)));
  const contributorById = new Map(approved.map((row) => [String(row.id), row]));
  const contributorByName = new Map(approved.map((row) => [clean(row.display_name), row]));
  const aliasToSlug = new Map();
  for (const row of approved) {
    for (const alias of contributorAliases(row)) aliasToSlug.set(alias, row.slug);
  }

  const topicSlugsAroundAnchor = (topicRows || []).map((row) => clean(row?.slug)).filter(Boolean);
  const contributionsBySlug = Object.fromEntries(approved.map((row) => [row.slug, []]));
  const relevantContributionsBySlug = Object.fromEntries(approved.map((row) => [row.slug, []]));
  const topicSlugsBySlug = Object.fromEntries(approved.map((row) => [row.slug, new Set()]));
  for (const row of contributions || []) {
    const contributor = contributorById.get(String(row?.author_contributor_id || ""));
    if (!contributor) continue;
    contributionsBySlug[contributor.slug].push(row);
    const convergenceSlug = clean(row?.convergence_slug);
    if (convergenceSlug) topicSlugsBySlug[contributor.slug].add(convergenceSlug);
    if (contributionTouchesWorldAnchor(row, { ...anchor, topicSlugs: topicSlugsAroundAnchor })) {
      relevantContributionsBySlug[contributor.slug].push(row);
    }
  }

  const researchObjectIdsBySlug = Object.fromEntries(approved.map((row) => [row.slug, new Set()]));
  for (const row of researchRows || []) {
    const slug = rowContributorSlug(row, contributorById, contributorByName);
    if (slug && row?.id) researchObjectIdsBySlug[slug].add(String(row.id));
  }

  const convergencesBySlug = Object.fromEntries(approved.map((row) => [row.slug, []]));
  for (const item of authorConvergences || []) {
    const author = clean(item?.author);
    const slug = aliasToSlug.get(author) || null;
    if (!slug) continue;
    if (convergenceTouchesWorldAnchor(item, anchor)) convergencesBySlug[slug].push(item);
  }

  const contributorRows = approved
    .map((row) => ({
      id: String(row.id),
      slug: row.slug,
      displayName: row.display_name,
      role: row.role || null,
      kind: row.kind || null,
      aliases: contributorAliases(row),
      counts: {
        research: researchObjectIdsBySlug[row.slug].size,
        contributions: relevantContributionsBySlug[row.slug].length,
        topicConvergences: [...topicSlugsBySlug[row.slug]].filter((slug) => topicSlugsAroundAnchor.includes(slug)).length,
        convergenceRows: convergencesBySlug[row.slug].length,
      },
    }))
    .sort((a, b) => WORLD_APPROVED_CONTRIBUTOR_SLUGS.indexOf(a.slug) - WORLD_APPROVED_CONTRIBUTOR_SLUGS.indexOf(b.slug));

  return {
    contributors: contributorRows,
    bySlug: Object.fromEntries(contributorRows.map((row) => [row.slug, {
      ...row,
      researchObjectIds: [...researchObjectIdsBySlug[row.slug]],
      relevantContributions: relevantContributionsBySlug[row.slug],
      topicSlugs: [...topicSlugsBySlug[row.slug]],
      convergences: convergencesBySlug[row.slug],
    }])),
    approvedSlugs: [...WORLD_APPROVED_CONTRIBUTOR_SLUGS],
    note: "World contributor lens is presentation/provenance only. It never attributes canonical engine rows to a person and never guesses missing authorship.",
  };
}


export function buildWorldLandingContributorProjection({
  contributors = [],
  publicContributions = [],
} = {}) {
  const allowed = new Set(WORLD_APPROVED_CONTRIBUTOR_SLUGS);
  const approved = (contributors || [])
    .filter((row) => allowed.has(clean(row?.slug)))
    .sort((a, b) => WORLD_APPROVED_CONTRIBUTOR_SLUGS.indexOf(a.slug) - WORLD_APPROVED_CONTRIBUTOR_SLUGS.indexOf(b.slug));
  const contributorById = new Map(approved.map((row) => [String(row.id), row]));
  const meetingsBySlug = Object.fromEntries(approved.map((row) => [row.slug, []]));
  const seen = new Set();

  for (const row of publicContributions || []) {
    const contributor = contributorById.get(String(row?.author_contributor_id || ""));
    const meetingSlug = clean(row?.convergence_slug);
    if (!contributor || !meetingSlug) continue;
    const key = `${contributor.slug}:${meetingSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const value = numericValue(row?.gematria_claim?.value ?? row?.target_id);
    meetingsBySlug[contributor.slug].push({
      id: key,
      kind: "topic",
      slug: meetingSlug,
      value,
      title: clean(row?.title) || clean(row?.gematria_claim?.claim) || (value != null ? `מפגש סביב ${value}` : "מפגש"),
      summary: clean(row?.gematria_claim?.claim) || null,
      method: clean(row?.gematria_claim?.method) || null,
      authorSlug: contributor.slug,
      authorName: contributor.display_name,
      source: "research_contributions:approved",
    });
  }

  const people = approved.map((row) => ({
    id: String(row.id),
    slug: row.slug,
    displayName: row.display_name,
    role: row.role || null,
    kind: row.kind || null,
    aliases: contributorAliases(row),
    meetingCount: meetingsBySlug[row.slug]?.length || 0,
  }));

  return {
    people,
    meetings: people.flatMap((person) => meetingsBySlug[person.slug] || []),
    bySlug: Object.fromEntries(people.map((person) => [person.slug, {
      ...person,
      meetings: meetingsBySlug[person.slug] || [],
    }])),
    note: "Public World landing shows only Human-Gate-approved contributor identities and APPROVED source-attributed meeting projections. Unknown authorship is never guessed.",
  };
}

export async function fetchWorldLandingContributorProjection() {
  const { supabase } = await import("../supabase.js");
  const { data: contributors, error: contributorError } = await supabase
    .from("contributors")
    .select("id,slug,display_name,kind,role,wa_names")
    .in("slug", WORLD_APPROVED_CONTRIBUTOR_SLUGS);
  if (contributorError) throw contributorError;

  const ids = (contributors || []).map((row) => row.id).filter(Boolean);
  let publicContributions = [];
  if (ids.length) {
    const { data, error } = await supabase
      .from("research_contributions")
      .select("id,author_contributor_id,title,target_type,target_id,gematria_claim,convergence_slug,status,created_at")
      .in("author_contributor_id", ids)
      .eq("status", "approved")
      .not("convergence_slug", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    publicContributions = Array.isArray(data) ? data : [];
  }

  return buildWorldLandingContributorProjection({ contributors, publicContributions });
}

export async function fetchWorldContributorLens({
  anchorType,
  anchorLabel,
  researchRows = [],
  topicRows = [],
} = {}) {
  const { supabase } = await import("../supabase.js");

  const { data: contributors, error: contributorError } = await supabase
    .from("contributors")
    .select("id,slug,display_name,kind,role,wa_names")
    .in("slug", WORLD_APPROVED_CONTRIBUTOR_SLUGS);
  if (contributorError) throw contributorError;

  const ids = (contributors || []).map((row) => row.id).filter(Boolean);
  let contributions = [];
  if (ids.length) {
    const { data, error } = await supabase.rpc("admin_all_contributions", { p_status: "all", p_limit: 5000 });
    if (error) throw error;
    contributions = (Array.isArray(data) ? data : []).filter((row) => ids.includes(row?.author_contributor_id));
  }

  const aliases = (contributors || []).flatMap(contributorAliases);
  let authorConvergences = [];
  if (aliases.length) {
    const { data, error } = await supabase.rpc("convergences_for_author", { p_names: aliases });
    if (error) throw error;
    authorConvergences = Array.isArray(data) ? data : [];
  }

  return buildWorldContributorLens({
    contributors,
    contributions,
    authorConvergences,
    researchRows,
    topicRows,
    anchor: { type: anchorType, label: anchorLabel },
  });
}
