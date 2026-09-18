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
