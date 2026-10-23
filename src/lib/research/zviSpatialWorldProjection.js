import { SPATIAL_FRAMEWORK, SPATIAL_MODELS } from "../spatialModels.js";
import { supabase } from "../supabase.js";
import { calculateGematriaEnvelope } from "./gematriaCalculationContract.js";
import { getPublicResearchClient } from "./researchViewMode.js";
import {
  channelUpdateOccurrenceId,
  contributorSourceLibraryHref,
  contributorSourceLocator,
} from "./worldContributorSourceLocator.js";

const ZVI_SOURCE_SLUG = "tzvi-opoc";
const ZVI_SOURCE_HREF = contributorSourceLibraryHref(ZVI_SOURCE_SLUG);
const PUBLIC_GOVERNANCE_STATES = new Set(["approved", "canonical", "published"]);
const clean = (value) => value == null ? "" : String(value).trim();
const unique = (values) => [...new Set((values || []).map(clean).filter(Boolean))];
const baseSourceRef = (value) => clean(value).split("#", 1)[0];

export const ZVI_SPATIAL_ADMIN_FILTER = [
  "meta->ext->spatial_research.not.is.null",
  "statement.ilike.%קובי%",
  "statement.ilike.%פאון%",
  "statement.ilike.%עשרימון%",
  "statement.ilike.%מחומש%",
  "statement.ilike.%מתומן%",
  "statement.ilike.%משולש%",
  "statement.ilike.%פירמיד%",
  "statement.ilike.%תלת%מימד%",
  "statement.ilike.%מרחב%",
  "statement.ilike.%פאות%",
  "statement.ilike.%π%",
  "statement.ilike.%פאי%",
  "statement.ilike.%אי%רציונ%",
].join(",");

function ordinaryGematria(term) {
  const result = calculateGematriaEnvelope(term).results.find((item) => item.methodKey === "רגיל");
  return Number(result?.value);
}

function verifyOperation(operation) {
  const values = operation.operationKey === "add" ? operation.addends : operation.factors;
  if (!Array.isArray(values) || !values.every(Number.isFinite)) return { ...operation, verified: false, actual: null };
  const actual = operation.operationKey === "add"
    ? values.reduce((sum, value) => sum + value, 0)
    : values.reduce((product, value) => product * value, 1);
  return { ...operation, actual, verified: actual === operation.result };
}

export function verifySpatialModel(model) {
  const gematria = (model.gematria || []).map((item) => {
    const actual = ordinaryGematria(item.term);
    return { ...item, actual, verified: Number.isFinite(actual) && actual === item.expected };
  });
  const operations = (model.spatial?.operations || []).map(verifyOperation);
  const exact = gematria.every((item) => item.verified) && operations.every((item) => item.verified);
  return { gematria, operations, exact, state: exact ? "חישוב מאומת" : "דורש בדיקה" };
}

function sourceContract(model) {
  const provenance = model.spatial?.provenance || {};
  const refs = unique(provenance.refs).map(baseSourceRef);
  const mediaRefs = unique(provenance.mediaRefs).map(baseSourceRef);
  const duplicateRefs = unique(provenance.duplicateRefs).map(baseSourceRef);
  return {
    contributor: provenance.contributor || "צבי",
    refs,
    mediaRefs,
    duplicateRefs,
    representativeRef: baseSourceRef(provenance.representativeRef) || refs[0] || null,
    locators: refs.map((ref) => contributorSourceLocator(ref, { slug: ZVI_SOURCE_SLUG })),
    occurrenceCount: refs.length,
    duplicateOccurrenceCount: duplicateRefs.length,
    independentSourceCount: null,
    href: ZVI_SOURCE_HREF,
  };
}

function rankCard(card) {
  const strength = card.review.connectionStrength === "חזק" ? 0 : card.review.connectionStrength === "בינוני" ? 1 : 2;
  const complete = card.verification.exact ? 0 : 1;
  return [strength, complete, -card.source.occurrenceCount, card.slug];
}

function compareCards(left, right) {
  const a = rankCard(left);
  const b = rankCard(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] < b[index]) return -1;
    if (a[index] > b[index]) return 1;
  }
  return 0;
}

function baseCard(model) {
  const source = sourceContract(model);
  const verification = verifySpatialModel(model);
  return {
    id: `spatial:${model.slug}`,
    slug: model.slug,
    section: model.section || "selected",
    series: Array.isArray(model.series) ? model.series : [],
    title: model.title,
    subtitle: model.subtitle || null,
    value: model.value,
    form: model.form,
    dimension: model.spatial?.dimension || null,
    shapeIdentity: model.spatial?.shapeIdentity || null,
    sourceClaims: Array.isArray(model.sourceClaims) ? model.sourceClaims : [],
    geometry: Array.isArray(model.spatial?.structuralProperties) ? model.spatial.structuralProperties : [],
    interpretation: model.interpretation || null,
    verification,
    source,
    image: null,
    imageProvenance: null,
    review: {
      connectionStrength: model.review?.connectionStrength || null,
      evidenceQuality: model.review?.evidenceQuality || "אין נתון",
      recommendation: model.review?.recommendation || "דורש בדיקה",
      calculationState: verification.state,
      publicationState: "אין נתון",
      whyRanked: verification.exact
        ? "הערכים והפעולות עברו מנוע דטרמיניסטי; חוזק החיבור נקבע בנפרד לפי איכות המקור והצורה."
        : "לפחות ערך או פעולה אחת טרם עברו אימות מלא.",
    },
    href: `/world?view=explore&kind=spatial&spatial=${encodeURIComponent(model.slug)}#spatial-${encodeURIComponent(model.slug)}`,
  };
}

export function buildZviSpatialWorldProjection(models = SPATIAL_MODELS) {
  const cards = (models || []).map(baseCard).sort(compareCards);
  return {
    id: "zvi-spatial-world-v3",
    title: SPATIAL_FRAMEWORK.title,
    description: "מפת מבנים מתוך הקורפוס החי של צבי. זו הקרנה של אותו Reality Graph — לא מאגר או מנוע מקביל.",
    sections: SPATIAL_FRAMEWORK.sections,
    cards,
    adminQueue: [],
    counts: {
      corpusCandidates: 119,
      corpusSourceOccurrences: 55,
      approvedModels: cards.length,
      sourceOccurrences: cards.reduce((sum, card) => sum + card.source.occurrenceCount, 0),
      duplicateOccurrences: cards.reduce((sum, card) => sum + card.source.duplicateOccurrenceCount, 0),
      withImage: 0,
      strong: cards.filter((card) => card.review.connectionStrength === "חזק").length,
      medium: cards.filter((card) => card.review.connectionStrength === "בינוני").length,
    },
    rules: {
      truthLayers: SPATIAL_FRAMEWORK.truthLayers,
      threeDimensionalAssetsLoadOnDemand: true,
      twoDimensionalFallbackAlwaysAvailable: true,
      missingStrengthLabel: "טרם דורג",
      independentSourcesAreNotInferredFromOccurrences: true,
      sourceTextComesFromLiveReader: true,
      noPhysicalDeduplication: true,
    },
  };
}

export const ZVI_SPATIAL_WORLD = buildZviSpatialWorldProjection();

function publicSourceImage(row) {
  const thumb = clean(row?.thumb_url);
  const image = clean(row?.image_url);
  if (/^https:\/\//i.test(thumb)) return thumb;
  if (/^https:\/\//i.test(image) && !/\.(?:mp4|mov|webm|m4v)(?:[?#]|$)/i.test(image)) return image;
  return null;
}

function longestTextRow(rows) {
  return [...(rows || [])].sort((left, right) => clean(right?.text).length - clean(left?.text).length
    || clean(right?.created_at).localeCompare(clean(left?.created_at)))[0] || null;
}

function enrichCard(card, researchRows, sourceRows) {
  const refSet = new Set(card.source.refs);
  const cardResearch = (researchRows || []).filter((row) => refSet.has(baseSourceRef(row?.source_ref)));
  const cardSources = (sourceRows || []).filter((row) => refSet.has(`channel_updates:${row?.id}`));
  const mediaRefSet = new Set(card.source.mediaRefs);
  const mediaRows = (sourceRows || []).filter((row) => mediaRefSet.has(`channel_updates:${row?.id}`));
  const representative = longestTextRow(cardSources);
  const media = mediaRows.find((row) => publicSourceImage(row)) || cardSources.find((row) => publicSourceImage(row)) || null;
  const publicRows = cardResearch.filter((row) => clean(row?.privacy_scope) === "public" && PUBLIC_GOVERNANCE_STATES.has(clean(row?.status)));
  const statuses = unique(publicRows.map((row) => row.status));
  const sourceImage = publicSourceImage(media);
  return {
    ...card,
    live: {
      available: publicRows.length > 0 && cardSources.length > 0,
      researchRows: publicRows.length,
      sourceRows: cardSources.length,
      representativeStatement: clean(representative?.text) || null,
      representativeSourceRef: representative?.id ? `channel_updates:${representative.id}` : card.source.representativeRef,
    },
    image: sourceImage,
    imageProvenance: sourceImage ? "public_source_occurrence" : null,
    source: {
      ...card.source,
      visibleOccurrenceCount: cardSources.length,
      representativeRef: representative?.id ? `channel_updates:${representative.id}` : card.source.representativeRef,
    },
    review: {
      ...card.review,
      publicationState: statuses.length === 1 ? statuses[0] : statuses.length ? statuses.join(" · ") : "אין נתון",
      engineVerifiedRows: publicRows.filter((row) => row.engine_verified === true).length,
    },
  };
}

function isSpatialAdminRow(row) {
  const statement = clean(row?.statement);
  const structured = Boolean(row?.meta?.ext?.spatial_research);
  return structured || /(קובי|פאון|עשרימון|מחומש|מתומן|משולש|פירמיד|תלת.?מימד|מרחב|פאות|π|פאי|אי.?רציונ)/iu.test(statement);
}

export function buildSpatialAdminQueue(rows = [], models = SPATIAL_MODELS) {
  const selected = new Set(models.flatMap((model) => model.spatial?.provenance?.refs || []).map(baseSourceRef));
  const groups = new Map();
  for (const row of (rows || []).filter(isSpatialAdminRow)) {
    const ref = baseSourceRef(row?.source_ref) || `research_objects:${row?.id}`;
    if (selected.has(ref)) continue;
    if (!groups.has(ref)) groups.set(ref, []);
    groups.get(ref).push(row);
  }
  return [...groups.entries()].map(([sourceRef, members]) => {
    const representative = [...members].sort((a, b) => clean(b?.statement).length - clean(a?.statement).length)[0];
    const statement = clean(representative?.statement);
    const isConstants = /(π|פאי|אי.?רציונ|\be\b)/iu.test(statement);
    const knownMismatch = sourceRef === "channel_updates:07432406-3b24-4c44-8ed8-ca980dced60b";
    const hasImageMarker = /\[Image\s+\d+\.(?:jpe?g|png|webp)\]/iu.test(statement);
    return {
      id: `spatial-queue:${sourceRef}`,
      sourceRef,
      statement,
      category: isConstants ? "פאי וקבועים" : "מרחבים ומבנים",
      status: clean(representative?.status) || "אין נתון",
      privacyScope: clean(representative?.privacy_scope) || "אין נתון",
      findingCount: members.length,
      engineVerifiedCount: members.filter((row) => row?.engine_verified === true).length,
      needs: knownMismatch ? "סתירת חישוב: 681 במקור מול 861 במנוע"
        : hasImageMarker ? "דורש התאמת תמונה או OCR"
          : isConstants ? "דורש אימות קבועים וסיווג קירוב"
            : "דורש מיון מבני",
      locator: contributorSourceLocator(sourceRef, { slug: ZVI_SOURCE_SLUG }),
    };
  }).sort((left, right) => left.category.localeCompare(right.category, "he") || left.sourceRef.localeCompare(right.sourceRef));
}

async function fetchAdminQueue(client) {
  const contributorResult = await client
    .from("contributors")
    .select("id,display_name,wa_names")
    .eq("slug", ZVI_SOURCE_SLUG)
    .maybeSingle();
  if (contributorResult.error) throw contributorResult.error;
  const contributor = contributorResult.data;
  if (!contributor?.id) return [];
  const aliases = unique([contributor.display_name, ...(Array.isArray(contributor.wa_names) ? contributor.wa_names : [])]);
  const quoted = (value) => `"${clean(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const contributorFilter = [
    `source_contributor_id.eq.${clean(contributor.id)}`,
    aliases.length ? `contributor.in.(${aliases.map(quoted).join(",")})` : null,
  ].filter(Boolean).join(",");
  const { data, error } = await client
    .from("world_contributor_research_v1")
    .select("id,statement,source_ref,contributor,engine_verified,status,privacy_scope,meta")
    .or(contributorFilter)
    .or(ZVI_SPATIAL_ADMIN_FILTER)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return buildSpatialAdminQueue(data || []);
}

export async function fetchZviSpatialWorldProjection({
  publicClient = getPublicResearchClient,
  adminClient = supabase,
  includeAdmin = false,
} = {}) {
  const base = buildZviSpatialWorldProjection();
  const sourceRefs = unique(base.cards.flatMap((card) => card.source.refs));
  const occurrenceIds = unique(base.cards.flatMap((card) => [...card.source.refs, ...card.source.mediaRefs])
    .map(channelUpdateOccurrenceId).filter(Boolean));
  try {
    const client = publicClient();
    const [researchResult, sourceResult, adminResult] = await Promise.all([
      client.from("world_contributor_research_v1")
        .select("id,statement,source_ref,contributor,engine_verified,status,privacy_scope,meta")
        .in("source_ref", sourceRefs),
      client.from("channel_updates")
        .select("id,text,image_url,thumb_url,status,created_at")
        .in("id", occurrenceIds),
      includeAdmin ? fetchAdminQueue(adminClient).catch(() => null) : Promise.resolve([]),
    ]);
    if (researchResult.error) throw researchResult.error;
    if (sourceResult.error) throw sourceResult.error;
    const cards = base.cards.map((card) => enrichCard(card, researchResult.data || [], sourceResult.data || []))
      .filter((card) => card.live.available)
      .sort(compareCards);
    return {
      ...base,
      cards,
      adminQueue: Array.isArray(adminResult) ? adminResult : [],
      counts: {
        ...base.counts,
        approvedModels: cards.length,
        sourceOccurrences: cards.reduce((sum, card) => sum + card.source.occurrenceCount, 0),
        duplicateOccurrences: cards.reduce((sum, card) => sum + card.source.duplicateOccurrenceCount, 0),
        withImage: cards.filter((card) => card.image).length,
        adminQueue: Array.isArray(adminResult) ? adminResult.length : null,
      },
      access: {
        available: true,
        reader: "public_rls",
        sourceMedia: "public_reader",
        adminQueue: includeAdmin ? (Array.isArray(adminResult) ? "authorized" : "unavailable") : "not_requested",
      },
    };
  } catch (_) {
    return {
      ...base,
      cards: [],
      adminQueue: [],
      counts: { ...base.counts, approvedModels: null, sourceOccurrences: null, duplicateOccurrences: null, withImage: null, adminQueue: null },
      access: { available: false, reader: "public_rls", sourceMedia: "unavailable", adminQueue: includeAdmin ? "unavailable" : "not_requested" },
    };
  }
}
