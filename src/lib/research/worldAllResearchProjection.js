import { supabase } from "../supabase.js";
import { normalizeWorldNumber, resolveExplicitVerificationState } from "./worldContextualProminence.js";
import { resolveResearchObjectPresentation, humanizeResearchSource } from "./researchObjectPresentation.js";

const clean = (value) => value == null ? "" : String(value).trim();
const PAGE_SIZE = 500;
const MAX_ROWS_PER_SOURCE = 10000;

const finite = normalizeWorldNumber;

function hasHebrew(value) {
  return /[א-ת]/.test(clean(value));
}

function isUrl(value) {
  return /^https?:\/\//i.test(clean(value));
}

function sourceMessageTitle(row) {
  const text = clean(row?.text);
  const contributor = clean(row?.credit || row?.speaker);
  if (text && hasHebrew(text)) return text;
  if (isUrl(text)) return contributor ? `קישור מקור שהתקבל מ${contributor}` : "הודעת מקור עם קישור";
  if (text) return contributor ? `הודעת מקור שהתקבלה מ${contributor}` : "הודעת מקור";
  return row?.image_url ? "הודעת מקור עם מדיה" : "הודעת מקור ללא טקסט";
}

function sourceMessageSummary(row) {
  const text = clean(row?.text);
  if (!text || hasHebrew(text)) return null;
  if (isUrl(text)) return "הקישור המקורי נשמר כמקום המקור; זהות מחבר התוכן אינה מוסקת מעצם שם השולח.";
  return "הטקסט המקורי נשמר במקור. שכבת התצוגה בעברית אינה משנה את תוכן המקור או את מעמדו.";
}

function safeContributionTitle(row) {
  const raw = clean(row?.title || row?.body);
  if (raw && hasHebrew(raw)) return raw;
  const value = finite(row?.gematria_claim?.value);
  return value != null ? `תרומת מחקר סביב ${value}` : "תרומת מחקר";
}

// Structured (never text-scanned) per-scope verification carrier: known source metadata
// keeps its own scoped state, e.g. meta.ext.batch_001b.notarikon_verification_state or
// meta.ext.<batch>.source_claim_46_exact_phrase, alongside a top-level engine_detail
// state. This walks meta.ext by KEY NAME only (never row.statement/free text) and never
// discards a raw scoped field — every one is returned for the caller to carry through.
function collectScopedVerificationStates(row) {
  const ext = row?.meta?.ext;
  const out = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === "object") {
        visit(value);
        continue;
      }
      if (/verification_state$/i.test(key) || /_exact_phrase$/i.test(key)) {
        const state = clean(value).toLowerCase();
        if (state) out.push({ key, state });
      }
    }
  };
  visit(ext);
  return out;
}

// Truth Axes v3: only engine_detail.verification_state is verification authority.
// research_objects.engine_verified is a compatibility/derived signal and must never be
// promoted to "match" on its own — absent an explicit state it stays a legacy signal.
// A top-level explicit "match" never overrides a known per-scope mismatch: the exact raw
// scope fields are preserved (see scopeVerificationStates below) and the composed state
// exposes partial/needs-review instead of certifying a full match.
function verificationState(row) {
  const explicit = resolveExplicitVerificationState(row);
  const scoped = collectScopedVerificationStates(row);
  const scopedMismatch = scoped.some((entry) => entry.state === "mismatch");
  if (explicit === "match" && scopedMismatch) return "partial_needs_review";
  if (explicit) return explicit;
  if (scopedMismatch) return "mismatch";
  return row?.engine_verified === true ? "legacy_signal" : "not_tested";
}

function countBy(rows, key) {
  const out = {};
  for (const row of rows) {
    const value = clean(row?.[key]) || "לא צוין";
    out[value] = (out[value] || 0) + 1;
  }
  return out;
}

async function fetchConvergenceCandidates() {
  try {
    const { data, error } = await supabase.rpc("admin_convergence_candidates", { p_limit: 50 });
    if (error) return { rows: [], error: clean(error.message) || "candidate_rpc_failed", meta: {} };
    const rows = Array.isArray(data?.candidates) ? data.candidates : [];
    return {
      rows,
      error: null,
      meta: {
        activePreferences: Array.isArray(data?.active_preferences) ? data.active_preferences : [],
        openContradictions: finite(data?.open_contradictions) ?? 0,
      },
    };
  } catch (error) {
    return { rows: [], error: clean(error?.message) || "candidate_rpc_failed", meta: {} };
  }
}

async function fetchAllRows(table, fields) {
  const rows = [];
  let total = null;
  let offset = 0;

  while (offset < MAX_ROWS_PER_SOURCE) {
    const end = Math.min(offset + PAGE_SIZE - 1, MAX_ROWS_PER_SOURCE - 1);
    let query = supabase
      .from(table)
      .select(fields, offset === 0 ? { count: "exact" } : undefined)
      .order("created_at", { ascending: false })
      .range(offset, end);
    const { data, error, count } = await query;
    if (error) throw error;
    if (offset === 0 && count != null) total = Number(count);
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const knownTotal = Number.isFinite(total) ? total : rows.length;
  return { rows, total: knownTotal, truncated: knownTotal > rows.length };
}

export function normalizeWorldAllResearchRow(row, family = "research_object") {
  if (!row?.id) return null;

  if (family === "source_message") {
    const sourceRef = "channel_updates:" + row.id;
    const rawText = clean(row.text) || null;
    return {
      id: "source:" + row.id,
      sourceId: String(row.id),
      family,
      createdAt: row.created_at || null,
      kind: "source_message",
      statement: sourceMessageTitle(row),
      secondary: sourceMessageSummary(row),
      originalStatement: rawText,
      terms: [],
      value: null,
      values: [],
      relates: [],
      source: clean(row.channel || row.source) || "channel_updates",
      sourceLabel: "הודעות מקור",
      sourceRef,
      sourceRefs: [sourceRef],
      contributor: clean(row.credit || row.speaker) || null,
      attributionLabel: clean(row.credit || row.speaker)
        ? `תווית שולח במקור: ${clean(row.credit || row.speaker)} · זהות מחבר התוכן לא הוכרעה`
        : "זהות השולח לא צוינה",
      status: clean(row.status) || "לא צוין",
      access: null,
      verification: "not_applicable",
      engineVerified: false,
      mediaUrl: clean(row.image_url) || null,
      mediaClass: row.image_url ? "image" : null,
      spatialCluster: null,
      href: clean(row.link_url) || (isUrl(rawText) ? rawText : null),
      presentation: {
        typeLabel: "הודעת מקור",
        sourceLabel: "הודעות מקור",
        contextLine: ["הודעת מקור", clean(row.channel), row.created_at ? new Date(row.created_at).toLocaleDateString("he-IL") : null].filter(Boolean).join(" · "),
      },
    };
  }

  if (family === "contribution") {
    const claimValue = finite(row?.gematria_claim?.value);
    const statement = safeContributionTitle(row);
    const rawContribution = clean(row.title || row.body) || null;
    const secondary = rawContribution && hasHebrew(rawContribution) ? (row.title ? clean(row.body) : null) : null;
    const mediaUrl = clean(row.image_url) || (
      Array.isArray(row.media) ? clean(row.media[0]?.url || row.media[0]) : clean(row?.media?.url)
    );
    return {
      id: "contribution:" + row.id,
      sourceId: String(row.id),
      family,
      createdAt: row.created_at || null,
      kind: clean(row.intent) || "contribution",
      statement,
      secondary,
      terms: [],
      value: claimValue,
      values: claimValue == null ? [] : [claimValue],
      relates: [clean(row.target_id), clean(row.convergence_slug)].filter(Boolean),
      source: clean(row.origin) || "research_contributions",
      sourceLabel: "תרומת מחקר",
      sourceRef: "research_contributions:" + row.id,
      sourceRefs: ["research_contributions:" + row.id],
      contributor: clean(row.author_name) || null,
      status: clean(row.status || row.research_state) || "לא צוין",
      access: null,
      verification: "not_tested",
      engineVerified: false,
      mediaUrl: mediaUrl || null,
      mediaClass: mediaUrl ? "media" : null,
      spatialCluster: null,
      href: row.convergence_slug ? "/topic/" + encodeURIComponent(row.convergence_slug) : null,
    };
  }

  if (family === "topic") {
    const values = (Array.isArray(row.highlight_numbers) && row.highlight_numbers.length
      ? row.highlight_numbers
      : Array.isArray(row.numbers) ? row.numbers : [])
      .map(Number).filter(Number.isFinite);
    return {
      id: "topic:" + row.id,
      sourceId: String(row.id),
      family,
      createdAt: row.created_at || null,
      kind: "topic",
      statement: clean(row.title) || "נושא",
      secondary: clean(row.subtitle) || null,
      terms: Array.isArray(row.search_terms) ? row.search_terms.map(String) : [],
      value: values.length === 1 ? values[0] : null,
      values,
      relates: [],
      source: "topic_cards",
      sourceLabel: "נושא",
      sourceRef: "topic_cards:" + row.id,
      sourceRefs: ["topic_cards:" + row.id],
      contributor: clean(row.created_by) || null,
      status: clean(row.status) || "לא צוין",
      approvedAt: row.approved_at || null,
      meterScore: finite(row.meter_score),
      quality: finite(row.quality),
      access: null,
      verification: "not_applicable",
      engineVerified: false,
      mediaUrl: null,
      mediaClass: Array.isArray(row.image_ids) && row.image_ids.length ? "linked_media" : null,
      spatialCluster: null,
      href: row.slug ? "/topic/" + encodeURIComponent(row.slug) : null,
    };
  }

  const value = finite(row.value);
  const metaSourceRefs = Array.isArray(row?.meta?.source_refs) ? row.meta.source_refs.map(String) : [];
  const sourceRef = clean(row.source_ref) || ("research_objects:" + row.id);
  const presentation = resolveResearchObjectPresentation(row, { locale: "he" });
  const operationalState = clean(
    row?.engine_detail?.status
    || row?.engine_detail?.classification
    || row?.engine_detail?.result_state
    || row?.engine_detail?.outcome
  ) || null;
  return {
    id: "research:" + row.id,
    sourceId: String(row.id),
    family: "research_object",
    createdAt: row.created_at || null,
    kind: clean(row.kind) || "observation",
    statement: presentation.title || "ממצא מחקר",
    secondary: presentation.summary || null,
    originalStatement: clean(row.statement) || null,
    presentation,
    typeLabel: presentation.typeLabel,
    contextLine: presentation.contextLine,
    attributionLabel: presentation.attributionLabel,
    terms: Array.isArray(row.terms) ? row.terms.map(String) : [],
    value,
    values: value == null ? [] : [value],
    relates: Array.isArray(row.relates) ? row.relates.map(String) : [],
    source: clean(row.source) || null,
    sourceLabel: presentation.sourceLabel || humanizeResearchSource(row.source, sourceRef),
    sourceRef,
    sourceRefs: [...new Set([sourceRef, ...metaSourceRefs].filter(Boolean))],
    contributor: clean(row.contributor) || null,
    confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : null,
    status: clean(row.status) || "לא צוין",
    access: clean(row.privacy_scope) || "לא צוין",
    parentId: clean(row.parent_id) || null,
    batchKey: clean(row?.meta?.batch_key) || null,
    operationalState,
    engineVerified: row.engine_verified === true,
    verification: verificationState(row),
    // Raw per-scope states, preserved verbatim for inspection — never collapsed away by
    // the composed `verification` field above.
    engineVerificationStateRaw: resolveExplicitVerificationState(row),
    scopeVerificationStates: collectScopedVerificationStates(row),
    mediaUrl: clean(row?.meta?.ext?.wa_channel_intake?.media_ref) || null,
    mediaClass: clean(row?.meta?.ext?.source_media_profile?.class) || null,
    spatialCluster: clean(row?.meta?.ext?.spatial_research?.cluster) || null,
    href: value != null ? "/2029/number/" + value : null,
  };
}

export function buildWorldAllResearchProjection(familyRows = {}, totals = {}) {
  const rows = [
    ...(familyRows.researchObjects || []).map((row) => normalizeWorldAllResearchRow(row, "research_object")),
    ...(familyRows.contributions || []).map((row) => normalizeWorldAllResearchRow(row, "contribution")),
    ...(familyRows.sourceMessages || []).map((row) => normalizeWorldAllResearchRow(row, "source_message")),
    ...(familyRows.topics || []).map((row) => normalizeWorldAllResearchRow(row, "topic")),
  ].filter(Boolean).sort((a, b) => clean(b.createdAt).localeCompare(clean(a.createdAt)));

  const sourceTotals = {
    research_object: Number(totals.researchObjects ?? familyRows.researchObjects?.length ?? 0),
    contribution: Number(totals.contributions ?? familyRows.contributions?.length ?? 0),
    source_message: Number(totals.sourceMessages ?? familyRows.sourceMessages?.length ?? 0),
    topic: Number(totals.topics ?? familyRows.topics?.length ?? 0),
  };

  return {
    rows,
    total: Object.values(sourceTotals).reduce((sum, value) => sum + value, 0),
    convergenceCandidates: Array.isArray(familyRows.convergenceCandidates) ? familyRows.convergenceCandidates : [],
    convergenceCandidateError: clean(totals.convergenceCandidateError) || null,
    convergenceCandidateMeta: totals.convergenceCandidateMeta || {},
    loaded: rows.length,
    truncated: Boolean(totals.truncated),
    sourceTotals,
    byFamily: countBy(rows, "family"),
    byKind: countBy(rows, "kind"),
    byAccess: countBy(rows.filter((row) => row.family === "research_object"), "access"),
    byStatus: countBy(rows, "status"),
    byVerification: countBy(rows, "verification"),
    byContributor: countBy(rows, "contributor"),
    truthBoundary: "הצגה למנהל אינה משנה גישה, ממשל, אימות, קנוניות או פרסום. מקור גולמי, תרומת מחקר, ממצא מחקר ונושא נשארים שכבות נפרדות.",
  };
}

export function filterWorldAllResearchRows(rows = [], filters = {}) {
  const query = clean(filters.query).toLowerCase();
  const family = clean(filters.family) || "all";
  const kind = clean(filters.kind) || "all";
  const access = clean(filters.access) || "all";
  const status = clean(filters.status) || "all";
  const verification = clean(filters.verification) || "all";
  const contributor = clean(filters.contributor) || "all";

  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (family !== "all" && row.family !== family) return false;
    if (kind !== "all" && row.kind !== kind) return false;
    if (access !== "all" && row.access !== access) return false;
    if (status !== "all" && row.status !== status) return false;
    if (verification !== "all" && row.verification !== verification) return false;
    if (contributor !== "all" && (row.contributor || "לא צוין") !== contributor) return false;
    if (!query) return true;
    const haystack = [
      row.family,
      row.statement,
      row.secondary,
      row.originalStatement,
      row.contextLine,
      row.attributionLabel,
      row.sourceLabel,
      row.contributor,
      row.source,
      row.sourceRef,
      row.value,
      ...(row.values || []),
      row.kind,
      row.status,
      row.access,
      row.mediaClass,
      row.spatialCluster,
      ...(row.terms || []),
      ...(row.relates || []),
    ].filter((value) => value != null).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export async function fetchWorldAllResearchProjection() {
  const [research, contributions, sources, topics, candidates] = await Promise.all([
    fetchAllRows(
      "research_objects",
      "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,evidence,status,privacy_scope,parent_id,meta"
    ),
    fetchAllRows(
      "research_contributions",
      "id,created_at,author_name,intent,origin,research_state,status,target_type,target_id,title,body,gematria_claim,image_url,media,convergence_slug"
    ),
    fetchAllRows(
      "channel_updates",
      "id,created_at,text,image_url,source,status,credit,channel,link_url,speaker"
    ),
    fetchAllRows(
      "topic_cards",
      "id,created_at,approved_at,slug,title,subtitle,search_terms,image_ids,numbers,highlight_numbers,status,quality,meter_score,created_by"
    ),
    fetchConvergenceCandidates(),
  ]);

  return buildWorldAllResearchProjection(
    {
      researchObjects: research.rows,
      contributions: contributions.rows,
      sourceMessages: sources.rows,
      topics: topics.rows,
      convergenceCandidates: candidates.rows,
    },
    {
      researchObjects: research.total,
      contributions: contributions.total,
      sourceMessages: sources.total,
      topics: topics.total,
      convergenceCandidateError: candidates.error,
      convergenceCandidateMeta: candidates.meta,
      truncated: research.truncated || contributions.truncated || sources.truncated || topics.truncated,
    }
  );
}
